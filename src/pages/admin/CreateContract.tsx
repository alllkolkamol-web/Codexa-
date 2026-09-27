import React, { useState, useEffect } from 'react';
import { 
  createContract, 
  generateUniqueContractCode, 
  findUserIdByEmail 
} from '../../services/contractService';
import { ContractStatus } from '../../types';
import { 
  FilePlus, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  Coins, 
  Building2, 
  User, 
  Mail, 
  Phone 
} from 'lucide-react';

interface CreateContractProps {
  onBack: () => void;
  onCreated: (contractId: string) => void;
}

export const CreateContract: React.FC<CreateContractProps> = ({ onBack, onCreated }) => {
  const [contractCode, setContractCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectName, setProjectName] = useState('');
  const [contractType, setContractType] = useState('تطوير منظومة وقواعد بيانات م');
  const [terms, setTerms] = useState(
    `1. تلتزم شركة Codexa بتنفيذ وتسليم المشروع وفقاً للمواصفات ونطاق العمل المحدد.\n2. يلتزم العميل بتوفير المتطلبات والموافقات اللازمة في الوقت المحدد.\n3. يعتبر الإقرار الصوتي المسجل والاعتماد الإلكتروني ملزماً قانونياً لكلا الطرفين.\n4. يشمل العقد ضماناً وصيانة فنية مجانية لمدة 6 أشهر من تاريخ التسليم النهائي.\n5. كافة حقوق الملكية الفكرية وسورس كود المشروع تؤول للعميل بعد سداد كامل المستحقات.`
  );
  const [amount, setAmount] = useState<number | ''>(5000);
  const [currency, setCurrency] = useState('د.ل');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('60 يوماً عمل');
  const [accessPassword, setAccessPassword] = useState('');
  const [status, setStatus] = useState<ContractStatus>('waiting_client');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientFoundStatus, setClientFoundStatus] = useState<'checking' | 'found' | 'not_found' | 'idle'>('idle');

  // Generate code on mount
  useEffect(() => {
    initCode();
  }, []);

  const initCode = async () => {
    setGeneratingCode(true);
    try {
      const code = await generateUniqueContractCode();
      setContractCode(code);
    } catch (e) {
      setContractCode(`CDX-${new Date().getFullYear()}-7F4K92`);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Check if client email is registered in Firestore
  const handleEmailBlur = async () => {
    if (!clientEmail.trim()) {
      setClientFoundStatus('idle');
      return;
    }
    setClientFoundStatus('checking');
    const uid = await findUserIdByEmail(clientEmail.trim());
    if (uid) {
      setClientFoundStatus('found');
    } else {
      setClientFoundStatus('not_found');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim() || !projectName.trim() || !amount || !contractCode) {
      setError('يرجى ملء جميع الحقول الإلزامية الأساسية (اسم العميل، اسم المشروع، كود العقد والمبلغ).');
      return;
    }

    setLoading(true);
    try {
      // Lookup registered client UID if exists
      let assignedClientId = `client_${Date.now()}`;
      if (clientEmail.trim()) {
        try {
          const existingUid = await findUserIdByEmail(clientEmail.trim());
          if (existingUid) assignedClientId = existingUid;
        } catch (e) {
          console.warn("Email lookup fallback:", e);
        }
      }

      const numAmount = Number(amount) || 0;

      const newContract = await createContract({
        contractCode,
        clientId: assignedClientId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() ? clientEmail.trim().toLowerCase() : undefined,
        clientPhone: clientPhone.trim(),
        projectName: projectName.trim(),
        contractType: contractType.trim(),
        description: contractType.trim() || projectName.trim(),
        contractContent: contractType.trim() || projectName.trim(),
        terms: terms.trim(),
        amount: numAmount,
        totalAmount: numAmount,
        currency,
        contractDate,
        endDate: endDate || 'وفقاً لمراحل التسليم',
        duration,
        accessPassword: accessPassword.trim() || undefined,
        status,
        verificationStatus: 'unverified',
      });

      if (newContract && newContract.contractId) {
        onCreated(newContract.contractId);
      } else {
        throw new Error('لم يتم إرجاع معرّف العقد بشكل صحيح.');
      }
    } catch (err: any) {
      console.error("Create contract submit error:", err);
      let errMsg = 'حدث خطأ أثناء حفظ العقد الجديد.';
      const rawMsg = err?.message || String(err);

      if (rawMsg.includes('Missing or insufficient permissions') || rawMsg.includes('permission-denied')) {
        errMsg = 'عفواً، حسابك لا يملك صلاحية مدير لحفظ العقد في قاعدة البيانات.';
      } else if (rawMsg.includes('استغرقت استجابة') || rawMsg.includes('استغرقت العملية') || rawMsg.includes('وقتاً طويلاً')) {
        errMsg = 'استغرقت استجابة قاعدة البيانات وقتاً طويلاً. يرجى التأكد من اتصال الشبكة وصلاحيات المدير.';
      } else if (rawMsg.includes('{')) {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed.error && (parsed.error.includes('Missing or insufficient permissions') || parsed.error.includes('permission-denied'))) {
            errMsg = 'عفواً، حسابك لا يملك صلاحية مدير لحفظ العقد في قاعدة البيانات.';
          } else if (parsed.error) {
            errMsg = `خطأ في حفظ العقد: ${parsed.error}`;
          }
        } catch (e) {
          errMsg = rawMsg;
        }
      } else if (typeof rawMsg === 'string' && rawMsg.trim()) {
        errMsg = rawMsg;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع للوحة التحكم</span>
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FilePlus className="w-5 h-5 text-blue-400" />
          <span>إنشاء عقد إلكتروني جديد</span>
        </h1>
      </div>

      {/* Main Form Card */}
      <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-2xl">
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section: Contract Code & Status */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 items-center justify-between gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                كود العقد الرسمي (CDX-YYYY-XXXXXX):
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-blue-400 bg-blue-950/60 px-3 py-1 rounded-lg border border-blue-800/60">
                  {generatingCode ? 'جاري...' : contractCode}
                </span>
                <button
                  type="button"
                  onClick={initCode}
                  className="text-[10px] text-slate-500 hover:text-white underline"
                >
                  تغيير الكود
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">كلمة مرور العقد (اختياري):</label>
              <input
                type="text"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="مثلاً: 123456"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">الحالة المبدئية:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
              >
                <option value="waiting_client">بانتظار العميل</option>
                <option value="draft">مسودة</option>
                <option value="pending_review">قيد المراجعة</option>
              </select>
            </div>
          </div>

          {/* Section 1: Client Information */}
          <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
              1. بيانات العميل والطرف الثاني
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم العميل أو الجهة <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="محمد علي / شركة الأفق"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  البريد الإلكتروني للعميل (اختياري)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="client@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                {clientFoundStatus === 'found' && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">✓ تم العثور على حساب مسجل لهذا العميل</span>
                )}
                {clientFoundStatus === 'not_found' && (
                  <span className="text-[10px] text-amber-400 mt-1 block">لم يسجل العميل حسابه بعد</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم هاتف العميل
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Project Specifications */}
          <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
              2. مواصفات ونوع المشروع البرمجي
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم المشروع <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="مثال: منصة التجارة الإلكترونية الموحدة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  نوع العقد والخدمة البرمجية (يدوياً)
                </label>
                <input
                  type="text"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  placeholder="تطوير منظومة وقواعد بيانات م"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Timeline Details */}
          <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
              3. التكاليف المالية والجدول الزمني
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  المبلغ الإجمالي <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  العملة
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                >
                  <option value="د.ل">دينار ليبي (د.ل)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  تاريخ العقد
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  مدة العقد
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="مثال: 60 يوماً"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Terms and Conditions */}
          <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
              4. بنود الشروط والأحكام والضمانات
            </h3>
            <textarea
              rows={5}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-700/20 transition-all flex items-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ وإصدار العقد</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
