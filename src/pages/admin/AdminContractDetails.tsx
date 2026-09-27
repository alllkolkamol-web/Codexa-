import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Contract, ContractStatus, STATUS_LABELS, STATUS_COLORS } from '../../types';
import { 
  getContractById, 
  updateContractStatusByAdmin, 
  deleteContractByAdmin,
  approveContractByAdmin 
} from '../../services/contractService';
import { generateContractPDF } from '../../utils/pdfGenerator';
import { OfficialContractModal } from '../../components/OfficialContractModal';
import { 
  ArrowRight, 
  FileText, 
  User, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Volume2, 
  Download, 
  AlertCircle,
  Save,
  Trash2,
  Eye
} from 'lucide-react';

interface AdminContractDetailsProps {
  contractId: string;
  onBack: () => void;
}

export const AdminContractDetails: React.FC<AdminContractDetailsProps> = ({ contractId, onBack }) => {
  const { currentUser } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus>('draft');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const loadContract = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getContractById(contractId, currentUser.uid, true);
      setContract(data);
      setSelectedStatus(data.status);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل العقد.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!contract) return;
    setDeleting(true);
    try {
      await deleteContractByAdmin(contract.contractId);
      onBack();
    } catch (err: any) {
      console.warn("Delete contract notice:", err);
      onBack();
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!contract) return;
    setUpdatingStatus(true);
    setStatusSuccess(false);
    try {
      await updateContractStatusByAdmin(contract.contractId, selectedStatus);
      setContract({ ...contract, status: selectedStatus });
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 3000);
    } catch (err: any) {
      alert('فشل تحديث الحالة: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>جاري تحميل تفاصيل العقد للمدير...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="py-16 max-w-xl mx-auto px-4 text-center">
        <div className="bg-[#0c1328] rounded-2xl border border-red-900/50 p-8">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white mb-2">خطأ</h2>
          <p className="text-xs text-red-300 mb-6">{error || 'العقد غير متوفر.'}</p>
          <button
            onClick={onBack}
            className="px-6 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
          >
            رجوع للوحة الإدارة
          </button>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[contract.status] || STATUS_COLORS.draft;

  return (
    <div className="py-8 max-w-5xl mx-auto px-4 sm:px-6">
      
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع للقائمة</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Official Document & Export PDF button */}
          <button
            onClick={() => {
              setShowDocModal(true);
              // Also trigger direct download in background
              generateContractPDF(contract).catch(() => {});
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md text-xs font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>تصدير وسحب PDF</span>
          </button>

          <button
            onClick={() => setShowDocModal(true)}
            className="px-3.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>معاينة وثيقة العقد</span>
          </button>

          {/* Delete contract button for Admin with in-place confirmation */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteContract}
                disabled={deleting}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
              >
                {deleting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>تأكيد حذف العقد</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>حذف العقد</span>
            </button>
          )}

          <span className={`px-3 py-1 rounded-md text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {STATUS_LABELS[contract.status]}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6">
        
        {/* Header Summary Card */}
        <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800/60">
                  {contract.contractCode}
                </span>
                <span className="text-xs text-slate-400">عقد رقم: {contract.contractId.slice(0, 8)}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{contract.projectName}</h1>
              <p className="text-xs text-slate-300 mt-1">النوع: {contract.contractType}</p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-left sm:text-right">
              <span className="text-[11px] text-slate-400 block">المبلغ المعتمد</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {contract.totalAmount || contract.amount} {contract.currency}
              </span>
            </div>
          </div>

          {/* Status Update Control for Admin */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">تغيير حالة العقد كمدير:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ContractStatus)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
              >
                <option value="draft">مسودة (draft)</option>
                <option value="waiting_client">بانتظار العميل (waiting_client)</option>
                <option value="pending_review">قيد المراجعة (pending_review)</option>
                <option value="approved">تمت الموافقة (approved)</option>
                <option value="completed">مكتمل (completed)</option>
                <option value="downloaded">تم سحب العقد (downloaded)</option>
              </select>

              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus || selectedStatus === contract.status}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{updatingStatus ? 'جاري الحفظ...' : 'حفظ الحالة'}</span>
              </button>
            </div>

            {statusSuccess && (
              <span className="text-xs text-emerald-400 font-semibold">✓ تم تحديث حالة العقد بنجاح</span>
            )}
          </div>
        </div>

        {/* Client & Parties Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 text-xs">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>بيانات العميل (الطرف الثاني)</span>
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">الاسم:</span>
                <span className="font-semibold text-white">{contract.clientName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">البريد الإلكتروني:</span>
                <span className="font-mono text-blue-300" dir="ltr">{contract.clientEmail || 'غير متوفر'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">رقم الهاتف:</span>
                <span className="font-mono text-slate-200" dir="ltr">{contract.clientPhone || 'غير مدخل'}</span>
              </div>
              {contract.accessPassword && (
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">كلمة مرور الدخول للموقع:</span>
                  <span className="font-mono text-amber-400 font-bold" dir="ltr">{contract.accessPassword}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">UID العميل في النظام:</span>
                <span className="font-mono text-[11px] text-slate-400" dir="ltr">{contract.clientId}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 text-xs">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>التواريخ والجدول الزمني</span>
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">تاريخ إصدار العقد:</span>
                <span className="font-semibold text-white">{contract.contractDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">تاريخ الانتهاء المحدد:</span>
                <span className="font-semibold text-white">{contract.endDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">مدة التنفيذ:</span>
                <span className="font-semibold text-white">{contract.duration}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">تاريخ الإنشاء في قاعدة البيانات:</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {contract.createdAt ? new Date(contract.createdAt).toLocaleString('ar-EG') : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 13: تسجيل العميل (Client Recording Module for Admin) */}
        <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 shadow-xl text-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span>تسجيل العميل</span>
            </h3>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
              contract.recordingUrl ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-slate-900 text-slate-400'
            }`}>
              وجود التسجيل: {contract.recordingUrl ? 'متوفر ✓' : 'غير متوفر ✕'}
            </span>
          </div>

          {contract.recordingUrl ? (
            <div className="space-y-4">
              
              {/* Audio Player and Duration */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">تسجيل الإقرار الصوتي متاح للاستماع</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    مدة التسجيل: <strong className="text-slate-200 font-mono">{contract.recordingDuration || '-'} ثانية</strong> | وقت الرفع: {contract.recordedAt ? new Date(contract.recordedAt).toLocaleString('ar-EG') : '-'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <audio controls src={contract.recordingUrl} className="w-full sm:w-72 h-9 rounded" />
                </div>
              </div>

              {/* Transcript */}
              {contract.transcript && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-blue-400 font-semibold block mb-1">نص الإقرار المنطوق (Transcript):</span>
                  <p className="text-slate-300 leading-relaxed font-sans">{contract.transcript}</p>
                </div>
              )}

              {/* Grid of Recording & Verification Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block mb-0.5">حالة التسجيل:</span>
                  <span className="text-blue-400 font-semibold">
                    {contract.recordingStatus === 'uploaded' ? 'تم الرفع بنجاح' : (contract.recordingStatus || 'تم الرفع')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">حالة التحقق:</span>
                  <span className={`font-semibold ${contract.verificationStatus === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {contract.verificationStatus === 'verified' 
                      ? 'تم التحقق' 
                      : contract.verificationStatus === 'pending_review' 
                        ? 'بانتظار التحقق (قيد المراجعة)' 
                        : (contract.verificationStatus || 'بانتظار التحقق')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">تاريخ التحقق / الموافقة:</span>
                  <span className="text-slate-300 font-mono">
                    {contract.approvedAt ? new Date(contract.approvedAt).toLocaleDateString('ar-EG') : (contract.verifiedAt ? new Date(contract.verifiedAt).toLocaleDateString('ar-EG') : 'قيد المراجعة')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">تاريخ سحب الـ PDF:</span>
                  <span className="text-purple-300 font-mono">
                    {contract.downloadedAt ? new Date(contract.downloadedAt).toLocaleDateString('ar-EG') : 'لم يُسحب بعد'}
                  </span>
                </div>
              </div>
              {/* Admin Action for Approval */}
              {contract.status !== 'approved' && contract.status !== 'completed' && contract.status !== 'downloaded' ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-emerald-950/60 border border-blue-600/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>موافقة واعتماد المدير على العقد</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      بعد الاستماع لتسجيل العميل والتأكد منه، اضغط على زر الاعتماد للموافقة على العقد وإتاحة سحب ملف PDF للعميل.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setUpdatingStatus(true);
                        await approveContractByAdmin(contract.contractId, contract.projectName, contract.contractCode, contract.clientId);
                        setContract({
                          ...contract,
                          status: 'approved',
                          verificationStatus: 'verified',
                          approvedAt: new Date().toISOString(),
                          approvalStatus: 'approved',
                        });
                        setSelectedStatus('approved');
                        setStatusSuccess(true);
                        setTimeout(() => setStatusSuccess(false), 3000);
                      } catch (e: any) {
                        alert('حدث خطأ أثناء اعتماد العقد: ' + e.message);
                      } finally {
                        setUpdatingStatus(false);
                      }
                    }}
                    disabled={updatingStatus}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ موافقة واعتماد المدير (إتاحة السحب للعميل)</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تم اعتماد وموافقة المدير على هذا العقد بنجاح، وأصبح متاحاً للعميل لسحبه وتحميله بصيغة PDF.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <Volume2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>لم يقم العميل بتسجيل الإقرار الصوتي بعد.</p>
            </div>
          )}
        </div>

        {/* Scope and Full Content */}
        <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 text-xs sm:text-sm">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>نطاق العمل ومحتوى العقد الكامل</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-xs">
            {contract.contractContent || contract.description}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 text-xs sm:text-sm">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>الشروط والأحكام والضمانات</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-xs">
            {contract.terms}
          </div>
        </div>

      </div>
      
      {/* Official Document Viewer Modal */}
      {contract && (
        <OfficialContractModal 
          contract={contract}
          isOpen={showDocModal}
          onClose={() => setShowDocModal(false)}
        />
      )}

    </div>
  );
};
