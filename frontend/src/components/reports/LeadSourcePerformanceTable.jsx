import React, { useMemo, useState } from "react";
import {
  Download,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Phone,
  Clock,
  TrendingUp,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { reportApi } from "../../services/reportApi";
import CleanMergeSourcesModal from "./CleanMergeSourcesModal";

const RECORDS_PER_PAGE = 10;

const LeadSourcePerformanceTable = ({
  sourceData = { sources: [], summary: {}, detectedDuplicates: [] },
  filters = {},
  onMetricClick,
  onRefresh,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSources, setExpandedSources] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [singleDownloading, setSingleDownloading] = useState("");

  const sources = sourceData?.sources || [];
  const summary = sourceData?.summary || {};
  const dateRange = sourceData?.dateRange || {};
  const detectedDuplicates = sourceData?.detectedDuplicates || [];

  const toggleExpand = (sourceName) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceName)) next.delete(sourceName);
      else next.add(sourceName);
      return next;
    });
  };

  const handleDownloadExcel = async (specificSourceName = "") => {
    try {
      if (specificSourceName) setSingleDownloading(specificSourceName);
      else setDownloading(true);
      setDownloadError("");
      await reportApi.downloadLeadSourceExcel(filters, specificSourceName);
    } catch (err) {
      console.error("Lead source download error:", err);
      setDownloadError(err.message || "Failed to download Lead Source Excel report");
      alert(err.message || "Failed to download Lead Source Excel report");
    } finally {
      if (specificSourceName) setSingleDownloading("");
      else setDownloading(false);
    }
  };

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) =>
      [
        s.sourceName,
        s.sourceType,
        s.cpUser?.name,
        s.cpUser?.phone,
        s.cpUser?.reraNumber,
        s.salespeopleSummary,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [sources, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSources.length / RECORDS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * RECORDS_PER_PAGE;
  const paginatedSources = filteredSources.slice(pageStartIndex, pageStartIndex + RECORDS_PER_PAGE);
  const pageEndIndex = Math.min(pageStartIndex + paginatedSources.length, filteredSources.length);

  const renderClickable = (source, metric, label, count, badgeClass = "badge-light") => {
    const val = count ?? 0;
    if (!val || val === 0 || !onMetricClick) {
      return <span className="text-muted">{val}</span>;
    }
    return (
      <button
        type="button"
        className={`btn btn-sm p-0 border-0 fw-bold text-decoration-none ${badgeClass}`}
        style={{ cursor: "pointer", fontSize: "13px" }}
        onClick={(e) => {
          e.stopPropagation();
          onMetricClick({
            sourceName: source.sourceName,
            leadSource: source.sourceName,
            metric,
            metricLabel: label,
            count: val,
            title: `${label} — ${source.sourceName}`,
          });
        }}
        title={`Click to view ${val} ${label}`}
      >
        {val}
      </button>
    );
  };

  return (
    <div className="admin-report-table-card lead-source-performance-table-card shadow-sm border-0 rounded-3 mt-4">
      {/* ── CARD HEADER ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 bg-white border-bottom rounded-top-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success-subtle text-success fw-bold px-2 py-1">CP Quality</span>
            <h5 className="mb-0 fw-bold text-dark">Lead Source &amp; Channel Partner Performance</h5>
          </div>
          <small className="text-muted">
            Data-quality &amp; outcome report per source: effort, lead quality, site visits, bookings and 2-way conversion % (IST)
            {dateRange.fromDate && (
              <span className="ms-1 fw-semibold text-primary">
                ({dateRange.fromDate} {dateRange.toDate !== dateRange.fromDate ? `to ${dateRange.toDate}` : ""})
              </span>
            )}
          </small>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Clean & Merge Button */}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 fw-semibold shadow-sm px-3 py-2"
            onClick={() => setIsCleanModalOpen(true)}
            title="Clean near-duplicate sources (e.g. 'Carpet Area CP' vs 'Carpet area') and standardize the source list"
          >
            <Sparkles size={15} className="text-warning" />
            <span>Clean &amp; Merge Sources</span>
            {detectedDuplicates.length > 0 && (
              <span className="badge bg-warning text-dark ms-1 px-1.5 py-0.5" style={{ fontSize: "11px" }}>
                {detectedDuplicates.length}
              </span>
            )}
          </button>

          {/* Download Excel Button */}
          <button
            type="button"
            className="btn btn-success d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
            onClick={() => handleDownloadExcel()}
            disabled={downloading}
            title="Download multi-sheet Lead Source & CP Performance Report (Excel)"
          >
            {downloading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download Source Report (Excel)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="alert alert-danger mx-3 mt-3 mb-0 py-2 small">{downloadError}</div>
      )}

      {/* ── KPI SUMMARY STRIP ── */}
      <div className="p-3 bg-light border-bottom">
        <div className="row g-2 text-center">
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Total Sources</small>
              <strong className="fs-6 text-dark">{summary.totalSources || 0}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Leads Provided</small>
              <strong className="fs-6 text-primary">{summary.totalLeadsProvided || 0}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Assigned %</small>
              <strong className="fs-6 text-info">{summary.overallAssignedRate || 0}%</strong>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Contacted %</small>
              <strong className="fs-6 text-secondary">{summary.overallContactRate || 0}%</strong>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Qual ÷ Prov %</small>
              <strong className="fs-6 text-success">{summary.overallQualifiedRate || 0}%</strong>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Book ÷ Prov %</small>
              <strong className="fs-6 text-purple" style={{ color: "#7c3aed" }}>{summary.overallBookingRate || 0}%</strong>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="bg-white p-2 rounded-2 border shadow-xs">
              <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px" }}>Booking Value</small>
              <strong className="fs-6 text-success">{summary.totalBookingValueFormatted || "₹ 0"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="p-3 bg-white d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom">
        <label className="crm-table-search m-0" style={{ maxWidth: "340px", width: "100%" }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search lead source or Channel Partner..."
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "6px 12px",
              width: "100%",
              outline: "none",
            }}
          />
        </label>
        <div className="text-muted small">
          Showing <strong>{filteredSources.length ? pageStartIndex + 1 : 0}</strong> to{" "}
          <strong>{pageEndIndex}</strong> of <strong>{filteredSources.length}</strong> sources
        </div>
      </div>

      {/* ── MAIN TABLE ── */}
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0" style={{ minWidth: "1250px" }}>
          <thead className="table-light text-muted small text-uppercase" style={{ fontSize: "11px" }}>
            {/* Top Header Grouping */}
            <tr className="border-bottom">
              <th colSpan="2" className="bg-white text-dark fw-bold border-end">Source / Partner</th>
              <th colSpan="3" className="bg-primary-subtle text-primary fw-bold border-end text-center">Volume &amp; Assignment</th>
              <th colSpan="3" className="bg-info-subtle text-info fw-bold border-end text-center">Contact Effort</th>
              <th colSpan="3" className="bg-warning-subtle text-dark fw-bold border-end text-center">Outcomes &amp; Quality</th>
              <th colSpan="2" className="bg-success-subtle text-success fw-bold border-end text-center">Visits &amp; Deals</th>
              <th colSpan="2" className="bg-purple-subtle fw-bold border-end text-center" style={{ color: "#7c3aed" }}>Two-Way Conversion %</th>
              <th className="bg-white text-dark fw-bold text-center">Attribution</th>
            </tr>
            {/* Individual Columns */}
            <tr>
              <th style={{ width: "36px" }}></th>
              <th>Lead Source / CP</th>

              {/* Volume */}
              <th className="text-center">Provided</th>
              <th className="text-center">Assigned</th>
              <th className="text-center border-end">Assigned %</th>

              {/* Effort */}
              <th className="text-center">Contacted</th>
              <th className="text-center">Calls</th>
              <th className="text-center border-end">Talk Time</th>

              {/* Quality */}
              <th className="text-center">Qualified</th>
              <th className="text-center">Unqualified</th>
              <th className="text-center border-end">Junk</th>

              {/* Visits & Deals */}
              <th className="text-center">Visits Done</th>
              <th className="text-center border-end">Bookings (₹)</th>

              {/* 2-Way Conversion */}
              <th className="text-center">Qual ÷ Prov</th>
              <th className="text-center border-end">Book ÷ Prov</th>

              <th>Salespeople Worked</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSources.length ? (
              paginatedSources.map((row) => {
                const isExpanded = expandedSources.has(row.sourceName);
                const isSingleExporting = singleDownloading === row.sourceName;

                return (
                  <React.Fragment key={row.sourceName}>
                    <tr
                      className={isExpanded ? "table-active" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleExpand(row.sourceName)}
                    >
                      {/* Expand Toggle */}
                      <td className="text-center p-2" onClick={(e) => { e.stopPropagation(); toggleExpand(row.sourceName); }}>
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-primary" />
                        ) : (
                          <ChevronRight size={16} className="text-muted" />
                        )}
                      </td>

                      {/* Source Name & CP Info */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <strong className="text-dark fs-6">{row.sourceName}</strong>
                          <span
                            className={`badge px-2 py-0.5 rounded-pill ${
                              row.isChannelPartner
                                ? "bg-primary-subtle text-primary border border-primary-subtle"
                                : "bg-secondary-subtle text-dark border"
                            }`}
                            style={{ fontSize: "10px" }}
                          >
                            {row.isChannelPartner ? "Channel Partner" : row.sourceType}
                          </span>
                        </div>
                        {row.cpUser ? (
                          <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                            CP: <strong>{row.cpUser.name}</strong> • Phone: {row.cpUser.phone} • RERA: {row.cpUser.reraNumber || "N/A"}
                          </small>
                        ) : null}
                      </td>

                      {/* Volume & Assignment */}
                      <td className="text-center">
                        {renderClickable(row, "leads", "Leads Provided", row.leadsProvided, "text-primary fw-bold")}
                      </td>
                      <td className="text-center">
                        <span className="text-dark fw-semibold">{row.leadsAssigned}</span>
                      </td>
                      <td className="text-center border-end">
                        <span className="badge bg-light text-dark border px-2 py-1">
                          {row.assignedPercentage}%
                        </span>
                      </td>

                      {/* Contact Effort */}
                      <td className="text-center">
                        {renderClickable(row, "contacted", "Contacted Leads", row.contactedLeads, "text-secondary fw-semibold")}
                      </td>
                      <td className="text-center">
                        {renderClickable(row, "calls", "Calls", row.totalCalls, "text-dark")}
                      </td>
                      <td className="text-center border-end">
                        <small className="text-muted">{row.totalTalkTimeFormatted}</small>
                      </td>

                      {/* Outcomes & Quality */}
                      <td className="text-center">
                        {renderClickable(row, "qualified", "Qualified Leads", row.qualified, "text-success fw-bold")}
                      </td>
                      <td className="text-center">
                        {renderClickable(row, "unqualified", "Unqualified Leads", row.unqualified, "text-warning fw-semibold")}
                      </td>
                      <td className="text-center border-end">
                        {renderClickable(row, "junk", "Junk Leads", row.junk, "text-danger fw-semibold")}
                      </td>

                      {/* Visits & Deals */}
                      <td className="text-center">
                        {renderClickable(row, "visits", "Site Visits Done", row.siteVisitsConducted, "text-info fw-bold")}
                      </td>
                      <td className="text-center border-end">
                        {row.bookingsCount > 0 ? (
                          <div>
                            <span className="badge bg-success text-white px-2 py-0.5 fw-bold">
                              {row.bookingsCount} booked
                            </span>
                            <small className="text-success d-block fw-semibold" style={{ fontSize: "11px" }}>
                              {row.bookingValueFormatted}
                            </small>
                          </div>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>

                      {/* 2-Way Conversion % */}
                      <td className="text-center">
                        <div className="d-flex flex-column align-items-center">
                          <span
                            className={`badge px-2 py-1 fw-bold ${
                              row.qualifiedRate >= 20
                                ? "bg-success text-white"
                                : row.qualifiedRate >= 10
                                ? "bg-warning text-dark"
                                : "bg-light text-dark border"
                            }`}
                          >
                            {row.qualifiedRate}%
                          </span>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Data Quality</small>
                        </div>
                      </td>

                      <td className="text-center border-end">
                        <div className="d-flex flex-column align-items-center">
                          <span
                            className={`badge px-2 py-1 fw-bold ${
                              row.bookingRate > 0 ? "bg-primary text-white" : "bg-light text-muted border"
                            }`}
                          >
                            {row.bookingRate}%
                          </span>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Deal Conv.</small>
                        </div>
                      </td>

                      {/* Salespeople summary */}
                      <td>
                        <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: "220px" }}>
                          {row.salespeopleSummary}
                        </small>
                      </td>
                    </tr>

                    {/* ── EXPANDED ROW: DETAILED CP DATA QUALITY BREAKDOWN ── */}
                    {isExpanded && (
                      <tr className="bg-light-subtle">
                        <td colSpan="16" className="p-3 bg-white border-bottom">
                          <div className="p-3 rounded-3 border bg-light">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                <span>Detailed Performance Breakdown for &quot;{row.sourceName}&quot;</span>
                                <span className="badge bg-secondary px-2">{row.leadsProvided} leads</span>
                              </h6>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 shadow-sm px-2 py-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadExcel(row.sourceName);
                                }}
                                disabled={isSingleExporting}
                                title="Export single Channel Partner performance sheet to share directly with this partner"
                              >
                                {isSingleExporting ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                ) : (
                                  <FileSpreadsheet size={14} />
                                )}
                                <span>Export Single CP Report</span>
                              </button>
                            </div>

                            <div className="row g-3">
                              {/* 1. Lead Quality Distribution */}
                              <div className="col-md-4">
                                <div className="p-3 bg-white rounded-3 border shadow-xs h-100">
                                  <span className="text-uppercase small fw-bold text-muted d-block mb-2" style={{ fontSize: "11px" }}>
                                    Lead Quality Composition
                                  </span>
                                  <div className="progress mb-2" style={{ height: "12px" }}>
                                    <div
                                      className="progress-bar bg-success"
                                      role="progressbar"
                                      style={{ width: `${row.qualifiedRate}%` }}
                                      title={`Qualified: ${row.qualified}`}
                                    />
                                    <div
                                      className="progress-bar bg-warning"
                                      role="progressbar"
                                      style={{
                                        width: `${row.leadsProvided > 0 ? ((row.unqualified / row.leadsProvided) * 100).toFixed(1) : 0}%`,
                                      }}
                                      title={`Unqualified: ${row.unqualified}`}
                                    />
                                    <div
                                      className="progress-bar bg-danger"
                                      role="progressbar"
                                      style={{
                                        width: `${row.leadsProvided > 0 ? ((row.junk / row.leadsProvided) * 100).toFixed(1) : 0}%`,
                                      }}
                                      title={`Junk: ${row.junk}`}
                                    />
                                  </div>
                                  <div className="d-flex justify-content-between small text-muted">
                                    <span>
                                      <strong className="text-success">{row.qualified}</strong> Qual ({row.qualifiedRate}%)
                                    </span>
                                    <span>
                                      <strong className="text-warning">{row.unqualified}</strong> Unqual
                                    </span>
                                    <span>
                                      <strong className="text-danger">{row.junk}</strong> Junk
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Call Dispositions Breakdown */}
                              <div className="col-md-4">
                                <div className="p-3 bg-white rounded-3 border shadow-xs h-100">
                                  <span className="text-uppercase small fw-bold text-muted d-block mb-2" style={{ fontSize: "11px" }}>
                                    Call Dispositions Logged
                                  </span>
                                  <div className="d-flex flex-wrap gap-1">
                                    <span className="badge bg-light text-dark border px-2 py-1">
                                      Callback: {row.dispositionBreakdown.callbackLater}
                                    </span>
                                    <span className="badge bg-light text-dark border px-2 py-1">
                                      Not Interested: {row.dispositionBreakdown.notInterested}
                                    </span>
                                    <span className="badge bg-light text-dark border px-2 py-1">
                                      Busy: {row.dispositionBreakdown.busy}
                                    </span>
                                    <span className="badge bg-light text-dark border px-2 py-1">
                                      No Answer: {row.dispositionBreakdown.noAnswer}
                                    </span>
                                    <span className="badge bg-danger-subtle text-danger border px-2 py-1">
                                      Wrong No: {row.dispositionBreakdown.wrongNumber}
                                    </span>
                                    <span className="badge bg-success-subtle text-success border px-2 py-1">
                                      Qualified: {row.dispositionBreakdown.qualified}
                                    </span>
                                    <span className="badge bg-danger text-white px-2 py-1">
                                      Junk: {row.dispositionBreakdown.junk}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Salespeople Worked */}
                              <div className="col-md-4">
                                <div className="p-3 bg-white rounded-3 border shadow-xs h-100">
                                  <span className="text-uppercase small fw-bold text-muted d-block mb-2" style={{ fontSize: "11px" }}>
                                    Salespeople Assigned &amp; Worked
                                  </span>
                                  {row.salespeopleWorked.length === 0 ? (
                                    <small className="text-muted">No salespeople assigned to leads from this source yet.</small>
                                  ) : (
                                    <ul className="list-unstyled mb-0 small">
                                      {row.salespeopleWorked.slice(0, 5).map((s) => (
                                        <li key={s.userName} className="d-flex justify-content-between py-1 border-bottom">
                                          <span className="fw-semibold text-dark">{s.userName}</span>
                                          <span className="text-muted">
                                            {s.leadsWorked} leads • {s.calls} calls
                                          </span>
                                        </li>
                                      ))}
                                      {row.salespeopleWorked.length > 5 && (
                                        <li className="text-muted pt-1 text-center small">
                                          + {row.salespeopleWorked.length - 5} more salespeople
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="16" className="text-center py-4 text-muted">
                  No lead source records found for the selected filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION CONTROLS ── */}
      {totalPages > 1 && (
        <div className="p-3 bg-white border-top d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Page {activePage} of {totalPages}
          </small>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="btn btn-light disabled text-dark fw-bold px-3">
              {activePage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── CLEAN & MERGE SOURCES MODAL ── */}
      <CleanMergeSourcesModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        detectedDuplicates={detectedDuplicates}
        sources={sources}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};

export default LeadSourcePerformanceTable;
