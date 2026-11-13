import React, { useRef, useState } from 'react';
import { SlipData } from '../types/index.ts';
import { Printer, Download, X, CheckCircle2, Receipt } from 'lucide-react';
import { formatDisplayDate } from '../../server/src/utils/dateHelper.ts';
import { jsPDF } from 'jspdf';

interface SlipModalProps {
  slip: SlipData | null;
  onClose: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const SlipModal: React.FC<SlipModalProps> = ({ slip, onClose }) => {
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!slip) return null;

  const isIssue = slip.slipType === 'ISSUE';
  const isReturn = slip.slipType === 'RETURN';
  const isPayment = slip.slipType === 'PAYMENT';

  const slipTitle = isIssue
    ? 'Book Issue Slip'
    : isReturn
    ? 'Book Return Slip'
    : 'Fine Payment Receipt';

  const referenceId = isPayment ? slip.fineId : slip.transactionId;
  const formattedSlipDate = formatDisplayDate(slip.slipDate);

  const buildPrintableHtml = (): string => {
    const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
      { label: 'Reference ID', value: referenceId },
      { label: 'Slip Date', value: formattedSlipDate },
      { label: 'Member Name', value: slip.memberName },
      { label: 'Member Code', value: slip.memberCode },
      { label: 'Book Title', value: slip.bookTitle },
    ];

    if ('bookIsbn' in slip && slip.bookIsbn) {
      rows.push({ label: 'ISBN', value: slip.bookIsbn });
    }

    if (isIssue) {
      rows.push({ label: 'Issue Date', value: formatDisplayDate(slip.issueDate) });
      rows.push({ label: 'Due Date (14 Days)', value: formatDisplayDate(slip.dueDate), highlight: true });
    } else if (isReturn) {
      rows.push({ label: 'Issue Date', value: formatDisplayDate(slip.issueDate) });
      rows.push({ label: 'Due Date', value: formatDisplayDate(slip.dueDate) });
      rows.push({ label: 'Return Date', value: formatDisplayDate(slip.returnDate) });
      if (slip.daysLate > 0) {
        rows.push({
          label: `Late Fine (${slip.daysLate} days × ₹5)`,
          value: `₹${slip.fineAmount} (Unpaid)`,
          highlight: true,
        });
      } else {
        rows.push({ label: 'Return Status', value: 'Returned on time (₹0 fine)' });
      }
    } else if (isPayment) {
      rows.push({
        label: 'Amount Paid in Full',
        value: `₹${slip.amountPaid}`,
        highlight: true,
      });
      rows.push({ label: 'Payment Date', value: formatDisplayDate(slip.paymentDate) });
    }

