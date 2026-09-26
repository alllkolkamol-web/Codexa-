export type UserRole = 'admin' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = 
  | 'draft' 
  | 'pending_review' 
  | 'waiting_client' 
  | 'approved' 
  | 'completed' 
  | 'downloaded';

export interface Contract {
  contractId: string;
  contractCode: string; // CDX-YYYY-XXXXXX
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectName: string;
  contractType: string;
  description: string;
  contractContent: string;
  terms: string;
  termsList?: string[];
  amount: number;
  totalAmount: number;
  currency: string;
  contractDate: string;
  endDate: string;
  duration: string;
  status: ContractStatus;
  recordingUrl?: string;
  recordingPath?: string;
  recordingDuration?: number;
  recordedAt?: string;
  recordingStatus?: 'uploaded' | 'pending' | 'verified';
  verificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected' | 'pending';
  verificationScore?: number;
  verifiedAt?: string;
  transcript?: string;
  declarationText?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalStatus?: 'approved';
  downloadedAt?: string;
  pdfUrl?: string;
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  notificationId: string;
  recipientId: string;
  recipientName?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  type: 'contract_created' | 'contract_recording_submitted' | 'contract_approved' | 'contract_downloaded' | 'general' | 'admin_broadcast' | 'admin_direct';
  contractId?: string;
  imageUrl?: string;
  imagePath?: string;
  linkUrl?: string;
  senderName?: string;
  senderId?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
}

export const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  waiting_client: 'بانتظار العميل',
  approved: 'تمت الموافقة',
  completed: 'مكتمل',
  downloaded: 'تم سحب العقد',
};

export const STATUS_COLORS: Record<ContractStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700' },
  pending_review: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-700/50' },
  waiting_client: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-700/50' },
  approved: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-700/50' },
  completed: { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-700/50' },
  downloaded: { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-700/50' },
};

export const OFFICIAL_ADMIN_EMAIL = 'codexacode@gmail.com';
export const OFFICIAL_ADMIN_UID = 'IymbRSEyNVfr1Xb7MfKIhJ483VO2';
export const OFFICIAL_ADMIN_UIDS = [
  'IymbRSEyNVfr1Xb7MfKIhJ483VO2'
];
export const OFFICIAL_ADMIN_EMAILS = [
  'codexacode@gmail.com'
];
export const OFFICIAL_PHONE = '0920619363';
