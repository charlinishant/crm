import React, { useState, useMemo } from 'react';
import './Booking.css';

const Booking = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [bookingFilter, setBookingFilter] = useState('All Bookings');

    const bookings = [
        {
            id: 16,
            leadId: "$47",
            bookingName: "Tejas Test 2",
            bookingSales: "-",
            applicantName: "Tejas Test 2",
            applicantSales: "-",
            projectUnit: "Palm Jumeriah",
            stage: "Tentative",
            source: "Direct_walkin",
            bookedBy: "Tejas Sales",
            bookedOn: "Jul 26, 2024",
            agreement: "Rs. 0",
            totalDemanded: "Rs. 0",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 70,
            leadId: "$94",
            bookingName: "Prashanth P",
            bookingSales: "Tejas Sales",
            applicantName: "Prashanth P",
            applicantSales: "Tejas Sales",
            projectUnit: "2703",
            projectSales: "Binghatti Hills",
            stage: "Cancelled",
            source: "-",
            bookedBy: "Tejas Sales",
            bookedOn: "Sep 13, 2024",
            agreement: "Rs. 1.2Cr",
            totalDemanded: "Rs. 0",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 86,
            leadId: "$189",
            bookingName: "Khan",
            bookingSales: "Tejas Sales",
            applicantName: "Khan",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "-",
            bookedBy: "Tejas Sales",
            bookedOn: "Sep 25, 2024",
            agreement: "Rs. 1.2Cr",
            totalDemanded: "Rs. 1.3Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 137,
            leadId: "$811",
            bookingName: "Divya",
            bookingSales: "Tejas Sales",
            applicantName: "Divya",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "Website_",
            bookedBy: "Tejas Sales",
            bookedOn: "Nov 29, 2024",
            agreement: "Rs. 1.3Cr",
            totalDemanded: "Rs. 1.2Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 162,
            leadId: "$8535",
            bookingName: "Ajay Koul",
            bookingSales: "Tejas Sales",
            applicantName: "Ajay Koul",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "-",
            bookedBy: "Tejas Sales",
            bookedOn: "Feb 6, 2025",
            agreement: "Rs. 1.2Cr",
            totalDemanded: "Rs. 1Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 156,
            leadId: "$9020",
            bookingName: "VidyadharProperty Advisor",
            bookingSales: "Tejas Sales",
            applicantName: "VidyadharProperty Advisor",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "-",
            bookedBy: "Tejas Sales",
            bookedOn: "Jan 28, 2025",
            agreement: "Rs. 1.2Cr",
            totalDemanded: "Rs. 1Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 130,
            leadId: "$768",
            bookingName: "Santosh Kumar",
            bookingSales: "Tejas Sales",
            applicantName: "Santosh Kumar",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "-",
            bookedBy: "Tejas Sales",
            bookedOn: "Oct 29, 2024",
            agreement: "Rs. 1.7Cr",
            totalDemanded: "Rs. 1.4Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 183,
            leadId: "$9174",
            bookingName: "Lavien",
            bookingSales: "Tejas Sales",
            applicantName: "Lavien null",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "Website_",
            bookedBy: "Tejas Sales",
            bookedOn: "Mar 5, 2025",
            agreement: "Rs. 1.7Cr",
            totalDemanded: "Rs. 1.4Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 78,
            leadId: "$55",
            bookingName: "Ramakrishna Prestine",
            bookingSales: "Tejas Sales",
            applicantName: "Ramakrishna Prestine",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "Website_",
            bookedBy: "Tejas Sales",
            bookedOn: "Sep 23, 2024",
            agreement: "Rs. 1.7Cr",
            totalDemanded: "Rs. 1.4Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        },
        {
            id: 79,
            leadId: "$53",
            bookingName: "Tejas Mehta",
            bookingSales: "Tejas Sales",
            applicantName: "Tejas Mehta",
            applicantSales: "Tejas Sales",
            projectUnit: "Binghatti Hills",
            projectSales: "",
            stage: "Cancelled",
            source: "-",
            bookedBy: "Tejas Sales",
            bookedOn: "Sep 23, 2024",
            agreement: "Rs. 1.7Cr",
            totalDemanded: "Rs. 1.8Cr",
            actualDemanded: "Rs. 0",
            overdue: "Rs. 0",
            receipts: "Rs. 0",
            creditNotes: "Rs. 0"
        }
    ];

    const filteredBookings = useMemo(() => {
        const query = searchQuery ? searchQuery.toLowerCase() : '';
        return bookings.filter(item => {
            const matchesSearch = Object.values(item).some(val =>
                String(val).toLowerCase().includes(query)
            );

            if (bookingFilter !== 'All Bookings') {
                return matchesSearch && item.stage === bookingFilter;
            }

            return matchesSearch;
        });
    }, [searchQuery, bookingFilter]);

    return (
        <div className="row gy-4" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div className="table-container">
                <div className="table-filter-toolbar">
                    <select
                        className="booking-dropdown"
                        value={bookingFilter}
                        onChange={(e) => setBookingFilter(e.target.value)}
                    >
                        <option>All Bookings</option>
                        <option>Tentative</option>
                        <option>Cancelled</option>
                    </select>

                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <span className="search-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                    </div>
                </div>

                <div className="table-header-info">
                    {filteredBookings.length} items.
                </div>

                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th className="checkbox-col">
                                    <input type="checkbox" />
                                </th>
                                <th>ID</th>
                                <th>LEAD ID</th>
                                <th>BOOKING NAME</th>
                                <th>APPLICANT NAME</th>
                                <th>PROJECT UNIT</th>
                                <th>STAGE</th>
                                <th>SOURCE</th>
                                <th>BOOKED BY SALES</th>
                                <th>BOOKED ON</th>
                                <th className="text-right">AGREEMENT</th>
                                <th className="text-right">TOTAL DEMANDED</th>
                                <th className="text-right">ACTUAL DEMANDED</th>
                                <th className="text-right">Overdue</th>
                                <th className="text-right">Receipts</th>
                                <th className="text-right">Credit Notes</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="summary-row">
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td className="text-right summary-title">Summary</td>
                                <td className="text-right summary-val">Rs. 21Cr</td>
                                <td className="text-right summary-val">Rs. 16Cr</td>
                                <td className="text-right summary-val">Rs. 0</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>

                            {filteredBookings.map((item) => (
                                <tr key={item.id}>
                                    <td className="checkbox-col">
                                        <input type="checkbox" />
                                    </td>
                                    <td># {item.id}</td>
                                    <td className="text-muted">{item.leadId}</td>
                                    <td>
                                        {item.bookingName}
                                        <br />
                                        <span className="text-muted">{item.bookingSales}</span>
                                    </td>
                                    <td>
                                        {item.applicantName}
                                        <br />
                                        <span className="text-muted">{item.applicantSales}</span>
                                    </td>
                                    <td>
                                        {item.projectUnit}
                                        {item.projectSales && (
                                            <>
                                                <br />
                                                <span className="text-muted">{item.projectSales}</span>
                                            </>
                                        )}
                                    </td>
                                    <td>
                                        <span className={
                                            item.stage === "Tentative"
                                                ? "badge-tentative"
                                                : "badge-cancelled"
                                        }>
                                            {item.stage}
                                        </span>
                                    </td>
                                    <td>{item.source}</td>
                                    <td>{item.bookedBy}</td>
                                    <td>{item.bookedOn}</td>
                                    <td className="text-right">{item.agreement}</td>
                                    <td className="text-right">{item.totalDemanded}</td>
                                    <td className="text-right">{item.actualDemanded}</td>
                                    <td className="text-right">{item.overdue}</td>
                                    <td className="text-right">{item.receipts}</td>
                                    <td className="text-right">{item.creditNotes}</td>
                                    <td className="text-right"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Booking;