    const tableRows = rows
      .map(
        row => `
        <tr class="${row.highlight ? 'highlight-row' : ''}">
          <td class="label">${escapeHtml(row.label)}</td>
          <td class="value">${escapeHtml(row.value)}</td>
        </tr>`
      )
      .join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(slipTitle)} - ${escapeHtml(referenceId)}</title>
  <style>
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .receipt {
      max-width: 440px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 24px;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 1px dashed #cbd5e1;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 16px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .header p {
      margin: 4px 0 10px;
      font-size: 11px;
      color: #475569;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    td {
      padding: 8px 6px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    td.label {
      color: #64748b;
      font-weight: 500;
      width: 42%;
    }
    td.value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    tr.highlight-row td {
      background: #f8fafc;
      font-weight: 700;
    }
    .footer {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Library Management System</h1>
      <p>College Library Circulation Desk</p>
      <span class="badge">${escapeHtml(slipTitle)}</span>
    </div>
    <table>
      ${tableRows}
    </table>
    <div class="footer">
      Authorized Library Circulation Receipt • Keep this slip for your records
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const iframe = printFrameRef.current;
    if (!iframe) return;

    setIsPrinting(true);
    const html = buildPrintableHtml();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => setIsPrinting(false), 300);
      }
    };

    iframe.onload = triggerPrint;
    iframe.srcdoc = html;
  };

  const handleSavePdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('LIBRARY MANAGEMENT SYSTEM', pageWidth / 2, y, { align: 'center' });

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('College Library Circulation Desk', pageWidth / 2, y, { align: 'center' });

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text(slipTitle.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    const addField = (label: string, value: string, emphasize = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 14, y);

      doc.setFont('helvetica', emphasize ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      const wrapped = doc.splitTextToSize(value, pageWidth - 76);
      doc.text(wrapped, pageWidth - 14, y, { align: 'right' });

      y += Math.max(7, wrapped.length * 4.8 + 2.5);
    };

    addField('Reference ID', referenceId);
    addField('Slip Date', formattedSlipDate);
    addField('Member Name', slip.memberName, true);
    addField('Member Code', slip.memberCode, true);
    addField('Book Title', slip.bookTitle, true);

    if ('bookIsbn' in slip && slip.bookIsbn) {
      addField('ISBN', slip.bookIsbn);
    }

    if (isIssue) {
      addField('Issue Date', formatDisplayDate(slip.issueDate));
      addField('Due Date (14 Days)', formatDisplayDate(slip.dueDate), true);
    } else if (isReturn) {
      addField('Issue Date', formatDisplayDate(slip.issueDate));
      addField('Due Date', formatDisplayDate(slip.dueDate));
      addField('Return Date', formatDisplayDate(slip.returnDate), true);
      if (slip.daysLate > 0) {
        addField('Late Duration', `${slip.daysLate} days`);
        addField('Accrued Fine', `Rs. ${slip.fineAmount} (Unpaid)`, true);
      } else {
        addField('Return Status', 'Returned on time (Rs. 0 fine)');
      }
    } else if (isPayment) {
      addField('Amount Paid in Full', `Rs. ${slip.amountPaid}`, true);
      addField('Payment Date', formatDisplayDate(slip.paymentDate), true);
    }

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, pageWidth - 14, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Library Circulation Document', pageWidth / 2, y, { align: 'center' });
    doc.text('Keep this receipt for your library records.', pageWidth / 2, y + 4.5, { align: 'center' });

    const safeRef = referenceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Library_${slip.slipType}_Slip_${safeRef}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <iframe
        ref={printFrameRef}
        title="Receipt Print Frame"
        className="fixed right-0 bottom-0 w-0 h-0 border-0 pointer-events-none"
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header bar with Close */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-800 text-sm">Official Library Document</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div id="printable-slip" className="p-6 font-sans">
          {/* Institution Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-200">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 uppercase">
              College Library Desk
            </h2>
            <p className="text-xs text-slate-500 font-medium">Circulation Division & Information Services</p>
            <div className="inline-block mt-2">
              {isIssue && (
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                  Book Issue Slip
                </span>
              )}
              {isReturn && (
                <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                  Book Return Slip
                </span>
              )}
              {isPayment && (
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                  Fine Payment Receipt
                </span>
              )}
            </div>
          </div>

          {/* Reference Meta */}
          <div className="my-4 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between text-xs font-mono text-slate-600">
            <span>Ref: {referenceId}</span>
            <span>Date: {formattedSlipDate}</span>
          </div>

          {/* Core Information Details */}
          <div className="space-y-3 text-xs">
            {/* Member Info */}
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Borrower / Member</span>
              <div className="text-right">
                <span className="font-bold text-slate-900 block">{slip.memberName}</span>
                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  {slip.memberCode}
                </span>
              </div>
            </div>

            {/* Book Info */}
            <div className="flex justify-between items-start gap-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium shrink-0">Book Title</span>
              <div className="text-right">
                <span className="font-semibold text-slate-900 block leading-tight">{slip.bookTitle}</span>
                {'bookIsbn' in slip && slip.bookIsbn && (
                  <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block whitespace-nowrap">
                    ISBN: {slip.bookIsbn}
                  </span>
                )}
              </div>
            </div>

            {/* Issue Dates */}
            {isIssue && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Issue Date</span>
                  <span className="font-medium text-slate-800">{formatDisplayDate(slip.issueDate)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 bg-amber-50/60 px-2 rounded">
                  <span className="text-amber-900 font-semibold">Due Date (14 Days)</span>
                  <span className="font-bold text-amber-900 font-mono text-sm">{formatDisplayDate(slip.dueDate)}</span>
                </div>
              </>
            )}

            {/* Return Dates & Fine */}
            {isReturn && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Issue Date</span>
                  <span className="font-medium text-slate-800">{formatDisplayDate(slip.issueDate)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Due Date</span>
                  <span className="font-medium text-slate-800">{formatDisplayDate(slip.dueDate)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Return Date</span>
                  <span className="font-bold text-slate-900">{formatDisplayDate(slip.returnDate)}</span>
                </div>
                {slip.daysLate > 0 ? (
                  <div className="p-2.5 my-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex justify-between text-xs text-red-800 font-semibold mb-1">
                      <span>Late Return ({slip.daysLate} days × ₹5)</span>
                      <span className="font-mono font-bold text-sm">₹{slip.fineAmount}</span>
                    </div>
                    <p className="text-[11px] text-red-600">
                      Unpaid fine generated. Please settle at the fines desk.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 my-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Returned on time. Zero fine accrued.</span>
                  </div>
                )}
              </>
            )}

            {/* Payment Details */}
            {isPayment && (
              <div className="p-3 my-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex justify-between text-xs text-emerald-900 font-semibold mb-1">
                  <span>Amount Paid in Full</span>
                  <span className="font-mono font-extrabold text-base text-emerald-800">₹{slip.amountPaid}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700">
                  <span>Payment Date</span>
                  <span className="font-medium">{formatDisplayDate(slip.paymentDate)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-center">
            <div className="font-mono text-[9px] tracking-widest text-slate-400 select-none">
              ||| | | |||| | ||| |||| | ||||| || | ||| ||| |
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Authorized Library Desk System • Keep this slip for your records
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              Save PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <Printer className="w-3.5 h-3.5" />
              {isPrinting ? 'Preparing...' : 'Print Slip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
