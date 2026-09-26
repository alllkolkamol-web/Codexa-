import React, { useState, useRef } from 'react';
import { Shield, Lock, Zap, Cloud, Code2, Terminal, CheckCircle2 } from 'lucide-react';

export const InteractiveLaptopHero: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [keyPulse, setKeyPulse] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const codeSnippets = [
    [
      '// CODEXA Smart Contract Engine',
      'const contract = await codexa.contracts.create({',
      '  code: "CDX-2026-X889",',
      '  status: "APPROVED_AND_VERIFIED",',
      '  security: "256-BIT_ENCRYPTED",',
      '});',
      'console.log("✓ Contract Status: SECURE");',
    ],
    [
      '// Voice Declaration & Audio Stamp',
      'const audio = await codexa.voice.processDeclaration({',
      '  durationSeconds: 12,',
      '  verificationScore: 0.99,',
      '  status: "PENDING_REVIEW",',
      '});',
      'console.log("✓ Audio Record Stored in Cloud");',
    ],
    [
      '// PDF Document Generation & Export',
      'const pdf = await codexa.pdf.generateDocument({',
      '  font: "Cairo-Arabic-UTF8",',
      '  signedBy: "CLIENT_OFFICIAL_UID",',
      '  status: "DOWNLOADED",',
      '});',
      'console.log("✓ Document Ready for Download");',
    ],
  ];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleKeyboardClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setKeyPulse(true);
    setTimeout(() => setKeyPulse(false), 300);

    setIsTyping(true);
    setActiveSnippetIndex((prev) => (prev + 1) % codeSnippets.length);
    setTimeout(() => setIsTyping(false), 300);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto my-10 px-2 sm:px-4 select-none dir-ltr">
      {/* Outer Glow Container */}
      <div 
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        className="relative rounded-3xl bg-slate-950/80 border border-slate-800/80 p-4 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-sm group"
      >
        {/* Dynamic Pointer Spotlight Glow */}
        <div 
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:hidden"
          style={{
            opacity: isHovered ? 0.85 : 0.25,
            background: `radial-gradient(450px circle at ${mousePos.x}% ${mousePos.y}%, rgba(37, 99, 235, 0.22), rgba(6, 182, 212, 0.08) 50%, transparent 80%)`,
          }}
        />

        {/* Hero Section Grid: Feature Badges (Left) + Laptop UI (Center/Right) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Side: Floating Status Pills (Matching official banner) */}
          <div className="md:col-span-4 flex flex-col gap-2.5 text-right dir-rtl">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-900/40 hover:border-blue-500/50 transition-all flex items-center gap-3 shadow-lg group/pill">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover/pill:scale-110 transition-transform">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">عقود رقمية</h4>
                <p className="text-[10px] text-slate-400">توثيق برمجي كامل ومباشر</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-900/40 hover:border-blue-500/50 transition-all flex items-center gap-3 shadow-lg group/pill">
              <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover/pill:scale-110 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">آمنة وموثوقة</h4>
                <p className="text-[10px] text-slate-400">إقرار صوتي وتشفير عالي</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-900/40 hover:border-blue-500/50 transition-all flex items-center gap-3 shadow-lg group/pill">
              <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover/pill:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">سرعة عالية</h4>
                <p className="text-[10px] text-slate-400">اعتماد وسحب لحظي للـ PDF</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-900/40 hover:border-blue-500/50 transition-all flex items-center gap-3 shadow-lg group/pill">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover/pill:scale-110 transition-transform">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">من أي مكان</h4>
                <p className="text-[10px] text-slate-400">وصول سحابي 24/7 للعملاء</p>
              </div>
            </div>
          </div>

          {/* Right Side: Interactive Laptop Graphic */}
          <div className="md:col-span-8 flex flex-col items-center justify-center">
            
            {/* LAPTOP SCREEN FRAME */}
            <div className="relative w-full max-w-lg rounded-t-2xl bg-slate-900 border-4 border-slate-700/80 shadow-2xl overflow-hidden transition-transform duration-300">
              
              {/* Laptop Web Cam & Speaker Bezel */}
              <div className="h-5 bg-slate-950 flex items-center justify-center gap-2 border-b border-slate-800 px-3">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-pulse" />
                <div className="w-12 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* SCREEN CONTENT DISPLAY */}
              <div className="p-4 sm:p-5 bg-[#080d1e] min-h-[210px] font-mono text-xs text-slate-200 relative overflow-hidden">
                
                {/* Screen Interactive Cursor Spotlight Effect */}
                <div 
                  className="pointer-events-none absolute inset-0 transition-opacity duration-200 motion-reduce:hidden"
                  style={{
                    opacity: isHovered ? 0.6 : 0,
                    background: `radial-gradient(200px circle at ${mousePos.x}% ${mousePos.y}%, rgba(59, 130, 246, 0.3), transparent 70%)`,
                  }}
                />

                {/* Window Title Bar */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-bold text-slate-300 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      codexa-engine.ts
                    </span>
                  </div>

                  {/* Keyboard Tap Hint */}
                  <span className="text-[10px] text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60 animate-pulse font-sans dir-rtl">
                    انقر لوحة المفاتيح لتشغيل الكود
                  </span>
                </div>

                {/* Animated Code Lines */}
                <div className={`space-y-1.5 transition-opacity duration-200 ${isTyping ? 'opacity-50' : 'opacity-100'}`}>
                  {codeSnippets[activeSnippetIndex].map((line, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 transition-all duration-300 ${
                        line.startsWith('//') 
                          ? 'text-slate-500 font-sans' 
                          : line.includes('✓') 
                            ? 'text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded' 
                            : 'text-blue-300'
                      }`}
                    >
                      <span className="text-slate-600 select-none text-[10px] w-4">{idx + 1}</span>
                      <span className="leading-tight break-all">{line}</span>
                    </div>
                  ))}
                </div>

                {/* Visual Status Indicator */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] dir-rtl">
                  <span className="text-slate-400 flex items-center gap-1 font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    النظام متصل وجاهز للتوثيق
                  </span>
                  <span className="font-bold text-blue-400 font-mono">CDX-PRO-V2</span>
                </div>

              </div>
            </div>

            {/* LAPTOP KEYBOARD BASE (Interactive Click / Touch Zone) */}
            <div 
              onClick={handleKeyboardClick}
              onTouchStart={handleKeyboardClick}
              className={`relative w-full max-w-xl h-11 bg-gradient-to-b from-slate-800 to-slate-900 border-x border-b border-slate-700/80 rounded-b-2xl cursor-pointer p-2 flex flex-col items-center justify-between shadow-2xl transition-all duration-200 active:scale-[0.99] group/kb ${
                keyPulse ? 'ring-2 ring-blue-500/80 bg-slate-700' : ''
              }`}
              title="انقر هنا لتغيير محتوى الشاشة وإظهار حركة لوحة المفاتيح"
            >
              {/* Keyboard Keys Simulation Grid */}
              <div className="w-4/5 h-4 bg-slate-950 rounded-sm border border-slate-800 flex items-center justify-center px-2 gap-1 overflow-hidden">
                <div className={`w-full h-2 rounded bg-slate-800 group-hover/kb:bg-blue-600/40 transition-colors ${keyPulse ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : ''}`} />
              </div>

              {/* Laptop Touchpad */}
              <div className="w-16 h-2 bg-slate-950 rounded-t-sm border-t border-slate-700/80" />

              {/* Key Ripple/Glow Burst */}
              {keyPulse && (
                <div className="absolute inset-0 bg-blue-500/20 rounded-b-2xl animate-ping pointer-events-none" />
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
