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
            projectSales: "",
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
        <div className="floor-dashboard">
            <div className="floor-card">
                <div className="floor-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <select
                            className="form-select form-select-sm booking-dropdown"
                            style={{ width: "160px" }}
                            value={bookingFilter}
                            onChange={(e) => setBookingFilter(e.target.value)}
                        >
                            <option>All Bookings</option>
                            <option>Tentative</option>
                            <option>Cancelled</option>
                        </select>
                        <span className="item-count">{filteredBookings.length} items.</span>
                    </div>

                    <div className="action-wrapper">
                        <div className="search-container">
                            <input
                                type="text"
                                className="form-control form-control-sm search-input-override"
                                placeholder="Search bookings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {/* SVG icon remains untouched */}
                            <span className="search-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="floor-table">
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
                                <th>BOOKED BY</th>
                                <th>BOOKED ON</th>
                                <th className="text-right">AGREEMENT</th>
                                <th className="text-right">TOTAL DEMANDED</th>
                                <th className="text-right">ACTUAL DEMANDED</th>
                                <th className="text-right">OVERDUE</th>
                                <th className="text-right">RECEIPTS</th>
                                <th className="text-right">CREDIT NOTES</th>
                                <th className="text-right">ACTIONS</th>
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
                                <td className="text-right summary-title">Summary:</td>
                                <td className="text-right summary-val">Rs. 21Cr</td>
                                <td className="text-right summary-val">Rs. 16Cr</td>
                                <td className="text-right summary-val">Rs. 0</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>

                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="17" className="text-center py-4">
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map((item) => (
                                    <tr key={item.id}>
                                        <td className="checkbox-col">
                                            <input type="checkbox" />
                                        </td>
                                        <td># {item.id}</td>
                                        <td className="text-muted">{item.leadId}</td>
                                        <td>
                                            <strong>{item.bookingName}</strong>
                                            <br />
                                            <span className="text-muted">{item.bookingSales}</span>
                                        </td>
                                        <td>
                                            <strong>{item.applicantName}</strong>
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
                                        <td className="text-right">...</td>
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

export default Booking;