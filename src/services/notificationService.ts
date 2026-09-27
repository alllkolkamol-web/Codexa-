import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { AppNotification, OFFICIAL_ADMIN_UID, OFFICIAL_ADMIN_UIDS, OFFICIAL_ADMIN_EMAILS, UserProfile, Contract } from '../types';

export interface ClientContact {
  id: string; // uid or clientId or email
  name: string;
  email: string;
  phone?: string;
  source: 'account' | 'contract';
  projectNames?: string[];
  role?: string;
}

const LOCAL_CONTRACTS_KEY = 'codexa_local_contracts_store';
const LOCAL_NOTIFICATIONS_KEY = 'codexa_local_notifications_store';

function getLocalContractsList(): Contract[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONTRACTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function getLocalNotificationsList(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalNotification(notif: AppNotification) {
  try {
    const list = getLocalNotificationsList();
    list.unshift(notif);
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (e) {}
}

/**
 * Clean data to guarantee no `undefined` fields reach Firestore addDoc / updateDoc
 */
function sanitizeFirestoreDoc<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      result[key] = val;
    } else {
      result[key] = null;
    }
  }
  return result;
}

/**
 * Subscribe to real-time notifications for the current user (client or admin)
 */
export function subscribeToNotifications(
  userId: string, 
  isAdmin: boolean, 
  callback: (notifications: AppNotification[]) => void,
  userEmail?: string
) {
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
  const cleanUid = userId ? userId.trim() : '';

  if (!db) {
    const localNotifs = getLocalNotificationsList().filter(n => {
      if (isAdmin) return true;
      const recId = (n.recipientId || '').toLowerCase();
      const recEmail = (n.recipientEmail || '').toLowerCase();
      return recId === 'all' || 
             recId === cleanUid.toLowerCase() || 
             (cleanEmail && (recId === cleanEmail || recId === `client_${cleanEmail}` || recEmail === cleanEmail));
    });
    callback(localNotifs);
    return () => {};
  }

  try {
    const notifsRef = collection(db, 'notifications');
    const q = query(notifsRef, limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const notifsMap = new Map<string, AppNotification>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const recId = (data.recipientId || '').trim();
          const recEmail = (data.recipientEmail || '').trim().toLowerCase();
          const recUid = (data.recipientUid || '').trim();

          let isMatch = false;

          if (isAdmin) {
            // Admin sees notifications directed to admin + broadcasts
            isMatch = true;
          } else {
            // Client matching logic
            const isBroadcast = recId === 'all' || data.type === 'admin_broadcast';
            const isUidMatch = cleanUid && (recId === cleanUid || recUid === cleanUid);
            const isEmailMatch = cleanEmail && (
              recId.toLowerCase() === cleanEmail || 
              recId.toLowerCase() === `client_${cleanEmail}` || 
              recEmail === cleanEmail
            );

            isMatch = Boolean(isBroadcast || isUidMatch || isEmailMatch);
          }

          if (isMatch) {
            notifsMap.set(docSnap.id, {
              notificationId: docSnap.id,
              recipientId: data.recipientId,
              recipientName: data.recipientName,
              recipientEmail: data.recipientEmail,
              title: data.title || '',
              message: data.message || '',
              type: data.type || 'general',
              contractId: data.contractId || undefined,
              imageUrl: data.imageUrl || undefined,
              imagePath: data.imagePath || undefined,
              linkUrl: data.linkUrl || undefined,
              senderName: data.senderName,
              senderId: data.senderId,
              createdAt: data.createdAt || new Date().toISOString(),
              read: !!data.read,
              readAt: data.readAt || undefined,
            });
          }
        });

        // Also merge local notifications matching this user
        const localList = getLocalNotificationsList();
        localList.forEach(n => {
          if (!notifsMap.has(n.notificationId)) {
            const recId = (n.recipientId || '').toLowerCase();
            const recEmail = (n.recipientEmail || '').toLowerCase();
            const isBroadcast = recId === 'all' || n.type === 'admin_broadcast';
            const isUidMatch = cleanUid && recId === cleanUid.toLowerCase();
            const isEmailMatch = cleanEmail && (recId === cleanEmail || recId === `client_${cleanEmail}` || recEmail === cleanEmail);
            
            if (isAdmin || isBroadcast || isUidMatch || isEmailMatch) {
              notifsMap.set(n.notificationId, n);
            }
          }
        });

        const notifs = Array.from(notifsMap.values());
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(notifs);
      },
      (error) => {
        console.warn("Notifications subscription warning:", error);
        // Fallback to local
        const localList = getLocalNotificationsList();
        callback(localList);
      }
    );
  } catch (error) {
    console.warn("Failed to subscribe to notifications:", error);
    return () => {};
  }
}

