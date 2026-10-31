import React, { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronRight, Phone, Clock, AlertTriangle, CheckCircle, UserCheck, Calendar, Eye } from "lucide-react";
import { reportApi } from "../../services/reportApi";

const RECORDS_PER_PAGE = 10;

const DprPerformanceTable = ({
  dprData = { callers: [], summary: {} },
  filters = {},
  onMetricClick,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const callers = dprData?.callers || [];
  const summary = dprData?.summary || {};
  const dateRange = dprData?.dateRange || {};

  const toggleExpand = (userId) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      setDownloadError("");
      await reportApi.downloadDprExcel(filters);
    } catch (err) {
      console.error("DPR download error:", err);
      setDownloadError(err.message || "Failed to download DPR Excel");
    } finally {
      setDownloading(false);
    }
  };

  const filteredCallers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return callers;
    return callers.filter((c) =>
      [
        c.userName,
        c.role,
        c.phone,
        c.extension,
        c.sources?.topSource,
        c.sources?.sourcesSummary,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [callers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCallers.length / RECORDS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * RECORDS_PER_PAGE;
  const paginatedCallers = filteredCallers.slice(pageStartIndex, pageStartIndex + RECORDS_PER_PAGE);
  const pageEndIndex = Math.min(pageStartIndex + paginatedCallers.length, filteredCallers.length);

  const renderClickable = (caller, metric, label, count, badgeClass = "badge-light") => {
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
            userId: caller.userId,
            salesUserId: caller.userId,
            userName: caller.userName,
            metric,
            metricLabel: label,
            count: val,
            title: `${label} — ${caller.userName}`,
          });
        }}
        title={`Click to view ${val} ${label}`}
      >
        {val}
      </button>
    );
  };

  return (
    <div className="admin-report-table-card dpr-performance-table-card shadow-sm border-0 rounded-3 mt-4">
      {/* ── CARD HEADER ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 bg-white border-bottom rounded-top-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1">DPR</span>
            <h5 className="mb-0 fw-bold text-dark">Daily Performance Report (DPR)</h5>
          </div>
          <small className="text-muted">
            One comprehensive row per salesperson: Activity (effort), Outcomes (results), Lead Sources &amp; Missed Commitments (IST)
            {dateRange.fromDate && (
              <span className="ms-1 fw-semibold text-primary">
                ({dateRange.fromDate} {dateRange.toDate !== dateRange.fromDate ? `to ${dateRange.toDate}` : ""})
              </span>
            )}
          </small>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-success d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
            onClick={handleDownloadExcel}
            disabled={downloading}
            style={{ borderRadius: "8px" }}
          >
            {downloading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Generating DPR...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download DPR (Excel)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="alert alert-danger mx-3 mt-3 mb-0 py-2 small">{downloadError}</div>
      )}

      {/* ── KPI QUICK SUMMARY STRIP ── */}
      <div className="dpr-summary-strip bg-light px-3 py-2 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3 text-secondary small">
        <div>
          <strong>Callers:</strong> <span className="text-dark fw-bold">{summary.totalCallers || callers.length}</span>
        </div>
        <div className="border-start ps-3">
          <strong>Total Calls:</strong>{" "}
          <span className="text-primary fw-bold">{summary.totalCalls || 0}</span>
          <span className="text-muted ms-1">({summary.totalConnected || 0} connected, {summary.overallAnswerRate || 0}%)</span>
        </div>
        <div className="border-start ps-3">
          <strong>Talk Time:</strong>{" "}
          <span className="text-success fw-bold">{summary.totalTalkTimeFormatted || "0s"}</span>
        </div>
        <div className="border-start ps-3">
          <strong>Dispositions:</strong>{" "}
          <span className="text-info-emphasis fw-bold">{summary.totalDispositions || 0}</span>
        </div>
        <div className="border-start ps-3">
          <strong>Bookings:</strong>{" "}
          <span className="text-purple fw-bold">{summary.totalBookings || 0}</span>
          <span className="text-muted ms-1">({summary.totalAgreementValueFormatted || "₹ 0"})</span>
        </div>
        <div className="border-start ps-3">
          <strong>Missed / Slipping:</strong>{" "}
          <span className="badge bg-danger rounded-pill px-2">{summary.totalMissedAndPending || 0}</span>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="p-3 bg-white border-bottom">
        <label className="crm-table-search m-0 w-100" style={{ maxWidth: "380px" }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search salesperson, role, extension, lead source..."
            aria-label="Search DPR table"
            style={{
              border: "none",
              outline: "none",
              boxShadow: "none",
              background: "transparent",
              width: "100%",
              padding: "4px 8px",
            }}
          />
        </label>
      </div>

      {/* ── MAIN DPR TABLE ── */}
      <div className="table-responsive" style={{ maxHeight: "680px" }}>
        <table className="table table-hover align-middle mb-0 dpr-main-table" style={{ fontSize: "12.5px" }}>
          <thead className="table-light sticky-top" style={{ zIndex: 10 }}>
            {/* Top Grouped Header */}
            <tr className="text-uppercase small fw-bold text-center border-bottom">
              <th colSpan="3" className="bg-primary text-white text-start py-2 px-3" style={{ borderTopLeftRadius: "6px" }}>
                👤 Caller Details
              </th>
              <th colSpan="5" className="bg-success text-white py-2">
                ⚡ Activity (Effort)
              </th>
              <th colSpan="6" className="bg-indigo text-white py-2" style={{ backgroundColor: "#6366f1" }}>
                🎯 Outcomes (Results)
              </th>
              <th colSpan="2" className="bg-warning text-dark py-2">
                🏷️ Sources Called On
              </th>
              <th colSpan="5" className="bg-danger text-white py-2" style={{ borderTopRightRadius: "6px" }}>
                ⚠️ Missed &amp; Pending (Accountability)
              </th>
            </tr>
            {/* Column Headers */}
            <tr className="text-secondary small text-nowrap bg-light border-bottom">
              <th style={{ width: "36px" }}></th>
              <th>Salesperson</th>
              <th>Role</th>

              {/* Activity */}
              <th className="text-center" title="Total calls (Inbound + Outbound)">Calls</th>
              <th className="text-center" title="Answered / Connected calls">Conn.</th>
              <th className="text-center" title="Answer Rate %">Ans %</th>
              <th className="text-center" title="Total talk duration">Talk Time</th>
              <th className="text-center" title="Unique leads interacted with">Worked</th>

              {/* Outcomes */}
              <th className="text-center" title="Dispositions Logged">Disp.</th>
              <th className="text-center" title="Leads Qualified">Qual.</th>
              <th className="text-center" title="Site Visits Conducted / Scheduled">Visits (Done/Sched)</th>
              <th className="text-center" title="Follow-ups Done">F/U Done</th>
              <th className="text-center" title="Bookings count">Bookings</th>
              <th className="text-end" title="Agreement Value">Agreement Value</th>

              {/* Sources */}
              <th>Top Source</th>
              <th style={{ minWidth: "160px" }}>Source Breakdown</th>

              {/* Missed */}
              <th className="text-center text-danger" title="Tasks past due date not completed">Missed Tasks</th>
              <th className="text-center text-danger" title="Overdue follow-ups not done (IST)">Missed F/U</th>
              <th className="text-center text-danger" title="Scheduled visits not conducted">Missed Visits</th>
              <th className="text-center text-danger" title="Missed inbound calls not returned">Unreturned Inb.</th>
              <th className="text-center fw-bold text-danger" title="Total missed & pending commitments">Total Slipping</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="21" className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading comprehensive DPR data...
                </td>
              </tr>
            ) : paginatedCallers.length === 0 ? (
              <tr>
                <td colSpan="21" className="text-center py-5 text-muted">
                  {searchQuery ? "No matching caller records found" : "No DPR data available for this period"}
                </td>
              </tr>
            ) : (
              paginatedCallers.map((row) => {
                const isExpanded = expandedUserIds.has(row.userId);
                return (
                  <React.Fragment key={row.userId}>
                    <tr
                      className={isExpanded ? "table-active" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleExpand(row.userId)}
                    >
                      <td className="text-center py-2" onClick={(e) => { e.stopPropagation(); toggleExpand(row.userId); }}>
                        {isExpanded ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-muted" />}
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{row.userName}</div>
                        {row.extension && row.extension !== "-" && (
                          <small className="text-muted">Ext: {row.extension}</small>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                          {row.role}
                        </span>
                      </td>

                      {/* Activity */}
                      <td className="text-center fw-semibold">
                        {renderClickable(row, "totalCalls", "Calls", row.activity.totalCalls, "text-primary")}
                        {row.activity.inboundCalls > 0 && (
                          <small className="d-block text-muted" style={{ fontSize: "10px" }}>
                            {row.activity.outboundCalls}out / {row.activity.inboundCalls}in
                          </small>
                        )}
                      </td>
                      <td className="text-center text-success fw-semibold">
                        {renderClickable(row, "connectedCalls", "Connected Calls", row.activity.connectedCalls, "text-success")}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${row.activity.answerRate >= 40 ? "bg-success" : row.activity.answerRate > 0 ? "bg-warning text-dark" : "bg-light text-muted"}`}>
                          {row.activity.answerRate}%
                        </span>
                      </td>
                      <td className="text-center text-nowrap fw-medium text-dark">
                        {row.activity.totalTalkTimeFormatted}
                      </td>
                      <td className="text-center fw-semibold text-secondary">
                        {row.activity.uniqueLeadsWorked}
                      </td>

                      {/* Outcomes */}
                      <td className="text-center fw-semibold text-indigo">
                        {row.outcomes.dispositionsLogged}
                      </td>
                      <td className="text-center text-success fw-bold">
                        {renderClickable(row, "qualifiedLeads", "Qualified Leads", row.outcomes.leadsQualified, "text-success")}
                      </td>
                      <td className="text-center text-nowrap">
                        <span className="text-success fw-bold">
                          {renderClickable(row, "siteVisitsConducted", "Visits Done", row.outcomes.siteVisitsConducted, "text-success")}
                        </span>
                        {" / "}
                        <span className="text-muted">
                          {renderClickable(row, "siteVisitsScheduled", "Visits Scheduled", row.outcomes.siteVisitsScheduled, "text-muted")}
                        </span>
                      </td>
                      <td className="text-center fw-semibold text-primary">
                        {renderClickable(row, "followupsDone", "Follow-ups Done", row.outcomes.followupsDone, "text-primary")}
                      </td>
                      <td className="text-center fw-bold">
                        {row.outcomes.bookingsCount > 0 ? (
                          <span className="badge bg-success px-2 py-1">
                            {renderClickable(row, "bookings", "Bookings", row.outcomes.bookingsCount, "text-white")}
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="text-end fw-bold text-nowrap text-dark">
                        {row.outcomes.agreementValue > 0 ? row.outcomes.agreementValueFormatted : "—"}
                      </td>

                      {/* Sources */}
                      <td className="text-nowrap">
                        <span className="badge bg-info-subtle text-info border border-info fw-semibold px-2 py-1">
                          {row.sources.topSource}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted d-inline-block text-truncate" style={{ maxWidth: "220px" }} title={row.sources.sourcesSummary}>
                          {row.sources.sourcesSummary}
                        </small>
                      </td>

                      {/* Missed & Pending */}
                      <td className="text-center">
                        {renderClickable(row, "missedTasks", "Missed Tasks", row.missed.missedTasks, "text-danger")}
                      </td>
                      <td className="text-center">
                        {renderClickable(row, "missedFollowups", "Missed Follow-ups", row.missed.missedFollowups, "text-danger")}
                      </td>
                      <td className="text-center">
                        {renderClickable(row, "missedSiteVisits", "Missed Visits", row.missed.missedSiteVisits, "text-danger")}
                      </td>
                      <td className="text-center">
                        {renderClickable(row, "unreturnedInboundCalls", "Unreturned Missed Inbounds", row.missed.unreturnedInboundCalls, "text-danger")}
                      </td>
                      <td className="text-center fw-bold">
                        {row.missed.totalMissedAndPending > 0 ? (
                          <span className="badge bg-danger rounded-pill px-2 py-1">
                            {row.missed.totalMissedAndPending}
                          </span>
                        ) : (
                          <span className="badge bg-success-subtle text-success">0</span>
                        )}
                      </td>
                    </tr>

                    {/* ── EXPANDED CALLER DAY DETAIL ROW ── */}
                    {isExpanded && (
                      <tr className="bg-light">
                        <td colSpan="21" className="p-3">
                          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                              <h6 className="mb-0 fw-bold text-primary d-flex align-items-center gap-2">
                                <span>📅 Detailed Day Breakdown — {row.userName}</span>
                                <span className="badge bg-secondary-subtle text-secondary small">{row.role}</span>
                              </h6>
                              <div className="d-flex align-items-center gap-3 small text-muted">
                                <span>📞 Phone: <strong>{row.phone}</strong></span>
                                <span>🏢 Extension: <strong>{row.extension}</strong></span>
                              </div>
                            </div>

                            <div className="row g-3">
                              {/* 1. Attendance & Hours */}
                              <div className="col-12 col-md-3">
                                <div className="p-3 rounded-3 bg-light border h-100">
                                  <div className="fw-bold text-dark mb-2 small d-flex align-items-center gap-1">
                                    <Clock size={15} className="text-primary" /> Attendance &amp; Activity
                                  </div>
                                  <div className="d-flex justify-content-between py-1 small border-bottom">
                                    <span className="text-muted">Status:</span>
                                    <span className={`badge ${row.activity.attendanceStatus === "Available" || row.activity.attendanceStatus === "Present" ? "bg-success" : "bg-secondary"}`}>
                                      {row.activity.attendanceStatus}
                                    </span>
                                  </div>
                                  <div className="d-flex justify-content-between py-1 small border-bottom">
                                    <span className="text-muted">First Punch / Login:</span>
                                    <strong>{row.activity.firstLoginTime}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between py-1 small border-bottom">
                                    <span className="text-muted">Hours Logged:</span>
                                    <strong className="text-primary">{row.activity.hoursLogged}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between py-1 small border-bottom">
                                    <span className="text-muted">Break Time:</span>
                                    <strong>{row.activity.breakTime}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between py-1 small">
                                    <span className="text-muted">Avg Call Duration:</span>
                                    <strong>{row.activity.avgDurationFormatted}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Dispositions Breakdown */}
                              <div className="col-12 col-md-5">
                                <div className="p-3 rounded-3 bg-light border h-100">
                                  <div className="fw-bold text-dark mb-2 small d-flex align-items-center gap-1">
                                    <CheckCircle size={15} className="text-indigo" /> Call Dispositions Logged ({row.outcomes.dispositionsLogged})
                                  </div>
                                  <div className="d-flex flex-wrap gap-2 pt-1">
                                    <span className="badge bg-primary px-2 py-1">
                                      Callback Later: {row.outcomes.dispositionBreakdown.callbackLater}
                                    </span>
                                    <span className="badge bg-success px-2 py-1">
                                      Qualified: {row.outcomes.dispositionBreakdown.qualified}
                                    </span>
                                    <span className="badge bg-warning text-dark px-2 py-1">
                                      Busy: {row.outcomes.dispositionBreakdown.busy}
                                    </span>
                                    <span className="badge bg-secondary px-2 py-1">
                                      No Answer: {row.outcomes.dispositionBreakdown.noAnswer}
                                    </span>
                                    <span className="badge bg-danger px-2 py-1">
                                      Not Interested: {row.outcomes.dispositionBreakdown.notInterested}
                                    </span>
                                    <span className="badge bg-dark px-2 py-1">
                                      Wrong Number: {row.outcomes.dispositionBreakdown.wrongNumber}
                                    </span>
                                    <span className="badge bg-danger-subtle text-danger border border-danger px-2 py-1">
                                      Junk / Lost: {row.outcomes.dispositionBreakdown.junk}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Sources Breakdown */}
                              <div className="col-12 col-md-4">
                                <div className="p-3 rounded-3 bg-light border h-100">
                                  <div className="fw-bold text-dark mb-2 small d-flex align-items-center gap-1">
                                    <UserCheck size={15} className="text-warning" /> Sources They Called On
                                  </div>
                                  {row.sources.sourcesBreakdown.length === 0 ? (
                                    <small className="text-muted">No sources logged for this period.</small>
                                  ) : (
                                    <div className="d-flex flex-column gap-1" style={{ maxHeight: "120px", overflowY: "auto" }}>
                                      {row.sources.sourcesBreakdown.map((s) => (
                                        <div key={s.source} className="d-flex justify-content-between small py-1 border-bottom">
                                          <span className="text-truncate" style={{ maxWidth: "180px" }}>{s.source}</span>
                                          <span className="badge bg-light text-dark fw-bold border">{s.count} calls</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 4. Accountability Strip */}
                              <div className="col-12">
                                <div className="p-3 rounded-3 bg-danger-subtle border border-danger-subtle d-flex flex-wrap justify-content-between align-items-center gap-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <AlertTriangle size={18} className="text-danger" />
                                    <strong className="text-danger small">Accountability &amp; Commitments:</strong>
                                    <span className="small text-danger">
                                      {row.missed.totalMissedAndPending > 0
                                        ? `${row.missed.totalMissedAndPending} items require immediate follow-up or attention.`
                                        : "Great job! All commitments and follow-ups are up to date."}
                                    </span>
                                  </div>
                                  <div className="d-flex align-items-center gap-2 flex-wrap">
                                    {row.missed.missedTasks > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger py-0 px-2 small"
                                        onClick={() =>
                                          onMetricClick?.({
                                            userId: row.userId,
                                            salesUserId: row.userId,
                                            userName: row.userName,
                                            metric: "missedTasks",
                                            metricLabel: "Missed Tasks",
                                            count: row.missed.missedTasks,
                                            title: `Missed Tasks — ${row.userName}`,
                                          })
                                        }
                                      >
                                        View {row.missed.missedTasks} Missed Tasks
                                      </button>
                                    )}
                                    {row.missed.missedFollowups > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger py-0 px-2 small"
                                        onClick={() =>
                                          onMetricClick?.({
                                            userId: row.userId,
                                            salesUserId: row.userId,
                                            userName: row.userName,
                                            metric: "missedFollowups",
                                            metricLabel: "Missed Follow-ups",
                                            count: row.missed.missedFollowups,
                                            title: `Missed Follow-ups — ${row.userName}`,
                                          })
                                        }
                                      >
                                        View {row.missed.missedFollowups} Missed Follow-ups
                                      </button>
                                    )}
                                    {row.missed.missedSiteVisits > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger py-0 px-2 small"
                                        onClick={() =>
                                          onMetricClick?.({
                                            userId: row.userId,
                                            salesUserId: row.userId,
                                            userName: row.userName,
                                            metric: "missedSiteVisits",
                                            metricLabel: "Missed Site Visits",
                                            count: row.missed.missedSiteVisits,
                                            title: `Missed Site Visits — ${row.userName}`,
                                          })
                                        }
                                      >
                                        View {row.missed.missedSiteVisits} Missed Visits
                                      </button>
                                    )}
                                    {row.missed.assignedNotContacted > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-warning py-0 px-2 small text-dark"
                                        onClick={() =>
                                          onMetricClick?.({
                                            userId: row.userId,
                                            salesUserId: row.userId,
                                            userName: row.userName,
                                            metric: "assignedNotContacted",
                                            metricLabel: "Assigned Not Contacted",
                                            count: row.missed.assignedNotContacted,
                                            title: `Assigned Not Contacted Leads — ${row.userName}`,
                                          })
                                        }
                                      >
                                        View {row.missed.assignedNotContacted} Uncontacted Leads
                                      </button>
                                    )}
                                  </div>
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
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ── */}
      {filteredCallers.length > 0 && (
        <div className="d-flex justify-content-between align-items-center p-3 bg-white border-top rounded-bottom-3 small">
          <div className="text-muted">
            Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
            <strong>{filteredCallers.length}</strong> callers
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
            >
              Previous
            </button>
            <span className="px-2 text-muted">
              Page {activePage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DprPerformanceTable;
