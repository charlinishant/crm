import React, { useState, useEffect } from "react";
import { ShieldAlert, Lock, AlertTriangle, CheckCircle, Eye, EyeOff, RotateCcw, X } from "lucide-react";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function BookingCancellationModal({ booking, onClose, onCancelled }) {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5002";
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState(null);
  const [reason, setReason] = useState("");
  const [superAdminPassword, setSuperAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [paymentTreatment, setPaymentTreatment] = useState("REFUND");
  const [refundAmount, setRefundAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formatMoney = (val) => {
    if (val === undefined || val === null || val === "") return "₹ 0";
    const num = Number(val);
    if (!Number.isFinite(num)) return "₹ 0";
    return `₹ ${num.toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    if (!booking?.id) return;
    let isMounted = true;
    setLoadingSummary(true);
    setErrorMessage("");

    fetch(`${API_URL}/bookings/${booking.id}/cancellation-summary`, {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load cancellation summary");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          if (data.totalCollected > 0) {
            setRefundAmount(String(data.totalCollected));
          }
        }
      })
      .catch((err) => {
        console.error("Summary error:", err);
        if (isMounted) {
          // Fallback summary using raw booking
          setSummary({
            bookingId: booking.id,
            customerName: booking.customerName || "Customer",
            projectName: booking.projectDetails || booking.unitItem?.unit?.project?.name || "-",
            unitName: booking.unitItem?.name || booking.unit?.unitNo || booking.unit?.name || "-",
            agreementValue: booking.agreementValue || booking.soldPrice || booking.totalPrice || 0,
            totalCollected: 0,
            requiresPaymentTreatment: false,
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoadingSummary(false);
      });

    return () => {
      isMounted = false;
    };
  }, [booking?.id, API_URL]);

  if (!booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!reason.trim()) {
      setErrorMessage("Cancellation reason is mandatory for audit logging.");
      return;
    }

    if (reason.trim().length < 5) {
      setErrorMessage("Please enter a detailed cancellation reason (at least 5 characters).");
      return;
    }

    if (!superAdminPassword.trim()) {
      setErrorMessage("Super-admin password is required to authorize booking cancellation.");
      return;
    }

    const totalCollected = summary?.totalCollected || 0;
    if (totalCollected > 0 && !["REFUND", "FORFEIT"].includes(paymentTreatment)) {
      setErrorMessage("Please select a payment handling option (Refund or Forfeit).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          superAdminPassword: superAdminPassword.trim(),
          reason: reason.trim(),
          paymentTreatment: totalCollected > 0 ? paymentTreatment : "NONE",
          refundAmount: totalCollected > 0 && paymentTreatment === "REFUND" ? Number(refundAmount) || totalCollected : 0,
          paymentNotes: paymentNotes.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel booking. Please verify the super-admin password.");
      }

      if (onCancelled) {
        onCancelled(data.data || { id: booking.id, stage: "Cancelled" });
      }
      onClose();
    } catch (err) {
      console.error("Cancellation error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during cancellation.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollected = summary?.totalCollected || 0;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.7)", zIndex: 1060, backdropFilter: "blur(3px)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0 rounded-3 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-danger text-white py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <ShieldAlert size={22} className="text-white" />
              <div>
                <h5 className="modal-title fw-bold mb-0 text-white">Authorize Booking Cancellation</h5>
                <small className="text-white-50">Super-Admin Password Gate & Inventory Release</small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={onClose}
              disabled={submitting}
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3 shadow-sm border-0">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  <div className="small fw-semibold">{errorMessage}</div>
                </div>
              )}

              {/* Booking Summary Box */}
              <div className="card bg-light border-0 rounded-2 p-3 mb-3">
                <div className="row g-2 text-dark">
                  <div className="col-sm-3">
                    <span className="text-muted small d-block">Booking ID</span>
                    <strong className="text-primary">#{booking.id}</strong>
                  </div>
                  <div className="col-sm-3">
                    <span className="text-muted small d-block">Customer</span>
                    <strong className="text-truncate d-block">{booking.customerName || summary?.customerName || "-"}</strong>
                  </div>
                  <div className="col-sm-3">
                    <span className="text-muted small d-block">Unit / Project</span>
                    <strong className="text-truncate d-block">
                      {summary?.unitName || booking.unitItem?.name || booking.unit?.unitNo || "-"} ({summary?.projectName || booking.projectDetails || "-"})
                    </strong>
                  </div>
                  <div className="col-sm-3">
                    <span className="text-muted small d-block">Agreement Value</span>
                    <strong className="text-success">{formatMoney(summary?.agreementValue || booking.agreementValue)}</strong>
                  </div>
                </div>
              </div>

              {/* Inventory Release Notice */}
              <div className="alert alert-info border-info border-opacity-25 bg-info bg-opacity-10 py-2 px-3 mb-3 d-flex align-items-start gap-2">
                <RotateCcw size={18} className="text-info mt-1 flex-shrink-0" />
                <div className="small">
                  <strong>Inventory Auto-Release:</strong> Cancelling this booking will mark it as <code>Cancelled</code> (soft-cancel) and immediately release <strong>Unit {summary?.unitName || booking.unitItem?.name || booking.unit?.unitNo || ""}</strong> back to <strong>Available</strong> in inventory so it can be re-sold. Cost sheets and records will remain archived for accounting & RERA audits.
                </div>
              </div>

              {/* Payments Guard Section */}
              {loadingSummary ? (
                <div className="p-3 text-center text-muted small">
                  Checking collections & payment records...
                </div>
              ) : totalCollected > 0 ? (
                <div className="card border-warning border-opacity-50 bg-warning bg-opacity-10 p-3 mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <AlertTriangle size={18} className="text-warning flex-shrink-0" />
                    <h6 className="fw-bold mb-0 text-dark">Payments Guard: Collections Detected</h6>
                  </div>
                  <p className="small text-muted mb-2">
                    A total of <strong className="text-danger">{formatMoney(totalCollected)}</strong> has been collected against this booking across {summary?.receipts?.length || 1} receipt(s). You must record how these funds will be handled:
                  </p>

                  <div className="row g-2 mb-2">
                    <div className="col-sm-6">
                      <div
                        className={`p-2 rounded border bg-white cursor-pointer ${
                          paymentTreatment === "REFUND" ? "border-primary shadow-sm" : "border-secondary border-opacity-25"
                        }`}
                        onClick={() => setPaymentTreatment("REFUND")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="form-check mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentTreatment"
                            id="treatmentRefund"
                            value="REFUND"
                            checked={paymentTreatment === "REFUND"}
                            onChange={() => setPaymentTreatment("REFUND")}
                          />
                          <label className="form-check-label fw-bold small ms-1" htmlFor="treatmentRefund">
                            Refund to Customer
                          </label>
                        </div>
                        <small className="text-muted d-block ps-4" style={{ fontSize: 11 }}>
                          Record refund transaction in ledger
                        </small>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div
                        className={`p-2 rounded border bg-white cursor-pointer ${
                          paymentTreatment === "FORFEIT" ? "border-danger shadow-sm" : "border-secondary border-opacity-25"
                        }`}
                        onClick={() => setPaymentTreatment("FORFEIT")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="form-check mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentTreatment"
                            id="treatmentForfeit"
                            value="FORFEIT"
                            checked={paymentTreatment === "FORFEIT"}
                            onChange={() => setPaymentTreatment("FORFEIT")}
                          />
                          <label className="form-check-label fw-bold small ms-1" htmlFor="treatmentForfeit">
                            Forfeit Amount
                          </label>
                        </div>
                        <small className="text-muted d-block ps-4" style={{ fontSize: 11 }}>
                          Retain collected amount as forfeited revenue
                        </small>
                      </div>
                    </div>
                  </div>

                  {paymentTreatment === "REFUND" && (
                    <div className="row g-2 mb-1">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-dark mb-1">Refund Amount (₹)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          max={totalCollected}
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-dark mb-1">Refund Reference / Mode</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Bank Transfer UTR #881923"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {paymentTreatment === "FORFEIT" && (
                    <div className="mb-1">
                      <label className="form-label small fw-semibold text-dark mb-1">Forfeiture Remarks</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Forfeited per clause 4.2 of booking agreement"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert alert-success border-success border-opacity-25 bg-success bg-opacity-10 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <CheckCircle size={18} className="text-success flex-shrink-0" />
                  <div className="small">
                    <strong>Payment Guard Check:</strong> No payments or receipts recorded against this booking. Safe to cancel without refund reconciliation.
                  </div>
                </div>
              )}

              {/* Cancellation Reason */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-dark mb-1">
                  Cancellation Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="Mandatory reason for cancellation (needed for CP commission, audit log, and accounting)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              {/* Super-Admin Re-Authentication Gate */}
              <div className="p-3 border rounded-2 bg-white shadow-sm border-danger border-opacity-50">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Lock size={16} className="text-danger" />
                  <label className="form-label small fw-bold text-danger mb-0">
                    Super-Admin Re-Authentication Password <span className="text-danger">*</span>
                  </label>
                </div>
                <div className="input-group input-group-sm">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control form-control-sm border-end-0"
                    placeholder="Enter super-admin password to authorize"
                    value={superAdminPassword}
                    onChange={(e) => setSuperAdminPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-start-0"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <small className="text-muted d-block mt-1" style={{ fontSize: 11 }}>
                  Changing booking stage to Cancelled affects revenue, unit availability, and channel partner commission. Enter the Super-Admin authorization password to proceed.
                </small>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer bg-light px-4 py-2 border-top d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3"
                onClick={onClose}
                disabled={submitting}
              >
                Keep Booking
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-danger px-3 d-inline-flex align-items-center gap-2 shadow-sm"
                disabled={submitting || !reason.trim() || !superAdminPassword.trim()}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Cancelling & Releasing Unit...
                  </>
                ) : (
                  <>
                    <Lock size={14} /> Authorize Cancellation & Release Unit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
