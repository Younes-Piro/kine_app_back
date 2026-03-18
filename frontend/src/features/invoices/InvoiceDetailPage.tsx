import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { invoicesApi } from '@/api/invoices';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate, formatMoney, resolveMediaUrl } from '@/lib/formatters';

import { buildInvoicePrintHtml } from './InvoicePDF';

export function InvoiceDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params.id);

  const invoiceQuery = useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: () => invoicesApi.detail(invoiceId),
    enabled: Number.isFinite(invoiceId),
  });

  if (!Number.isFinite(invoiceId)) {
    return <p>Invalid invoice id.</p>;
  }

  if (invoiceQuery.isLoading) {
    return <p>Loading invoice details...</p>;
  }

  if (invoiceQuery.isError || !invoiceQuery.data) {
    return <p>Invoice not found.</p>;
  }

  const invoice = invoiceQuery.data;
  const backendPdfUrl = resolveMediaUrl(invoice.pdf_file);

  const handleGeneratePdf = () => {
    const popup = window.open('', '_blank');
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(buildInvoicePrintHtml({ invoice }));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <Card>
      <CardHeader className="card-header-between">
        <div>
          <CardTitle>{invoice.invoice_number}</CardTitle>
          <p>{invoice.client_full_name}</p>
        </div>

        <div className="actions-inline">
          <Button type="button" variant="secondary" onClick={() => navigate('/invoices')}>
            Back
          </Button>
          <Button type="button" onClick={handleGeneratePdf}>
            Generate PDF
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        <div className="detail-grid">
          <div className="metric-card">
            <h4>Invoice Type</h4>
            <p>{invoice.invoice_type_text}</p>
          </div>
          <div className="metric-card">
            <h4>Issue Date</h4>
            <p>{formatDate(invoice.issue_date, 'yyyy-MM-dd')}</p>
          </div>
          <div className="metric-card">
            <h4>Start Date</h4>
            <p>{formatDate(invoice.start_date, 'yyyy-MM-dd')}</p>
          </div>
          <div className="metric-card">
            <h4>End Date</h4>
            <p>{formatDate(invoice.end_date, 'yyyy-MM-dd')}</p>
          </div>
          <div className="metric-card">
            <h4>Session Rhythm</h4>
            <p>{invoice.session_rhythm_text || 'N/A'}</p>
          </div>
          <div className="metric-card">
            <h4>Sessions</h4>
            <p>{invoice.number_of_sessions}</p>
          </div>
          <div className="metric-card">
            <h4>Unit Price</h4>
            <p>{formatMoney(invoice.unit_price)}</p>
          </div>
          <div className="metric-card">
            <h4>Total Amount</h4>
            <strong>{formatMoney(invoice.total_amount)}</strong>
          </div>
        </div>

        <div className="client-info-grid">
          <div>
            <h4>Diagnosis</h4>
            <p>{invoice.diagnosis ?? 'N/A'}</p>
          </div>
          <div>
            <h4>Type and Site</h4>
            <p>{invoice.type_and_site ?? 'N/A'}</p>
          </div>
          <div>
            <h4>Notes</h4>
            <p>{invoice.notes ?? 'N/A'}</p>
          </div>
          <div>
            <h4>Stored PDF</h4>
            {backendPdfUrl ? (
              <a href={backendPdfUrl} target="_blank" rel="noreferrer">
                Download stored PDF
              </a>
            ) : (
              <p>No stored PDF file.</p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
