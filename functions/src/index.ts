import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

const OFFICIAL_ADMIN_EMAIL = 'codexacode@gmail.com';
const OFFICIAL_PHONE = '0920619363';

// Configure Nodemailer Transporter (supports environment variables or fallback SMTP)
function createMailTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Fallback to test/mock or direct transport
  return nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    secure: false,
  });
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة والتدقيق',
  waiting_client: 'بانتظار العميل',
  approved: 'تمت الموافقة والاعتماد الرسمي',
  completed: 'مكتمل',
  downloaded: 'تم سحب العقد وتحميله PDF',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  pending_review: '#d97706',
  waiting_client: '#3b82f6',
  approved: '#059669',
  completed: '#0284c7',
  downloaded: '#7c3aed',
};

/**
 * Builds the Arabic HTML email template
 */
function buildStatusEmailHtml(params: {
  contractId: string;
  contractCode: string;
  projectName: string;
  clientName: string;
  newStatus: string;
  oldStatus?: string;
  actionUrl?: string;
}) {
  const statusArabic = STATUS_LABELS[params.newStatus] || params.newStatus;
  const oldStatusArabic = params.oldStatus ? (STATUS_LABELS[params.oldStatus] || params.oldStatus) : null;
  const color = STATUS_COLORS[params.newStatus] || '#2563eb';
  const contractUrl = params.actionUrl || `https://codexa.onrender.com/contract/${params.contractId}`;

  let statusMessage = '';
  switch (params.newStatus) {
    case 'waiting_client':
      statusMessage = 'عقد مشروعك جاهز للمراجعة. يرجى الدخول للمنصة وقراءة البنود وتسجيل الإقرار الصوتي للمصادقة.';
      break;
    case 'pending_review':
      statusMessage = 'تم استلام الإقرار الصوتي المسجل بنجاح، والعقد حالياً قيد مراجعة وتدقيق الإدارة لاعتماده.';
      break;
    case 'approved':
      statusMessage = 'تهانينا! تمت مصادقة واعتماد العقد رسمياً من قبل إدارة Codexa. يمكنك الآن سحب وتحميل نسختك الرسمية المعتمدة بصيغة PDF.';
      break;
    case 'downloaded':
      statusMessage = 'تم سحب وتحميل نسخة العقد بصيغة PDF وتوثيق العملية في السجلات الرسمية للشركة.';
      break;
    case 'completed':
      statusMessage = 'تم تنفيذ وإتمام كافة بنود المشروع ومراحله بنجاح تام.';
      break;
    default:
      statusMessage = 'تم تحديث حالة العقد في منصة العقود الإلكترونية.';
      break;
  }

  const subject = `[Codexa] تحديث حالة العقد: ${params.projectName} (${params.contractCode}) - ${statusArabic}`;

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;direction:rtl;text-align:right;color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#030712;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#0b132b;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);padding:25px 30px;border-bottom:2px solid #2563eb;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:1px;font-family:monospace;">CODEXA</h1>
              <p style="margin:5px 0 0 0;font-size:12px;color:#93c5fd;">نظام إدارة وتوثيق العقود الإلكترونية المعتمد</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:30px 25px;">
              <p style="font-size:15px;color:#e2e8f0;margin:0 0 15px 0;">
                مرحباً <strong>${params.clientName || 'عزيزنا العميل'}</strong>،
              </p>
              
              <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 20px 0;">
                نود إعلامك بأنه تم تحديث حالة عقد مشروعك في منصة <strong>Codexa</strong>:
              </p>

              <table role="presentation" width="100%" style="background-color:#030712;border:1px solid #1e293b;border-radius:12px;margin-bottom:25px;" cellspacing="0" cellpadding="12">
                <tr>
                  <td width="35%" style="color:#64748b;font-size:13px;border-bottom:1px solid #111827;padding:10px 15px;">اسم المشروع:</td>
                  <td width="65%" style="color:#ffffff;font-size:13px;font-weight:bold;border-bottom:1px solid #111827;padding:10px 15px;">${params.projectName}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #111827;padding:10px 15px;">كود العقد:</td>
                  <td style="color:#60a5fa;font-size:13px;font-family:monospace;font-weight:bold;border-bottom:1px solid #111827;padding:10px 15px;">${params.contractCode}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #111827;padding:10px 15px;">الحالة الجديدة:</td>
                  <td style="padding:10px 15px;border-bottom:1px solid #111827;">
                    <span style="display:inline-block;background-color:${color};color:#ffffff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:bold;">
                      ${statusArabic}
                    </span>
                  </td>
                </tr>
                ${oldStatusArabic ? `
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #111827;padding:10px 15px;">الحالة السابقة:</td>
                  <td style="color:#94a3b8;font-size:13px;border-bottom:1px solid #111827;padding:10px 15px;">${oldStatusArabic}</td>
                </tr>
                ` : ''}
              </table>

              <div style="background-color:#0f172a;border-right:4px solid ${color};border-radius:8px;padding:15px;margin-bottom:25px;">
                <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6;">
                  ${statusMessage}
                </p>
              </div>

              <div style="text-align:center;margin:30px 0 20px 0;">
                <a href="${contractUrl}" style="background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:bold;display:inline-block;">
                  عرض العقد في المنصة &larr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#030712;padding:20px;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#94a3b8;">شركة <strong>Codexa</strong> للبرمجيات والحلول الرقمية</p>
              <p style="margin:0;font-size:11px;color:#64748b;">الهاتف: ${OFFICIAL_PHONE} | البريد: ${OFFICIAL_ADMIN_EMAIL}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Cloud Function: Triggered automatically whenever a contract document in Firestore is updated
 */
export const onContractStatusUpdated = functions.firestore
  .document('contracts/{contractId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const contractId = context.params.contractId;

    if (!afterData) return null;

    const oldStatus = beforeData?.status;
    const newStatus = afterData?.status;

    // Check if status has changed
    if (oldStatus === newStatus) {
      return null;
    }

    const clientEmail = afterData.clientEmail;
    if (!clientEmail || !clientEmail.includes('@')) {
      console.log(`[onContractStatusUpdated] No valid client email for contract ${contractId}`);
      return null;
    }

    const clientName = afterData.clientName || 'عميل كوديكسا';
    const projectName = afterData.projectName || 'مشروع برمجيات';
    const contractCode = afterData.contractCode || `CDX-${contractId.substring(0, 6)}`;

    const { subject, html } = buildStatusEmailHtml({
      contractId,
      contractCode,
      projectName,
      clientName,
      newStatus,
      oldStatus,
    });

    const transporter = createMailTransporter();

    try {
      const mailOptions = {
        from: `"كوديكسا للعقود - Codexa Contracts" <${process.env.SMTP_USER || OFFICIAL_ADMIN_EMAIL}>`,
        to: clientEmail.trim(),
        cc: OFFICIAL_ADMIN_EMAIL,
        subject,
        html,
      };

      // Send email
      await transporter.sendMail(mailOptions);
      console.log(`[onContractStatusUpdated] Email sent successfully to ${clientEmail} for contract ${contractCode} (${newStatus})`);

      // Log email delivery in Firestore
      await db.collection('email_logs').add({
        contractId,
        contractCode,
        recipientEmail: clientEmail,
        newStatus,
        oldStatus: oldStatus || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        success: true,
      });

      // Update contract timestamp
      await change.after.ref.update({
        lastEmailNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastEmailStatus: newStatus,
      });
    } catch (error: any) {
      console.error(`[onContractStatusUpdated] Error sending email notification:`, error);
      
      // Also write to mail collection as fallback queue for Trigger Email extension
      await db.collection('mail').add({
        to: [clientEmail.trim()],
        cc: [OFFICIAL_ADMIN_EMAIL],
        message: {
          subject,
          html,
        },
        metadata: {
          contractId,
          contractCode,
          newStatus,
          error: error?.message || 'SMTP fallback',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection('email_logs').add({
        contractId,
        contractCode,
        recipientEmail: clientEmail,
        newStatus,
        oldStatus: oldStatus || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        success: false,
        error: error?.message || 'Unknown error',
      });
    }

    return null;
  });

/**
 * Cloud Function: Triggered when a new contract is created
 */
export const onContractCreated = functions.firestore
  .document('contracts/{contractId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const contractId = context.params.contractId;

    if (!data || !data.clientEmail) return null;

    const { subject, html } = buildStatusEmailHtml({
      contractId,
      contractCode: data.contractCode || contractId,
      projectName: data.projectName || 'مشروع جديد',
      clientName: data.clientName || 'عميلنا العزيز',
      newStatus: data.status || 'draft',
    });

    try {
      const transporter = createMailTransporter();
      await transporter.sendMail({
        from: `"كوديكسا للعقود - Codexa Contracts" <${process.env.SMTP_USER || OFFICIAL_ADMIN_EMAIL}>`,
        to: data.clientEmail.trim(),
        cc: OFFICIAL_ADMIN_EMAIL,
        subject,
        html,
      });
    } catch (err) {
      console.warn('[onContractCreated] Notice sending creation email:', err);
    }

    return null;
  });

/**
 * HTTPS Callable: Allows manual triggering of status email from Admin Dashboard
 */
export const sendContractStatusEmail = functions.https.onCall(async (data, context) => {
  const { contractId, newStatus, customMessage } = data;

  if (!contractId || !newStatus) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing contractId or newStatus.');
  }

  const contractDoc = await db.collection('contracts').doc(contractId).get();
  if (!contractDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Contract not found.');
  }

  const contractData = contractDoc.data()!;
  const clientEmail = contractData.clientEmail;
  if (!clientEmail) {
    throw new functions.https.HttpsError('failed-precondition', 'Contract has no client email.');
  }

  const { subject, html } = buildStatusEmailHtml({
    contractId,
    contractCode: contractData.contractCode,
    projectName: contractData.projectName,
    clientName: contractData.clientName,
    newStatus,
    oldStatus: contractData.status,
  });

  const transporter = createMailTransporter();
  await transporter.sendMail({
    from: `"كوديكسا للعقود - Codexa Contracts" <${process.env.SMTP_USER || OFFICIAL_ADMIN_EMAIL}>`,
    to: clientEmail.trim(),
    cc: OFFICIAL_ADMIN_EMAIL,
    subject,
    html,
  });

  return { success: true, message: 'Email sent successfully' };
});