/**
 * Send standard internal notification
 */
export async function sendNotification(notification: {
  recipientId: string;
  title: string;
  message: string;
  type: AppNotification['type'];
  contractId?: string;
  imageUrl?: string;
  imagePath?: string;
  linkUrl?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  senderId?: string;
}) {
  const timestamp = new Date().toISOString();
  const notifData = sanitizeFirestoreDoc({
    recipientId: notification.recipientId,
    recipientName: notification.recipientName || 'عميل',
    recipientEmail: notification.recipientEmail || null,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    contractId: notification.contractId || null,
    imageUrl: notification.imageUrl || null,
    imagePath: notification.imagePath || null,
    linkUrl: notification.linkUrl || null,
    senderName: notification.senderName || 'إدارة Codexa',
    senderId: notification.senderId || OFFICIAL_ADMIN_UID,
    read: false,
    createdAt: timestamp,
  });

  if (db) {
    try {
      await addDoc(collection(db, 'notifications'), notifData);
    } catch (err) {
      console.warn("Failed to send internal notification to Firestore:", err);
    }
  }

  saveLocalNotification({
    ...notifData,
    notificationId: `local_${Date.now()}`,
  } as any);
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const timestamp = new Date().toISOString();

  // Update in local store
  try {
    const localList = getLocalNotificationsList();
    const updated = localList.map(n => n.notificationId === notificationId ? { ...n, read: true, readAt: timestamp } : n);
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {}

  // Update in Firestore
  if (!db || notificationId.startsWith('local_') || notificationId.startsWith('direct_') || notificationId.startsWith('broadcast_')) return;
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: timestamp,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

/**
 * Mark ALL notifications as read by the client
 */
export async function markAllNotificationsAsRead(notifications: AppNotification[]): Promise<void> {
  const timestamp = new Date().toISOString();

  // 1. Update in local storage
  try {
    const localList = getLocalNotificationsList();
    const updated = localList.map(n => ({ ...n, read: true, readAt: timestamp }));
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {}

  // 2. Update in Firestore
  const firestoreDb = db;
  if (!firestoreDb || !notifications.length) return;

  const unreadNotifs = notifications.filter(n => !n.read && !n.notificationId.startsWith('local_') && !n.notificationId.startsWith('direct_') && !n.notificationId.startsWith('broadcast_'));
  
  await Promise.allSettled(
    unreadNotifs.map(n => {
      const notifRef = doc(firestoreDb, 'notifications', n.notificationId);
      return updateDoc(notifRef, {
        read: true,
        readAt: timestamp,
      });
    })
  );
}

/**
 * Delete a notification (Admin only)
 */
export async function deleteNotification(notificationId: string) {
  if (!notificationId) return;

  // 1. Delete from local storage
  try {
    const localList = getLocalNotificationsList();
    const updated = localList.filter(n => n.notificationId !== notificationId);
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {}

  // 2. Delete from Firestore
  const firestoreDb = db;
  if (!firestoreDb) return;

  try {
    const notifRef = doc(firestoreDb, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (err) {
    console.warn("Firestore delete notification warning:", err);
  }
}

/**
 * Fast real-time client lookup by email or UID across registered users and contracts
 */
export async function lookupClientByEmail(rawInput: string): Promise<ClientContact | null> {
  const input = rawInput.trim();
  const email = input.toLowerCase();
  if (!input) return null;

  // 1. Check local contracts cache
  const localContracts = getLocalContractsList();
  const matchedLocal = localContracts.find(c => 
    (c.clientEmail && c.clientEmail.trim().toLowerCase() === email) ||
    c.clientId === input
  );
  if (matchedLocal) {
    return {
      id: matchedLocal.clientId || (matchedLocal.clientEmail ? `client_${matchedLocal.clientEmail}` : input),
      name: matchedLocal.clientName || input.split('@')[0],
      email: matchedLocal.clientEmail || '',
      phone: matchedLocal.clientPhone || '',
      source: 'contract',
      projectNames: matchedLocal.projectName ? [matchedLocal.projectName] : [],
    };
  }

  // 2. Query Firestore users collection
  if (db) {
    try {
      if (email.includes('@')) {
        const usersQ = query(collection(db, 'users'), where('email', '==', email), limit(1));
        const userSnap = await getDocs(usersQ);
        if (!userSnap.empty) {
          const u = userSnap.docs[0].data() as UserProfile;
          return {
            id: userSnap.docs[0].id || u.uid,
            name: u.displayName || u.email?.split('@')[0] || 'عميل مسجل',
            email: u.email || '',
            phone: u.phoneNumber || '',
            source: 'account',
            role: u.role,
          };
        }
      } else {
        const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', input), limit(1)));
        if (!snap.empty) {
          const u = snap.docs[0].data() as UserProfile;
          return {
            id: snap.docs[0].id || u.uid,
            name: u.displayName || u.email?.split('@')[0] || 'عميل مسجل',
            email: u.email || '',
            phone: u.phoneNumber || '',
            source: 'account',
            role: u.role,
          };
        }
      }
    } catch (e) {
      console.warn("Lookup client user error:", e);
    }

    // 3. Query Firestore contracts collection
    try {
      if (email.includes('@')) {
        const contractsQ = query(collection(db, 'contracts'), where('clientEmail', '==', email), limit(1));
        const contractSnap = await getDocs(contractsQ);
        if (!contractSnap.empty) {
          const c = contractSnap.docs[0].data() as Contract;
          return {
            id: c.clientId || `client_${email}`,
            name: c.clientName || email.split('@')[0],
            email: c.clientEmail || email,
            phone: c.clientPhone || '',
            source: 'contract',
            projectNames: c.projectName ? [c.projectName] : [],
          };
        }
      }
    } catch (e) {
      console.warn("Lookup client contract error:", e);
    }
  }

  return null;
}

/**
 * Fetch unified list of all clients for admin:
 * Combines registered users from `users` collection AND clients from `contracts` collection + local store.
 */
export async function fetchUnifiedClientsForAdmin(): Promise<ClientContact[]> {
  const clientMap = new Map<string, ClientContact>();

  // 1. Fetch from users collection
  if (db) {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        const uid = u.uid || d.id;
        const email = (u.email || '').trim().toLowerCase();
        
        // Exclude system admin from client list
        if (uid === OFFICIAL_ADMIN_UID || email === 'codexacode@gmail.com') return;

        const key = email || uid;
        clientMap.set(key, {
          id: uid,
          name: u.displayName || (email ? email.split('@')[0] : 'مستخدم مسجل بالمنظومة'),
          email: u.email || '',
          phone: u.phoneNumber || '',
          source: 'account',
          role: u.role || 'client',
          projectNames: [],
        });
      });
    } catch (err) {
      console.warn("Error fetching users for admin contacts:", err);
    }

    // 2. Fetch from contracts collection in Firestore
    try {
      const contractsSnap = await getDocs(collection(db, 'contracts'));
      contractsSnap.forEach((d) => {
        const c = d.data() as Contract;
        const email = (c.clientEmail || '').trim().toLowerCase();
        const uid = c.clientId || '';
        const name = c.clientName || email || 'عميل عقد';
        const key = email || uid || d.id;

        if (clientMap.has(key)) {
          const existing = clientMap.get(key)!;
          if (c.projectName && !existing.projectNames?.includes(c.projectName)) {
            existing.projectNames = [...(existing.projectNames || []), c.projectName];
          }
          if (!existing.phone && c.clientPhone) {
            existing.phone = c.clientPhone;
          }
          if (uid && existing.id.startsWith('client_')) {
            existing.id = uid;
          }
        } else {
          clientMap.set(key, {
            id: uid || (email ? `client_${email}` : d.id),
            name,
            email: c.clientEmail || '',
            phone: c.clientPhone || '',
            source: 'contract',
            projectNames: c.projectName ? [c.projectName] : [],
          });
        }
      });
    } catch (err) {
      console.warn("Error fetching contracts for admin contacts:", err);
    }
  }

  // 3. Merge local storage contracts
  const localContracts = getLocalContractsList();
  localContracts.forEach((c) => {
    const email = (c.clientEmail || '').trim().toLowerCase();
    const uid = c.clientId || '';
    const key = email || uid;
    if (!key) return;

    const name = c.clientName || email || 'عميل';
    if (clientMap.has(key)) {
      const existing = clientMap.get(key)!;
      if (c.projectName && !existing.projectNames?.includes(c.projectName)) {
        existing.projectNames = [...(existing.projectNames || []), c.projectName];
      }
      if (!existing.phone && c.clientPhone) {
        existing.phone = c.clientPhone;
      }
    } else {
      clientMap.set(key, {
        id: uid || (email ? `client_${email}` : `client_${Date.now()}`),
        name,
        email: c.clientEmail || '',
        phone: c.clientPhone || '',
        source: 'contract',
        projectNames: c.projectName ? [c.projectName] : [],
      });
    }
  });

  const result = Array.from(clientMap.values());
  result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return result;
}

/**
 * Fetch all registered users for admin selection
 */
export async function fetchRegisteredUsersForAdmin(): Promise<UserProfile[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users'), limit(150));
    const snap = await getDocs(q);
    const users: UserProfile[] = [];
    snap.forEach((docSnap) => {
      users.push(docSnap.data() as UserProfile);
    });
    return users;
  } catch (err) {
    console.warn("Could not fetch registered users for admin:", err);
    return [];
  }
}

/**
 * Fetch all sent notifications for Admin management (with real-time read status tracking)
 */
export async function getAllNotificationsForAdmin(): Promise<AppNotification[]> {
  const notifsMap = new Map<string, AppNotification>();

  // From Firestore
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        notifsMap.set(docSnap.id, {
          notificationId: docSnap.id,
          recipientId: data.recipientId,
          recipientName: data.recipientName,
          recipientEmail: data.recipientEmail || undefined,
          title: data.title || '',
          message: data.message || '',
          type: data.type || 'general',
          contractId: data.contractId || undefined,
          imageUrl: data.imageUrl || undefined,
          imagePath: data.imagePath || undefined,
          linkUrl: data.linkUrl || undefined,
          senderName: data.senderName,
          senderId: data.senderId,
          createdAt: data.createdAt || new Date().toISOString(),
          read: !!data.read,
          readAt: data.readAt || undefined,
        });
      });
    } catch (err) {
      console.warn("Error fetching all notifications for admin:", err);
    }
  }

  // From local storage
  const localList = getLocalNotificationsList();
  localList.forEach(n => {
    if (!notifsMap.has(n.notificationId)) {
      notifsMap.set(n.notificationId, n);
    }
  });

  const notifs = Array.from(notifsMap.values());
  notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return notifs;
}

