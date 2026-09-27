import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { 
  Contract, 
  ContractStatus, 
  OFFICIAL_ADMIN_UID,
  OFFICIAL_ADMIN_UIDS
} from '../types';
import { sendNotification } from './notificationService';
import { queueContractStatusEmail } from './emailService';

const LOCAL_CONTRACTS_KEY = 'codexa_local_contracts_store';
const DELETED_CONTRACTS_KEY = 'codexa_deleted_contracts_store';

function getDeletedContractIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CONTRACTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch (e) {
    return new Set();
  }
}

function markContractDeleted(contractId: string): void {
  try {
    const set = getDeletedContractIds();
    set.add(contractId);
    localStorage.setItem(DELETED_CONTRACTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("Failed to mark contract deleted:", e);
  }
}

function unmarkContractDeleted(contractId: string): void {
  try {
    const set = getDeletedContractIds();
    set.delete(contractId);
    localStorage.setItem(DELETED_CONTRACTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("Failed to unmark contract deleted:", e);
  }
}

function getLocalContracts(): Contract[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONTRACTS_KEY);
    if (!raw) return [];
    const deleted = getDeletedContractIds();
    const list: Contract[] = JSON.parse(raw);
    return list.filter(c => !deleted.has(c.contractId));
  } catch (e) {
    return [];
  }
}

function saveLocalContract(contract: Contract): void {
  try {
    unmarkContractDeleted(contract.contractId);
    const list = getLocalContracts().filter(c => c.contractId !== contract.contractId);
    list.unshift(contract);
    localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to save local contract:", e);
  }
}

