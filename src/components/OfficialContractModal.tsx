import React, { useRef } from 'react';
import { Contract, OFFICIAL_PHONE } from '../types';
import { generateContractPDF } from '../utils/pdfGenerator';
import { markContractDownloaded } from '../services/contractService';
import { 
  Printer, 
  Download, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface OfficialContractModalProps {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (newContract: Contract) => void;
}

export const OfficialContractModal: React.FC<OfficialContractModalProps> = ({
  contract,
  isOpen,
  onClose,
  onStatusUpdate
}) => {
  const [downloading, setDownloading] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      // 1. Generate PDF
      const pdfBlob = await generateContractPDF(contract);
      
      // 2. Update status to 'downloaded' in DB and local storage
      await markContractDownloaded(
        contract.contractId,
        contract.projectName,
        contract.contractCode,
        pdfBlob
      );

      // 3. Update parent state if callback provided
      if (onStatusUpdate) {
        onStatusUpdate({
          ...contract,
          status: 'downloaded',
          downloadedAt: new Date().toISOString()
        });
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (e) {
      console.warn('PDF download warning:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(contract.contractCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header Controls */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/60">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>الوثيقة الرسمية للعقد:</span>
                <span className="font-mono text-blue-400">{contract.contractCode}</span>
              </h3>
              <p className="text-[11px] text-slate-400">نسخة معتمدة وموثقة إلكترونياً من شركة Codexa</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors hidden sm:flex"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloading ? 'جاري التحميل...' : 'تنزيل PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Success Notice */}
        {downloadSuccess && (
          <div className="px-6 py-2.5 bg-emerald-950/90 border-b border-emerald-600 flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ تم تنزيل ملف العقد (PDF) بنجاح إلى جهازك! يمكنك الآن الدخول عليه من قائمة التنزيلات في المتصفح.</span>
            </div>
            <button 
              onClick={() => setDownloadSuccess(false)}
              className="text-emerald-400 hover:text-white text-[11px]"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Browser Direct Download Bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">لتنزيل نسخة PDF إلى مجلد وقائمة التنزيلات في المتصفح:</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-700/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'جاري السحب والتنزيل...' : 'سحب وتنزيل ملف PDF إلى جهازك'}</span>
          </button>
        </div>

        {/* Printable Official Paper Container */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-950/60 flex-1">
          <div 
            ref={printRef}
            className="max-w-3xl mx-auto bg-white text-slate-900 rounded-xl shadow-xl overflow-hidden text-right border border-slate-200"
            style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}
          >
            {/* Header */}
            <div className="bg-[#070b19] text-white p-6 sm:p-8 border-b-4 border-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-wider text-white">CODEXA</h1>
                <p className="text-xs text-blue-300 font-semibold mt-1">تطوير التطبيقات، المواقع والمنظومات البرمجية</p>
                <p className="text-[11px] text-slate-400 mt-0.5">الهاتف الرسمي: <a href="https://wa.me/218920619363" target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-100 transition-colors">{OFFICIAL_PHONE}</a></p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-lg text-center self-start sm:self-auto">
                <span className="text-[10px] text-slate-400 block mb-0.5">كود العقد الرسمي</span>
                <strong className="text-sm font-mono font-bold text-blue-400">{contract.contractCode}</strong>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-6 sm:p-8 space-y-6 text-xs text-slate-800">
              
              {/* Title */}
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">عقد تقديم خدمات برمجية وإلكترونية</h2>
                <p className="text-xs text-slate-500 mt-1">عقد رسمي ومسجل إلكترونياً لدى منصة شركة Codexa</p>
              </div>

              {/* Parties */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 leading-relaxed">
                <h3 className="font-bold text-slate-900 mb-2 pb-1 border-b border-slate-200 text-xs">1. أطراف العقد</h3>
                <p className="mb-1.5"><strong className="text-slate-900">الطرف الأول (المطور):</strong> شركة Codexa لتطوير البرمجيات والمنظومات الإلكترونية.</p>
                <p>
                  <strong className="text-slate-900">الطرف الثاني (العميل):</strong> {contract.clientName} | 
                  البريد: <span dir="ltr" className="font-mono text-blue-700 font-semibold">{contract.clientEmail}</span>
                  {contract.clientPhone ? ` | الهاتف: ${contract.clientPhone}` : ''}
                </p>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">اسم المشروع:</span>
                  <strong className="text-blue-900 font-bold">{contract.projectName}</strong>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-700 block text-[10px]">المبلغ الإجمالي:</span>
                  <strong className="text-emerald-800 font-black font-mono text-sm">
                    {contract.totalAmount || contract.amount} {contract.currency}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">نوع العقد:</span>
                  <span className="font-semibold text-slate-800">{contract.contractType}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">تاريخ العقد:</span>
                  <span className="font-semibold text-slate-800">{contract.contractDate}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">مدة التنفيذ:</span>
                  <span className="font-semibold text-slate-800">{contract.duration}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">تاريخ الانتهاء:</span>
                  <span className="font-semibold text-slate-800">{contract.endDate}</span>
                </div>
              </div>

              {/* Scope */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 pb-1 border-b-2 border-blue-600 text-xs">2. وصف المشروع ونطاق العمل البرمجي</h3>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl whitespace-pre-wrap leading-relaxed text-slate-700 font-sans">
                  {contract.contractContent || contract.description || 'المواصفات والبنود الفنية المعتمدة للمشروع'}
                </div>
              </div>

              {/* Terms */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 pb-1 border-b-2 border-blue-600 text-xs">3. الشروط والأحكام والضمانات</h3>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl whitespace-pre-wrap leading-relaxed text-slate-700 font-sans">
                  {contract.terms || 'الشروط والأحكام الفنية وحقوق الملكية والتسليم المعتمدة'}
                </div>
              </div>

              {/* Digital Stamp */}
              <div className="bg-sky-50 border-2 border-sky-600 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-sky-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-700" />
                    <span>ختم الاعتماد والتوثيق الإلكتروني الرسمي</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px]">
                    معتمد وموثق رسمياً ✓
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 space-y-1">
                  <p>• <strong>حالة الإقرار الصوتي:</strong> تم تسجيل الإقرار الصوتي للعميل وحفظه بنجاح في المنظومة السحابية.</p>
                  <p>• <strong>معرّف العميل (UID):</strong> <span dir="ltr" className="font-mono text-slate-900">{contract.clientId}</span></p>
                  <p>• <strong>تاريخ الاعتماد:</strong> {contract.approvedAt ? new Date(contract.approvedAt).toLocaleString('ar-EG') : new Date().toLocaleDateString('ar-EG')}</p>
                  <p>• <strong>التوقيع الرقمي:</strong> إقرار إلكتروني ملزم قانونياً وقائم على توثيق الصوت وقراءة بنود العقد.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                منظومة العقود الإلكترونية الموحدة لشركة Codexa | كود العقد: {contract.contractCode} | الدعم: <a href="https://wa.me/218920619363" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{OFFICIAL_PHONE}</a>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
