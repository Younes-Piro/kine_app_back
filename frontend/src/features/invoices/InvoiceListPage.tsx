import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { invoicesApi } from '@/api/invoices';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, type TableColumn } from '@/components/ui/Table';
import { useAppOptions } from '@/hooks/useAppOptions';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatMoney } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/http';
import type { InvoiceDetail, InvoiceListItem } from '@/types/api';

import { downloadStoredInvoicePdf, openInvoicePdfWindow } from './InvoicePDF';

type PdfAction = 'see' | 'save' | 'download';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [clientFilter, setClientFilter] = useState<number | undefined>();
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<number | undefined>();
  const [activePdfAction, setActivePdfAction] = useState<{
    invoiceId: number;
    action: PdfAction;
  } | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', { client_id: clientFilter, invoice_type: invoiceTypeFilter }],
    queryFn: () =>
      invoicesApi.list({
        clientId: clientFilter,
        invoiceTypeId: invoiceTypeFilter,
      }),
  });

  const allInvoicesQuery = useQuery({
    queryKey: ['invoices', 'filter-source'],
    queryFn: () => invoicesApi.list(),
    staleTime: 60_000,
  });

  const invoiceTypeOptionsQuery = useAppOptions('invoice_type');

  const canCreateInvoice = hasPermission('invoice:create');

  const isPdfActionLoading = (invoiceId: number, action: PdfAction) =>
    activePdfAction?.invoiceId === invoiceId && activePdfAction.action === action;

  const openPdfPlaceholder = (title: string) => {
    const popup = window.open('', '_blank');
    if (!popup) {
      return null;
    }

    popup.document.open();
    popup.document.write(`<!doctype html><html><head><title>${title}</title></head><body>Loading PDF...</body></html>`);
    popup.document.close();
    return popup;
  };

  const fetchInvoiceDetail = async (invoiceId: number) =>
    queryClient.fetchQuery({
      queryKey: queryKeys.invoices.detail(invoiceId),
      queryFn: () => invoicesApi.detail(invoiceId),
      staleTime: 60_000,
    });

  const runPdfAction = async (
    invoiceId: number,
    action: PdfAction,
    callback: (invoice: InvoiceDetail) => void,
    options?: { onError?: () => void },
  ) => {
    setActivePdfAction({ invoiceId, action });
    try {
      const invoice = await fetchInvoiceDetail(invoiceId);
      callback(invoice);
    } catch (error) {
      options?.onError?.();
      toast.error(getApiErrorMessage(error, 'Failed to load invoice details'));
    } finally {
      setActivePdfAction((current) =>
        current?.invoiceId === invoiceId && current.action === action ? null : current,
      );
    }
  };

  const handleSeePdf = async (invoiceId: number) => {
    const popup = openPdfPlaceholder('Invoice Preview');
    if (!popup) {
      toast.error('Please allow popups to preview the invoice PDF');
      return;
    }

    await runPdfAction(
      invoiceId,
      'see',
      (invoice) => {
        openInvoicePdfWindow(invoice, { popup });
      },
      {
        onError: () => popup.close(),
      },
    );
  };

  const handleSavePdf = async (invoiceId: number) => {
    const popup = openPdfPlaceholder('Invoice Save');
    if (!popup) {
      toast.error('Please allow popups to save the invoice PDF');
      return;
    }

    await runPdfAction(
      invoiceId,
      'save',
      (invoice) => {
        openInvoicePdfWindow(invoice, { popup, autoPrint: true });
        toast.success('Print dialog opened. Choose "Save as PDF".');
      },
      {
        onError: () => popup.close(),
      },
    );
  };

  const handleDownloadPdf = async (invoiceId: number) => {
    const popup = openPdfPlaceholder('Invoice Download');
    if (!popup) {
      toast.error('Please allow popups to download the invoice PDF');
      return;
    }

    await runPdfAction(
      invoiceId,
      'download',
      (invoice) => {
        if (downloadStoredInvoicePdf(invoice)) {
          popup.close();
          return;
        }

        openInvoicePdfWindow(invoice, { popup, autoPrint: true });
        toast.success('No stored PDF found. Use "Save as PDF" in the print dialog.');
      },
      {
        onError: () => popup.close(),
      },
    );
  };

  const source = allInvoicesQuery.data ?? invoicesQuery.data ?? [];
  const clientOptions = Array.from(
    new Map(source.map((invoice) => [invoice.client, invoice.client_full_name])).entries(),
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const columns: Array<TableColumn<InvoiceListItem>> = [
    {
      header: 'Invoice #',
      render: (invoice) => invoice.invoice_number,
    },
    {
      header: 'Client',
      render: (invoice) => invoice.client_full_name,
    },
    {
      header: 'Type',
      render: (invoice) => invoice.invoice_type_text,
    },
    {
      header: 'Issue Date',
      render: (invoice) => formatDate(invoice.issue_date, 'yyyy-MM-dd'),
    },
    {
      header: 'Sessions',
      render: (invoice) => invoice.number_of_sessions,
    },
    {
      header: 'Total Amount',
      render: (invoice) => formatMoney(invoice.total_amount),
    },
    {
      header: 'PDF',
      className: 'invoice-pdf-actions-col',
      render: (invoice) => (
        <div className="actions-inline invoice-pdf-actions">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isLoading={isPdfActionLoading(invoice.id, 'see')}
            onClick={(event) => {
              event.stopPropagation();
              void handleSeePdf(invoice.id);
            }}
          >
            See PDF
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isLoading={isPdfActionLoading(invoice.id, 'save')}
            onClick={(event) => {
              event.stopPropagation();
              void handleSavePdf(invoice.id);
            }}
          >
            Save PDF
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isPdfActionLoading(invoice.id, 'download')}
            onClick={(event) => {
              event.stopPropagation();
              void handleDownloadPdf(invoice.id);
            }}
          >
            Download PDF
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="card-header-between">
        <div>
          <CardTitle>Invoices</CardTitle>
          <p>Manage invoice records and open details.</p>
        </div>
        {canCreateInvoice ? (
          <Button type="button" onClick={() => navigate('/invoices/new')}>
            New Invoice
          </Button>
        ) : null}
      </CardHeader>

      <CardBody>
        <div className="filters-grid">
          <div className="field">
            <label>Filter by Client</label>
            <select
              className="input"
              value={clientFilter ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                setClientFilter(raw ? Number(raw) : undefined);
              }}
            >
              <option value="">All clients</option>
              {clientOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Filter by Type</label>
            <select
              className="input"
              value={invoiceTypeFilter ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                setInvoiceTypeFilter(raw ? Number(raw) : undefined);
              }}
            >
              <option value="">
                {invoiceTypeOptionsQuery.isLoading ? 'Loading types...' : 'All types'}
              </option>
              {(invoiceTypeOptionsQuery.data ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {invoicesQuery.isLoading ? <p>Loading invoices...</p> : null}
        {invoicesQuery.isError ? <p>Failed to load invoices.</p> : null}

        {!invoicesQuery.isLoading && !invoicesQuery.isError ? (
          <Table
            columns={columns}
            data={invoicesQuery.data ?? []}
            getRowKey={(invoice) => invoice.id}
            emptyMessage="No invoices found."
            onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
