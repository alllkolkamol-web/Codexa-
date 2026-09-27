import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Contract, ContractStatus, STATUS_LABELS, OFFICIAL_ADMIN_EMAIL, OFFICIAL_PHONE } from '../types';

export interface ContractEmailPayload {
  contractId: string;
  contractCode: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  newStatus: ContractStatus;
  oldStatus?: ContractStatus;
  customMessage?: string;
  actionUrl?: string;
}

/**
 * Generate a professional HTML email template for Contract Status Updates
 */
export function generateContractStatusEmailHtml(payload: ContractEmailPayload): { subject: string; html: string; text: string } {
  const statusArabic = STATUS_LABELS[payload.newStatus] || payload.newStatus;
  const oldStatusArabic = payload.oldStatus ? (STATUS_LABELS[payload.oldStatus] || payload.oldStatus) : null;
  const subject = `[Codexa] تحديث حالة العقد: ${payload.projectName} (${payload.contractCode}) - ${statusArabic}`;

  let statusDescription = '';
  let statusBadgeColor = '#2563eb';

  switch (payload.newStatus) {
    case 'waiting_client':
      statusDescription = 'العقد بانتظار اطلاعكم وتسجيل الإقرار الصوتي الإلزامي للمصادقة على بنود المشروع.';
      statusBadgeColor = '#3b82f6';
      break;
    case 'pending_review':
      statusDescription = 'تم استلام تسجيل الإقرار الصوتي بنجاح، والعقد حالياً قيد مراجعة وتدقيق الإدارة.';
      statusBadgeColor = '#d97706';
      break;
    case 'approved':
      statusDescription = 'تهانينا! تمت مراجعة واعتماد العقد رسمياً من إدارة Codexa. يمكنك الآن الدخول وتحميل نسختك الرسمية المعتمدة بصيغة PDF.';
      statusBadgeColor = '#059669';
      break;
    case 'downloaded':
      statusDescription = 'تم سحب وتحميل نسخة العقد الرسمية الموثقة (PDF) بنجاح وتوثيق ذلك في السجلات.';
      statusBadgeColor = '#7c3aed';
      break;
    case 'completed':
      statusDescription = 'تم تنفيذ وإتمام كافة بنود ومراحل المشروع والعقد بنجاح تام.';
      statusBadgeColor = '#0284c7';
      break;
    case 'draft':
    default:
      statusDescription = 'تم تعديل أو تحديث مسودة العقد في النظام.';
      statusBadgeColor = '#4b5563';
      break;
  }

  const contractUrl = payload.actionUrl || `${window?.location?.origin || 'https://codexa.onrender.com'}/contract/${payload.contractId}`;

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #0b132b; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 25px 30px; border-bottom: 2px solid #2563eb; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px; font-family: monospace;">CODEXA</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #93c5fd;">نظام إدارة وتوثيق العقود الإلكترونية المعتمد</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="font-size: 15px; color: #e2e8f0; margin: 0 0 15px 0;">
                مرحباً <strong>${payload.clientName || 'عزيزنا العميل'}</strong>،
              </p>
              
              <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
                نود إعلامكم بأنه قد تم تحديث حالة عقد مشروعكم في منصة <strong>Codexa</strong> وفقاً للبيانات الموضحة أدناه:
              </p>

              <!-- Contract Info Box -->
              <table role="presentation" width="100%" style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; margin-bottom: 25px;" cellspacing="0" cellpadding="12">
                <tr>
                  <td width="35%" style="color: #64748b; font-size: 13px; border-bottom: 1px solid #111827; padding: 10px 15px;">اسم المشروع:</td>
                  <td width="65%" style="color: #ffffff; font-size: 13px; font-weight: bold; border-bottom: 1px solid #111827; padding: 10px 15px;">${payload.projectName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-size: 13px; border-bottom: 1px solid #111827; padding: 10px 15px;">كود العقد:</td>
                  <td style="color: #60a5fa; font-size: 13px; font-family: monospace; font-weight: bold; border-bottom: 1px solid #111827; padding: 10px 15px;">${payload.contractCode}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-size: 13px; border-bottom: 1px solid #111827; padding: 10px 15px;">الحالة الجديدة:</td>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #111827;">
                    <span style="display: inline-block; background-color: ${statusBadgeColor}; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                      ${statusArabic}
                    </span>
                  </td>
                </tr>
                ${oldStatusArabic ? `
                <tr>
                  <td style="color: #64748b; font-size: 13px; border-bottom: 1px solid #111827; padding: 10px 15px;">الحالة السابقة:</td>
                  <td style="color: #94a3b8; font-size: 13px; border-bottom: 1px solid #111827; padding: 10px 15px;">${oldStatusArabic}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 10px 15px;">تاريخ الإشعار:</td>
                  <td style="color: #94a3b8; font-size: 12px; padding: 10px 15px;">${new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              </table>

              <!-- Status Notice Description -->
              <div style="background-color: #0f172a; border-right: 4px solid ${statusBadgeColor}; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                  ${statusDescription}
                </p>
                ${payload.customMessage ? `
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #93c5fd; border-top: 1px dashed #334155; padding-top: 8px;">
                  ملاحظة إضافية: ${payload.customMessage}
                </p>
                ` : ''}
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${contractUrl}" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
                  عرض وتفاصيل العقد في المنصة &larr;
                </a>
              </div>

              <p style="font-size: 11px; color: #64748b; text-align: center; margin: 15px 0 0 0;">
                يمكنك أيضاً زيارة الموقع والبحث عن العقد مباشرة عبر الكود المخصص: <strong>${payload.contractCode}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #030712; padding: 20px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
                شركة <strong>Codexa</strong> للبرمجيات والحلول الرقمية
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
                الهاتف الرسمي للتنسيق والدعم: <a href="https://wa.me/218920619363" style="color: #60a5fa; font-family: monospace; text-decoration: none;">${OFFICIAL_PHONE}</a> | البريد: <a href="mailto:${OFFICIAL_ADMIN_EMAIL}" style="color: #60a5fa; text-decoration: none;">${OFFICIAL_ADMIN_EMAIL}</a>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 10px; color: #475569;">
                هذا البريد تم إرساله تلقائياً من نظام التنبيهات وإدارة العقود المعتمد لشركة Codexa.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
[Codexa] تحديث حالة العقد
---------------------------------------------
مرحباً ${payload.clientName || 'عزيزنا العميل'}،

تم تحديث حالة عقد مشروعكم (${payload.projectName}) كود: ${payload.contractCode} إلى: ${statusArabic}.

تفاصيل التحديث:
${statusDescription}
${payload.customMessage ? `ملاحظة: ${payload.customMessage}` : ''}

يمكنك معاينة العقد عبر الرابط التالي:
${contractUrl}

للتواصل والدعم:
هاتف: ${OFFICIAL_PHONE}
بريد: ${OFFICIAL_ADMIN_EMAIL}

شركة Codexa للبرمجيات والحلول الرقمية
  `.trim();

  return { subject, html, text };
}

/**
 * Queue an email notification in Firestore `mail` collection
 * (Triggers Firebase Email Extension & Cloud Functions seamlessly)
 */
export async function queueContractStatusEmail(payload: ContractEmailPayload): Promise<void> {
  if (!db || !payload.clientEmail) {
    return;
  }

  const { subject, html, text } = generateContractStatusEmailHtml(payload);

  try {
    const mailDoc = {
      to: [payload.clientEmail.trim()],
      cc: [OFFICIAL_ADMIN_EMAIL],
      message: {
        subject,
        text,
        html,
      },
      metadata: {
        contractId: payload.contractId,
        contractCode: payload.contractCode,
        projectName: payload.projectName,
        clientName: payload.clientName,
        oldStatus: payload.oldStatus || null,
        newStatus: payload.newStatus,
        source: 'codexa_contract_system',
        triggeredAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      status: 'queued',
    };

    await addDoc(collection(db, 'mail'), mailDoc);
    console.log(`[EmailService] Contract status email queued for ${payload.clientEmail} (${payload.contractCode}) -> ${payload.newStatus}`);
  } catch (error) {
    console.warn('[EmailService] Failed to queue email to Firestore mail collection:', error);
  }
}

/**
 * Convenience helper to trigger status notification for a contract object
 */
export async function notifyContractStatusChange(
  contract: Contract,
  newStatus: ContractStatus,
  oldStatus?: ContractStatus,
  customMessage?: string
): Promise<void> {
  if (!contract.clientEmail) return;

  await queueContractStatusEmail({
    contractId: contract.contractId,
    contractCode: contract.contractCode,
    projectName: contract.projectName,
    clientName: contract.clientName,
    clientEmail: contract.clientEmail,
    newStatus,
    oldStatus: oldStatus || contract.status,
    customMessage,
  });
}