function removeLocalContract(contractId: string): void {
  try {
    markContractDeleted(contractId);
    const raw = localStorage.getItem(LOCAL_CONTRACTS_KEY);
    const list: Contract[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(c => c.contractId !== contractId);
    localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Failed to remove local contract:", e);
  }
}

// Generate unique contract code: CDX-YYYY-XXXXXX (Fast 0ms execution)
export async function generateUniqueContractCode(): Promise<string> {
  const year = new Date().getFullYear();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CDX-${year}-${randomPart}`;
}

// Find user by email to get clientId with timeout
export async function findUserIdByEmail(email: string): Promise<string | null> {
  if (!db) return null;
  try {
    const q = query(
      collection(db, 'users'), 
      where('email', '==', email.trim().toLowerCase())
    );
    const fetchPromise = getDocs(q);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const snap = await Promise.race([fetchPromise, timeoutPromise]);
    if (snap && 'empty' in snap && !snap.empty) {
      return snap.docs[0].id;
    }
    return null;
  } catch (err) {
    console.warn("Could not find user by email:", err);
    return null;
  }
}

// Export local contracts for fast UI access
export function getLocalContractsList(): Contract[] {
  return getLocalContracts();
}

// Fetch single contract by contractId with permission check
export async function getContractById(
  contractId: string, 
  currentUserId: string | null, 
  isAdmin: boolean,
  currentUserEmail?: string
): Promise<Contract> {
  const localContract = getLocalContracts().find(c => c.contractId === contractId);
  const userEmail = currentUserEmail?.trim().toLowerCase();

  const verifyAndLink = (contract: Contract): Contract => {
    if (isAdmin) return contract;
    if (!currentUserId) return contract;

    const contractEmail = contract.clientEmail?.trim().toLowerCase();
    const isOwner = contract.clientId === currentUserId || 
                    (userEmail && contractEmail && userEmail === contractEmail) ||
                    (!contract.clientId || contract.clientId.startsWith('client_'));

    if (isOwner) {
      if (contract.clientId !== currentUserId) {
        contract.clientId = currentUserId;
        saveLocalContract(contract);
        if (db) {
          updateDoc(doc(db, 'contracts', contract.contractId), { clientId: currentUserId }).catch(() => {});
        }
      }
      return contract;
    }
    throw new Error('لا يمكنك الوصول إلى هذا العقد.');
  };

  // If we have it locally, return it immediately if no Firestore connection
  if (!db && localContract) return verifyAndLink(localContract);

  if (db) {
    try {
      const docRef = doc(db, 'contracts', contractId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const contract = snap.data() as Contract;
        const verified = verifyAndLink(contract);
        saveLocalContract(verified);
        return verified;
      }
    } catch (err: any) {
      if (err.message === 'لا يمكنك الوصول إلى هذا العقد.') throw err;
      console.warn("Firestore getContractById fallback:", err);
    }
  }

  if (localContract) return verifyAndLink(localContract);
  throw new Error('لم يتم العثور على العقد المطلوب.');
}

// Client search by contract code: CDX-YYYY-XXXXXX
export async function searchContractByCode(
  contractCode: string, 
  currentUserId: string | null,
  isAdmin: boolean = false,
  currentUserEmail?: string
): Promise<Contract> {
  const cleanCode = contractCode.trim().toUpperCase();
  const userEmail = currentUserEmail?.trim().toLowerCase();

  const verifyAndLink = (contract: Contract): Contract => {
    if (isAdmin) {
      saveLocalContract(contract);
      return contract;
    }

    // If guest search (no UID), we just return the contract if code matches
    if (!currentUserId) return contract;

    const contractEmail = contract.clientEmail?.trim().toLowerCase();
    
    // Check ownership: matching UID, matching Email, or temporary client ID
    const isOwner = contract.clientId === currentUserId || 
                    (userEmail && contractEmail && userEmail === contractEmail) ||
                    (!contract.clientId || contract.clientId.startsWith('client_'));

    if (isOwner) {
      if (contract.clientId !== currentUserId) {
        contract.clientId = currentUserId;
        if (userEmail && !contract.clientEmail) {
          contract.clientEmail = userEmail;
        }
        saveLocalContract(contract);
        if (db) {
          try {
            updateDoc(doc(db, 'contracts', contract.contractId), { 
              clientId: currentUserId,
              updatedAt: new Date().toISOString()
            }).catch(() => {});
          } catch (e) {}
        }
      } else {
        saveLocalContract(contract);
      }
      return contract;
    }
    throw new Error('لا يمكنك الوصول إلى هذا العقد.');
  };

  if (db) {
    try {
      const q = query(
        collection(db, 'contracts'), 
        where('contractCode', '==', cleanCode)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const contractDoc = snap.docs[0];
        const contract = contractDoc.data() as Contract;
        return verifyAndLink(contract);
      }
    } catch (err: any) {
      if (err.message === 'لا يمكنك الوصول إلى هذا العقد.') {
        throw err;
      }
      console.warn("Firestore searchContractByCode fallback:", err);
    }
  }

  const localContract = getLocalContracts().find(c => c.contractCode?.toUpperCase() === cleanCode);
  if (localContract) {
    return verifyAndLink(localContract);
  }

  throw new Error('لم يتم العثور على عقد بهذا الكود.');
}

// Fetch all contracts for client
export async function getClientContracts(clientId: string, clientEmail?: string): Promise<Contract[]> {
  const deleted = getDeletedContractIds();
  const email = clientEmail?.trim().toLowerCase();

  const localList = getLocalContracts().filter(c => 
    !deleted.has(c.contractId) && 
    (c.clientId === clientId || (email && c.clientEmail?.trim().toLowerCase() === email))
  );
  const map = new Map<string, Contract>();
  localList.forEach(c => map.set(c.contractId, c));

  if (db) {
    try {
      // 1. Query by UID
      const q1 = query(collection(db, 'contracts'), where('clientId', '==', clientId));
      const snap1 = await getDocs(q1);
      snap1.forEach((docSnap) => {
        const item = docSnap.data() as Contract;
        if (!deleted.has(item.contractId)) {
          const existing = map.get(item.contractId);
          if (!existing || new Date(item.updatedAt || item.createdAt || 0).getTime() > new Date(existing.updatedAt || existing.createdAt || 0).getTime()) {
            map.set(item.contractId, item);
          }
        }
      });

      // 2. Query by Email if available
      if (email) {
        const q2 = query(collection(db, 'contracts'), where('clientEmail', '==', email));
        const snap2 = await getDocs(q2);
        snap2.forEach((docSnap) => {
          const item = docSnap.data() as Contract;
          if (!deleted.has(item.contractId)) {
            const existing = map.get(item.contractId);
            if (!existing || new Date(item.updatedAt || item.createdAt || 0).getTime() > new Date(existing.updatedAt || existing.createdAt || 0).getTime()) {
              map.set(item.contractId, item);
            }
          }
        });
      }
    } catch (err) {
      console.warn("Error fetching client contracts:", err);
    }
  }

  const contracts = Array.from(map.values());
  contracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return contracts;
}

// Fetch all contracts for admin
export async function getAllContractsForAdmin(): Promise<Contract[]> {
  const deleted = getDeletedContractIds();
  const localList = getLocalContracts().filter(c => !deleted.has(c.contractId));
  const map = new Map<string, Contract>();
  localList.forEach(c => map.set(c.contractId, c));

  if (db) {
    try {
      const snap = await getDocs(collection(db, 'contracts'));
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Contract;
        if (!deleted.has(item.contractId)) {
          const existing = map.get(item.contractId);
          if (!existing || new Date(item.updatedAt || item.createdAt || 0).getTime() > new Date(existing.updatedAt || existing.createdAt || 0).getTime()) {
            map.set(item.contractId, item);
          }
        }
      });
    } catch (err) {
      console.warn("Error fetching admin contracts:", err);
    }
  }

  const contracts = Array.from(map.values());
  contracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return contracts;
}

// Create new contract (Admin only)
export async function createContract(
  contractData: Omit<Contract, 'contractId' | 'createdAt' | 'updatedAt'>
): Promise<Contract> {
  const contractId = `CDX_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const content = contractData.contractContent || contractData.description || contractData.projectName || 'تفاصيل العقد المعتمدة';
  
  const newContract: Contract = {
    ...contractData,
    contractId,
    contractContent: content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always save immediately to local persistent storage
  saveLocalContract(newContract);

  // Sync to Firestore in background/safely
  if (db) {
    try {
      const contractRef = doc(db, 'contracts', contractId);
      const savePromise = setDoc(contractRef, newContract);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      await Promise.race([savePromise, timeoutPromise]);
    } catch (err) {
      console.warn("Firestore sync warning (stored safely in persistent storage):", err);
    }
  }

  // Send notification asynchronously
  if (newContract.clientId) {
    sendNotification({
      recipientId: newContract.clientId,
      title: 'لديك عقد جديد',
      message: `تم إنشاء عقد جديد لمشروعك (${newContract.projectName}) بكود: ${newContract.contractCode}. يمكنك الآن مراجعته واعتماده.`,
      type: 'contract_created',
      contractId: newContract.contractId,
    }).catch((notifErr) => {
      console.warn("Notification notice:", notifErr);
    });
  }

  return newContract;
}

// Upload Audio Recording and submit verification data
export async function uploadContractRecording(
  contractId: string, 
  userId: string | null,
  audioBlob: Blob, 
  durationSeconds: number,
  contractCode: string,
  transcript?: string
): Promise<{ 
  recordingUrl: string; 
  recordingPath: string; 
  verificationStatus: 'pending_review'; 
}> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('ملف التسجيل الصوتي فارغ. يرجى إعادة التسجيل.');
  }
  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error('حجم ملف التسجيل الصوتي يتجاوز الحد المسموح (25MB).');
  }
  if (durationSeconds < 4) {
    throw new Error('مدة التسجيل قصيرة جداً (أقل من 4 ثوانٍ). يرجى قراءة الإقرار كاملاً وبوضوح.');
  }

  const mime = audioBlob.type || 'audio/webm';
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
  const fileName = `${Date.now()}_declaration.${ext}`;
  const idToUse = userId || 'guest';
  const recordingPath = `contractRecordings/${contractId}/${idToUse}/${fileName}`;
  let recordingUrl = '';

  if (storage) {
    try {
      const storageRef = ref(storage, recordingPath);
      // Aggressive timeout (3s) for storage upload to ensure instant UX
      const uploadPromise = uploadBytes(storageRef, audioBlob, { contentType: mime });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      
      const uploadRes = await Promise.race([uploadPromise, timeoutPromise]) as any;
      recordingUrl = await getDownloadURL(uploadRes.ref);
    } catch (storageErr) {
      console.warn("Storage upload deferred or timeout, using local data URL for speed:", storageErr);
    }
  }

  // Fallback to Data URL if storage failed or timed out
  if (!recordingUrl) {
    try {
      recordingUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('فشل قراءة ملف التسجيل.'));
        reader.readAsDataURL(audioBlob);
      });
    } catch (e) {
      console.error("FileReader error:", e);
    }
  }

  const verificationStatus: 'pending_review' = 'pending_review';

  // Update local contract
  const localContract = getLocalContracts().find(c => c.contractId === contractId);
  if (localContract) {
    localContract.recordingUrl = recordingUrl;
    localContract.recordingPath = recordingPath;
    localContract.recordingDuration = Math.round(durationSeconds);
    localContract.recordedAt = new Date().toISOString();
    localContract.recordingStatus = 'uploaded';
    localContract.status = 'pending_review';
    localContract.verificationStatus = verificationStatus;
    localContract.transcript = transcript || 'تم استلام الإقرار الصوتي المسجل بنجاح وبانتظار المراجعة.';
    localContract.updatedAt = new Date().toISOString();
    saveLocalContract(localContract);
  }

  // Send status email to client
  if (localContract && localContract.clientEmail) {
    queueContractStatusEmail({
      contractId,
      contractCode,
      projectName: localContract.projectName,
      clientName: localContract.clientName || 'العميل',
      clientEmail: localContract.clientEmail,
      newStatus: 'pending_review',
      oldStatus: 'waiting_client',
    }).catch(() => {});
  }

  // Update in Firestore
  if (db && recordingUrl) {
    try {
      // Check if data URL is too large for Firestore (Limit is 1MB total doc size)
      // If it's a data URL and > 800KB, we shouldn't save the full string to Firestore
      const isDataUrl = recordingUrl.startsWith('data:');
      const finalRecordingUrl = (isDataUrl && recordingUrl.length > 800000) 
        ? 'data:audio/webm;base64,LARGE_FILE_STORED_LOCALLY_ONLY' 
        : recordingUrl;

      const contractRef = doc(db, 'contracts', contractId);
      await updateDoc(contractRef, {
        recordingUrl: finalRecordingUrl,
        recordingPath,
        recordingDuration: Math.round(durationSeconds),
        recordedAt: new Date().toISOString(),
        recordingStatus: 'uploaded',
        status: 'pending_review',
        verificationStatus,
        transcript: transcript || 'تم استلام الإقرار الصوتي المسجل بنجاح وبانتظار المراجعة.',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Firestore recording update notice:", err);
    }
  }

  // Notification to Admin
  for (const adminId of OFFICIAL_ADMIN_UIDS) {
    sendNotification({
      recipientId: adminId,
      title: 'تم استلام تسجيل عقد',
      message: `تم استلام التسجيل الصوتي للعميل المرتبط بالعقد ${contractCode}.`,
      type: 'contract_recording_submitted',
      contractId,
    }).catch(() => {});
  }

  return { recordingUrl, recordingPath, verificationStatus };
}

// Approve contract (Client final confirmation)
export async function approveContract(
  contractId: string, 
  userId: string,
  projectName: string,
  contractCode: string
): Promise<void> {
  const localContract = getLocalContracts().find(c => c.contractId === contractId);
  if (localContract) {
    if (!localContract.recordingUrl) {
      throw new Error('لا يمكن اعتماد العقد دون إتمام التسجيل الصوتي أولاً.');
    }
    localContract.status = 'approved';
    localContract.approvedAt = new Date().toISOString();
    localContract.approvedBy = userId;
    localContract.approvalStatus = 'approved';
    localContract.updatedAt = new Date().toISOString();
    saveLocalContract(localContract);
  }

  if (db) {
    // Perform firestore update in background to keep UI responsive
    updateDoc(doc(db, 'contracts', contractId), {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: userId,
      approvalStatus: 'approved',
      updatedAt: new Date().toISOString(),
    }).catch(err => console.warn("Background firestore approveContract warning:", err));
  }

  for (const adminId of OFFICIAL_ADMIN_UIDS) {
    sendNotification({
      recipientId: adminId,
      title: 'تمت الموافقة على عقد',
      message: `قام العميل بالموافقة الرسمية على عقد (${projectName}) كود: ${contractCode}.`,
      type: 'contract_approved',
      contractId,
    }).catch(() => {});
  }

  // Send status email to client & admin
  if (localContract && localContract.clientEmail) {
    queueContractStatusEmail({
      contractId,
      contractCode,
      projectName,
      clientName: localContract.clientName || 'العميل',
      clientEmail: localContract.clientEmail,
      newStatus: 'approved',
      oldStatus: 'pending_review',
    }).catch(() => {});
  }
}

// Mark contract as downloaded & securely store PDF
export async function markContractDownloaded(
  contractId: string,
  _projectName: string,
  contractCode: string,
  pdfBlob?: Blob
): Promise<{ pdfUrl?: string; pdfPath?: string }> {
  let pdfUrl = '';
  const pdfPath = `contracts/${contractId}/Codexa_Contract_${contractCode}.pdf`;

  // 1. Update LOCAL status immediately
  const localContract = getLocalContracts().find(c => c.contractId === contractId);
  if (localContract) {
    localContract.status = 'downloaded';
    localContract.downloadedAt = new Date().toISOString();
    localContract.updatedAt = new Date().toISOString();
    saveLocalContract(localContract);
  }

  // Send status email for downloaded contract
  if (localContract && localContract.clientEmail) {
    queueContractStatusEmail({
      contractId,
      contractCode,
      projectName: localContract.projectName,
      clientName: localContract.clientName || 'العميل',
      clientEmail: localContract.clientEmail,
      newStatus: 'downloaded',
      oldStatus: 'approved',
    }).catch(() => {});
  }

  // 2. Storage upload with timeout
  if (storage && pdfBlob) {
    try {
      const storageRef = ref(storage, pdfPath);
      const uploadPromise = uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000));
      
      const uploadRes = await Promise.race([uploadPromise, timeoutPromise]) as any;
      pdfUrl = await getDownloadURL(uploadRes.ref);
    } catch (storageErr) {
      console.warn("Storage PDF upload notice or timeout:", storageErr);
    }
  }

  // 3. Update Firestore
  if (db) {
    try {
      const contractRef = doc(db, 'contracts', contractId);
      const updatePayload: Record<string, any> = {
        status: 'downloaded',
        downloadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (pdfUrl) {
        updatePayload.pdfUrl = pdfUrl;
        updatePayload.pdfPath = pdfPath;
      }
      await updateDoc(contractRef, updatePayload);
    } catch (err) {
      console.warn("Firestore markContractDownloaded notice:", err);
    }
  }

  // 4. Send notification
  for (const adminId of OFFICIAL_ADMIN_UIDS) {
    sendNotification({
      recipientId: adminId,
      title: 'تم سحب عقد',
      message: `قام العميل بسحب العقد ${contractCode}.`,
      type: 'contract_downloaded',
      contractId,
    }).catch(() => {});
  }

  return { pdfUrl, pdfPath };
}

