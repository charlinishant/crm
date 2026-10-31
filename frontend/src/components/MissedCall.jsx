import React, { useCallback, useEffect, useMemo, useState } from "react";
import { 
  PhoneMissed, 
  AlertCircle, 
  PhoneCall, 
  Search, 
  RotateCw, 
  Download, 
  Filter, 
  User, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  X
} from "lucide-react";
import { getSocket } from "../services/socketClient";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const formatDateTime = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const MissedCall = () => {
  // Stats
  const [stats, setStats] = useState({
    totalMissed: 0,
    unacknowledged: 0,
    callbackPending: 0,
  });

  // Table Data & Pagination
  const [logs, setLogs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Telecaller list - Strictly SALES / PRE_SALES only (no CPs, no admin)
  const [telecallers, setTelecallers] = useState([]);

  // Filters state
  const [selectedTelecaller, setSelectedTelecaller] = useState("all");
  const [selectedDirection, setSelectedDirection] = useState("inbound");
  const [selectedAck, setSelectedAck] = useState("all");
  const [selectedCallbackStatus, setSelectedCallbackStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load telecallers server-side centrally
  useEffect(() => {
    let isMounted = true;
    const loadTelecallers = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Central server-side filtered telecallers endpoint
        const res = await fetch(`${API_URL}/users/telecallers`, { headers });
        if (!res.ok) throw new Error("Failed to fetch telecallers");
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        
        // Strict client-side safeguard: NEVER allow CHANNEL_PARTNER or ADMIN into telecaller dropdown
        const verifiedTelecallers = list.filter((u) => {
          const role = String(u.role || "").toUpperCase();
          return (role === "SALES" || role === "PRE_SALES") && role !== "CHANNEL_PARTNER" && role !== "ADMIN";
        });

        if (isMounted) {
          setTelecallers(verifiedTelecallers);
        }
      } catch (err) {
        console.warn("Unable to load telecallers from /users/telecallers, trying fallback:", err.message);
        try {
          const token = localStorage.getItem("authToken");
          const fallbackRes = await fetch(`${API_URL}/api/admin/reports/sales-users`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const fallbackJson = await fallbackRes.json();
          const list = Array.isArray(fallbackJson.data) ? fallbackJson.data : [];
          const verified = list.filter((u) => {
            const role = String(u.role || "").toUpperCase();
            return (role === "SALES" || role === "PRE_SALES") && role !== "CHANNEL_PARTNER" && role !== "ADMIN";
          });
          if (isMounted) setTelecallers(verified);
        } catch (e) {
          console.error("Failed to load telecallers:", e);
        }
      }
    };
    loadTelecallers();
    return () => { isMounted = false; };
  }, []);

  // Fetch missed calls
  const fetchMissedCalls = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      if (selectedTelecaller && selectedTelecaller !== "all") {
        params.set("agentId", selectedTelecaller);
      }
      if (selectedDirection && selectedDirection !== "all") {
        params.set("direction", selectedDirection);
      }
      if (selectedAck && selectedAck !== "all") {
        params.set("isAcknowledged", selectedAck === "acknowledged" ? "true" : "false");
      }
      if (selectedCallbackStatus && selectedCallbackStatus !== "all") {
        params.set("callbackStatus", selectedCallbackStatus);
      }
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`${API_URL}/calls/missed?${params.toString()}`, { headers });
      if (!res.ok) throw new Error("Failed to load missed calls");
      const json = await res.json();

      setLogs(Array.isArray(json.data) ? json.data : []);
      setTotalItems(Number(json.totalItems) || 0);
      if (json.stats) {
        setStats({
          totalMissed: Number(json.stats.totalMissed) || 0,
          unacknowledged: Number(json.stats.unacknowledged) || 0,
          callbackPending: Number(json.stats.callbackPending) || 0,
        });
      }
    } catch (err) {
      console.error("Error loading missed calls:", err);
      setLogs([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentPage, pageSize, selectedTelecaller, selectedDirection, selectedAck, selectedCallbackStatus, fromDate, toDate, debouncedSearch]);

  // Initial load and filter change
  useEffect(() => {
    fetchMissedCalls();
  }, [fetchMissedCalls]);

  // Socket.io live updates
  useEffect(() => {
    let cleanups = [];
    let isMounted = true;

    const setupSocket = async () => {
      try {
        const socket = await getSocket();
        if (!socket || !isMounted) return;

        const handleUpdate = () => {
          fetchMissedCalls(false);
        };

        socket.on("missed-call:new", handleUpdate);
        socket.on("mcube:inbound:missed", handleUpdate);
        socket.on("missed-call:acknowledged", handleUpdate);
        socket.on("missed-call:callback-completed", handleUpdate);

        cleanups.push(() => {
          try {
            socket.off("missed-call:new", handleUpdate);
            socket.off("mcube:inbound:missed", handleUpdate);
            socket.off("missed-call:acknowledged", handleUpdate);
            socket.off("missed-call:callback-completed", handleUpdate);
          } catch (e) {}
        });
      } catch (e) {
        console.warn("MissedCall socket connection warning:", e.message);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      cleanups.forEach((c) => c());
    };
  }, [fetchMissedCalls]);

  // Acknowledge a single call
  const handleAcknowledge = async (callLogId) => {
    try {
      setActionLoadingId(callLogId);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/calls/${callLogId}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to acknowledge call");
      await fetchMissedCalls(false);
    } catch (err) {
      alert(err.message || "Unable to acknowledge call");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete a callback
  const handleCompleteCallback = async (callLogId) => {
    const note = window.prompt("Enter callback remark / note (optional):", "Callback completed");
    if (note === null) return;

    try {
      setActionLoadingId(callLogId);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/calls/${callLogId}/complete-callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes: note }),
      });
      if (!res.ok) throw new Error("Failed to complete callback");
      await fetchMissedCalls(false);
    } catch (err) {
      alert(err.message || "Unable to complete callback");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedTelecaller("all");
    setSelectedDirection("inbound");
    setSelectedAck("all");
    setSelectedCallbackStatus("all");
    setFromDate("");
    setToDate("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!logs.length) {
      alert("No records to export");
      return;
    }

    const headers = [
      "Sr. No",
      "Caller Phone",
      "Lead ID",
      "Lead Name",
      "Call Date & Time",
      "Intended Telecaller",
      "Provider Status",
      "Acknowledgment",
      "Callback Status",
      "Notes",
    ];

    const rows = logs.map((log, index) => {
      const sr = (currentPage - 1) * pageSize + index + 1;
      const phone = log.displayNumber || log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-";
      const leadId = log.lead?.id ? `#${log.lead.id}` : "-";
      const leadName = log.leadName || "-";
      const callTime = formatDateTime(log.startedAt || log.createdAt);
      const agent = log.agentName || "Unassigned";
      const status = log.providerStatus || log.status || "Missed";
      const ack = log.isAcknowledged ? "Acknowledged" : "Unacknowledged";
      const callback = log.callbackStatus ? log.callbackStatus.charAt(0).toUpperCase() + log.callbackStatus.slice(1) : "Pending";
      const notes = (log.notes || "").replace(/"/g, '""');

      return [
        sr,
        `"${phone}"`,
        `"${leadId}"`,
        `"${leadName}"`,
        `"${callTime}"`,
        `"${agent}"`,
        `"${status}"`,
        `"${ack}"`,
        `"${callback}"`,
        `"${notes}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `missed-calls-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="container-fluid px-3 py-3" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        {/* Total Missed */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-secondary fw-semibold text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  TOTAL MISSED RECORDS
                </span>
                <h2 className="mt-2 mb-0 fw-bold text-dark" style={{ fontSize: "32px" }}>
                  {stats.totalMissed}
                </h2>
              </div>
              <div 
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "48px", height: "48px", background: "#eff6ff", color: "#3b82f6" }}
              >
                <PhoneMissed size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Unacknowledged */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="fw-semibold text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px", color: "#ef4444" }}>
                  UNACKNOWLEDGED
                </span>
                <h2 className="mt-2 mb-0 fw-bold" style={{ fontSize: "32px", color: "#ef4444" }}>
                  {stats.unacknowledged}
                </h2>
              </div>
              <div 
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "48px", height: "48px", background: "#fef2f2", color: "#ef4444" }}
              >
                <AlertCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Callback Pending */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="fw-semibold text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px", color: "#d97706" }}>
                  CALLBACK PENDING
                </span>
                <h2 className="mt-2 mb-0 fw-bold" style={{ fontSize: "32px", color: "#d97706" }}>
                  {stats.callbackPending}
                </h2>
              </div>
              <div 
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "48px", height: "48px", background: "#fffbeb", color: "#d97706" }}
              >
                <PhoneCall size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white">
        <div className="row g-2 align-items-center justify-content-between">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                className="form-control border-start-0 ps-0" 
                placeholder="Search by phone, caller, or lead..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "14px" }}
              />
              <button 
                className="btn btn-outline-secondary border-start-0" 
                type="button"
                onClick={() => fetchMissedCalls(true)}
                title="Refresh Records"
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          <div className="col-12 col-md-auto d-flex justify-content-end">
            <button 
              type="button" 
              className="btn btn-outline-primary d-flex align-items-center gap-2 fw-semibold px-3 py-2"
              onClick={handleExportCSV}
              style={{ fontSize: "13px", borderRadius: "8px" }}
            >
              <Download size={16} />
              Export to CSV
            </button>
          </div>
        </div>

        <hr className="my-3 text-muted opacity-25" />

        {/* Filters Bar */}
        <div className="row g-2 align-items-center">
          <div className="col-auto d-flex align-items-center gap-1 text-muted fw-semibold" style={{ fontSize: "13px" }}>
            <Filter size={15} />
            <span>Filters:</span>
          </div>

          {/* All Telecallers Dropdown - SCOPED TO SALES ONLY (Server-side & Client-side verified) */}
          <div className="col-auto">
            <select 
              className="form-select form-select-sm fw-medium shadow-none border-secondary-subtle"
              style={{ minWidth: "170px", fontSize: "13px", height: "36px", borderRadius: "6px" }}
              value={selectedTelecaller}
              onChange={(e) => {
                setSelectedTelecaller(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Telecallers</option>
              {telecallers.map((user) => {
                const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email;
                return (
                  <option key={user.id} value={user.id}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Direction Filter */}
          <div className="col-auto">
            <select 
              className="form-select form-select-sm fw-medium shadow-none border-secondary-subtle"
              style={{ minWidth: "140px", fontSize: "13px", height: "36px", borderRadius: "6px" }}
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound Missed</option>
              <option value="outbound">Outbound Missed</option>
            </select>
          </div>

          {/* Acknowledgments Filter */}
          <div className="col-auto">
            <select 
              className="form-select form-select-sm fw-medium shadow-none border-secondary-subtle"
              style={{ minWidth: "160px", fontSize: "13px", height: "36px", borderRadius: "6px" }}
              value={selectedAck}
              onChange={(e) => {
                setSelectedAck(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Acknowledgments</option>
              <option value="unacknowledged">Unacknowledged</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          </div>

          {/* Callback Status Filter */}
          <div className="col-auto">
            <select 
              className="form-select form-select-sm fw-medium shadow-none border-secondary-subtle"
              style={{ minWidth: "160px", fontSize: "13px", height: "36px", borderRadius: "6px" }}
              value={selectedCallbackStatus}
              onChange={(e) => {
                setSelectedCallbackStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Callback Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* From Date */}
          <div className="col-auto d-flex align-items-center gap-1">
            <span className="text-muted" style={{ fontSize: "12px" }}>From:</span>
            <input 
              type="date" 
              className="form-control form-control-sm shadow-none border-secondary-subtle"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "135px", height: "36px", fontSize: "12px", borderRadius: "6px" }}
            />
          </div>

          {/* Reset Filters */}
          <div className="col-auto">
            <button 
              type="button" 
              className="btn btn-link text-danger text-decoration-none fw-semibold p-0 ms-2"
              onClick={handleResetFilters}
              style={{ fontSize: "13px" }}
            >
              ✕ Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Missed Calls Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr style={{ background: "#2563eb", color: "#ffffff" }}>
                <th className="py-3 px-3 text-white fw-bold" style={{ width: "60px", fontSize: "13px" }}>Sr. No</th>
                <th className="py-3 px-3 text-white fw-bold" style={{ fontSize: "13px" }}>Caller Phone / Lead</th>
                <th className="py-3 px-3 text-white fw-bold" style={{ fontSize: "13px" }}>Call Date & Time</th>
                <th className="py-3 px-3 text-white fw-bold" style={{ fontSize: "13px" }}>Intended Telecaller</th>
                <th className="py-3 px-3 text-white fw-bold" style={{ fontSize: "13px" }}>Provider Status</th>
                <th className="py-3 px-3 text-white fw-bold" style={{ fontSize: "13px" }}>Acknowledgment</th>
                <th className="py-3 px-3 text-white fw-bold" style={{ fontSize: "13px" }}>Callback Status</th>
                <th className="py-3 px-3 text-white fw-bold text-end" style={{ fontSize: "13px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                    <span className="text-muted fw-medium" style={{ fontSize: "14px" }}>Loading missed calls records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <PhoneMissed size={36} className="text-secondary opacity-50 mb-2 d-block mx-auto" />
                    <p className="mb-0 fw-semibold">No missed calls found matching current filters.</p>
                    <small className="text-secondary">Try resetting your filters or selecting a different date range.</small>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const srNo = (currentPage - 1) * pageSize + index + 1;
                  const phone = log.displayNumber || log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-";
                  const providerStatus = String(log.providerStatus || log.status || "Missed").toUpperCase();
                  const isAck = Boolean(log.isAcknowledged);
                  const isPendingCallback = !log.callbackStatus || String(log.callbackStatus).toLowerCase() === "pending";

                  return (
                    <tr key={log.id} className="border-bottom" style={{ borderColor: "#f1f5f9" }}>
                      {/* Sr. No */}
                      <td className="py-3 px-3 text-secondary fw-semibold" style={{ fontSize: "13px" }}>
                        {srNo}
                      </td>

                      {/* Caller Phone / Lead */}
                      <td className="py-3 px-3">
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                            {phone}
                          </span>
                          {log.lead ? (
                            <div className="d-flex align-items-center gap-1 mt-1">
                              <span className="fw-semibold text-primary" style={{ fontSize: "12px" }}>
                                {log.leadName || `Lead #${log.lead.id}`}
                              </span>
                              <span className="badge bg-light text-secondary border px-1" style={{ fontSize: "10px" }}>
                                #{log.lead.id}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: "11px" }}>Unknown Caller</span>
                          )}
                        </div>
                      </td>

                      {/* Call Date & Time */}
                      <td className="py-3 px-3 text-secondary fw-medium" style={{ fontSize: "13px" }}>
                        {formatDateTime(log.startedAt || log.createdAt)}
                      </td>

                      {/* Intended Telecaller */}
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center gap-1 text-dark fw-medium" style={{ fontSize: "13px" }}>
                          <User size={14} className="text-muted" />
                          <span>{log.agentName || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Provider Status */}
                      <td className="py-3 px-3">
                        <span 
                          className="badge px-2 py-1 fw-bold"
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            fontSize: "11px",
                            borderRadius: "4px"
                          }}
                        >
                          {providerStatus}
                        </span>
                      </td>

                      {/* Acknowledgment */}
                      <td className="py-3 px-3">
                        {isAck ? (
                          <span 
                            className="badge d-inline-flex align-items-center gap-1 px-2 py-1 fw-semibold"
                            style={{ background: "#dcfce7", color: "#166534", fontSize: "11px", borderRadius: "4px" }}
                          >
                            <CheckCircle2 size={12} />
                            Acknowledged
                          </span>
                        ) : (
                          <span 
                            className="badge d-inline-flex align-items-center gap-1 px-2 py-1 fw-semibold border"
                            style={{ background: "#fff", borderColor: "#ef4444", color: "#ef4444", fontSize: "11px", borderRadius: "4px" }}
                          >
                            <AlertCircle size={12} />
                            Unacknowledged
                          </span>
                        )}
                      </td>

                      {/* Callback Status */}
                      <td className="py-3 px-3">
                        {isPendingCallback ? (
                          <span 
                            className="badge d-inline-flex align-items-center gap-1 px-2 py-1 fw-semibold"
                            style={{ background: "#fef3c7", color: "#b45309", fontSize: "11px", borderRadius: "4px" }}
                          >
                            <Clock size={12} />
                            Pending
                          </span>
                        ) : (
                          <span 
                            className="badge d-inline-flex align-items-center gap-1 px-2 py-1 fw-semibold"
                            style={{ background: "#dcfce7", color: "#166534", fontSize: "11px", borderRadius: "4px" }}
                          >
                            <CheckCircle2 size={12} />
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-end">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {!isAck && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-1 px-2 fw-semibold"
                              style={{ fontSize: "11px", borderRadius: "5px" }}
                              onClick={() => handleAcknowledge(log.id)}
                              disabled={actionLoadingId === log.id}
                              title="Acknowledge this missed call"
                            >
                              {actionLoadingId === log.id ? "..." : "Ack"}
                            </button>
                          )}
                          {isPendingCallback && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-1 px-2 fw-semibold text-dark"
                              style={{ fontSize: "11px", borderRadius: "5px", background: "#fef3c7", borderColor: "#fde68a" }}
                              onClick={() => handleCompleteCallback(log.id)}
                              disabled={actionLoadingId === log.id}
                              title="Mark callback done"
                            >
                              Callback Done
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between p-3 border-top bg-light-subtle">
            <span className="text-muted fw-medium mb-2 mb-sm-0" style={{ fontSize: "13px" }}>
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{" "}
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} records
            </span>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3 py-1"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ fontSize: "13px", borderRadius: "6px" }}
              >
                Previous
              </button>

              <span className="badge bg-white text-dark border px-3 py-2 fw-bold" style={{ fontSize: "13px" }}>
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3 py-1"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ fontSize: "13px", borderRadius: "6px" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissedCall;
