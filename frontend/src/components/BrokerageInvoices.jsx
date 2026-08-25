import React, { useMemo } from "react";

const BrokerageInvoices = () => {
  const invoices = useMemo(() => [], []);

  return (
    <div className="row gy-4" style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <div className="invoice-wrapper-card">
        <div className="table-header-info">
          <span className="items-count">
            {invoices.length} items. Sorted by 'Created at desc'
          </span>
          <div className="header-actions">
            <button className="btn-new-invoice">New Invoice</button>
            <button className="btn-filter-icon" aria-label="Filter invoices">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>INVOICE ID</th>
                <th>LEAD ID</th>
                <th>BOOKING ID</th>
                <th>INVOICE TO</th>
                <th>BOOKING NAME</th>
                <th>BROKERAGE NAME(S)</th>
                <th>STATUS</th>
                <th className="text-right">TOTAL AMOUNT</th>
                <th className="text-right">DUE ON</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="brokerage-empty-state">
                    No brokerage invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.leadId}</td>
                    <td className="text-muted-id">{invoice.bookingId}</td>
                    <td>{invoice.invoiceTo}</td>
                    <td>
                      {invoice.bookingName}
                      {invoice.role && (
                        <span className="text-muted-sub">{invoice.role}</span>
                      )}
                    </td>
                    <td>{invoice.brokerageName}</td>
                    <td>
                      <span className={invoice.status === "Cancelled" ? "badge-cancelled" : "badge-generated"}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="text-right">{invoice.totalAmount}</td>
                    <td className="text-right">{invoice.dueOn}</td>
                    <td className="text-right">
                      <span className="action-icon">...</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BrokerageInvoices;
