import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Eye, Lock, ShieldAlert, Info, Download } from 'lucide-react';
import BookingPreviewModal from '../user/BookingPreviewModal';
import BookingCancellationModal from './BookingCancellationModal';
import TableSelectionCheckbox from './table/TableSelectionCheckbox';
import { useTableSelection } from './table/useTableSelection';
import BulkActionToolbar from './table/BulkActionToolbar';

const cleanSourceForDisplay = (source) => {
    if (!source || typeof source !== 'string') return "-";
    const parts = source.split('|').map((s) => s.trim());
    for (const part of parts) {
        if (part.startsWith('source:')) {
            const val = part.replace('source:', '').trim();
            if (val) return val;
        }
    }
    const filtered = parts.filter(
        (p) => !p.startsWith('sourceLocked:') && !p.startsWith('taggedAt:') && !p.startsWith('taggedBy:') && !p.startsWith('source:')
    );
    if (filtered.length > 0 && filtered[0]) return filtered[0];
    const firstClean = source.replace(/source:/gi, '').split('|')[0].trim();
    return firstClean || "-";
};

const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const Booking = () => {
    const navigate = useNavigate();
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5002";
    const RECORDS_PER_PAGE = 10;
    const [searchQuery, setSearchQuery] = useState('');
    const [bookingFilter, setBookingFilter] = useState('All Bookings');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingBookingId, setUpdatingBookingId] = useState(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [previewBooking, setPreviewBooking] = useState(null);
    const [cancellationBooking, setCancellationBooking] = useState(null);
    const [auditModalBooking, setAuditModalBooking] = useState(null);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    const [auditLogsData, setAuditLogsData] = useState(null);

    const openCancellationAudit = async (booking) => {
        setAuditModalBooking(booking);
        setAuditLogsLoading(true);
        setAuditLogsData(null);
        try {
            const res = await fetch(`${API_URL}/bookings/${booking.id}/cancellation-summary`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setAuditLogsData(data);
            }
        } catch (e) {
            console.error("Failed to load audit logs", e);
        } finally {
            setAuditLogsLoading(false);
        }
    };

    const handleBookingCancelled = (cancelledData) => {
        setStatusMessage(`Booking #${cancelledData.id} cancelled successfully. Unit inventory released back to Available.`);
        setBookings((current) =>
            current.map((b) =>
                b.id === cancelledData.id ? { ...b, stage: "Cancelled", activeUnitItemId: null } : b
            )
        );
        fetchBookings();
    };

    const formatMoney = (value) => {
        if (value === undefined || value === null || value === "") return "-";
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return "-";
        return `₹ ${amount.toLocaleString("en-IN")}`;
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

    const getBookingProject = (booking) =>
        booking.projectDetails ||
        booking.unitItem?.unit?.project?.name ||
        booking.unit?.project?.name ||
        "-";

    const getBookingUnit = (booking) => {
        if (booking.unitItem?.name) return booking.unitItem.name;
        if (booking.unit?.name) return booking.unit.name;
        if (booking.unit?.unitNo) return booking.unit.unitNo;
        if (booking.unit?.id) return `Unit #${booking.unit.id}`;
        if (typeof booking.unit === "string") return booking.unit;
        return "-";
    };

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/bookings?limit=200`, {
                headers: getAuthHeaders(),
            });
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

    useEffect(() => {
        fetchBookings();
    }, [API_URL]);

    const rows = useMemo(() => bookings.map((booking) => ({
        id: booking.id,
        leadId: booking.leadId ? `#${booking.leadId}` : "-",
        customerName: booking.customerName || "Customer",
        project: getBookingProject(booking),
        bookingUnit: getBookingUnit(booking),
        stage: booking.stage || "Tentative",
        source: cleanSourceForDisplay(booking.source),
        bookedBy: booking.bookedBy || "-",
        bookedOn: formatDate(booking.bookedOn || booking.createdAt),
        agreementValue: formatMoney(booking.agreementValue ?? booking.soldPrice ?? booking.totalPrice ?? booking.basePrice),
        rawBooking: booking,
    })), [bookings]);

    const handleStageChange = async (bookingId, stage) => {
        if (stage === "Cancelled") {
            const raw = bookings.find((b) => b.id === bookingId);
            setCancellationBooking(raw || { id: bookingId });
            return;
        }

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
                headers: getAuthHeaders(),
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
            setStatusMessage(`Booking #${bookingId} stage updated to ${stage}.`);
        } catch (error) {
            console.error("Unable to update booking status:", error);
            setBookings(previousBookings);
            setStatusMessage(error.message || "Booking status could not be updated.");
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

    const tableSelection = useTableSelection({
        rows: currentBookings,
        getRowId: (item) => item.id,
        disabled: bulkDeleting,
        pruneOnRowsChange: true,
    });

    const handleBulkDelete = async () => {
        if (tableSelection.selectedCount === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${tableSelection.selectedCount} selected booking(s)?`)) {
            return;
        }
        setBulkDeleting(true);
        try {
            const deletePromises = tableSelection.selectedIds.map((id) =>
                fetch(`${API_URL}/bookings/${id}`, { method: "DELETE", headers: getAuthHeaders() })
            );
            await Promise.all(deletePromises);
            setBookings((prev) => prev.filter((b) => !tableSelection.selectedIds.includes(b.id)));
            tableSelection.clearSelection();
            setStatusMessage("Selected bookings deleted successfully.");
        } catch (err) {
            console.error("Bulk delete failed:", err);
            setStatusMessage("Failed to delete selected bookings.");
        } finally {
            setBulkDeleting(false);
        }
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(1, page - 1));
    };

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(totalPages, page + 1));
    };

    return (
        <div className="floor-dashboard booking-dashboard">
            <div className="floor-card booking-card">
                <div className="floor-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <select
                            className="form-select booking-dropdown"
                            value={bookingFilter}
                            onChange={(e) => setBookingFilter(e.target.value)}
                        >
                            <option value="All Bookings">All Bookings</option>
                            <option value="Tentative">Tentative</option>
                            <option value="Booked">Booked</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
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
                    {tableSelection.selectedCount > 0 && (
                        <BulkActionToolbar
                            count={tableSelection.selectedCount}
                            entityLabel="bookings"
                            isDeleting={bulkDeleting}
                            onClear={() => {
                                tableSelection.clearSelection();
                                setStatusMessage('');
                            }}
                            onDelete={handleBulkDelete}
                            deleteLabel="Delete selected"
                        />
                    )}
                    <table className="floor-table booking-table-wide">
                        <thead>
                            <tr>
                                <th style={{ borderStartStartRadius: '8px', borderEndStartRadius: '8px', width: '48px', textAlign: 'center', padding: '14px 12px' }}>
                                    <TableSelectionCheckbox
                                        checked={tableSelection.allVisibleSelected}
                                        indeterminate={tableSelection.isHeaderIndeterminate}
                                        label="Select visible bookings"
                                        onChange={tableSelection.toggleVisible}
                                        disabled={bulkDeleting || currentBookings.length === 0}
                                    />
                                </th>
                                <th>Lead Id</th>
                                <th>Customer Name</th>
                                <th>Project</th>
                                <th>Unit</th>
                                <th>Agreement Value</th>
                                <th>Stage</th>
                                <th>Source</th>
                                <th>Booked By</th>
                                <th>Booked Date</th>
                                <th style={{ borderStartEndRadius: '8px', borderEndEndRadius: '8px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-4">
                                        {loading ? "Loading bookings..." : "No bookings found."}
                                    </td>
                                </tr>
                            ) : (
                                currentBookings.map((item) => (
                                    <tr key={item.id} className={tableSelection.isSelected(item.id) ? "selected" : ""}>
                                        <td style={{ textAlign: 'center', padding: '14px 12px' }}>
                                            <TableSelectionCheckbox
                                                checked={tableSelection.isSelected(item.id)}
                                                label={`Select booking ${item.id}`}
                                                onChange={() => tableSelection.toggleRow(item.id)}
                                                disabled={bulkDeleting}
                                            />
                                        </td>
                                        <td className="text-muted fw-bold">{item.leadId}</td>
                                        <td>
                                            <strong>{item.customerName}</strong>
                                        </td>
                                        <td>
                                            {item.project}
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border px-2 py-1">
                                                {item.bookingUnit}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{item.agreementValue}</strong>
                                        </td>
                                        <td>
                                            {item.stage === "Cancelled" ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger py-0 px-2 d-inline-flex align-items-center gap-1 rounded-pill"
                                                    style={{ fontSize: 12, fontWeight: 600, height: 26 }}
                                                    title="Cancelled under Super-Admin Authorization. Click to view cancellation audit."
                                                    onClick={() => openCancellationAudit(item.rawBooking || item)}
                                                >
                                                    <Lock size={11} /> Cancelled
                                                </button>
                                            ) : (
                                                <select
                                                    className={`booking-stage-select booking-stage-${String(item.stage).toLowerCase()}`}
                                                    value={item.stage}
                                                    onChange={(event) => handleStageChange(item.id, event.target.value)}
                                                    disabled={updatingBookingId === item.id}
                                                    aria-label={`Update booking ${item.id} stage`}
                                                >
                                                    <option value="Tentative">Tentative</option>
                                                    <option value="Booked">Booked</option>
                                                    <option value="Confirmed">Confirmed</option>
                                                    <option value="Cancelled">🔒 Cancelled (Gated)</option>
                                                </select>
                                            )}
                                        </td>
                                        <td>
                                            <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">
                                                {item.source}
                                            </span>
                                        </td>
                                        <td>{item.bookedBy}</td>
                                        <td>{item.bookedOn}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="d-flex align-items-center justify-content-center gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1"
                                                    style={{ fontSize: 12, borderRadius: 6 }}
                                                    title="View Booking Details & Cost Sheet"
                                                    onClick={() => setPreviewBooking(item.rawBooking)}
                                                >
                                                    <Eye size={13} /> View
                                                </button>
                                                {item.stage === "Cancelled" ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary py-1 px-2 d-inline-flex align-items-center gap-1"
                                                        style={{ fontSize: 12, borderRadius: 6 }}
                                                        title="View Cancellation Audit & History"
                                                        onClick={() => openCancellationAudit(item.rawBooking || item)}
                                                    >
                                                        <Info size={13} /> Audit
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger py-1 px-2 d-inline-flex align-items-center gap-1"
                                                        style={{ fontSize: 12, borderRadius: 6 }}
                                                        title="Cancel Booking & Release Unit (Super-Admin Gate)"
                                                        onClick={() => setCancellationBooking(item.rawBooking || item)}
                                                    >
                                                        <ShieldAlert size={13} /> Cancel
                                                    </button>
                                                )}
                                            </div>
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
            <BookingPreviewModal booking={previewBooking} onClose={() => setPreviewBooking(null)} />

            {cancellationBooking && (
                <BookingCancellationModal
                    booking={cancellationBooking}
                    onClose={() => setCancellationBooking(null)}
                    onCancelled={handleBookingCancelled}
                />
            )}

            {auditModalBooking && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.7)", zIndex: 1060, backdropFilter: "blur(3px)" }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0 rounded-3 overflow-hidden">
                            <div className="modal-header bg-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <ShieldAlert size={20} className="text-warning" />
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0 text-white">Cancellation Audit Log</h5>
                                        <small className="text-white-50">Booking #{auditModalBooking.id}</small>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    aria-label="Close"
                                    onClick={() => setAuditModalBooking(null)}
                                />
                            </div>
                            <div className="modal-body p-4">
                                {auditLogsLoading ? (
                                    <div className="text-center py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                        Loading audit history...
                                    </div>
                                ) : (
                                    <div>
                                        <div className="card bg-light border-0 p-3 mb-3">
                                            <div className="row g-2 small">
                                                <div className="col-6">
                                                    <span className="text-muted d-block">Customer</span>
                                                    <strong>{auditLogsData?.customerName || auditModalBooking.customerName || "-"}</strong>
                                                </div>
                                                <div className="col-6">
                                                    <span className="text-muted d-block">Unit / Project</span>
                                                    <strong>
                                                        {auditLogsData?.unitName || auditModalBooking.bookingUnit || "-"} ({auditLogsData?.projectName || auditModalBooking.project || "-"})
                                                    </strong>
                                                </div>
                                                <div className="col-6 mt-2">
                                                    <span className="text-muted d-block">Current Inventory Status</span>
                                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                                                        {auditLogsData?.unitStatus || "Available"} (Released)
                                                    </span>
                                                </div>
                                                <div className="col-6 mt-2">
                                                    <span className="text-muted d-block">Total Collections Recorded</span>
                                                    <strong>{formatMoney(auditLogsData?.totalCollected)}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <h6 className="fw-bold text-dark mb-2">Audit Events</h6>
                                        {auditLogsData?.cancellationHistory?.length > 0 ? (
                                            auditLogsData.cancellationHistory.map((log) => {
                                                let parsed = {};
                                                try {
                                                    parsed = JSON.parse(log.details);
                                                } catch (e) {
                                                    parsed = { reason: log.details };
                                                }
                                                return (
                                                    <div key={log.id} className="p-3 border rounded-2 bg-white mb-2 shadow-sm">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
                                                                {log.action}
                                                            </span>
                                                            <small className="text-muted">{formatDate(log.createdAt)}</small>
                                                        </div>
                                                        <div className="small mb-1">
                                                            <strong>Reason:</strong> {parsed.reason || log.details || "-"}
                                                        </div>
                                                        <div className="small text-muted mb-1">
                                                            <strong>Authorized By:</strong> {log.performedBy || parsed.cancelledBy || "Super-Admin"}
                                                            {parsed.cancelledByRole && ` (${parsed.cancelledByRole})`}
                                                        </div>
                                                        {parsed.paymentTreatment && parsed.paymentTreatment !== "NONE" && (
                                                            <div className="small text-dark mt-1 p-2 bg-light rounded">
                                                                <strong>Payment Handling:</strong> {parsed.paymentTreatment}
                                                                {parsed.refundAmount > 0 && ` (₹ ${parsed.refundAmount.toLocaleString("en-IN")})`}
                                                                {parsed.paymentNotes && <div className="text-muted">Note: {parsed.paymentNotes}</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-muted small p-2 bg-light rounded text-center">
                                                No detailed audit events recorded for this booking cancellation.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light px-4 py-2 border-top">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setAuditModalBooking(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Booking;
