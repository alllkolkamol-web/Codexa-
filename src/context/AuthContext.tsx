import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fetchSignInMethodsForEmail,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  auth, 
  db, 
  isFirebaseConfigured, 
  saveFirebaseApiKey,
  handleFirestoreError, 
  OperationType 
} from '../firebase/config';
import { 
  UserProfile, 
  UserRole, 
  OFFICIAL_ADMIN_EMAIL, 
  OFFICIAL_ADMIN_UID,
  OFFICIAL_ADMIN_UIDS,
  OFFICIAL_ADMIN_EMAILS
} from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isClient: boolean;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  saveApiKey: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const getCachedProfile = (uid: string): UserProfile | null => {
    try {
      const raw = sessionStorage.getItem(`codexa_user_profile_${uid}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  };

  const setCachedProfile = (uid: string, profile: UserProfile) => {
    try {
      sessionStorage.setItem(`codexa_user_profile_${uid}`, JSON.stringify(profile));
    } catch (e) {}
  };

  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    const isOfficialAdmin = 
      (user.uid === OFFICIAL_ADMIN_UID || OFFICIAL_ADMIN_UIDS.includes(user.uid)) ||
      (!!user.email && OFFICIAL_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()));

    const targetRole: UserRole = isOfficialAdmin ? 'admin' : 'client';

    if (!db) {
      const defaultProf: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: targetRole,
        displayName: user.displayName || user.email?.split('@')[0] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCachedProfile(user.uid, defaultProf);
      return defaultProf;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        if (data.role !== targetRole) {
          const updated: UserProfile = { ...data, role: targetRole };
          await setDoc(userRef, updated, { merge: true });
          setCachedProfile(user.uid, updated);
          return updated;
        }
        setCachedProfile(user.uid, data);
        return data;
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: targetRole,
          displayName: user.displayName || user.email?.split('@')[0] || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setCachedProfile(user.uid, newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn("Could not fetch user profile from Firestore:", err);
      const fallback: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: targetRole,
        displayName: user.displayName || user.email?.split('@')[0] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCachedProfile(user.uid, fallback);
      return fallback;
    }
  };

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth, 
        async (user) => {
          if (user) {
            setCurrentUser(user);
            const cached = getCachedProfile(user.uid);
            if (cached) {
              setUserProfile(cached);
              setLoading(false); // Instant render from cache
            } else {
              setLoading(true);
            }
            try {
              const fresh = await fetchUserProfile(user);
              if (fresh) setUserProfile(fresh);
            } catch (e) {
              console.error("Profile sync error:", e);
            } finally {
              setLoading(false);
            }
          } else {
            setCurrentUser(null);
            setUserProfile(null);
            setLoading(false);
          }
        },
        (authError) => {
          console.warn("Firebase Auth listener error caught gracefully:", authError);
          setLoading(false);
          if (authError.message.includes('api-key') || (authError as any).code === 'auth/invalid-api-key') {
            setError('مفتاح Web API Key الخاص بمشروع Firebase غير مدخل أو غير صالح.');
          }
        }
      );

      return () => unsubscribe();
    } catch (initErr) {
      console.warn("Failed to subscribe to auth state:", initErr);
      setLoading(false);
    }
  }, []);

  const translateAuthError = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';

    if (code.includes('invalid-api-key') || message.includes('auth/invalid-api-key')) {
      return 'مفتاح Web API Key الخاص بمشروع Firebase غير مدخل أو غير صالح. يرجى تزويده في الإعدادات.';
    }
    if (code.includes('user-not-found')) {
      return 'لم تقم بإنشاء حساب، يجب عليك إنشاء حساب أولاً.';
    }
    if (code.includes('wrong-password')) {
      return 'كلمة المرور غير صحيحة.';
    }
    if (code.includes('invalid-credential')) {
      return 'كلمة المرور غير صحيحة أو أن الحساب غير مسجل مسبقاً.';
    }
    if (code.includes('email-already-in-use')) {
      return 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.';
    }
    if (code.includes('weak-password')) {
      return 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور تحتوي على 8 خانات على الأقل مع حروف وأرقام.';
    }
    if (code.includes('invalid-email')) {
      return 'صيغة البريد الإلكتروني غير صالحة.';
    }
    if (code.includes('too-many-requests')) {
      return 'تم حظر المحاولات مؤقتاً لكثرة الطلبات. يرجى الانتظار قليلاً والمحاولة مجدداً.';
    }
    if (code.includes('network-request-failed')) {
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    }
    return 'حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.';
  };

  const login = async (email: string, pass: string) => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      const msg = 'لم يتم ربط مفتاح Firebase Web API بعد. يرجى إضافة المفتاح أولاً.';
      setError(msg);
      throw new Error(msg);
    }
    const cleanEmail = email.trim();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const profile = await fetchUserProfile(cred.user);
      setUserProfile(profile);
    } catch (err: any) {
      const code = err?.code || '';
      let msg = '';

      if (code.includes('user-not-found')) {
        msg = 'لم تقم بإنشاء حساب، يجب عليك إنشاء حساب أولاً.';
      } else if (code.includes('wrong-password')) {
        msg = 'كلمة المرور غير صحيحة.';
      } else if (code.includes('invalid-credential')) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
          if (methods && methods.length > 0) {
            msg = 'كلمة المرور غير صحيحة.';
          } else {
            msg = 'لم تقم بإنشاء حساب، يجب عليك إنشاء حساب أولاً.';
          }
        } catch (checkErr) {
          msg = 'كلمة المرور غير صحيحة أو أنك لم تقم بإنشاء حساب بعد.';
        }
      } else {
        msg = translateAuthError(err);
      }

      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (email: string, pass: string, name?: string, phone?: string) => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      const msg = 'لم يتم ربط مفتاح Firebase Web API بعد. يرجى إضافة المفتاح أولاً.';
      setError(msg);
      throw new Error(msg);
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      
      const isOfficialAdmin = 
        (cred.user.uid === OFFICIAL_ADMIN_UID || OFFICIAL_ADMIN_UIDS.includes(cred.user.uid)) &&
        email.trim().toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase();

      const initialRole: UserRole = isOfficialAdmin ? 'admin' : 'client';

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: email.trim(),
        role: initialRole,
        displayName: name || email.split('@')[0],
        phoneNumber: phone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (db) {
        try {
          await setDoc(doc(db, 'users', cred.user.uid), newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
        }
      }

      setUserProfile(newProfile);
    } catch (err: any) {
      const msg = translateAuthError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setError(null);
    if (auth) {
      await firebaseSignOut(auth);
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  const isAdmin = 
    !!currentUser && 
    (currentUser.uid === OFFICIAL_ADMIN_UID || OFFICIAL_ADMIN_UIDS.includes(currentUser.uid)) &&
    !!currentUser.email && 
    currentUser.email.toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase();

  const isClient = !!currentUser && !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isClient,
        loading,
        isConfigured: isFirebaseConfigured,
        login,
        register,
        logout,
        error,
        clearError,
        saveApiKey: saveFirebaseApiKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
