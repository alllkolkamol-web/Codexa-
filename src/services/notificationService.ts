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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase/config';
import { AppNotification, OFFICIAL_ADMIN_UID, OFFICIAL_ADMIN_UIDS, UserProfile, Contract } from '../types';

export interface ClientContact {
  id: string; // uid or clientId or email
  name: string;
  email: string;
  phone?: string;
  source: 'account' | 'contract';
  projectNames?: string[];
  role?: string;
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
  if (!db) {
    return () => {};
  }
  try {
    const notifsRef = collection(db, 'notifications');
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    
    // For admin: notifications directed to admin
    // For clients: notifications directed to their specific userId OR userEmail OR broadcast to 'all'
    const adminTargets = Array.from(new Set([userId, cleanEmail, OFFICIAL_ADMIN_UID, ...OFFICIAL_ADMIN_UIDS, 'admin'])).filter(Boolean).slice(0, 10);
    const clientTargets = Array.from(new Set([userId, cleanEmail, 'all'])).filter(Boolean).slice(0, 10);

    const q = isAdmin 
      ? query(notifsRef, where('recipientId', 'in', adminTargets), limit(50))
      : query(notifsRef, where('recipientId', 'in', clientTargets), limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        const notifs: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notifs.push({
            notificationId: docSnap.id,
            recipientId: data.recipientId,
            recipientName: data.recipientName,
            recipientEmail: data.recipientEmail,
            title: data.title || '',
            message: data.message || '',
            type: data.type || 'general',
            contractId: data.contractId,
            imageUrl: data.imageUrl,
            imagePath: data.imagePath,
            linkUrl: data.linkUrl,
            senderName: data.senderName,
            senderId: data.senderId,
            createdAt: data.createdAt || new Date().toISOString(),
            read: !!data.read,
            readAt: data.readAt,
          });
        });
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(notifs);
      },
      (error) => {
        console.warn("Notifications subscription error:", error);
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
  if (!db) return;
  try {
    const notifData = {
      ...notification,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'notifications'), notifData);
  } catch (err) {
    console.warn("Failed to send internal notification:", err);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  if (!db) return;
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

/**
 * Delete a notification (Admin only)
 */
export async function deleteNotification(notificationId: string) {
  if (!db) return;
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${notificationId}`);
  }
}

/**
 * Fetch unified list of all clients for admin:
 * Combines registered users from `users` collection AND clients from `contracts` collection.
 */
export async function fetchUnifiedClientsForAdmin(): Promise<ClientContact[]> {
  if (!db) return [];

  const clientMap = new Map<string, ClientContact>();

  // 1. Fetch from users collection
  try {
    const usersQ = query(collection(db, 'users'), limit(150));
    const usersSnap = await getDocs(usersQ);
    usersSnap.forEach((d) => {
      const u = d.data() as UserProfile;
      if (u.role !== 'admin' && u.email) {
        const key = u.email.trim().toLowerCase();
        clientMap.set(key, {
          id: u.uid,
          name: u.displayName || u.email.split('@')[0],
          email: u.email.trim(),
          phone: u.phoneNumber || '',
          source: 'account',
          role: u.role,
          projectNames: [],
        });
      }
    });
  } catch (err) {
    console.warn("Error fetching users for admin contacts:", err);
  }

  // 2. Fetch from contracts collection to discover all contracted clients
  try {
    const contractsQ = query(collection(db, 'contracts'), limit(150));
    const contractsSnap = await getDocs(contractsQ);
    contractsSnap.forEach((d) => {
      const c = d.data() as Contract;
      const email = (c.clientEmail || '').trim().toLowerCase();
      const name = c.clientName || email || 'عميل';
      const id = c.clientId || (email ? `client_${email}` : d.id);

      if (email) {
        if (clientMap.has(email)) {
          const existing = clientMap.get(email)!;
          if (c.projectName && !existing.projectNames?.includes(c.projectName)) {
            existing.projectNames = [...(existing.projectNames || []), c.projectName];
          }
        } else {
          clientMap.set(email, {
            id,
            name,
            email,
            phone: c.clientPhone || '',
            source: 'contract',
            projectNames: c.projectName ? [c.projectName] : [],
          });
        }
      } else if (id && !clientMap.has(id)) {
        clientMap.set(id, {
          id,
          name,
          email: '',
          phone: c.clientPhone || '',
          source: 'contract',
          projectNames: c.projectName ? [c.projectName] : [],
        });
      }
    });
  } catch (err) {
    console.warn("Error fetching contracts for admin contacts:", err);
  }

  const result = Array.from(clientMap.values());
  result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return result;
}

/**
 * Fetch all registered users for admin selection (backward compatibility)
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
 * Fetch all sent notifications for Admin management
 */
export async function getAllNotificationsForAdmin(): Promise<AppNotification[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const notifs: AppNotification[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      notifs.push({
        notificationId: docSnap.id,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        title: data.title || '',
        message: data.message || '',
        type: data.type || 'general',
        contractId: data.contractId,
        imageUrl: data.imageUrl,
        imagePath: data.imagePath,
        linkUrl: data.linkUrl,
        senderName: data.senderName,
        senderId: data.senderId,
        createdAt: data.createdAt || new Date().toISOString(),
        read: !!data.read,
        readAt: data.readAt,
      });
    });
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifs;
  } catch (err) {
    console.warn("Error fetching all notifications for admin:", err);
    return [];
  }
}

/**
 * Compress an image file to Base64 data URL (< 70KB) for instant, fail-proof transfer
 */
export function compressImageToBase64(file: File, maxWidth = 640, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image for notification (Storage with fast 3.5s timeout + aggressive lightweight Base64 fallback)
 */
export async function uploadNotificationImage(file: File): Promise<{ imageUrl: string; imagePath?: string }> {
  if (!file) throw new Error('الملف غير موجود');

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
  const fileName = `${Date.now()}_${cleanName || 'notif_image.jpg'}`;
  const imagePath = `notificationImages/${fileName}`;

  if (storage) {
    try {
      const storageRef = ref(storage, imagePath);
      const uploadPromise = uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout')), 3500)
      );
      const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
      const imageUrl = await getDownloadURL(snapshot.ref);
      return { imageUrl, imagePath };
    } catch (storageErr) {
      console.warn("Storage upload timed out or failed, using ultra-light base64 fallback:", storageErr);
    }
  }

  // Fallback to compressed base64
  const base64Url = await compressImageToBase64(file);
  return { imageUrl: base64Url };
}

/**
 * Send Admin Notification: broadcast to all users OR targeted to a single user
 * Guarantees responsive non-blocking write with strict timeout.
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
  if (!db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

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
      // Broadcast single document with recipientId: 'all'
      // All clients query where recipientId IN [userId, userEmail, 'all'] and receive it instantly!
      const notifDoc = {
        recipientId: 'all',
        recipientName: 'جميع المستخدمين والعملاء',
        title: cleanTitle,
        message: cleanMessage,
        type: 'admin_broadcast',
        imageUrl: params.imageUrl || null,
        imagePath: params.imagePath || null,
        linkUrl: params.linkUrl || null,
        senderName: params.senderName || 'إدارة Codexa',
        senderId: params.senderId || OFFICIAL_ADMIN_UID,
        read: false,
        createdAt: timestamp,
      };

      const savePromise = addDoc(collection(db, 'notifications'), notifDoc);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('استغرقت استجابة قاعدة البيانات وقتاً أطول من المعتاد. يرجى التحقق من الاتصال بالشبكة.')), 8000)
      );
      await Promise.race([savePromise, timeoutPromise]);

      return { success: true, count: 1 };
    } else {
      // Targeted single user by UID or Email
      const targetId = (params.recipientId || params.recipientEmail || '').trim();
      if (!targetId) {
        throw new Error('يرجى تحديد العميل المستلم أو إدخال بريده الإلكتروني.');
      }

      const notifDoc = {
        recipientId: targetId,
        recipientName: params.recipientName || params.recipientEmail || 'عميل محدد',
        recipientEmail: params.recipientEmail ? params.recipientEmail.trim().toLowerCase() : '',
        title: cleanTitle,
        message: cleanMessage,
        type: 'admin_direct',
        imageUrl: params.imageUrl || null,
        imagePath: params.imagePath || null,
        linkUrl: params.linkUrl || null,
        senderName: params.senderName || 'إدارة Codexa',
        senderId: params.senderId || OFFICIAL_ADMIN_UID,
        read: false,
        createdAt: timestamp,
      };

      const savePromise = addDoc(collection(db, 'notifications'), notifDoc);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('استغرقت استجابة قاعدة البيانات وقتاً أطول من المعتاد. يرجى التحقق من الاتصال بالشبكة.')), 8000)
      );
      await Promise.race([savePromise, timeoutPromise]);

      return { success: true, count: 1 };
    }
  } catch (err: any) {
    console.error("sendAdminNotification error:", err);
    throw err;
  }
}
