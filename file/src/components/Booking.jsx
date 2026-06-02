import React, { useEffect, useMemo, useState } from 'react';
import './Booking.css';
import { MoreVertical } from 'lucide-react';

const Booking = () => {
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const RECORDS_PER_PAGE = 10;
    const [searchQuery, setSearchQuery] = useState('');
    const [bookingFilter, setBookingFilter] = useState('All Bookings');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingBookingId, setUpdatingBookingId] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const formatMoney = (value) => {
        if (value === undefined || value === null || value === "") return "Rs. 0";
        return `Rs. ${Number(value).toLocaleString("en-IN")}`;
    };

    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_URL}/bookings?limit=100`);
                if (!response.ok) throw new Error("Unable to load bookings");

                const result = await response.json();
                const bookingList = Array.isArray(result) ? result : result?.data || [];
                setBookings(bookingList);
            } catch (error) {
                console.error("Unable to load bookings:", error);
                setBookings([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [API_URL]);

    const rows = useMemo(() => bookings.map((booking) => ({
        id: booking.id,
        leadId: booking.leadId ? `$${booking.leadId}` : "-",
        bookingName: booking.customerName || "Customer",
        bookingSales: booking.bookedBy || "-",
        applicantName: booking.customerName || "Customer",
        applicantSales: booking.bookedBy || "-",
        projectUnit: booking.unit || "-",
        projectSales: booking.projectDetails || "",
        stage: booking.stage || "Tentative",
        source: booking.source || "-",
        bookedBy: booking.bookedBy || "-",
        bookedOn: formatDate(booking.bookedOn),
        agreement: formatMoney(booking.basePrice),
        totalDemanded: "Rs. 0",
        actualDemanded: "Rs. 0",
        overdue: "Rs. 0",
        receipts: "Rs. 0",
        creditNotes: "Rs. 0"
    })), [bookings]);

    const handleStageChange = async (bookingId, stage) => {
        setUpdatingBookingId(bookingId);
        setStatusMessage('');

        const previousBookings = bookings;
        setBookings((current) =>
            current.map((booking) =>
                booking.id === bookingId ? { ...booking, stage } : booking
            )
        );

        try {
            const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ stage }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result?.message || "Unable to update booking status");
            }

            setBookings((current) =>
                current.map((booking) =>
                    booking.id === bookingId ? { ...booking, ...result, stage: result.stage || stage } : booking
                )
            );
            setStatusMessage(`Booking #${bookingId} status updated.`);
        } catch (error) {
            console.error("Unable to update booking status:", error);
            setBookings(previousBookings);
            setStatusMessage("Booking status could not be updated.");
        } finally {
            setUpdatingBookingId(null);
        }
    };

    const filteredBookings = useMemo(() => {
        const query = searchQuery ? searchQuery.toLowerCase() : '';
        return rows.filter(item => {
            const matchesSearch = Object.values(item).some(val =>
                String(val).toLowerCase().includes(query)
            );

            if (bookingFilter !== 'All Bookings') {
                return matchesSearch && item.stage === bookingFilter;
            }

            return matchesSearch;
        });
    }, [searchQuery, bookingFilter, rows]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, bookingFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / RECORDS_PER_PAGE));

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    const currentBookings = filteredBookings.slice(
        (currentPage - 1) * RECORDS_PER_PAGE,
        currentPage * RECORDS_PER_PAGE
    );
    const showingFrom = filteredBookings.length === 0 ? 0 : (currentPage - 1) * RECORDS_PER_PAGE + 1;
    const showingTo = Math.min(currentPage * RECORDS_PER_PAGE, filteredBookings.length);

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(1, page - 1));
    };

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(totalPages, page + 1));
    };

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
                            <option>Booked</option>
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
                    {statusMessage && (
                        <div className="booking-status-message">{statusMessage}</div>
                    )}
                    <table className="floor-table">
                        <thead>
                            <tr>
                                <th style={{ borderStartStartRadius: '8px', borderEndStartRadius: '8px' }}>Lead Id</th>
                                <th>Booking Name</th>
                                <th>Applicant Name</th>
                                <th>Project Unit</th>
                                <th>Stage</th>
                                <th>Source</th>
                                <th>Booked By</th>
                                <th>Booked On</th>
                                <th className="text-right">Agreement</th>
                                <th className="text-right">Total Demanded</th>
                                <th className="text-right">Actual Demanded</th>
                                <th className="text-right">Overdue</th>
                                <th className="text-right">Receipts</th>
                                <th className="text-right">Credit Notes</th>
                                <th style={{ borderStartEndRadius: '8px', borderEndEndRadius: '8px' }} className="text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                           
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="17" className="text-center py-4">
                                        {loading ? "Loading bookings..." : "No bookings found."}
                                    </td>
                                </tr>
                            ) : (
                                currentBookings.map((item) => (
                                    <tr key={item.id}>
                                        {/* <td>{item.id}</td> */}
                                        <td className="text-muted">{item.leadId}</td>
                                        <td>
                                            <strong>{item.bookingName}</strong>
                                            <br />
                                            {/* <span className="text-muted">{item.bookingSales}</span> */}
                                        </td>
                                        <td>
                                            <strong>{item.applicantName}</strong>
                                            <br />
                                            {/* <span className="text-muted">{item.applicantSales}</span> */}
                                        </td>
                                        <td>
                                            {item.projectUnit}
                                            {item.projectSales && (
                                                <>
                                                    <br />
                                                    {/* <span className="text-muted">{item.projectSales}</span> */}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                className={`booking-stage-select booking-stage-${String(item.stage).toLowerCase()}`}
                                                value={item.stage}
                                                onChange={(event) => handleStageChange(item.id, event.target.value)}
                                                disabled={updatingBookingId === item.id}
                                                aria-label={`Update booking ${item.id} stage`}
                                            >
                                                <option value="Tentative">Tentative</option>
                                                <option value="Booked">Booked</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
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
                                        <td className="text-right">
                                            <button
                                                type="button"
                                                className="booking-action-button"
                                                aria-label={`Open actions for booking ${item.id}`}
                                            >
                                                <MoreVertical size={16} strokeWidth={2.2} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="booking-pagination">
                    <span className="booking-pagination-info">
                        Showing {showingFrom}-{showingTo} of {filteredBookings.length}
                    </span>
                    <div className="booking-pagination-actions">
                        <button
                            type="button"
                            className="booking-page-button"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span className="booking-page-count">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            type="button"
                            className="booking-page-button"
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Booking;