/**
 * Compress an image file to Base64 data URL (< 60KB) for instant, 0-hang transfer
 */
export function compressImageToBase64(file: File, maxWidth = 550, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    // Safety timeout to prevent any freeze
    const safetyTimeout = setTimeout(() => {
      resolve('');
    }, 1200);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = (e.target?.result as string) || '';
        try {
          const img = new Image();
          img.onload = () => {
            clearTimeout(safetyTimeout);
            try {
              let width = img.width || maxWidth;
              let height = img.height || maxWidth;
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(rawResult);
                return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', quality));
            } catch {
              resolve(rawResult);
            }
          };
          img.onerror = () => {
            clearTimeout(safetyTimeout);
            resolve(rawResult);
          };
          img.src = rawResult;
        } catch {
          clearTimeout(safetyTimeout);
          resolve(rawResult);
        }
      };
      reader.onerror = () => {
        clearTimeout(safetyTimeout);
        resolve('');
      };
      reader.readAsDataURL(file);
    } catch {
      clearTimeout(safetyTimeout);
      resolve('');
    }
  });
}

/**
 * Upload image for notification (Fast instant base64 data encoding)
 */
export async function uploadNotificationImage(file: File): Promise<{ imageUrl: string; imagePath?: string }> {
  if (!file) return { imageUrl: '' };
  const base64Url = await compressImageToBase64(file);
  return { imageUrl: base64Url };
}

