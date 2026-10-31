import React, { useState } from "react";
import { Sparkles, ArrowRight, CheckCircle, AlertTriangle, X } from "lucide-react";
import { reportApi } from "../../services/reportApi";

const CleanMergeSourcesModal = ({
  isOpen = false,
  onClose,
  detectedDuplicates = [],
  sources = [],
  onSuccess,
}) => {
  const [fromSource, setFromSource] = useState("");
  const [toSource, setToSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAutoClean = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage(null);
      const res = await reportApi.autoCleanLeadSources();
      setMessage({
        type: "success",
        text: res?.data?.message || `Successfully cleaned and normalized sources!`,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Auto clean error:", err);
      setError(err.message || "Failed to auto-clean lead sources");
    } finally {
      setLoading(false);
    }
  };

  const handleManualMerge = async (e) => {
    e.preventDefault();
    if (!fromSource.trim() || !toSource.trim()) {
      setError("Please specify both the source to merge from and the target canonical source.");
      return;
    }
    if (fromSource.trim().toLowerCase() === toSource.trim().toLowerCase()) {
      setError("Source to merge from and target source cannot be the same.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage(null);
      const res = await reportApi.mergeLeadSources({
        fromSource: fromSource.trim(),
        toSource: toSource.trim(),
      });
      setMessage({
        type: "success",
        text: res?.data?.message || `Merged "${fromSource}" into "${toSource}" successfully!`,
      });
      setFromSource("");
      setToSource("");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Merge error:", err);
      setError(err.message || "Failed to merge sources");
    } finally {
      setLoading(false);
    }
  };

  const allSourceNames = sources.map((s) => s.sourceName || s);

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <span className="p-2 bg-primary bg-opacity-25 rounded-3 text-info">
                <Sparkles size={20} />
              </span>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0">Clean &amp; Merge Lead Sources</h5>
                <small className="text-light opacity-75">
                  Eliminate near-duplicates (e.g. &apos;Carpet Area CP&apos; vs &apos;Carpet area&apos;) to maintain accurate CP conversion math
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
            />
          </div>

          <div className="modal-body p-4 bg-light">
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3 py-2 px-3 mb-3">
                <AlertTriangle size={18} />
                <span className="small">{error}</span>
              </div>
            )}

            {message && (
              <div className="alert alert-success d-flex align-items-center gap-2 rounded-3 py-2 px-3 mb-3">
                <CheckCircle size={18} />
                <span className="small">{message.text}</span>
              </div>
            )}

            {/* 1. DETECTED DUPLICATES PANEL */}
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <span>Detected Duplicate / Near-Match Sources</span>
                    <span className="badge bg-warning text-dark px-2">
                      {detectedDuplicates.length} found
                    </span>
                  </h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary fw-semibold d-flex align-items-center gap-1 shadow-sm px-3"
                    onClick={handleAutoClean}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>Auto-Clean All</span>
                  </button>
                </div>

                {detectedDuplicates.length === 0 ? (
                  <div className="text-center py-3 text-muted">
                    <CheckCircle className="text-success mb-1" size={24} />
                    <p className="small mb-0">No obvious duplicate sources detected! Your lead source list is clean.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0 align-middle">
                      <thead className="table-light small text-muted">
                        <tr>
                          <th>Canonical Source</th>
                          <th>Raw Variations in DB</th>
                          <th>Detection Reason</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detectedDuplicates.map((dup) => (
                          <tr key={dup.canonical}>
                            <td className="fw-bold text-primary">{dup.canonical}</td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {dup.variants.map((v) => (
                                  <span key={v} className="badge bg-secondary-subtle text-dark border px-2">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">{dup.reason}</small>
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-0 px-2"
                                style={{ fontSize: "12px" }}
                                onClick={() => {
                                  const nonCanonical = dup.variants.find((v) => v !== dup.canonical) || dup.variants[0];
                                  setFromSource(nonCanonical);
                                  setToSource(dup.canonical);
                                }}
                              >
                                Select for Merge
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 2. MANUAL MERGE TOOL */}
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-3">
                <h6 className="fw-bold text-dark mb-2">Manual Source Merger</h6>
                <p className="text-muted small mb-3">
                  Merge all leads from an old or mistyped spelling into a canonical source. Leads and activity history are permanently updated to the target source.
                </p>

                <form onSubmit={handleManualMerge}>
                  <div className="row g-3 align-items-center">
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        From Source (Duplicate / Old)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Carpet area"
                        value={fromSource}
                        onChange={(e) => setFromSource(e.target.value)}
                        list="fromSourcesList"
                        required
                      />
                      <datalist id="fromSourcesList">
                        {allSourceNames.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>

                    <div className="col-md-2 text-center pt-3 d-none d-md-block text-muted">
                      <ArrowRight size={22} />
                    </div>

                    <div className="col-md-5">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        To Canonical Source (Target)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Carpet Area CP"
                        value={toSource}
                        onChange={(e) => setToSource(e.target.value)}
                        list="toSourcesList"
                        required
                      />
                      <datalist id="toSourcesList">
                        {allSourceNames.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-3 gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border"
                      onClick={() => {
                        setFromSource("");
                        setToSource("");
                      }}
                      disabled={loading}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-success fw-semibold px-3"
                      disabled={loading || !fromSource.trim() || !toSource.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                          <span>Merging...</span>
                        </>
                      ) : (
                        <span>Merge Sources</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="modal-footer bg-white border-top px-4 py-2 d-flex justify-content-between align-items-center">
            <small className="text-muted">Changes are reflected immediately across all reports and conversion calculations.</small>
            <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanMergeSourcesModal;
