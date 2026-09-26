import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { OFFICIAL_PHONE } from '../types';
import heroBannerImg from '../assets/images/codexa_hero_banner_1790428893490.jpg';
import { searchContractByCode } from '../services/contractService';
import { 
  FileCheck2, 
  Layers, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  ArrowLeft,
  Phone,
  Search,
  Loader2,
  FileSearch,
  AlertCircle
} from 'lucide-react';

interface HomeProps {
  setCurrentView: (view: string) => void;
  onOpenContract?: (contractId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ setCurrentView, onOpenContract }) => {
  const { currentUser, isAdmin } = useAuth();
  const [searchCode, setSearchCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleGuestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    try {
      // Guest search (passing null as userId)
      const contract = await searchContractByCode(searchCode, null);
      if (onOpenContract) {
        onOpenContract(contract.contractId);
      }
    } catch (err: any) {
      setSearchError(err.message || 'لم يتم العثور على عقد بهذا الكود.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden py-12 md:py-20">
      
      {/* Background radial gradients for prestigious Dark Navy/Blue look */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-10 left-1/4 w-[350px] h-[350px] bg-indigo-900/15 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Company Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-medium mb-8 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>المنصة الرسمية المعتمدة للعقود البرمجية</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight mb-4 font-mono">
          CODEXA
          <span className="block text-lg sm:text-2xl lg:text-3xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-200 mt-1">
            تطوير التطبيقات، المواقع والمنظومات البرمجية
          </span>
        </h1>

        {/* Guest Search Section (Moved to the head) */}
        {!currentUser && (
          <div className="max-w-xl mx-auto mb-10 animate-fadeIn">
            <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <FileSearch className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-white">يمكنك سحب عقدك بدون تسجيل دخول</h3>
                  <p className="text-[11px] text-blue-300">ابحث عن عقدك باستخدام كود العقد المخصص لك</p>
                </div>
              </div>

              <form onSubmit={handleGuestSearch} className="relative">
                <input
                  type="text"
                  placeholder="أدخل كود العقد (مثال: CDX-2024-XXXXXX)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 px-4 pr-11 text-sm text-white focus:outline-none focus:border-blue-600 transition-colors text-center font-mono placeholder:text-slate-600 placeholder:font-sans"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                
                <button
                  type="submit"
                  disabled={searchLoading || !searchCode.trim()}
                  className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>البحث عن العقد</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {searchError && (
                <div className="mt-3 p-2 rounded-lg bg-red-950/40 border border-red-900/50 text-[11px] text-red-400 flex items-center gap-2 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Short & Honest Introduction without fake stats */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed mb-10">
          نظام العقود الإلكتروني الموحد لشركة <strong className="text-white font-semibold">Codexa</strong>. 
          يتيح لعملائنا مراجعة بنود المشاريع، إجراء الإقرار الصوتي الموثق، 
          المصادقة الإلكترونية الرسمية، وسحب نسخة العقد النهائية بصيغة PDF.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          {currentUser ? (
            <button
              onClick={() => setCurrentView(isAdmin ? 'admin' : 'account')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-900/30 transition-all hover:scale-[1.02]"
            >
              <span>{isAdmin ? 'الانتقال إلى لوحة الإدارة' : 'الانتقال إلى حسابي والبحث عن عقد'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setCurrentView('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-900/30 transition-all hover:scale-[1.02]"
              >
                <span>تسجيل الدخول</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentView('register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm border border-slate-700/80 transition-all hover:scale-[1.02]"
              >
                <span>إنشاء حساب جديد</span>
              </button>
            </>
          )}
        </div>

        {/* Hero Banner Image Section */}
        <div className="w-full max-w-5xl mx-auto my-8 sm:my-10 px-2 sm:px-0">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950/60">
            <img 
              src={heroBannerImg} 
              alt="Codexa Official Hero Banner" 
              className="w-full h-auto object-contain max-h-[550px] sm:max-h-[650px] mx-auto block rounded-2xl sm:rounded-3xl"
              loading="eager"
            />
          </div>
        </div>

        {/* Core Domains Cards (No fake numbers, only factual services) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
          
          <div className="p-6 rounded-2xl bg-[#0d1630]/70 border border-slate-800/80 hover:border-blue-900/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-950 flex items-center justify-center border border-blue-800/40 mb-4">
              <Smartphone className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">تطوير التطبيقات</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              بناء وتطوير تطبيقات الهواتف الذكية لأنظمة iOS و Android بأحدث التقنيات وأعلى معايير الأداء وتجربة المستخدم.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0d1630]/70 border border-slate-800/80 hover:border-blue-900/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-950 flex items-center justify-center border border-blue-800/40 mb-4">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">تطوير المواقع</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              تصميم وتطوير المنصات والمواقع التفاعلية المخصصة بسرعة استجابة عالية وتوافق كامل مع كافة الأجهزة والشاشات.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0d1630]/70 border border-slate-800/80 hover:border-blue-900/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-950 flex items-center justify-center border border-blue-800/40 mb-4">
              <Layers className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">المنظومات البرمجية</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              هندسة وبرمجة المنظومات وقواعد البيانات وإدارة العمليات المؤسسية مع ضمان سرية وحماية وتكامل البيانات.
            </p>
          </div>

        </div>

        {/* Direct Contact Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">هل لديك استفسار بشأن عقدك البرمجي؟</h4>
              <p className="text-xs text-slate-400">فريق Codexa متواجد للتنسيق والمتابعة المباشرة.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-base font-bold text-blue-300 dir-ltr bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
            {OFFICIAL_PHONE}
          </div>
        </div>

      </div>
    </div>
  );
};