/**
 * Send Admin Notification: purely INTERNAL in-app notification (real-time to all or targeted)
 */
export async function sendAdminNotification(params: {
  recipientType: 'all' | 'single';
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  imageUrl?: string;
  imagePath?: string;
  linkUrl?: string;
  senderName?: string;
  senderId?: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  const cleanTitle = params.title.trim();
  const cleanMessage = params.message.trim();

  if (!cleanTitle) {
    throw new Error('يرجى كتابة عنوان للإشعار.');
  }
  if (!cleanMessage) {
    throw new Error('يرجى كتابة نص الإشعار.');
  }

  const timestamp = new Date().toISOString();

  try {
    if (params.recipientType === 'all') {
      // Internal broadcast to all users in app
      const rawDoc = {
        recipientId: 'all',
        recipientName: 'جميع المستخدمين والعملاء',
        recipientEmail: null,
        title: cleanTitle,
        message: cleanMessage,
        type: 'admin_broadcast' as const,
        imageUrl: params.imageUrl ? params.imageUrl.trim() : null,
        imagePath: params.imagePath ? params.imagePath.trim() : null,
        linkUrl: params.linkUrl ? params.linkUrl.trim() : null,
        senderName: params.senderName || 'إدارة Codexa',
        senderId: params.senderId || OFFICIAL_ADMIN_UID,
        read: false,
        readAt: null,
        createdAt: timestamp,
      };

      const notifDoc = sanitizeFirestoreDoc(rawDoc);

      let firestoreWritten = false;
      if (db) {
        try {
          await addDoc(collection(db, 'notifications'), notifDoc);
          firestoreWritten = true;
        } catch (dbErr: any) {
          console.warn("Firestore notification broadcast write note:", dbErr);
        }
      }
      saveLocalNotification({
        ...notifDoc,
        notificationId: `broadcast_${Date.now()}`,
      } as any);

      return { success: true, count: 1 };
    } else {
      // Targeted internal notification to specific client
      const rawEmail = (params.recipientEmail || '').trim().toLowerCase();
      const rawId = (params.recipientId || '').trim();
      const targetId = rawEmail || rawId;

      if (!targetId) {
        throw new Error('يرجى تحديد العميل المستلم أو إدخال بريده الإلكتروني أو المعرّف.');
      }

      let resolvedName = params.recipientName || 'عميل مخصص';
      let resolvedUid: string | null = null;
      if (rawEmail) {
        const clientInfo = await lookupClientByEmail(rawEmail);
        if (clientInfo && clientInfo.name) {
          resolvedName = clientInfo.name;
          if (clientInfo.id && !clientInfo.id.startsWith('client_')) {
            resolvedUid = clientInfo.id;
          }
        }
      }
      if (!resolvedUid && rawId && rawId !== rawEmail && !rawId.startsWith('client_')) {
        resolvedUid = rawId;
      }

      const rawDoc = {
        recipientId: rawEmail || targetId,
        recipientName: resolvedName,
        recipientEmail: rawEmail || null,
        recipientUid: resolvedUid,
        title: cleanTitle,
        message: cleanMessage,
        type: 'admin_direct' as const,
        imageUrl: params.imageUrl ? params.imageUrl.trim() : null,
        imagePath: params.imagePath ? params.imagePath.trim() : null,
        linkUrl: params.linkUrl ? params.linkUrl.trim() : null,
        senderName: params.senderName || 'إدارة Codexa',
        senderId: params.senderId || OFFICIAL_ADMIN_UID,
        read: false,
        readAt: null,
        createdAt: timestamp,
      };

      const notifDoc = sanitizeFirestoreDoc(rawDoc);

      if (db) {
        try {
          await addDoc(collection(db, 'notifications'), notifDoc);
        } catch (dbErr: any) {
          console.warn("Firestore notification direct write note:", dbErr);
        }
      }
      saveLocalNotification({
        ...notifDoc,
        notificationId: `direct_${Date.now()}`,
      } as any);

      // If distinct UID also exists, send directly to UID as well
      if (rawId && rawId !== rawEmail && !rawId.startsWith('client_') && db) {
        const uidDoc = sanitizeFirestoreDoc({
          ...rawDoc,
          recipientId: rawId,
        });
        addDoc(collection(db, 'notifications'), uidDoc).catch(() => {});
      }

      return { success: true, count: 1 };
    }
  } catch (err: any) {
    console.error("sendAdminNotification error:", err);
    throw err;
  }
}
