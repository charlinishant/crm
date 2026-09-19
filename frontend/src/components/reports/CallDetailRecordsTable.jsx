import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const RECORDS_PER_PAGE = 10;

const getStatusBadge = (status) => {
  const st = String(status || "").toLowerCase();
  if (["connected", "completed", "answered"].includes(st)) {
    return <span className="badge bg-success-subtle text-success">Connected</span>;
  }
  if (st === "missed") {
    return <span className="badge bg-danger-subtle text-danger">Missed</span>;
  }
  if (st === "busy") {
    return <span className="badge bg-warning-subtle text-warning">Busy</span>;
  }
  if (["no-answer", "noanswer"].includes(st)) {
    return <span className="badge bg-warning-subtle text-warning">No Answer</span>;
  }
  if (["failed", "rejected"].includes(st)) {
    return <span className="badge bg-secondary-subtle text-secondary">Failed</span>;
  }
  return <span className="badge bg-info-subtle text-info">{status || "Initiated"}</span>;
};

const getDirectionBadge = (direction) => {
  const dir = String(direction || "outbound").toLowerCase();
  if (dir === "inbound") {
    return <span className="badge bg-cyan-100 text-cyan-800 d-inline-flex align-items-center gap-1">📥 Inbound</span>;
  }
  return <span className="badge bg-purple-100 text-purple-800 d-inline-flex align-items-center gap-1">📤 Outbound</span>;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const CallDetailRecordsTable = ({ records = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeAudioId, setActiveAudioId] = useState(null);

  const filteredRecords = useMemo(() => {
    let list = records;

    if (directionFilter !== "all") {
      list = list.filter((r) => String(r.direction || "outbound").toLowerCase() === directionFilter);
    }

    if (statusFilter !== "all") {
      list = list.filter((r) => {
        const st = String(r.status || "").toLowerCase();
        if (statusFilter === "answered") return ["connected", "completed", "answered"].includes(st);
        if (statusFilter === "missed") return ["missed", "no-answer", "busy", "failed"].includes(st);
        return st === statusFilter;
      });
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((r) =>
        [
          r.phone,
          r.leadName,
          r.agentName,
          r.agentExtension,
          r.virtualNumber,
          r.disposition,
          r.notes,
          r.status,
          r.projectName,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query))
      );
    }

    return list;
  }, [records, directionFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * RECORDS_PER_PAGE;
  const paginatedData = filteredRecords.slice(pageStartIndex, pageStartIndex + RECORDS_PER_PAGE);
  const pageEndIndex = Math.min(pageStartIndex + paginatedData.length, filteredRecords.length);

  return (
    <div className="admin-report-table-card cdr-records-table-card mt-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h6>Mcube Call Detail Records (CDR) & Recordings</h6>
          <small className="text-muted">Live telephony call logs, caller leads, audio recordings, and dispositions</small>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Direction Filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Directions</option>
            <option value="inbound">Inbound Calls</option>
            <option value="outbound">Outbound Calls</option>
          </select>

          {/* Status Filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="answered">Answered / Connected</option>
            <option value="missed">Missed / Busy</option>
          </select>

          {/* Search */}
          <label className="crm-table-search sales-performance-search" style={{ maxWidth: "240px", margin: 0 }}>
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search CDR..."
              aria-label="Search CDR"
            />
          </label>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Date & Time</th>
              <th>Direction</th>
              <th>Customer / Phone</th>
              <th>Linked Lead</th>
              <th>Executive / Ext</th>
              <th>DID / Virtual</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Recording</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Disposition</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length ? (
              paginatedData.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="text-nowrap font-medium text-dark">{formatDate(row.createdAt)}</div>
                  </td>
                  <td>{getDirectionBadge(row.direction)}</td>
                  <td>
                    <span className="font-mono text-dark fw-semibold">{row.phone}</span>
                  </td>
                  <td>
                    {row.leadId ? (
                      <Link
                        to={`/lead-details/${row.leadId}`}
                        className="text-primary fw-medium text-decoration-none hover-underline"
                      >
                        {row.leadName}
                      </Link>
                    ) : (
                      <span className="text-muted fst-italic">Unlinked Lead</span>
                    )}
                  </td>
                  <td>
                    <div className="font-medium text-dark">{row.agentName}</div>
                    {row.agentExtension && row.agentExtension !== "-" && (
                      <small className="text-muted">Ext: {row.agentExtension}</small>
                    )}
                  </td>
                  <td>
                    <span className="text-muted font-mono">{row.virtualNumber}</span>
                  </td>
                  <td>{getStatusBadge(row.status)}</td>
                  <td>
                    <span className="font-mono">{row.durationClock || "00:00"}</span>
                  </td>
                  <td>
                    {row.recordingUrl ? (
                      (() => {
                        const authUserRole = String(
                          (JSON.parse(localStorage.getItem("authUser") || "null"))?.role || ""
                        ).toUpperCase();
                        const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUserRole);

                        if (!isAdmin) {
                          return (
                            <span className="badge bg-light text-primary border" style={{ fontSize: "11px" }}>
                              🎧 Saved in CRM
                            </span>
                          );
                        }

                        return (
                          <div className="d-flex align-items-center gap-1">
                            {activeAudioId === row.id ? (
                              <div className="cdr-audio-player">
                                <audio controls autoPlay src={row.recordingUrl} style={{ height: "30px", width: "180px" }}>
                                  Your browser does not support the audio element.
                                </audio>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-muted p-0 ms-1"
                                  onClick={() => setActiveAudioId(null)}
                                  title="Close player"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                                onClick={() => setActiveAudioId(row.id)}
                                title="Play call recording"
                              >
                                ▶ Play
                              </button>
                            )}
                            <a
                              href={row.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="btn btn-sm btn-outline-secondary py-1 px-2"
                              title="Download recording"
                            >
                              ⬇
                            </a>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-muted" style={{ fontSize: "12px" }}>No Audio</span>
                    )}
                  </td>
                  <td>
                    <div>
                      {row.disposition && row.disposition !== "-" ? (
                        <span className="badge bg-light text-dark border">{row.disposition}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </div>
                    {row.notes && <small className="text-muted d-block text-truncate" style={{ maxWidth: "140px" }} title={row.notes}>{row.notes}</small>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="admin-report-empty-cell text-center py-4">
                  {searchQuery || directionFilter !== "all" || statusFilter !== "all"
                    ? "No matching call records found"
                    : "No Mcube CDR records available"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRecords.length > 0 && (
        <div className="lead-pagination sales-performance-pagination mt-3">
          <div className="lead-pagination-info">
            Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
            <strong>{filteredRecords.length}</strong> call records
          </div>
          <div className="lead-pagination-actions">
            <button
              type="button"
              className="lead-pagination-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={activePage === 1}
            >
              Previous
            </button>
            <span className="lead-pagination-page">
              {activePage} / {totalPages}
            </span>
            <button
              type="button"
              className="lead-pagination-btn"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
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

export default CallDetailRecordsTable;
