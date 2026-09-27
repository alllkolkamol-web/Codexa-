import React from 'react';
import { OFFICIAL_PHONE } from '../types';
import { Phone, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-[#070b19] text-slate-400 py-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-200 font-bold font-mono text-sm">
              <span>CODEXA</span>
              <span className="text-[11px] font-normal text-slate-400 font-sans">| تطوير التطبيقات والمواقع والمنظومات البرمجية</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              النظام الإلكتروني المعتمد لإصدار وتوثيق ومصادقة العقود البرمجية الرسمية.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>هاتف الاتصال:</span>
              <a href="https://wa.me/218920619363" target="_blank" rel="noreferrer" className="font-mono text-blue-300 font-semibold dir-ltr hover:text-blue-200 transition-colors">
                {OFFICIAL_PHONE}
              </a>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-slate-600" />
              <span>نظام محمي ومشفر</span>
            </div>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-slate-900 text-center text-[11px] text-slate-600">
          جميع الحقوق محفوظة © {new Date().getFullYear()} شركة Codexa.
        </div>
      </div>
    </footer>
  );
};