// Admin update status
export async function updateContractStatusByAdmin(
  contractId: string, 
  newStatus: ContractStatus
): Promise<void> {
  const localContract = getLocalContracts().find(c => c.contractId === contractId);
  const oldStatus = localContract?.status;
  if (localContract) {
    localContract.status = newStatus;
    localContract.updatedAt = new Date().toISOString();
    saveLocalContract(localContract);
  }

  if (localContract && localContract.clientEmail) {
    queueContractStatusEmail({
      contractId,
      contractCode: localContract.contractCode,
      projectName: localContract.projectName,
      clientName: localContract.clientName || 'العميل',
      clientEmail: localContract.clientEmail,
      newStatus,
      oldStatus,
    }).catch(() => {});
  }

  if (db) {
    try {
      const contractRef = doc(db, 'contracts', contractId);
      await updateDoc(contractRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Firestore updateContractStatus notice:", err);
    }
  }
}

// Admin approve contract (approves after reviewing client voice recording)
export async function approveContractByAdmin(
  contractId: string,
  projectName: string,
  contractCode: string,
  clientId?: string
): Promise<void> {
  const localContract = getLocalContracts().find(c => c.contractId === contractId);
  const now = new Date().toISOString();
  if (localContract) {
    localContract.status = 'approved';
    localContract.verificationStatus = 'verified';
    localContract.verifiedAt = now;
    localContract.approvedAt = now;
    localContract.approvalStatus = 'approved';
    localContract.updatedAt = now;
    saveLocalContract(localContract);
  }

  // Send email to client upon admin approval
  if (localContract && localContract.clientEmail) {
    queueContractStatusEmail({
      contractId,
      contractCode,
      projectName,
      clientName: localContract.clientName || 'العميل',
      clientEmail: localContract.clientEmail,
      newStatus: 'approved',
      oldStatus: 'pending_review',
    }).catch(() => {});
  }

  if (db) {
    try {
      const contractRef = doc(db, 'contracts', contractId);
      await updateDoc(contractRef, {
        status: 'approved',
        verificationStatus: 'verified',
        verifiedAt: now,
        approvedAt: now,
        approvalStatus: 'approved',
        updatedAt: now,
      });
    } catch (err) {
      console.warn("Firestore approveContractByAdmin notice:", err);
    }
  }

  // Send notification to Client that Admin approved their contract and they can now download PDF
  if (clientId) {
    sendNotification({
      recipientId: clientId,
      title: 'تم اعتماد وموافقة العقد',
      message: `تمت موافقة واعتماد المدير على عقد مشروعك (${projectName}) كود: ${contractCode}. يمكنك الآن سحب نسختك الرسمية المعتمدة بصيغة PDF.`,
      type: 'contract_approved',
      contractId,
    }).catch((notifErr) => {
      console.warn("Notification error:", notifErr);
    });
  }
}

// Delete contract by Admin
export async function deleteContractByAdmin(contractId: string): Promise<void> {
  removeLocalContract(contractId);

  if (db) {
    try {
      const contractRef = doc(db, 'contracts', contractId);
      await deleteDoc(contractRef);
    } catch (err) {
      console.warn("Firestore deleteContract notice:", err);
    }
  }
}
