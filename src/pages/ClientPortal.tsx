import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Contract, STATUS_LABELS, STATUS_COLORS, AppNotification } from '../types';
import { searchContractByCode, getClientContracts } from '../services/contractService';
import { subscribeToNotifications, markNotificationAsRead } from '../services/notificationService';
import { 
  Search, 
  FileText, 
  DownloadCloud, 
  AlertCircle, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  ShieldCheck,
  Bell,
  Check
} from 'lucide-react';

interface ClientPortalProps {
  onOpenContract: (contractId: string) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onOpenContract }) => {
  const { currentUser, userProfile } = useAuth();
  const [contractCodeInput, setContractCodeInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [downloadedContracts, setDownloadedContracts] = useState<Contract[]>([]);
  const [allMyContracts, setAllMyContracts] = useState<Contract[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'downloaded' | 'all' | 'notifications'>('search');

  useEffect(() => {
    if (!currentUser) return;
    loadClientContracts();
    const unsub = subscribeToNotifications(currentUser.uid, false, (notifs) => {
      setNotifications(notifs);
    }, currentUser.email || undefined);
    return () => unsub();
  }, [currentUser]);

  const loadClientContracts = async () => {
    if (!currentUser) return;
    setLoadingContracts(true);
    try {
      const contracts = await getClientContracts(currentUser.uid, currentUser.email || undefined);
      setAllMyContracts(contracts);
      setDownloadedContracts(contracts.filter((c) => c.status === 'downloaded'));
    } catch (err) {
      console.warn("Could not load client contracts list:", err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    const code = contractCodeInput.trim().toUpperCase();
    if (!code) {
      setSearchError('يرجى إدخال كود العقد أولاً.');
      return;
    }

    if (!currentUser) {
      setSearchError('يرجى تسجيل الدخول للبحث عن العقد.');
      return;
    }

    setSearchLoading(true);
    try {
      const contract = await searchContractByCode(code, currentUser.uid, false, currentUser.email || undefined);
      // Valid contract belonging to this client found!
      onOpenContract(contract.contractId);
    } catch (err: any) {
      // Error message will strictly be: "لم يتم العثور على عقد بهذا الكود." or "لا يمكنك الوصول إلى هذا العقد."
      setSearchError(err.message || 'تعذر الوصول إلى العقد.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6">
      
      {/* Welcome greeting */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          أهلاً بك، {userProfile?.displayName || currentUser?.email?.split('@')[0]}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          بوابة العقود الإلكترونية الرسمية لشركة Codexa
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-8 space-x-2 space-x-reverse text-xs">
        <button
          onClick={() => setActiveTab('search')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'search'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>البحث عن عقد</span>
        </button>

        <button
          onClick={() => setActiveTab('downloaded')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'downloaded'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DownloadCloud className="w-4 h-4" />
          <span>العقود المسحوبة ({downloadedContracts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'all'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>جميع عقودي ({allMyContracts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>الإشعارات والرسائل ({notifications.length})</span>
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
              {notifications.filter((n) => !n.read).length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Search Tab */}
      {activeTab === 'search' && (
        <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 sm:p-10 shadow-xl">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-blue-400">
              <Search className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">الوصول إلى عقدك البرمجي</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              أدخل كود العقد المخصص لمشروعك البرمجي كما تم استلامه من إدارة شركة Codexa.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="relative flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={contractCodeInput}
                  onChange={(e) => setContractCodeInput(e.target.value)}
                  placeholder="اكتب كود عقدك (مثال: CDX-2026-7F4K92)"
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors uppercase tracking-wider text-center sm:text-right"
                  autoComplete="off"
                />
                <Search className="w-5 h-5 text-slate-500 absolute right-4 top-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={searchLoading}
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-700/20 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                {searchLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>بحث</span>
                    <Search className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Search Error Alert */}
          {searchError && (
            <div className="max-w-xl mx-auto mt-6 p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span className="font-medium">{searchError}</span>
            </div>
          )}

          {/* Explanatory note */}
          <div className="max-w-xl mx-auto mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>صيغة الكود: CDX-YYYY-XXXXXX</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>تحقق آمن ومحمي بالصلاحيات</span>
            </span>
          </div>

        </div>
      )}

      {/* TAB 2: Downloaded Contracts */}
      {activeTab === 'downloaded' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">العقود التي تم سحب نسختها النهائية (PDF)</h3>
            <span className="text-xs text-slate-400">{downloadedContracts.length} عقد</span>
          </div>

          {loadingContracts ? (
            <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل العقود المسحوبة...</div>
          ) : downloadedContracts.length === 0 ? (
            <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-8 text-center">
              <DownloadCloud className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">لا توجد عقود مسحوبة حتى الآن</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                عند إكمال قراءة العقد والإقرار الصوتي والموافقة عليه ثم سحب ملف الـ PDF، سيظهر العقد هنا في هذا القسم دائماً.
              </p>
            </div>
          ) : (
            downloadedContracts.map((contract) => (
              <div
                key={contract.contractId}
                onClick={() => onOpenContract(contract.contractId)}
                className="bg-[#0c1328] hover:bg-slate-900/80 transition-colors rounded-xl border border-slate-800 p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                      {contract.contractCode}
                    </span>
                    <span className="text-xs text-slate-400">| {contract.contractType}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{contract.projectName}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>تاريخ السحب: {contract.downloadedAt ? new Date(contract.downloadedAt).toLocaleDateString('ar-EG') : '-'}</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {contract.totalAmount || contract.amount} {contract.currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/50">
                    تم سحب العقد
                  </span>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors">
                    <span>عرض العقد</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: All My Contracts */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">كافة العقود المرتبطة بحسابك</h3>
            <span className="text-xs text-slate-400">{allMyContracts.length} عقد</span>
          </div>

          {loadingContracts ? (
            <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل العقود...</div>
          ) : allMyContracts.length === 0 ? (
            <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-8 text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">لم يتم ربط أي عقد بحسابك بعد</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                إذا تم تزويدك بكود عقد جديد من قبل إدارة شركة Codexa، يمكنك البحث عنه في تبويب "البحث عن عقد".
              </p>
            </div>
          ) : (
            allMyContracts.map((contract) => {
              const statusStyle = STATUS_COLORS[contract.status] || STATUS_COLORS.draft;
              return (
                <div
                  key={contract.contractId}
                  onClick={() => onOpenContract(contract.contractId)}
                  className="bg-[#0c1328] hover:bg-slate-900/80 transition-colors rounded-xl border border-slate-800 p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                        {contract.contractCode}
                      </span>
                      <span className="text-xs text-slate-400">| {contract.contractType}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{contract.projectName}</h4>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                      <span>تاريخ العقد: {contract.contractDate}</span>
                      <span className="text-blue-400 font-semibold">
                        {contract.totalAmount || contract.amount} {contract.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                      {STATUS_LABELS[contract.status]}
                    </span>
                    <button className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs flex items-center gap-1.5 transition-colors border border-blue-500/30">
                      <span>عرض</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span>الإشعارات والرسائل المستلمة من إدارة المنظومة</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {notifications.length} إشعار
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
              <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">لا توجد إشعارات حالياً</h4>
              <p className="text-xs text-slate-500 mt-1">ستصلك هنا كافة التنبيهات والرسائل الرسمية من إدارة Codexa.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.notificationId}
                className={`bg-[#0c1328] rounded-2xl border transition-all p-5 ${
                  !notif.read ? 'border-blue-700/80 bg-blue-950/20 shadow-lg shadow-blue-950/30' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/60 text-[10px] font-semibold">
                      {notif.senderName || 'إدارة Codexa'}
                    </span>
                    {!notif.read && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        جديد
                      </span>
                    )}
                    {notif.recipientId === 'all' && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-700 text-[10px]">
                        إشعار عام للجميع
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">
                      {new Date(notif.createdAt).toLocaleDateString('ar-LY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {!notif.read && (
                      <button
                        onClick={async () => {
                          await markNotificationAsRead(notif.notificationId);
                          setNotifications((prev) =>
                            prev.map((n) =>
                              n.notificationId === notif.notificationId ? { ...n, read: true } : n
                            )
                          );
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                  {notif.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {notif.message}
                </p>

                {/* Attached Image */}
                {notif.imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 max-w-lg bg-black/40">
                    <img
                      src={notif.imageUrl}
                      alt="مرفق الإشعار"
                      className="w-full max-h-80 object-contain hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}

                {/* Actions / Links */}
                {(notif.linkUrl || notif.contractId) && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-3 flex-wrap">
                    {notif.linkUrl && (
                      <a
                        href={notif.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الرابط المرفق</span>
                      </a>
                    )}
                    {notif.contractId && (
                      <button
                        onClick={() => onOpenContract(notif.contractId!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-blue-900/40 text-blue-300 text-xs font-semibold transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>الانتقال للعقد المرتبط</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
