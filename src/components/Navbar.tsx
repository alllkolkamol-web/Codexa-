import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { OFFICIAL_PHONE, AppNotification } from '../types';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { 
  FileText, 
  User, 
  ShieldCheck, 
  LogOut, 
  Bell, 
  Phone, 
  PlusCircle, 
  Settings,
  Key,
  X,
  Check,
  CheckCheck,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenContract?: (contractId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, onOpenContract }) => {
  const { currentUser, userProfile, isAdmin, logout, isConfigured, saveApiKey } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotifModal, setActiveNotifModal] = useState<AppNotification | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, isAdmin, (notifs) => {
      setNotifications(notifs);
    }, currentUser.email || undefined);
    return () => unsub();
  }, [currentUser, isAdmin]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.notificationId);
    }
    setShowNotifications(false);
    if (notif.imageUrl || notif.type === 'admin_broadcast' || notif.type === 'admin_direct') {
      setActiveNotifModal(notif);
    } else if (notif.contractId && onOpenContract) {
      onOpenContract(notif.contractId);
    } else if (isAdmin) {
      setCurrentView('admin');
    } else {
      setCurrentView('account');
    }
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    if (!apiKeyInput.trim() || apiKeyInput.trim().length < 20) {
      setKeyError('يرجى إدخال مفتاح Web API صالح من Firebase Console.');
      return;
    }
    const ok = saveApiKey(apiKeyInput.trim());
    if (ok) {
      setShowApiKeyModal(false);
    } else {
      setKeyError('فشل حفظ المفتاح. يرجى التأكد من صلاحية المفتاح.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0a1128]/95 backdrop-blur-md border-b border-slate-800/80 text-white">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Brand Logo */}
            <div 
              onClick={() => setCurrentView('home')} 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
            >
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center shadow-lg shadow-blue-900/30 group-hover:scale-105 transition-transform duration-200 border border-blue-500/20">
                <span className="text-lg sm:text-2xl font-black tracking-tighter text-white font-mono">C</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-2xl font-bold tracking-tight text-white font-mono">CODEXA</span>
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">عقود</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">تطوير التطبيقات والمواقع والمنظومات</p>
              </div>
            </div>

            {/* Center Contact */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>الاتصال المباشر:</span>
              <a href="https://wa.me/218920619363" target="_blank" rel="noreferrer" className="font-mono text-blue-300 font-semibold dir-ltr hover:text-blue-100 transition-colors">
                {OFFICIAL_PHONE}
              </a>
            </div>

            {/* Right Navigation & User Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              
              {/* If Firebase Web API key is not yet provided, show a subtle key setup trigger */}
              {!isConfigured && (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 text-[10px] sm:text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 transition-colors"
                  title="إعداد مفتاح Firebase"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">مفتاح Firebase</span>
                </button>
              )}

              {/* If Logged In */}
              {currentUser ? (
                <>
                  {isAdmin ? (
                    <button
                      onClick={() => setCurrentView('admin-new-contract')}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-700/20 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>إنشاء عقد</span>
                    </button>
                  ) : null}

                  {isAdmin ? (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentView === 'admin' ? 'bg-slate-800 text-blue-400 border border-blue-900/50' : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-[11px] sm:text-xs">لوحة الإدارة</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentView('account')}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentView === 'account' ? 'bg-slate-800 text-blue-400 border border-blue-900/50' : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                      <span className="text-[11px] sm:text-xs">حسابي</span>
                    </button>
                  )}

                  {/* Notifications Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-1.5 sm:p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                      title="الإشعارات"
                    >
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 text-[9px] sm:text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                          {unreadCount > 9 ? '+9' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute left-0 mt-2 w-72 sm:w-96 max-w-[calc(100vw-24px)] bg-[#0f172a] rounded-xl border border-slate-700 shadow-2xl overflow-hidden z-50 text-right">
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-white">الإشعارات ({notifications.length})</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await markAllNotificationsAsRead(notifications);
                                  setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>قراءة الكل</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                              لا توجد إشعارات جديدة حالياً
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.notificationId}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3.5 hover:bg-slate-800/80 cursor-pointer transition-colors ${
                                  !notif.read ? 'bg-blue-950/25' : ''
                                }`}
                              >
                                <div className="flex gap-2.5">
                                  {notif.imageUrl && (
                                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 shrink-0 overflow-hidden">
                                      <img src={notif.imageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className={`text-xs font-semibold truncate ${!notif.read ? 'text-blue-300' : 'text-slate-200'}`}>
                                        {notif.title}
                                      </span>
                                      {!notif.read && (
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1"></span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                      {notif.message}
                                    </p>
                                    <span className="text-[10px] text-slate-500 mt-1 block">
                                      {new Date(notif.createdAt).toLocaleString('ar-LY', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        day: 'numeric',
                                        month: 'short',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User profile & logout */}
                  <div className="flex items-center gap-2 pl-2 border-r border-slate-800">
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                        {userProfile?.displayName || currentUser.email?.split('@')[0]}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {isAdmin ? 'مدير النظام' : 'عميل'}
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        await logout();
                        setCurrentView('home');
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="تسجيل الخروج"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView('login')}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => setCurrentView('register')}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-700/20 transition-colors"
                  >
                    إنشاء حساب
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1328] rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">إعداد Web API Key لمشروع Firebase</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              المشروع مضبوط على: <strong className="text-blue-400 font-mono">gen-lang-client-0587198690</strong>.
              يرجى لصق الـ Web API Key الخاص بتطبيق الويب <strong className="text-blue-400 font-mono">codexa</strong> من Firebase Console.
            </p>

            {keyError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs">
                {keyError}
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Web API Key (يبدأ عادةً بـ AIza...)
                </label>
                <input
                  type="text"
                  required
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-700/20"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتفعيل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Notification Modal */}
      {activeNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-right">
          <div className="bg-[#0c1328] rounded-2xl border border-slate-700 max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">إشعار من {activeNotifModal.senderName || 'إدارة Codexa'}</span>
              </div>
              <button
                onClick={() => setActiveNotifModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50 font-semibold">
                  {activeNotifModal.recipientId === 'all' ? 'إشعار عام للجميع' : 'إشعار مخصص لك'}
                </span>
                <span>
                  {new Date(activeNotifModal.createdAt).toLocaleString('ar-LY')}
                </span>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {activeNotifModal.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {activeNotifModal.message}
              </p>

              {activeNotifModal.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50">
                  <img
                    src={activeNotifModal.imageUrl}
                    alt="Notification Attachment"
                    className="w-full max-h-80 object-contain"
                  />
                </div>
              )}

              {activeNotifModal.linkUrl && (
                <div className="pt-2">
                  <a
                    href={activeNotifModal.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>الانتقال إلى الرابط المرفق</span>
                  </a>
                </div>
              )}

              {activeNotifModal.contractId && onOpenContract && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const cid = activeNotifModal.contractId!;
                      setActiveNotifModal(null);
                      onOpenContract(cid);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold border border-blue-900/40 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>عرض العقد المرتبط بهذا الإشعار</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-left">
              <button
                onClick={() => setActiveNotifModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
