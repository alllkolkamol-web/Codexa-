import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle, ArrowRight, X, Eye, EyeOff, Key, Check } from 'lucide-react';

interface LoginProps {
  setCurrentView: (view: string) => void;
}

export const Login: React.FC<LoginProps> = ({ setCurrentView }) => {
  const { login, isAdmin, isConfigured, saveApiKey } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleSaveKeyInline = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyError(null);
    if (!apiKeyInput.trim() || apiKeyInput.trim().length < 15) {
      setApiKeyError('يرجى إدخال مفتاح Web API صالح من Firebase Console.');
      return;
    }
    const ok = saveApiKey(apiKeyInput.trim());
    if (!ok) {
      setApiKeyError('فشل حفظ المفتاح. يرجى التأكد من صلاحيته.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      setCurrentView('account');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول. يرجى التأكد من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative">
        
        {/* Top Cancel / Back to Home Button */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:bg-slate-800"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>إلغاء والرجوع للرئيسية</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">تسجيل الدخول</h2>
          <p className="text-xs text-slate-400 mt-1">الدخول إلى نظام عقود Codexa الإلكتروني</p>
        </div>

        {/* API Key Setup Banner if Firebase Web API Key is missing */}
        {!isConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/70 border border-amber-700/80 text-amber-200 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>تفعيل مفتاح Firebase Web API</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              يرجى إدخال الـ Web API Key الخاص بمشروع Firebase لتفعيل تسجيل الدخول وربط قاعدة البيانات:
            </p>
            <form onSubmit={handleSaveKeyInline} className="flex gap-2">
              <input
                type="text"
                required
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-amber-800/80 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تفعيل</span>
              </button>
            </form>
            {apiKeyError && <p className="text-red-400 text-[11px]">{apiKeyError}</p>}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons: Cancel + Submit */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="w-1/3 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>إلغاء</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-700/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>دخول</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            ليس لديك حساب بعد؟{' '}
            <button
              onClick={() => setCurrentView('register')}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors inline-flex items-center gap-1"
            >
              <span>إنشاء حساب عميل</span>
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
