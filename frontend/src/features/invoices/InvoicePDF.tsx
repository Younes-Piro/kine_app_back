import { resolveMediaUrl } from '@/lib/formatters';
import type { InvoiceDetail } from '@/types/api';

interface InvoicePDFProps {
  invoice: InvoiceDetail;
}

interface OpenInvoicePdfOptions {
  autoPrint?: boolean;
  popup?: Window | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateForPdf(value?: string | null) {
  if (!value) {
    return '/ / /';
  }

  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!parts) {
    return value;
  }

  return `${parts[3]}/${parts[2]}/${parts[1]}`;
}

function formatAmountForPdf(value?: string | number | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0.00';
  }

  return numeric.toFixed(2);
}

function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return cleaned.length > 0 ? cleaned : 'invoice';
}

export function buildInvoicePrintHtml({ invoice }: InvoicePDFProps) {
  const diagnosis = escapeHtml(invoice.diagnosis?.trim() || '/');
  const typeAndSite = escapeHtml(invoice.type_and_site?.trim() || '/');
  const notes = escapeHtml(invoice.notes?.trim() || '/');
  const sessionRhythm = escapeHtml(invoice.session_rhythm_text?.trim() || '/');
  const intervention = escapeHtml(invoice.invoice_type_text?.trim() || 'Reeducation (AMM)');
  const invoiceNumber = escapeHtml(invoice.invoice_number || '/');
  const clientName = escapeHtml(invoice.client_full_name || '/');
  const issueDate = escapeHtml(formatDateForPdf(invoice.issue_date));
  const startDate = escapeHtml(formatDateForPdf(invoice.start_date));
  const endDate = escapeHtml(formatDateForPdf(invoice.end_date));
  const unitPrice = escapeHtml(formatAmountForPdf(invoice.unit_price));
  const totalAmount = escapeHtml(formatAmountForPdf(invoice.total_amount));

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Facture ${invoiceNumber}</title>
    <style>
      @page {
        size: A4;
        margin: 12mm;
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #2d2d2d;
        font-family: "Times New Roman", Georgia, serif;
      }
      body {
        font-size: 12px;
        line-height: 1.35;
      }
      .invoice-sheet {
        width: 100%;
        max-width: 780px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        border-bottom: 1px solid #787878;
        padding-bottom: 8px;
      }
      .header h1 {
        margin: 0;
        font-size: 36px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
      }
      .header .line {
        margin: 2px 0;
        font-size: 16px;
        letter-spacing: 0.3px;
      }
      .meta {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 12px;
        margin-top: 14px;
        align-items: start;
      }
      .meta .block p {
        margin: 0;
      }
      .meta .center {
        text-align: center;
        font-size: 30px;
        font-weight: 700;
        margin-top: 18px;
      }
      .text-strong {
        font-weight: 700;
      }
      .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 20px;
        row-gap: 8px;
        margin-top: 16px;
      }
      .field-line {
        border-bottom: 1px solid #9a9a9a;
        padding-bottom: 3px;
        min-height: 20px;
      }
      .field-line .label {
        font-weight: 700;
      }
      .patient-row {
        margin-top: 18px;
      }
      .patient-row .label {
        font-size: 22px;
        font-weight: 700;
        text-decoration: underline;
      }
      .patient-row .value {
        margin-left: 8px;
        font-size: 20px;
      }
      .date-lines {
        margin-top: 14px;
      }
      .date-lines p {
        margin: 0 0 6px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 12px;
      }
      th,
      td {
        border: 1px solid #747474;
        padding: 6px 5px;
        vertical-align: top;
        word-wrap: break-word;
      }
      th {
        text-align: center;
        font-weight: 700;
      }
      .col-interventions {
        width: 20%;
      }
      .col-date {
        width: 11%;
      }
      .col-sessions {
        width: 12%;
      }
      .col-price {
        width: 12%;
      }
      .col-total {
        width: 12%;
      }
      .col-notes {
        width: 14%;
      }
      .blank-row td {
        height: 34px;
      }
      tfoot td {
        font-weight: 700;
      }
      .total-label {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .text-right {
        text-align: right;
      }
      @media print {
        .invoice-sheet {
          max-width: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="invoice-sheet">
      <header class="header">
        <h1>CABINET DE KINESITHERAPIE</h1>
        <p class="line">RUE OUED EL MAKHAZINE N° 16 App :1</p>
        <p class="line">LARACHE</p>
      </header>

      <section class="meta">
        <div class="block">
          <p class="text-strong">BOUSFIHA IMAD</p>
          <p>KINE-PHYSIOTHERAPEUTE</p>
          <p>ICE : 002096048000093</p>
          <p>INPE : 015040801</p>
        </div>
        <div class="center">FACTURE N° : ${invoiceNumber}</div>
        <div class="block text-right">
          <p>Patente : 53705148 / IF: N° 86404068</p>
          <p>Banque : Attijariwafabank / 43553001473</p>
          <p>LARACHE</p>
          <p>Tél : 0539501718</p>
        </div>
      </section>

      <section class="fields">
        <div class="field-line"><span class="label">Diagnostic :</span> ${diagnosis}</div>
        <div class="field-line"><span class="label">Nombre des seances :</span> ${invoice.number_of_sessions} seances</div>
        <div class="field-line"><span class="label">Le type et siege :</span> ${typeAndSite}</div>
        <div class="field-line"><span class="label">Le rythme des seances :</span> ${sessionRhythm}</div>
      </section>

      <div class="patient-row">
        <span class="label">Nom du patient :</span>
        <span class="value">${clientName}</span>
      </div>

      <div class="date-lines">
        <p><span class="text-strong">Edite le :</span> ${issueDate}</p>
        <p><span class="text-strong">Fin de traitement :</span> ${endDate}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-interventions" rowspan="2">Interventions</th>
            <th colspan="2">Date de traitement</th>
            <th class="col-sessions" rowspan="2">Nombre de seance</th>
            <th class="col-price" rowspan="2">Prix unitaire</th>
            <th class="col-total" rowspan="2">Montant global</th>
            <th class="col-notes" rowspan="2">Observations</th>
          </tr>
          <tr>
            <th class="col-date">Debut</th>
            <th class="col-date">Fin</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${intervention}</td>
            <td class="text-center">${startDate}</td>
            <td class="text-center">${endDate}</td>
            <td class="text-center">${invoice.number_of_sessions}</td>
            <td class="text-center">${unitPrice} DH</td>
            <td class="text-center">${totalAmount} dhs</td>
            <td>${notes}</td>
          </tr>
          <tr class="blank-row">
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
          <tr class="blank-row">
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="total-label" colspan="5">TOTAL=</td>
            <td class="text-center">${totalAmount} Dhs</td>
            <td>&nbsp;</td>
          </tr>
        </tfoot>
      </table>
    </main>
  </body>
</html>
`.trim();
}

export function openInvoicePdfWindow(invoice: InvoiceDetail, options: OpenInvoicePdfOptions = {}) {
  const popup = options.popup ?? window.open('', '_blank');
  if (!popup || popup.closed) {
    return null;
  }

  popup.document.open();
  popup.document.write(buildInvoicePrintHtml({ invoice }));
  popup.document.close();
  popup.focus();

  if (options.autoPrint) {
    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 250);
  }

  return popup;
}

export function downloadStoredInvoicePdf(
  invoice: Pick<InvoiceDetail, 'invoice_number' | 'pdf_file'>,
) {
  const mediaUrl = resolveMediaUrl(invoice.pdf_file);
  if (!mediaUrl) {
    return false;
  }

  const anchor = document.createElement('a');
  anchor.href = mediaUrl;
  anchor.download = `${sanitizeFileName(invoice.invoice_number)}.pdf`;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  return true;
}
