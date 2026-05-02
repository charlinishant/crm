
 import React from 'react';
 import "./BrokerageInvoices.css"

const  BrokerageInvoices = () => {
   
    const invoices = [
        {
            id: 758184643,
            leadId: "$9674",
            bookingId: "#449",
            invoiceTo: "Developer",
            bookingName: "Hemantha",
            role: "Post Sale Manager",
            brokerageName: "Hello home",
            status: "Generated",
            totalAmount: "₹ 2,36,000",
            dueOn: "Apr 30, 2026"
        },
        {
            id: 7192031728,
            leadId: "$9674",
            bookingId: "#449",
            invoiceTo: "Channel Partner",
            bookingName: "Hemantha",
            role: "Post Sale Manager",
            brokerageName: "Zeeshan Khan (Our Nes...",
            status: "Generated",
            totalAmount: "₹ 2,20,000",
            dueOn: "-"
        },
        {
            id: 6613708484,
            leadId: "$85",
            bookingId: "#36",
            invoiceTo: "Channel Partner",
            bookingName: "Shaurya S",
            role: "Tejas Sales",
            brokerageName: "Zeeshan Khan (Our Nes...",
            status: "Generated",
            totalAmount: "₹ 2,00,000",
            dueOn: "-"
        },
        {
            id: 6182012868,
            leadId: "$9352",
            bookingId: "#235",
            invoiceTo: "Channel Partner",
            bookingName: "Harsh Vardhan",
            role: "Post Sale Manager",
            brokerageName: "Shaheen Sheikh (Propte...",
            status: "Cancelled",
            totalAmount: "₹ 4,00,000",
            dueOn: "Nov 26, 2025"
        },
        {
            id: 5800576814,
            leadId: "-",
            bookingId: "-",
            invoiceTo: "Seller",
            bookingName: "-",
            role: "",
            brokerageName: "Our Nest Realty",
            status: "Generated",
            totalAmount: "₹ 2,00,000",
            dueOn: "-"
        },
        {
            id: 5741304119,
            leadId: "$113",
            bookingId: "#53",
            invoiceTo: "Channel Partner",
            bookingName: "jawed A",
            role: "Tejas Sales",
            brokerageName: "Zeeshan Khan (Our Nes...",
            status: "Generated",
            totalAmount: "₹ 1,18,000",
            dueOn: "-"
        },
        {
            id: 4487511234,
            leadId: "$47",
            bookingId: "#16",
            invoiceTo: "Developer",
            bookingName: "Tejas Test 2",
            role: "",
            brokerageName: "hshshhs",
            status: "Generated",
            totalAmount: "₹ 0",
            dueOn: "Apr 17, 2025"
        },
        {
            id: 2838636299,
            leadId: "$65",
            bookingId: "#112",
            invoiceTo: "Channel Partner",
            bookingName: "Tejas Mehta",
            role: "",
            brokerageName: "Zeeshan Khan (Our Nes...",
            status: "Generated",
            totalAmount: "₹ 1,50,000",
            dueOn: "Nov 15, 2024"
        }
    ];

    return (
        <div className="row gy-4" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div className="invoice-wrapper-card">
                {/* Header controls: items count, New Invoice button, and filter icon */}
                <div className="table-header-info">
                    <span className="items-count">8 items. Sorted by 'Created at desc'</span>
                    <div className="header-actions">
                        <button className="btn-new-invoice">New Invoice</button>
                        <button className="btn-filter-icon">
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
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td>{inv.id}</td>
                                    <td>{inv.leadId}</td>
                                    <td className="text-muted-id">{inv.bookingId}</td>
                                    <td>{inv.invoiceTo}</td>
                                    <td>
                                        {inv.bookingName}
                                        {inv.role && (
                                            <span className="text-muted-sub">{inv.role}</span>
                                        )}
                                    </td>
                                    <td>{inv.brokerageName}</td>
                                    <td>
                                        <span className={
                                            inv.status === "Cancelled"
                                                ? "badge-cancelled"
                                                : "badge-generated"
                                        }>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="text-right">{inv.totalAmount}</td>
                                    <td className="text-right">{inv.dueOn}</td>
                                    <td className="text-right">
                                        <span className="action-icon">⋮</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};




export default BrokerageInvoices;