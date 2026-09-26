import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Contract, ContractStatus, STATUS_LABELS, STATUS_COLORS } from '../../types';
import { 
  getAllContractsForAdmin, 
  deleteContractByAdmin,
  updateContractStatusByAdmin 
} from '../../services/contractService';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  FileText, 
  DownloadCloud, 
  Eye, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  Bell,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { AdminNotifications } from './AdminNotifications';

interface AdminDashboardProps {
  onOpenContract: (contractId: string) => void;
  onNavigateNew: () => void;
  onExit?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenContract, onNavigateNew, onExit }) => {
  const { logout } = useAuth();
  const [dashboardTab, setDashboardTab] = useState<'contracts' | 'notifications'>('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadAllContracts();
  }, []);

  const loadAllContracts = async () => {
    setLoading(true);
    try {
      const data = await getAllContractsForAdmin();
      setContracts(data);
    } catch (err) {
      console.warn("Failed to load contracts for admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (contract: Contract) => {
    setDeletingId(contract.contractId);
    setConfirmDeleteId(null);
    try {
      setContracts((prev) => prev.filter((c) => c.contractId !== contract.contractId));
      await deleteContractByAdmin(contract.contractId);
    } catch (err: any) {
      console.warn("Delete contract error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickStatusChange = async (contractId: string, newStatus: ContractStatus) => {
    setUpdatingId(contractId);
    try {
      setContracts((prev) => prev.map((c) => c.contractId === contractId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c));
      await updateContractStatusByAdmin(contractId, newStatus);
    } catch (err: any) {
      alert('فشل تحديث الحالة: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Normalize Arabic letters and characters for forgiving search
  const normalize = (txt?: string): string => {
    if (!txt) return '';
    return txt
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '');
  };

  // Direct code jump
  const handleDirectJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const term = normalize(searchTerm);
    const matched = contracts.find(c => 
      normalize(c.contractCode).includes(term) ||
      normalize(c.contractId) === term ||
      normalize(c.clientEmail).includes(term)
    );
    if (matched) {
      onOpenContract(matched.contractId);
    }
  };

  // Filter contracts by status and search terms
  const filteredContracts = contracts.filter((c) => {
    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    // Search query filter
    if (searchTerm.trim()) {
      const term = normalize(searchTerm);
      const matchCode = normalize(c.contractCode).includes(term);
      const matchClient = normalize(c.clientName).includes(term);
      const matchEmail = normalize(c.clientEmail).includes(term);
      const matchPhone = normalize(c.clientPhone).includes(term);
      const matchProject = normalize(c.projectName).includes(term);
      const matchType = normalize(c.contractType).includes(term);
      const matchId = normalize(c.contractId).includes(term);
      const matchAmount = String(c.totalAmount || c.amount).includes(term);
      return matchCode || matchClient || matchEmail || matchPhone || matchProject || matchType || matchId || matchAmount;
    }
    return true;
  });

  const countByStatus = (status: ContractStatus) => {
    return contracts.filter((c) => c.status === status).length;
  };

  // Secure CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredContracts || filteredContracts.length === 0) {
      alert('لا توجد عقود متاحة للتصدير حالياً.');
      return;
    }

    const sanitizeForCSV = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim().replace(/[\r\n]+/g, ' ');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'` + str;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'كود العقد',
      'اسم العميل',
      'البريد الإلكتروني',
      'رقم الهاتف',
      'اسم المشروع',
      'نوع العقد',
      'المبلغ',
      'العملة',
      'حالة العقد',
      'تاريخ العقد',
      'مدة التنفيذ',
      'حالة التسجيل الصوتي',
      'تاريخ الاعتماد',
      'تاريخ السحب',
      'تاريخ الإنشاء'
    ];

    const rows = filteredContracts.map((c) => [
      sanitizeForCSV(c.contractCode),
      sanitizeForCSV(c.clientName),
      sanitizeForCSV(c.clientEmail),
      sanitizeForCSV(c.clientPhone || ''),
      sanitizeForCSV(c.projectName),
      sanitizeForCSV(c.contractType || 'تطوير منظومة وقواعد بيانات'),
      sanitizeForCSV(c.totalAmount || c.amount),
      sanitizeForCSV(c.currency || 'د.ل'),
      sanitizeForCSV(STATUS_LABELS[c.status] || c.status),
      sanitizeForCSV(c.contractDate),
      sanitizeForCSV(c.duration),
      sanitizeForCSV(c.recordingUrl ? 'تم التسجيل الصوتي' : 'لم يتم التسجيل'),
      sanitizeForCSV(c.approvedAt || 'غير معتمد بعد'),
      sanitizeForCSV(c.downloadedAt || 'لم يسحب بعد'),
      sanitizeForCSV(c.createdAt)
    ]);

    const csvContent = '\uFEFF' + [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Codexa_Contracts_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/40">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              لوحة تحكم المدير الرسمي
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            إدارة ومراجعة العقود، البحث الفوري، تعديل الحالات، وإرسال الإشعارات للعملاء
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadAllContracts}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-semibold text-xs shadow-md disabled:opacity-50 transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || contracts.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 hover:text-emerald-300 font-bold text-xs shadow-md disabled:opacity-50 transition-all"
            title="تصدير قائمة العقود الحالية إلى ملف CSV"
          >
            <DownloadCloud className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </button>

          <button
            onClick={onNavigateNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-700/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إنشاء عقد جديد</span>
          </button>

          <button
            onClick={async () => {
              if (onExit) {
                onExit();
              } else {
                const confirmExit = window.confirm('هل ترغب في الخروج من لوحة تحكم المدير وتسجيل الخروج؟');
                if (confirmExit) {
                  await logout();
                  window.location.href = '/login';
                }
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white font-bold text-xs shadow-lg shadow-red-950/30 transition-all"
            title="الخروج من لوحة تحكم المدير"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>خروج من اللوحة</span>
          </button>
        </div>
      </div>

      {/* Dashboard Section Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4 mb-8">
        <button
          type="button"
          onClick={() => setDashboardTab('contracts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            dashboardTab === 'contracts'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-700/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>سجل وإدارة العقود ({contracts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            dashboardTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-700/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-400" />
          <span>مركز الإشعارات والرسائل للعملاء</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">إرسال عام / مخصص</span>
        </button>
      </div>

      {dashboardTab === 'notifications' ? (
        <AdminNotifications />
      ) : (
        <>
          {/* Status Counters Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'all' ? 'bg-blue-950/40 border-blue-600' : 'bg-[#0c1328] border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-slate-400 block mb-1">جميع العقود</span>
          <span className="text-xl font-bold text-white font-mono">{contracts.length}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('waiting_client')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'waiting_client' ? 'bg-blue-950/40 border-blue-600' : 'bg-[#0c1328] border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-blue-400 block mb-1">بانتظار العميل</span>
          <span className="text-xl font-bold text-blue-300 font-mono">{countByStatus('waiting_client')}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('pending_review')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'pending_review' ? 'bg-amber-950/40 border-amber-600' : 'bg-[#0c1328] border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-amber-400 block mb-1">قيد المراجعة</span>
          <span className="text-xl font-bold text-amber-300 font-mono">{countByStatus('pending_review')}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'approved' ? 'bg-emerald-950/40 border-emerald-600' : 'bg-[#0c1328] border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-emerald-400 block mb-1">تمت الموافقة</span>
          <span className="text-xl font-bold text-emerald-300 font-mono">{countByStatus('approved')}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('completed')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'completed' ? 'bg-cyan-950/40 border-cyan-600' : 'bg-[#0c1328] border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-cyan-400 block mb-1">المكتملة</span>
          <span className="text-xl font-bold text-cyan-300 font-mono">{countByStatus('completed')}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('downloaded')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'downloaded' ? 'bg-purple-950/40 border-purple-600' : 'bg-[#0c1328] border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-purple-400 block mb-1">المسحوبة (PDF)</span>
          <span className="text-xl font-bold text-purple-300 font-mono">{countByStatus('downloaded')}</span>
        </div>

      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-4 sm:p-5 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input with quick jump */}
        <form onSubmit={handleDirectJump} className="relative w-full md:w-96 flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالكود، العميل، الهاتف، البريد، أو المشروع..."
            className="w-full pl-20 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-3 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              مسح
            </button>
          )}
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto text-xs">
          <span className="text-slate-500 ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>الحالة:</span>
          </span>

          {(['all', 'waiting_client', 'pending_review', 'approved', 'completed', 'downloaded', 'draft'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all' ? 'الكل' : STATUS_LABELS[st as ContractStatus]}
            </button>
          ))}
        </div>

      </div>

      {/* Contracts Table / List */}
      <div className="bg-[#0c1328] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p>جاري تحميل سجل العقود...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">لا توجد عقود مطابقة</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm.trim() ? `لم يتم العثور على نتائج تطابق "${searchTerm}"` : 'لا توجد عقود مضافة حالياً.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="p-4">كود العقد</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">المشروع</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4">الحالة (تعديل مباشر)</th>
                  <th className="p-4">تاريخ الإنشاء</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContracts.map((contract) => {
                  const statusStyle = STATUS_COLORS[contract.status] || STATUS_COLORS.draft;
                  const isUpdating = updatingId === contract.contractId;
                  const isDeleting = deletingId === contract.contractId;
                  return (
                    <tr
                      key={contract.contractId}
                      className="hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-blue-400">
                        <button
                          onClick={() => onOpenContract(contract.contractId)}
                          className="hover:underline hover:text-blue-300 text-right"
                          title="فتح تفاصيل العقد"
                        >
                          {contract.contractCode}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{contract.clientName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{contract.clientEmail}</div>
                        {contract.clientPhone && (
                          <div className="text-[10px] text-slate-500 font-mono">{contract.clientPhone}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-200">{contract.projectName}</div>
                        <div className="text-[11px] text-slate-500">{contract.contractType}</div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-200">
                        {contract.totalAmount || contract.amount} {contract.currency}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={contract.status}
                            onChange={(e) => handleQuickStatusChange(contract.contractId, e.target.value as ContractStatus)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} focus:outline-none cursor-pointer`}
                          >
                            <option value="draft" className="bg-slate-900 text-slate-300">مسودة</option>
                            <option value="waiting_client" className="bg-slate-900 text-blue-400">بانتظار العميل</option>
                            <option value="pending_review" className="bg-slate-900 text-amber-400">قيد المراجعة</option>
                            <option value="approved" className="bg-slate-900 text-emerald-400">تمت الموافقة</option>
                            <option value="completed" className="bg-slate-900 text-cyan-400">مكتمل</option>
                            <option value="downloaded" className="bg-slate-900 text-purple-300">تم سحب العقد (PDF)</option>
                          </select>
                          {isUpdating && (
                            <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenContract(contract.contractId)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض وتفاصيل</span>
                          </button>

                          {confirmDeleteId === contract.contractId ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDeleteContract(contract)}
                                disabled={isDeleting}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1"
                              >
                                {isDeleting ? (
                                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>تأكيد الحذف</span>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(contract.contractId)}
                              disabled={isDeleting}
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 hover:text-red-300 border border-red-800/60 transition-colors inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-40"
                              title="حذف العقد نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

    </div>
  );
};
