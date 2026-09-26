import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppNotification } from '../../types';
import { 
  fetchUnifiedClientsForAdmin, 
  sendAdminNotification, 
  getAllNotificationsForAdmin, 
  uploadNotificationImage,
  deleteNotification,
  ClientContact
} from '../../services/notificationService';
import { 
  Bell, 
  Send, 
  Users, 
  User, 
  Image as ImageIcon, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  ExternalLink,
  Upload,
  Link as LinkIcon,
  Search,
  Check,
  FileText,
  Mail,
  Edit3
} from 'lucide-react';

export const AdminNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Data state
  const [clients, setClients] = useState<ClientContact[]>([]);
  const [sentNotifications, setSentNotifications] = useState<AppNotification[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const [recipientType, setRecipientType] = useState<'all' | 'single'>('all');
  const [singleMode, setSingleMode] = useState<'list' | 'manual'>('list');
  const [selectedClient, setSelectedClient] = useState<ClientContact | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  // Image handling
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [useUrlMode, setUseUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal preview state
  const [previewNotif, setPreviewNotif] = useState<AppNotification | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingClients(true);
    setLoadingHistory(true);
    try {
      const [fetchedClients, fetchedNotifs] = await Promise.all([
        fetchUnifiedClientsForAdmin(),
        getAllNotificationsForAdmin()
      ]);
      setClients(fetchedClients);
      setSentNotifications(fetchedNotifs);
      
      // Auto-select first client if available and none selected
      if (fetchedClients.length > 0 && !selectedClient) {
        setSelectedClient(fetchedClients[0]);
      }
    } catch (e) {
      console.warn("Failed loading admin notification data:", e);
    } finally {
      setLoadingClients(false);
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP).' });
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'حجم الصورة كبير جداً (أقصى حد 12MB).' });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال عنوان الإشعار.' });
      return;
    }
    if (!cleanMessage) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال نص الإشعار.' });
      return;
    }

    // Determine target recipient info
    let targetRecipientId: string | undefined = undefined;
    let targetRecipientEmail: string | undefined = undefined;
    let targetRecipientName: string | undefined = undefined;

    if (recipientType === 'single') {
      if (singleMode === 'list') {
        if (!selectedClient) {
          setStatusMessage({ type: 'error', text: 'يرجى اختيار العميل المستلم من القائمة، أو التبديل للإدخال اليدوي.' });
          return;
        }
        targetRecipientId = selectedClient.id || selectedClient.email;
        targetRecipientEmail = selectedClient.email;
        targetRecipientName = selectedClient.name;
      } else {
        // Manual mode
        const emailInput = manualEmail.trim();
        if (!emailInput) {
          setStatusMessage({ type: 'error', text: 'يرجى إدخال البريد الإلكتروني أو معرّف العميل المستلم.' });
          return;
        }
        targetRecipientId = emailInput.toLowerCase();
        targetRecipientEmail = emailInput.includes('@') ? emailInput.toLowerCase() : undefined;
        targetRecipientName = manualName.trim() || emailInput;
      }
    }

    setSubmitting(true);
    try {
      let finalImageUrl = useUrlMode ? imageUrlInput.trim() : '';
      let finalImagePath: string | undefined = undefined;

      // Handle image if provided
      if (!useUrlMode && imageFile) {
        const uploadResult = await uploadNotificationImage(imageFile);
        finalImageUrl = uploadResult.imageUrl;
        finalImagePath = uploadResult.imagePath;
      }

      await sendAdminNotification({
        recipientType,
        recipientId: targetRecipientId,
        recipientName: recipientType === 'single' ? targetRecipientName : 'جميع المستخدمين والعملاء',
        recipientEmail: targetRecipientEmail,
        title: cleanTitle,
        message: cleanMessage,
        imageUrl: finalImageUrl || undefined,
        imagePath: finalImagePath,
        linkUrl: linkUrl.trim() || undefined,
        senderName: 'إدارة Codexa',
        senderId: currentUser?.uid,
      });

      setStatusMessage({ 
        type: 'success', 
        text: recipientType === 'all' 
          ? 'تم إرسال الإشعار بنجاح إلى جميع مستخدمي وعملاء المنظومة!' 
          : `تم إرسال الإشعار بنجاح إلى (${targetRecipientName || targetRecipientEmail || targetRecipientId}).`
      });

      // Reset form
      setTitle('');
      setMessage('');
      setLinkUrl('');
      handleRemoveImage();

      // Refresh sent list
      const updatedHistory = await getAllNotificationsForAdmin();
      setSentNotifications(updatedHistory);
    } catch (err: any) {
      console.error("Submit notification error:", err);
      setStatusMessage({ 
        type: 'error', 
        text: err?.message || 'حدث خطأ أثناء إرسال الإشعار. يرجى التأكد من الاتصال بالشبكة.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (notifId: string) => {
    const confirm = window.confirm('هل أنت متأكد من حذف هذا الإشعار؟');
    if (!confirm) return;

    setDeletingId(notifId);
    try {
      await deleteNotification(notifId);
      setSentNotifications((prev) => prev.filter((n) => n.notificationId !== notifId));
    } catch (e: any) {
      alert('فشل حذف الإشعار: ' + (e.message || 'خطأ غير معروف'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!clientSearchTerm.trim()) return true;
    const term = clientSearchTerm.toLowerCase();
    const inName = c.name?.toLowerCase().includes(term);
    const inEmail = c.email?.toLowerCase().includes(term);
    const inProjects = c.projectNames?.some((p) => p.toLowerCase().includes(term));
    const inPhone = c.phone?.toLowerCase().includes(term);
    return inName || inEmail || inProjects || inPhone;
  });

  return (
    <div className="space-y-8">
      
      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
              : 'bg-red-950/60 border-red-700/80 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Compose Form (Left/Top) & Sent History (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Compose Form: 7 cols */}
        <div className="lg:col-span-7 bg-[#0c1328] rounded-2xl border border-slate-800 p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">إرسال إشعار داخلي جديد للعملاء</h2>
              <p className="text-xs text-slate-400">
                بث فوري يصل لحساب العميل وشريط الإشعارات مباشرة وبدون أي تأخير
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* 1. Recipient Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                الجهة المستلمة للإشعار <span className="text-red-400">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setRecipientType('all')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center gap-3 ${
                    recipientType === 'all'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-900/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${recipientType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">جميع المستخدمين والعملاء</span>
                    <span className="text-[10px] text-slate-400 block">بث عام لكافة الحسابات</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('single')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center gap-3 ${
                    recipientType === 'single'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-900/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${recipientType === 'single' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">مستخدم محدد (عميل مخصص)</span>
                    <span className="text-[10px] text-slate-400 block">إشعار خاص لعميل معين</span>
                  </div>
                </button>
              </div>

              {/* Single User Selection Panel */}
              {recipientType === 'single' && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in duration-150">
                  
                  {/* Toggle Mode: From List vs Manual Email */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-[11px] font-semibold text-slate-300">طريقة تحديد العميل المستلم:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSingleMode('list')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          singleMode === 'list'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        اختيار من قائمة العملاء ({clients.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleMode('manual')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          singleMode === 'manual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        إدخال البريد يدوياً
                      </button>
                    </div>
                  </div>

                  {/* MODE 1: From Unified Clients List */}
                  {singleMode === 'list' ? (
                    <div className="space-y-2.5">
                      
                      {/* Search Bar & Refresh */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={clientSearchTerm}
                            onChange={(e) => setClientSearchTerm(e.target.value)}
                            placeholder="ابحث بالاسم، البريد، الهاتف، أو اسم المشروع..."
                            className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                        <button
                          type="button"
                          onClick={loadData}
                          disabled={loadingClients}
                          className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 shrink-0"
                          title="تحديث قائمة العملاء"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingClients ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Currently Selected Highlight */}
                      {selectedClient && (
                        <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="text-white font-bold">{selectedClient.name}</span>
                              <span className="text-blue-300 text-[11px] mr-2">({selectedClient.email || 'بدون بريد'})</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-200">
                            المستلم المختار
                          </span>
                        </div>
                      )}

                      {/* Clients Scrollable Cards */}
                      {loadingClients ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1.5" />
                          <p>جاري جلب قائمة العملاء المسجلين وأصحاب العقود...</p>
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className="py-5 text-center text-xs text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800">
                          <User className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                          <p>لم يتم العثور على عملاء بهذا البحث.</p>
                          <button
                            type="button"
                            onClick={() => setSingleMode('manual')}
                            className="mt-2 text-blue-400 hover:underline text-xs inline-block"
                          >
                            اضغط هنا لإدخال بريد العميل يدوياً
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {filteredClients.map((c) => {
                            const isSelected = selectedClient?.email === c.email || selectedClient?.id === c.id;
                            return (
                              <button
                                key={c.id || c.email}
                                type="button"
                                onClick={() => setSelectedClient(c)}
                                className={`w-full text-right p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-blue-600/25 border-blue-500 text-white'
                                    : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs truncate">{c.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                      c.source === 'account' 
                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50' 
                                        : 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                                    }`}>
                                      {c.source === 'account' ? 'حساب مسجل' : 'عميل عقد'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {c.email} {c.phone ? `• ${c.phone}` : ''}
                                  </div>
                                  {c.projectNames && c.projectNames.length > 0 && (
                                    <div className="text-[10px] text-blue-400/90 truncate mt-0.5 flex items-center gap-1">
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span>مشروع: {c.projectNames.join('، ')}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0">
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-700'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  ) : (
                    /* MODE 2: Manual Direct Input */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          البريد الإلكتروني للعميل المستلم <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                            placeholder="client@example.com"
                            className="w-full pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr text-left"
                          />
                          <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          اسم العميل (اختياري للعرض)
                        </label>
                        <input
                          type="text"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="مثال: المهندس أحمد / شركة النور"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* 2. Notification Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                عنوان الإشعار <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: إشعار هام بشأن بنود العقد البرمجي الجديد / إعلان صيانة..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 3. Notification Message Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  نص ومحتوى الإشعار <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500">{message.length}/3000 حرف</span>
              </div>
              <textarea
                required
                rows={5}
                maxLength={3000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب هنا تفاصيل الإشعار الذي تود إيصاله للعملاء بالتفصيل..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* 4. Image Attachment Section */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">إرفاق صورة مع الإشعار (اختياري)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setUseUrlMode(!useUrlMode)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  {useUrlMode ? 'رفع ملف من الجهاز' : 'استخدام رابط URL للصورة'}
                </button>
              </div>

              {!useUrlMode ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="notif-image-upload"
                  />

                  {!imagePreview ? (
                    <label
                      htmlFor="notif-image-upload"
                      className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/70 group"
                    >
                      <Upload className="w-6 h-6 text-slate-500 group-hover:text-blue-400 mb-2 transition-colors" />
                      <span className="text-xs font-semibold text-slate-300">اضغط هنا لاختيار صورة من جهازك</span>
                      <span className="text-[10px] text-slate-500 mt-1">يتم ضغطها وتجهيزها تلقائياً للنقل الفوري</span>
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 w-full object-contain rounded-lg bg-black/40"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-3 left-3 p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-500 transition-colors shadow-lg"
                        title="إلغاء الصورة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="text-[10px] text-slate-400 text-center mt-2">
                        {imageFile?.name} ({(imageFile ? imageFile.size / 1024 : 0).toFixed(0)} KB)
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => {
                      setImageUrlInput(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://example.com/image.png"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr text-left"
                  />
                  {imageUrlInput && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-2">
                      <img
                        src={imageUrlInput}
                        alt="Preview"
                        className="max-h-48 w-full object-contain rounded-lg bg-black/40"
                        onError={() => {
                          setStatusMessage({ type: 'error', text: 'تعذر تحميل الصورة من الرابط المدخل.' });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Optional Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رابط مرفق اختياري (Action Link)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/details أو رابط داخل الموقع"
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr text-left"
                />
                <LinkIcon className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Send Button */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-700/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري إرسال الإشعار فورياً...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {recipientType === 'all' 
                        ? 'إرسال الإشعار لجميع المستخدمين والعملاء الآن' 
                        : singleMode === 'list' && selectedClient
                          ? `إرسال الإشعار إلى (${selectedClient.name}) الآن`
                          : manualEmail
                            ? `إرسال الإشعار إلى (${manualEmail}) الآن`
                            : 'إرسال الإشعار للعميل المحدد الآن'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* History / Sent Archive: 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0c1328] rounded-2xl border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">سجل الإشعارات المرسلة ({sentNotifications.length})</h3>
              </div>
              <button
                onClick={loadData}
                disabled={loadingHistory}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="تحديث السجل"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p>جاري تحميل سجل الإشعارات...</p>
                </div>
              ) : sentNotifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>لا توجد إشعارات مرسلة بعد.</p>
                </div>
              ) : (
                sentNotifications.map((notif) => (
                  <div
                    key={notif.notificationId}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {notif.recipientId === 'all' ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800/60 text-[10px] font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>عام للكل</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[10px] font-semibold flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{notif.recipientName || notif.recipientEmail || notif.recipientId}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {new Date(notif.createdAt).toLocaleDateString('ar-LY', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewNotif(notif)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                          title="معاينة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(notif.notificationId)}
                          disabled={deletingId === notif.notificationId}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1">{notif.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.imageUrl && (
                      <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-800 h-24 bg-black/40">
                        <img
                          src={notif.imageUrl}
                          alt="Notif thumb"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white">
                          صورة مرفقة
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Preview Modal */}
      {previewNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0c1328] rounded-2xl border border-slate-700 max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">معاينة الإشعار الداخلي كما يراه العميل</span>
              </div>
              <button
                onClick={() => setPreviewNotif(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50 font-semibold">
                  {previewNotif.senderName || 'إدارة Codexa'}
                </span>
                <span>
                  {new Date(previewNotif.createdAt).toLocaleString('ar-LY')}
                </span>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {previewNotif.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {previewNotif.message}
              </p>

              {previewNotif.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50">
                  <img
                    src={previewNotif.imageUrl}
                    alt="Notification media"
                    className="w-full max-h-72 object-contain"
                  />
                </div>
              )}

              {previewNotif.linkUrl && (
                <a
                  href={previewNotif.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح الرابط المرفق</span>
                </a>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-left">
              <button
                onClick={() => setPreviewNotif(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
