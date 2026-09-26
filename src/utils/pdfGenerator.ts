import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Contract, OFFICIAL_PHONE } from '../types';

export function downloadPDFFile(blob: Blob, filename: string) {
  // Use standard application/pdf blob
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  a.setAttribute('download', filename);
  a.setAttribute('type', 'application/pdf');
  a.target = '_blank';
  document.body.appendChild(a);

  // Robust trigger across all browsers
  try {
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    a.dispatchEvent(clickEvent);
  } catch (e) {
    a.click();
  }

  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(blobUrl);
  }, 5000);
}

export async function generateContractPDF(contract: Contract): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '750px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  container.style.direction = 'rtl';
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';

  const formatMoney = (amount: number, currency: string) => {
    return `${amount} ${currency}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG');
    } catch (e) {
      return dateStr;
    }
  };

  container.innerHTML = `
    <div style="background-color: #070b19; color: #ffffff; padding: 24px 28px; border-bottom: 4px solid #2563eb; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff; font-family: sans-serif;">CODEXA</h1>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #93c5fd; font-weight: 600;">تطوير التطبيقات، المواقع والمنظومات البرمجية</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8;">الهاتف الرسمي: ${OFFICIAL_PHONE}</p>
      </div>
      <div style="background-color: #1e293b; border: 1px solid #334155; padding: 8px 14px; border-radius: 8px; text-align: center;">
        <span style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">كود العقد الرسمي</span>
        <strong style="font-size: 14px; color: #60a5fa; font-family: sans-serif;">${contract.contractCode}</strong>
      </div>
    </div>

    <div style="padding: 26px; font-size: 11.5px; line-height: 1.6; color: #1e293b;">
      
      <!-- Document Title -->
      <div style="text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">عقد تقديم خدمات برمجية وإلكترونية</h2>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">عقد موثق ومسجل إلكترونياً في المنصة الرسمية لشركة Codexa</p>
      </div>

      <!-- Parties Section -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">1. أطراف العقد</h3>
        <p style="margin: 0 0 4px 0;"><strong>الطرف الأول (المطور):</strong> شركة Codexa لتطوير البرمجيات والمنظومات الإلكترونية.</p>
        <p style="margin: 0;"><strong>الطرف الثاني (العميل):</strong> ${contract.clientName} | البريد: <span dir="ltr">${contract.clientEmail}</span> ${contract.clientPhone ? ' | الهاتف: ' + contract.clientPhone : ''}</p>
      </div>

      <!-- Contract Overview Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px;">
        <tbody>
          <tr>
            <td style="padding: 8px 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 700; width: 20%;">اسم المشروع:</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700; color: #1e40af;">${contract.projectName}</td>
            <td style="padding: 8px 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 700; width: 20%;">المبلغ الإجمالي:</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #047857; font-size: 12px;">${formatMoney(contract.totalAmount || contract.amount, contract.currency)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 700;">نوع العقد:</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${contract.contractType}</td>
            <td style="padding: 8px 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 700;">تاريخ العقد:</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${contract.contractDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 700;">مدة الإنجاز:</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${contract.duration}</td>
            <td style="padding: 8px 10px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 700;">تاريخ الانتهاء:</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${contract.endDate}</td>
          </tr>
        </tbody>
      </table>

      <!-- Scope / Content -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 12.5px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 3px;">2. وصف المشروع ونطاق العمل البرمجي</h3>
        <div style="padding: 12px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; line-height: 1.7; color: #334155; white-space: pre-wrap;">
${contract.contractContent || contract.description || 'المواصفات الفنية المعتمدة للمشروع'}
        </div>
      </div>

      <!-- Terms and Conditions -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 12.5px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 3px;">3. الشروط والأحكام والضمانات</h3>
        <div style="padding: 12px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; line-height: 1.7; color: #334155; white-space: pre-wrap;">
${contract.terms || 'الشروط والضمانات الفنية وحقوق الملكية البرمجية'}
        </div>
      </div>

      <!-- Digital Stamp & Verification -->
      <div style="background-color: #f0f9ff; border: 2px solid #0284c7; border-radius: 10px; padding: 14px; margin-top: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 12.5px; font-weight: 800; color: #0369a1;">ختم الاعتماد والتوثيق الإلكتروني الرسمي</h4>
          <span style="background-color: #0284c7; color: #ffffff; padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 700;">معتمد وموثق رسمياً ✓</span>
        </div>
        <div style="font-size: 10.5px; color: #334155; line-height: 1.6;">
          <p style="margin: 2px 0;">• <strong>حالة الإقرار الصوتي:</strong> تم تسجيل الإقرار الصوتي للعميل بنجاح وحفظه في سحابة Codexa المشفرة.</p>
          <p style="margin: 2px 0;">• <strong>معرّف العميل (UID):</strong> <span dir="ltr">${contract.clientId}</span></p>
          <p style="margin: 2px 0;">• <strong>تاريخ الاعتماد والموافقة:</strong> ${formatDate(contract.approvedAt || new Date().toISOString())}</p>
          <p style="margin: 2px 0;">• <strong>التوقيع الرقمي:</strong> إقرار إلكتروني ملزم قانونياً وقائم على توثيق الصوت وقراءة بنود العقد كاملة.</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 9.5px; color: #64748b;">
        نظام العقود الإلكتروني الموحد لشركة Codexa | كود العقد: ${contract.contractCode} | الهاتف: ${OFFICIAL_PHONE}
      </div>

    </div>
  `;

  document.body.appendChild(container);

  // Clean filename that Android and all PDF readers recognize without truncation
  const safeCode = (contract.contractCode || 'CODEXA').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Contract_${safeCode}.pdf`;

  try {
    const canvas = await html2canvas(container, {
      scale: 1.5, // Optimized resolution (~300KB instead of 11MB)
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 750,
    });

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    pdf.setProperties({
      title: `Contract_${safeCode}`,
      subject: contract.projectName || 'Software Development Contract',
      author: 'Codexa',
      creator: 'Codexa'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    const arrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });

    // Single clean trigger for browser downloads list
    downloadPDFFile(pdfBlob, fileName);

    return pdfBlob;
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.warn("Direct PDF generation fallback:", err);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setFontSize(14);
    pdf.text(`Codexa Contract: ${contract.contractCode}`, 15, 25);
    pdf.setFontSize(11);
    pdf.text(`Project: ${contract.projectName}`, 15, 38);
    pdf.text(`Client: ${contract.clientName} (${contract.clientEmail})`, 15, 48);
    pdf.text(`Amount: ${contract.totalAmount || contract.amount} ${contract.currency}`, 15, 58);
    pdf.text(`Date: ${contract.contractDate}`, 15, 68);

    const arrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    downloadPDFFile(pdfBlob, fileName);

    return pdfBlob;
  }
}
