import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Contract, STATUS_LABELS, STATUS_COLORS, OFFICIAL_PHONE } from '../types';
import { 
  getContractById, 
  uploadContractRecording, 
  approveContract, 
  markContractDownloaded,
  getLocalContractsList
} from '../services/contractService';
import { generateContractPDF } from '../utils/pdfGenerator';
import { OfficialContractModal } from '../components/OfficialContractModal';
import { 
  FileText, 
  Mic, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  Download, 
  AlertCircle, 
  Coins, 
  ShieldCheck, 
  ArrowRight,
  Volume2,
  CheckSquare,
  Clock,
  Sparkles,
  Eye,
  Lock
} from 'lucide-react';

interface ContractViewProps {
  contractId: string;
  onBack: () => void;
}

export const ContractView: React.FC<ContractViewProps> = ({ contractId, onBack }) => {
  const { currentUser, isAdmin } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Checkbox: "قرأت العقد والشروط والتفاصيل كاملة."
  const [hasReadContract, setHasReadContract] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [recordingSuccess, setRecordingSuccess] = useState(false);

  // Live Speech Recognition Transcript
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Approval and PDF State
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [enteredPassword, setEnteredPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showMicPrompt, setShowMicPrompt] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const DEFAULT_DECLARATION_TEXT = 
    "أقر أنا بأنني قرأت العقد والشروط والأحكام والتفاصيل كاملة، وقد اطلعت على جميع البنود المذكورة فيه ووافقت عليها.";

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const loadContract = async () => {
    setLoading(true);
    setError(null);

    // 1. Instant access from local cache if exists
    const local = getLocalContractsList().find(c => c.contractId === contractId);
    if (local) {
      setContract(local);
      setLoading(false); // Switch to content view immediately
      
      // Setup audio state from local
      if (local.recordingUrl) {
        setAudioUrl(local.recordingUrl);
        setRecordingSuccess(true);
        setHasReadContract(true);
        if (local.recordingDuration) setRecordingDuration(local.recordingDuration);
        if (local.transcript) setLiveTranscript(local.transcript);
      }
    }

    // 2. Fetch fresh data from Firestore
    try {
      const data = await getContractById(
        contractId, 
        currentUser?.uid || null, 
        isAdmin, 
        currentUser?.email || undefined
      );
      
      setContract(data);
      if (data.recordingUrl) {
        setAudioUrl(data.recordingUrl);
        setRecordingSuccess(true);
        setHasReadContract(true);
        if (data.recordingDuration) setRecordingDuration(data.recordingDuration);
        if (data.transcript) setLiveTranscript(data.transcript);
      }
    } catch (err: any) {
      if (!local) {
        setError(err.message || 'تعذر تحميل بيانات العقد.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    if (!hasReadContract) {
      setRecordingError('يرجى تأكيد قراءة العقد والشروط أولاً بتفعيل المربع أعلاه.');
      return;
    }
    
    // Show Codexa permission request first
    setShowMicPrompt(true);
  };

  const triggerActualRecording = async () => {
    setShowMicPrompt(false);
    setRecordingError(null);
    
    // Check for secure context (required for getUserMedia)
    if (!window.isSecureContext) {
      setRecordingError('يجب تشغيل الموقع عبر اتصال آمن (HTTPS) لاستخدام الميكروفون.');
      return;
    }

    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setLiveTranscript('');

    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if ((navigator as any).getUserMedia) {
        stream = await new Promise((resolve, reject) => {
          (navigator as any).getUserMedia({ audio: true }, resolve, reject);
        });
      } else if ((navigator as any).webkitGetUserMedia) {
        stream = await new Promise((resolve, reject) => {
          (navigator as any).webkitGetUserMedia({ audio: true }, resolve, reject);
        });
      }
    } catch (err: any) {
      console.error("Microphone access error:", err);
      const errName = err.name || '';
      const errMsg = err.message || '';
      
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('denied')) {
        setRecordingError('عذراً، تم رفض الوصول للميكروفون. يرجى الضغط على أيقونة القفل (أو الإعدادات) في شريط المتصفح، ثم تفعيل الميكروفون وإعادة تحميل الصفحة.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setRecordingError('لم يتم العثور على ميكروفون متصل بجهازك. يرجى التأكد من توصيل الميكروفون والمحاولة مجدداً.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setRecordingError('الميكروفون قيد الاستخدام من قبل تطبيق آخر. يرجى إغلاق التطبيقات الأخرى والمحاولة مجدداً.');
      } else {
        setRecordingError('يجب السماح باستخدام الميكروفون من إعدادات المتصفح لتسجيل إقرار قراءة العقد.');
      }
      return;
    }

    if (!stream) {
      setRecordingError('متصفحك لا يدعم تسجيل الصوت المباشر أو لم يتم منح إذن الميكروفون.');
      return;
    }

    try {
      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav'
      ];
      let mimeType = '';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) {
            mimeType = t;
            break;
          }
        }
      }

      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualType = mimeType || mediaRecorder.mimeType || 'audio/webm';
        const audioBlobResult = new Blob(audioChunksRef.current, { 
          type: actualType 
        });
        setAudioBlob(audioBlobResult);
        const url = URL.createObjectURL(audioBlobResult);
        setAudioUrl(url);
        stream?.getTracks().forEach((track) => track.stop());
      };

      // Optional Web Speech API for Arabic live transcription
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = 'ar-SA';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let transcriptText = '';
            for (let i = 0; i < event.results.length; i++) {
              transcriptText += event.results[i][0].transcript + ' ';
            }
            setLiveTranscript(transcriptText);
          };
          recognition.start();
          recognitionRef.current = recognition;
        }
      } catch (speechErr) {
        console.warn("Speech recognition optional support notice:", speechErr);
      }

      mediaRecorder.start(200);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 180) { // 3 minutes limit
            stopRecording();
            setRecordingError('وصلت للحد الأقصى للتسجيل (3 دقائق). يرجى الإرسال الآن.');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error("Recording init error:", err);
      setRecordingError('حدث خطأ في تشغيل مسجل الصوت. يرجى إعادة المحاولة.');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  };

  // Upload and Submit Audio Recording
  const handleSubmitRecording = async () => {
    if (!audioBlob || !contract) return;

    if (recordingDuration < 4) {
      setRecordingError('مدة التسجيل قصيرة جداً (أقل من 4 ثوانٍ). يرجى قراءة نص الإقرار كاملاً وبوضوح.');
      return;
    }

    setUploadingRecording(true);
    setRecordingError(null);
    try {
      const declaration = contract.declarationText || DEFAULT_DECLARATION_TEXT;
      const transcriptToUse = liveTranscript || declaration;
      
      // Perform upload
      const res = await uploadContractRecording(
        contract.contractId,
        currentUser?.uid || null,
        audioBlob,
        recordingDuration,
        contract.contractCode,
        transcriptToUse
      );

      // Instant UI Update
      setRecordingSuccess(true);
      setContract({
        ...contract,
        recordingUrl: res.recordingUrl,
        recordingPath: res.recordingPath,
        recordingDuration,
        recordingStatus: 'uploaded',
        status: 'pending_review',
        verificationStatus: res.verificationStatus,
        transcript: transcriptToUse,
      });
    } catch (err: any) {
      // Point 26: Exact error message
      setRecordingError('حدث خطأ أثناء رفع التسجيل. حاول مرة أخرى.');
    } finally {
      setUploadingRecording(false);
    }
  };

  // Handle Contract Final Approval
  const handleApprove = async () => {
    if (!contract || !currentUser) return;
    setApprovalError(null);
    setApproving(true);
    try {
      await approveContract(contract.contractId, currentUser.uid, contract.projectName, contract.contractCode);
      setContract({
        ...contract,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.uid,
        approvalStatus: 'approved',
      });
    } catch (err: any) {
      setApprovalError('حدث خطأ أثناء اعتماد الموافقة. يرجى المحاولة مرة أخرى.');
    } finally {
      setApproving(false);
    }
  };

  // Handle PDF Generation, Protected Upload & Download
  const handleDownloadPDF = async () => {
    if (!contract || downloadingPDF) return;
    
    setDownloadingPDF(true);
    setPdfError(null);
    try {
      // 1. Generate client-side PDF document & obtain Blob
      const pdfBlob = await generateContractPDF(contract);

      // 2. Show success state and modal immediately after generation
      setShowDocModal(true);
      
      // Update local state for immediate feedback
      const now = new Date().toISOString();
      setContract({
        ...contract,
        status: 'downloaded',
        downloadedAt: now,
      });

      // 3. Perform background upload and firestore sync without blocking UI
      markContractDownloaded(
        contract.contractId, 
        contract.projectName, 
        contract.contractCode,
        pdfBlob
      ).catch(bgErr => console.warn("Background PDF sync warning:", bgErr));

    } catch (err) {
      console.error("PDF generation error:", err);
      setPdfError("حدث خطأ أثناء محاولة سحب العقد. يرجى المحاولة مرة أخرى.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>جاري تحميل بيانات العقد والتحقق من الصلاحيات...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="py-16 max-w-xl mx-auto px-4 text-center">
        <div className="bg-[#0c1328] rounded-2xl border border-red-900/50 p-8 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر عرض العقد</h2>
          <p className="text-xs text-red-300 mb-6">{error || 'لا يمكنك الوصول إلى هذا العقد.'}</p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            الرجوع إلى حسابي
          </button>
        </div>
      </div>
    );
  }

  const isApproved = contract.status === 'approved' || contract.status === 'completed' || contract.status === 'downloaded';
  const hasAudioUploaded = !!contract.recordingUrl || recordingSuccess;
  const statusStyle = STATUS_COLORS[contract.status] || STATUS_COLORS.draft;
  const declarationText = contract.declarationText || DEFAULT_DECLARATION_TEXT;

  // Password Verification UI
  if (!isAuthorized && contract.accessPassword && !isAdmin) {
    return (
      <div className="py-16 max-w-lg mx-auto px-4">
        <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center mx-auto mb-6 border border-blue-800/50">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">العقد محمي بكلمة مرور</h2>
          <p className="text-xs text-slate-400 mb-8 leading-relaxed">
            يرجى إدخال كلمة المرور الممنوحة لك من قبل إدارة Codexa للوصول إلى تفاصيل هذا العقد.
          </p>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (enteredPassword.trim() === contract.accessPassword) {
                setIsAuthorized(true);
                setPasswordError(false);
              } else {
                setPasswordError(true);
              }
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="text"
                autoFocus
                value={enteredPassword}
                onChange={(e) => {
                  setEnteredPassword(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="أدخل رمز الدخول هنا..."
                className={`w-full px-4 py-3 rounded-xl bg-slate-900 border ${passwordError ? 'border-red-500' : 'border-slate-700'} text-white text-center font-bold tracking-widest focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {passwordError && (
                <p className="text-[10px] text-red-400 mt-2 font-bold animate-pulse">✓ كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-700/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              <span>دخول وتأكيد الرمز</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              إلغاء والرجوع
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6">
      
      {/* Top Bar with Back Button and Code */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">حالة العقد:</span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {STATUS_LABELS[contract.status]}
          </span>
        </div>
      </div>

      {/* Main Contract Card */}
      <div className="bg-[#0c1328] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl mb-8">
        
        {/* Header of Contract */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0d1630] via-slate-900 to-[#0d1630] border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800/60">
                  {contract.contractCode}
                </span>
                <span className="text-xs text-slate-400">عقد إلكتروني رسمي</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{contract.projectName}</h1>
              <p className="text-xs text-slate-300 mt-1">نوع المشروع: {contract.contractType}</p>
            </div>

            <div className="text-left sm:text-right bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 self-start sm:self-auto">
              <span className="text-[11px] text-slate-400 block">المبلغ الإجمالي المعتمد</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {contract.totalAmount || contract.amount} {contract.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Contract Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-950/30 border-b border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">الطرف الأول (المطور):</span>
            <span className="font-semibold text-slate-200">شركة Codexa</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">الطرف الثاني (العميل):</span>
            <span className="font-semibold text-slate-200">{contract.clientName}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">تاريخ توقيع العقد:</span>
            <span className="font-semibold text-slate-200">{contract.contractDate}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">مدة الإنجاز والتسليم:</span>
            <span className="font-semibold text-slate-200">{contract.duration} ({contract.endDate})</span>
          </div>
        </div>

        {/* Body Content of Contract (Full disclosure: No hiding or summarization!) */}
        <div className="p-6 sm:p-8 space-y-8 text-xs sm:text-sm">
          
          {/* Section 1: Project Description & Scope */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>أولاً: وصف المشروع ونطاق العمل البرمجي</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {contract.contractContent || contract.description}
            </div>
          </div>

          {/* Section 2: Detailed Terms & Conditions */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>ثانياً: الشروط والأحكام والضمانات</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {contract.terms}
            </div>
          </div>

          {/* Section 3: Financial & Delivery Terms */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Coins className="w-4 h-4 text-blue-400" />
              <span>ثالثاً: القيمة المالية وآلية الاعتماد</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed">
              <p>
                اتفق الطرفان على أن القيمة المالية الإجمالية لتنفيذ وتسليم المشروع البرمجي الموضح أعلاه هي:
                <strong className="text-blue-400 font-mono font-bold mx-1">
                  {contract.totalAmount || contract.amount} {contract.currency}
                </strong>
                شاملة لكافة البنود والمواصفات المحددة في هذا العقد. يعتبر الإقرار الصوتي المسجل أدناه والتوثيق الإلكتروني بمثابة إمضاء رقمي ملزم للطرفين.
              </p>
            </div>
          </div>

        </div>

        {/* Section 3 Requirement: Reading Confirmation & Prompt */}
        <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-blue-950/80 to-slate-950 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirmReadCheckbox"
                checked={hasReadContract}
                disabled={hasAudioUploaded || isApproved}
                onChange={(e) => setHasReadContract(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800 cursor-pointer disabled:opacity-60"
              />
              <div>
                <label 
                  htmlFor="confirmReadCheckbox" 
                  className="text-xs sm:text-sm font-bold text-white cursor-pointer select-none leading-relaxed block"
                >
                  اقرأ كل ما هو موجود في العقد والشروط وتأكيد الموافقة
                </label>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  "أؤكد أنني قرأت واطلعت على كامل بنود العقد والشروط والمواصفات الفنية المحددة أعلاه."
                </p>
              </div>
            </div>
            {!hasReadContract && !hasAudioUploaded && (
              <button
                type="button"
                onClick={() => setHasReadContract(true)}
                className="px-4 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-semibold self-start sm:self-auto transition-colors"
              >
                تأكيد القراءة الآن
              </button>
            )}
          </div>
        </div>

        {/* Legal & Audio Declaration Section */}
        <div className="p-6 sm:p-8 bg-[#090e1f] border-t border-slate-800">
          
          <div className="mb-6">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-400" />
              <span>تأكيد قراءة العقد (الإقرار الصوتي الإلزامي)</span>
            </h3>
            <p className="text-xs text-slate-400">
              وفقاً لنظام شركة Codexa، يتعين على العميل قراءة نص الإقرار أدناه بصوته عبر الميكروفون لتوثيق الاطلاع والموافقة.
            </p>
          </div>

          {/* Declaration Text Box */}
          <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-700/60 mb-6 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-300">النص المطلوب قراءته صوتياً بالميكروفون:</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              "{declarationText}"
            </p>
          </div>

          {/* Audio Recording Process */}
          {hasAudioUploaded ? (
            /* Already recorded and awaiting review / approved */
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center shrink-0 border border-blue-700/50">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {contract.status === 'approved' || contract.status === 'completed' || contract.status === 'downloaded'
                      ? 'تم اعتماد الإقرار الصوتي والموافقة على العقد'
                      : 'تم استلام التسجيل الصوتي - الحالة: بانتظار التحقق (قيد المراجعة)'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    مدة التسجيل: {contract.recordingDuration || recordingDuration} ثانية | تم الحفظ في الخادم المشفر
                  </p>
                </div>
              </div>

              {/* Playback Audio */}
              {audioUrl && (
                <div className="w-full sm:w-auto">
                  <audio controls src={audioUrl} className="h-9 w-full sm:w-64 rounded" />
                </div>
              )}
            </div>
          ) : (
            /* Recording Controls for Client */
            <div className="space-y-4">
              
              {recordingError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{recordingError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {!isRecording && !audioBlob && (
                  <button
                    onClick={startRecording}
                    disabled={!hasReadContract}
                    className={`px-7 py-3.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
                      hasReadContract 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-700/30' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 shadow-none'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>ابدأ تسجيل الصوت الآن</span>
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-700/30 transition-all flex items-center gap-2 animate-pulse"
                  >
                    <Square className="w-4 h-4" />
                    <span>إيقاف التسجيل ({recordingDuration} ثانية)</span>
                  </button>
                )}

                {audioBlob && !isRecording && (
                  <>
                    <button
                      onClick={handleSubmitRecording}
                      disabled={uploadingRecording}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-700/20 transition-all flex items-center gap-2"
                    >
                      {uploadingRecording ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>إرسال التسجيل</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={startRecording}
                      disabled={uploadingRecording}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>إعادة التسجيل</span>
                    </button>
                  </>
                )}
              </div>

              {/* Audio player preview before submit */}
              {audioUrl && !recordingSuccess && (
                <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <span className="text-xs text-slate-400">استمع لتسجيلك قبل الإرسال:</span>
                  <audio controls src={audioUrl} className="h-8 flex-1" />
                </div>
              )}

              {liveTranscript && (
                <div className="text-[11px] text-slate-400 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-blue-400 font-semibold">النص المكتشف عبر الصوت: </span>
                  <span>{liveTranscript}</span>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Official Approval & PDF Download Action Bar */}
        <div className="p-6 sm:p-8 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="w-full sm:w-auto">
            <h4 className="text-xs font-bold text-white mb-1">حالة الاعتماد وسحب العقد</h4>
            
            {/* Guidance Text */}
            <p className="text-[11px] text-slate-400">
              {isApproved && hasAudioUploaded 
                ? '✓ تمت الموافقة واعتماد المدير على هذا العقد بنجاح، يمكنك الآن سحب نسختك الرسمية PDF.'
                : hasAudioUploaded 
                  ? '⏳ تم إرسال تسجيلك الصوتي بنجاح وهو قيد مراجعة وتدقيق المدير. سيتاح زر سحب العقد فور اعتماد المدير.'
                  : '⚠️ يرجى تأكيد القراءة وإتمام التسجيل الصوتي أولاً لإرسال العقد لاعتماد المدير.'}
            </p>

            {approvalError && (
              <p className="text-xs text-red-400 mt-1">{approvalError}</p>
            )}

            {pdfError && (
              <p className="text-xs text-red-400 mt-1">{pdfError}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            
            {/* Case 1: Audio not recorded yet */}
            {!hasAudioUploaded && (
              <div className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>مطلوب التسجيل الصوتي أولاً</span>
              </div>
            )}

            {/* Case 2: Audio uploaded but Admin has NOT approved yet */}
            {hasAudioUploaded && !isApproved && (
              <div className="px-5 py-2.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>بانتظار موافقة واعتماد المدير</span>
              </div>
            )}

            {/* Case 3: Audio recorded AND Admin Approved -> Download PDF is active! */}
            {hasAudioUploaded && isApproved && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowDocModal(true)}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>معاينة العقد الرسمي</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
                >
                  {downloadingPDF ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>سحب العقد PDF</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Sticky Recording Bar when Active */}
      {isRecording && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-slate-950/95 backdrop-blur-md border-t border-red-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] animate-slideUp">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">جاري تسجيل صوتك الآن...</h4>
                <p className="text-[10px] text-slate-400">يمكنك التمرير للأعلى لقراءة بنود العقد أثناء التسجيل</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm font-bold text-red-400">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all flex items-center gap-2 active:scale-95"
              >
                <Square className="w-4 h-4" />
                <span>إيقاف وحفظ التسجيل</span>
              </button>
            </div>
          </div>
          
          {liveTranscript && (
            <div className="max-w-4xl mx-auto mt-3 p-2 bg-black/40 rounded-lg border border-white/5 text-[10px] text-slate-400 truncate text-center">
              <span className="text-blue-400 mr-1">نص مؤقت:</span> {liveTranscript}
            </div>
          )}
        </div>
      )}

      {/* Official Document Viewer Modal */}
      {contract && (
        <OfficialContractModal 
          contract={contract}
          isOpen={showDocModal}
          onClose={() => setShowDocModal(false)}
          onStatusUpdate={(updated) => setContract(updated)}
        />
      )}

      {/* Codexa Microphone Permission Request Modal */}
      {showMicPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0c1328] rounded-3xl border border-blue-900/40 p-8 max-w-md w-full shadow-2xl text-center scale-in-center">
            <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <Mic className="w-10 h-10 text-blue-400 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-3">طلب إذن الميكروفون</h2>
            <div className="bg-blue-950/40 rounded-2xl p-4 mb-6 border border-blue-800/30">
              <p className="text-sm text-slate-200 leading-relaxed">
                تطلب شركة <span className="text-blue-400 font-bold">Codexa</span> الوصول إلى الميكروفون الخاص بك لتسجيل إقرارك الصوتي وتوثيق موافقتك على العقد بشكل رسمي.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={triggerActualRecording}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-700/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>سماح لشركة Codexa</span>
              </button>
              
              <button
                onClick={() => setShowMicPrompt(false)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                إلغاء
              </button>
            </div>
            
            <p className="mt-6 text-[10px] text-slate-500">
              سيطلب المتصفح إذن الوصول الفعلي بعد ضغطك على زر السماح أعلاه.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
