import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { FaTrashAlt, FaUndo, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import { getReportsSocket } from "../services/socketClient";

// Enhanced API URL handling with fallbacks and logging
const getApiUrl = () => {
  const url = process.env.REACT_APP_API_URL;
  if (!url || url.trim() === "") {
    console.warn("[BinPage] REACT_APP_API_URL not set, using default: http://localhost:5000");
    return "http://localhost:5000";
  }
  return url.replace(/\/+$/, "");
};

const API_URL = getApiUrl();
console.log(`[BinPage] Using API URL: ${API_URL}`);

const ITEMS_PER_PAGE = 15;

const CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "leads", label: "Leads" },
  { id: "projects", label: "Projects" },
  { id: "towers", label: "Towers" },
  { id: "calllogs", label: "Call Logs" },
  { id: "floorplans", label: "Floor Plans" },
  { id: "units", label: "Units" },
  { id: "tasks", label: "Tasks" },
  { id: "users", label: "Users" },
];

const formatSafeDate = (value) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    const result = d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    // Ensure we always return a non-empty string
    return result || "-";
  } catch (e) {
    console.error("[BinPage] Date formatting error:", e, value);
    return "-";
  }
};

const BinPage = () => {
  console.log("[BinPage] Component mounting");

  const [activeCategory, setActiveCategory] = useState("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    leads: 0,
    projects: 0,
    towers: 0,
    calllogs: 0,
    floorplans: 0,
    units: 0,
    tasks: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [projectsList, setProjectsList] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const getAuthHeaders = () => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return headers;
    } catch (err) {
      console.error("[BinPage] Error in getAuthHeaders:", err);
      return { "Content-Type": "application/json" };
    }
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items)) {
      console.warn("[BinPage] items is not an array:", items);
      return [];
    }
    const start = Math.max(0, (currentPage - 1) * ITEMS_PER_PAGE);
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  const pageStartIndex = Math.min(
    items?.length || 0,
    Math.max(0, (currentPage - 1) * ITEMS_PER_PAGE) + 1
  );
  const pageEndIndex = Math.min(
    items?.length || 0,
    currentPage * ITEMS_PER_PAGE
  );

  // Selected items objects
  const selectedItemsList = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter((it) =>
      it &&
      it !== null &&
      it.id != null &&
      selectedIds.has(`${(it.category || "leads")}:${it.id}`)
    );
  }, [items, selectedIds]);

  // Fetch available projects for filtering
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        console.log("[BinPage] Fetching projects for filter");
        const res = await fetch(`${API_URL}/projects`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          console.warn("[BinPage] Failed to fetch projects:", res.status);
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.projects)
              ? data.projects
              : [];

        if (Array.isArray(list)) {
          setProjectsList(list);
          console.log("[BinPage] Fetched projects:", list.length);
        } else {
          console.warn("[BinPage] Projects data is not an array:", list);
        }
      } catch (err) {
        console.error("[BinPage] Error fetching projects:", err);
      }
    };

    fetchProjects();
  }, []);

  // Fetch Bin Items
  const fetchBinItems = useCallback(async () => {
    console.log("[BinPage] Fetching bin items with params:", {
      activeCategory,
      projectFilter,
      searchQuery
    });

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.append("category", activeCategory);
      if (projectFilter) params.append("projectId", projectFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const url = `${API_URL}/api/bin?${params.toString()}`;
      console.log("[BinPage] Fetching from:", url);

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      // Handle non-JSON responses
      let result;
      try {
        result = await response.json();
      } catch (jsonErr) {
        console.error("[BinPage] JSON parse error:", jsonErr);
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        const message = result?.message ||
                       result?.error ||
                       `HTTP ${response.status}`;
        throw new Error(message);
      }

      const nextItems = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.items)
            ? result.items
            : [];

      console.log("[BinPage] Received items:", nextItems.length);

      setItems(Array.isArray(nextItems) ? nextItems : []);

      if (result.counts && typeof result.counts === "object") {
        setCounts(result.counts);
      }

      setSelectedIds(new Set());
    } catch (err) {
      console.error("[BinPage] Error fetching bin items:", err);
      setError(err.message || "Failed to load items in the Bin");
      setItems([]);
    } finally {
      setLoading(false);
      console.log("[BinPage] Fetch completed, loading:", false);
    }
  }, [activeCategory, projectFilter, searchQuery]);

  // Initial fetch
  useEffect(() => {
    console.log("[BinPage] Initial fetchBinItems call");
    fetchBinItems();
  }, [fetchBinItems]);

  // Real-time socket updates with enhanced null safety
  useEffect(() => {
    let socketRef = null;
    let handleUpdate = null;

    const setupSocket = async () => {
      try {
        console.log("[BinPage] Setting up socket connection");
        const socket = await getReportsSocket();

        if (!socket) {
          console.warn("[BinPage] Socket connection failed");
          return;
        }

        if (typeof socket.on !== "function") {
          console.warn("[BinPage] Socket does not have 'on' method");
          return;
        }

        socketRef = socket;
        handleUpdate = () => {
          console.log("[BinPage] Socket update received");
          fetchBinItems();
        };

        socket.on("reports:update", handleUpdate);
        console.log("[BinPage] Socket event listener attached");
      } catch (err) {
        console.error("[BinPage] Error setting up socket:", err);
      }
    };

    setupSocket();

    return () => {
      console.log("[BinPage] Cleaning up socket connection");
      if (socketRef && handleUpdate && typeof socketRef.off === "function") {
        try {
          socketRef.off("reports:update", handleUpdate);
          console.log("[BinPage] Socket event listener removed");
        } catch (err) {
          console.error("[BinPage] Error removing socket listener:", err);
        }
      }
    };
  }, [fetchBinItems]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    console.log("[BinPage] Toggle select all");
    if (selectedIds.size === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      paginatedItems.forEach((item) => {
        if (item && item.id != null) {
          next.add(`${(item.category || "leads")}:${item.id}`);
        }
      });
      setSelectedIds(next);
    }
  };

  const handleToggleSelectItem = (category, id) => {
    if (id == null) {
      console.warn("[BinPage] Ignoring select item with null id:", {category, id});
      return;
    }

    const key = `${(category || "leads")}:${id}`;
    const next = new Set(selectedIds);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedIds(next);
  };

  // Restore Action
  const handleRestore = async (itemOrItems) => {
    console.log("[BinPage] Restore action triggered");
    setActionBusy(true);
    setStatusMessage("");
    setError("");

    try {
      if (Array.isArray(itemOrItems)) {
        console.log("[BinPage] Restoring multiple items:", itemOrItems.length);
        const byCategory = {};

        itemOrItems.forEach((it) => {
          if (!it || it.id == null) {
            console.warn("[BinPage] Skipping invalid item in batch restore:", it);
            return;
          }
          const cat = it.category || "leads";
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(it.id);
        });

        for (const [cat, ids] of Object.entries(byCategory)) {
          if (ids.length === 0) continue;

          console.log("[BinPage] Restoring category:", cat, "count:", ids.length);
          const res = await fetch(`${API_URL}/api/bin/restore`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ category: cat, ids }),
          });

          if (!res.ok) {
            const r = await res.json().catch(() => ({}));
            throw new Error(r?.message || `Failed to restore ${cat}`);
          }
        }

        setStatusMessage(`Successfully restored ${itemOrItems.length} selected item(s)!`);
      } else if (itemOrItems && itemOrItems.id != null) {
        console.log("[BinPage] Restoring single item:", itemOrItems.id);
        const res = await fetch(`${API_URL}/api/bin/restore`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            category: itemOrItems.category || "leads",
            id: itemOrItems.id
          }),
        });

        if (!res.ok) {
          const r = await res.json().catch(() => ({}));
          throw new Error(r?.message || "Failed to restore item");
        }

        setStatusMessage(`Restored "${itemOrItems.title || itemOrItems.name || "item"}" successfully!`);
      } else {
        throw new Error("Invalid item(s) provided for restore");
      }

      setConfirmModal(null);
      await fetchBinItems();
    } catch (err) {
      console.error("[BinPage] Error in restore:", err);
      setError(err.message || "Unable to restore item");
    } finally {
      setActionBusy(false);
    }
  };

  // Permanent Delete Action
  const handlePermanentDelete = async (itemOrItems) => {
    console.log("[BinPage] Permanent delete action triggered");
    setActionBusy(true);
    setStatusMessage("");
    setError("");

    try {
      if (Array.isArray(itemOrItems)) {
        console.log("[BinPage] Permanently deleting multiple items:", itemOrItems.length);
        const byCategory = {};

        itemOrItems.forEach((it) => {
          if (!it || it.id == null) {
            console.warn("[BinPage] Skipping invalid item in batch delete:", it);
            return;
          }
          const cat = it.category || "leads";
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(it.id);
        });

        for (const [cat, ids] of Object.entries(byCategory)) {
          if (ids.length === 0) continue;

          console.log("[BinPage] Permanently deleting category:", cat, "count:", ids.length);
          const res = await fetch(`${API_URL}/api/bin/permanent-delete`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ category: cat, ids }),
          });

          if (!res.ok) {
            const r = await res.json().catch(() => ({}));
            throw new Error(r?.message || `Failed to permanently delete ${cat}`);
          }
        }

        setStatusMessage(`Permanently deleted ${itemOrItems.length} item(s)!`);
      } else if (itemOrItems && itemOrItems.id != null) {
        console.log("[BinPage] Permanently deleting single item:", itemOrItems.id);
        const res = await fetch(`${API_URL}/api/bin/permanent-delete`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            category: itemOrItems.category || "leads",
            id: itemOrItems.id
          }),
        });

        if (!res.ok) {
          const r = await res.json().catch(() => ({}));
          throw new Error(r?.message || "Failed to delete item permanently");
        }

        setStatusMessage(`Permanently deleted "${itemOrItems.title || itemOrItems.name || "item"}"!`);
      } else {
        throw new Error("Invalid item(s) provided for delete");
      }

      setConfirmModal(null);
      await fetchBinItems();
    } catch (err) {
      console.error("[BinPage] Error in permanent delete:", err);
      setError(err.message || "Unable to permanently delete item");
    } finally {
      setActionBusy(false);
    }
  };

  // Empty Bin Action
  const handleEmptyBin = async () => {
    console.log("[BinPage] Empty bin action triggered");
    setActionBusy(true);

    try {
      console.log("[BinPage] Emptying bin for category:", activeCategory);
      const res = await fetch(`${API_URL}/api/bin/empty`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ category: activeCategory }),
      });

      if (!res.ok) {
        const r = await res.json().catch(() => ({}));
        throw new Error(r?.message || "Failed to empty bin");
      }

      setStatusMessage("Bin emptied successfully!");
      setConfirmModal(null);
      await fetchBinItems();
    } catch (err) {
      console.error("[BinPage] Error emptying bin:", err);
      setError(err.message || "Unable to empty bin");
    } finally {
      setActionBusy(false);
    }
  };

  const totalAllCount = Number(counts?.all || 0);
  console.log("[BinPage] Rendering with state:", {
    itemsCount: items.length,
    loading,
    error,
    activeCategory,
    totalAllCount
  });

  return (
    <MasterLayout>
      <Breadcrumb title="Bin" />

      <div className="card h-100 p-0 radius-12 border-0 shadow-sm">
        {/* Top Header */}
        <div className="p-24 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="w-40-px h-40-px rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center">
                <FaTrashAlt size={18} />
              </span>
              <div>
                <h5 className="mb-0 fw-bold">Recycle Bin</h5>
                <p className="text-muted text-sm mb-0">
                  Restore deleted records with their history, or permanently erase them.
                </p>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {totalAllCount > 0 && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 px-3 py-2"
                onClick={() => setConfirmModal({ action: "empty" })}
              >
                <FaTrash size={13} />
                Empty {activeCategory === "all" ? "Bin" : activeCategory}
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-24 pt-3 pb-2 border-bottom bg-light" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          {CATEGORIES.map((cat) => {
            const count = typeof counts === "object" && counts ? (counts[cat.id] ?? 0) : 0;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setCurrentPage(1);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: isActive ? "600" : "500",
                  cursor: "pointer",
                  border: isActive ? "1.5px solid #487fff" : "1.5px solid #cbd5e1",
                  background: isActive ? "#487fff" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "20px",
                    height: "20px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: isActive ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    color: isActive ? "#ffffff" : "#64748b",
                    padding: "0 5px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Project Filter Bar */}
        <div className="p-20 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ maxWidth: "600px" }}>
            <label className="crm-table-search m-0" style={{ maxWidth: "340px" }}>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search deleted items..."
                aria-label="Search bin"
                style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%", padding: 0 }}
              />
            </label>

            <select
              className="form-select"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ maxWidth: "220px", height: "46px", borderRadius: "8px" }}
            >
              <option value="">All Projects</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `Project #${p.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Selection Actions */}
          {selectedIds.size > 0 && (
            <div className="d-flex align-items-center gap-2 bg-primary-50 p-2 rounded border border-primary-100">
              <span className="text-sm fw-semibold text-primary px-2">
                {selectedIds.size} item(s) selected
              </span>
              <button
                type="button"
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                onClick={() => handleRestore(selectedItemsList)}
                disabled={actionBusy}
              >
                <FaUndo size={11} /> Restore Selected
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                onClick={() => setConfirmModal({ action: "permanent", items: selectedItemsList })}
                disabled={actionBusy}
              >
                <FaTrash size={11} /> Delete Forever
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className="mx-24 mb-3 alert alert-success alert-dismissible fade show" role="alert">
            {statusMessage}
            <button type="button" className="btn-close" onClick={() => setStatusMessage("")}></button>
          </div>
        )}
        {error && (
          <div className="mx-24 mb-3 alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError("")}></button>
          </div>
        )}

        {/* Data Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={{ background: "#487fff", color: "#ffffff", fontWeight: 600, padding: "14px 15px", textAlign: "center", width: "48px", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                    onChange={handleToggleSelectAll}
                    style={{ accentColor: "#fff" }}
                  />
                </th>
                <th style={{ background: "#487fff", color: "#ffffff", fontWeight: 600, padding: "14px 15px", textAlign: "left", whiteSpace: "nowrap" }}>Category</th>
                <th style={{ background: "#487fff", color: "#ffffff", fontWeight: 600, padding: "14px 15px", textAlign: "left", whiteSpace: "nowrap" }}>Item Details</th>
                <th style={{ background: "#487fff", color: "#ffffff", fontWeight: 600, padding: "14px 15px", textAlign: "left", whiteSpace: "nowrap" }}>Project / Association</th>
                <th style={{ background: "#487fff", color: "#ffffff", fontWeight: 600, padding: "14px 15px", textAlign: "left", whiteSpace: "nowrap" }}>Deleted / Trashed On</th>
                <th style={{ background: "#487fff", color: "#ffffff", fontWeight: 600, padding: "14px 15px", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <div className="d-flex align-items-center justify-content-center gap-2">
                      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                      <span>Loading Bin items...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <FaTrashAlt size={32} className="text-secondary opacity-50 mb-2" />
                    <p className="mb-0 fw-medium">The Bin is empty.</p>
                    <small className="text-secondary">Deleted leads, call history, projects, floor plans, units, and tasks will appear here.</small>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  if (!item) {
                    console.warn("[BinPage] Skipping null item at index:", idx);
                    return null;
                  }

                  const itemCat = item.category || "leads";
                  const itemId = item.id || idx;
                  const key = `${itemCat}:${itemId}`;
                  const isSelected = selectedIds.has(key);

                  // Safe date formatting with fallback
                  const dateValue = item.deletedAt || item.updatedAt || item.createdAt;
                  const formattedDate = formatSafeDate(dateValue);

                  const rowBg = isSelected ? "#eff6ff" : idx % 2 === 1 ? "#f8fafc" : "#ffffff";

                  return (
                    <tr
                      key={key}
                      style={{ borderBottom: "1px solid #e2e8f0", background: rowBg, transition: "background 0.15s" }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f1f5f9"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                    >
                      <td style={{ textAlign: "center", padding: "12px 15px", verticalAlign: "middle" }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(itemCat, itemId)}
                        />
                      </td>
                      <td style={{ padding: "12px 15px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                            backgroundColor:
                              itemCat === "leads"
                                ? "#dbeafe"
                                : itemCat === "projects"
                                ? "#e0e7ff"
                                : itemCat === "towers"
                                ? "#e0f2fe"
                                : itemCat === "calllogs"
                                ? "#fef9c3"
                                : itemCat === "floorplans"
                                ? "#dcfce7"
                                : itemCat === "units"
                                ? "#fef3c7"
                                : itemCat === "tasks"
                                ? "#f3e8ff"
                                : itemCat === "users"
                                ? "#fee2e2"
                                : "#f1f5f9",
                            color:
                              itemCat === "leads"
                                ? "#1e40af"
                                : itemCat === "projects"
                                ? "#3730a3"
                                : itemCat === "towers"
                                ? "#0369a1"
                                : itemCat === "calllogs"
                                ? "#854d0e"
                                : itemCat === "floorplans"
                                ? "#15803d"
                                : itemCat === "units"
                                ? "#92400e"
                                : itemCat === "tasks"
                                ? "#6b21a8"
                                : itemCat === "users"
                                ? "#b91c1c"
                                : "#334155",
                          }}
                        >
                          {item.categoryLabel || itemCat}
                        </span>
                      </td>
                      <td style={{ padding: "12px 15px", verticalAlign: "middle", color: "#334155" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                          {item.title || item.name || "Untitled"}
                        </div>
                        {item.subtitle && <div style={{ color: "#64748b", fontSize: "12px" }}>{item.subtitle}</div>}
                        {item.meta && <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>{item.meta}</div>}
                      </td>
                      <td style={{ padding: "12px 15px", verticalAlign: "middle" }}>
                        <span className="bg-light text-dark border px-2 py-1">
                          {item.project || "General"}
                        </span>
                        {item.tower && <span className="badge bg-light text-muted border ms-1">{item.tower}</span>}
                      </td>
                      <td style={{
                        padding: "12px 15px",
                        verticalAlign: "middle",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 500,
                        minWidth: "120px"
                      }}
                      title={formattedDate}
                    >
                      {formattedDate}
                    </td>
                    <td style={{ padding: "12px 15px", textAlign: "right", verticalAlign: "middle" }}>
                      <div className="d-inline-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
                          title="Restore item"
                          onClick={() => handleRestore(item)}
                          disabled={actionBusy}
                          style={{ padding: "5px 10px", fontSize: "12px", fontWeight: "600" }}
                        >
                          <FaUndo size={11} /> Restore
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1"
                          title="Delete permanently"
                          onClick={() => setConfirmModal({ action: "permanent", target: item })}
                          disabled={actionBusy}
                          style={{ padding: "5px 10px", fontSize: "12px", fontWeight: "600" }}
                        >
                          <FaTrash size={11} /> Delete Forever
                        </button>
                      </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Static Fixed Pagination Bar */}
        {items.length > 0 && (
          <div className="table-pagination">
            <span>
              Showing <strong>{pageStartIndex}</strong> to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{items.length}</strong> deleted items
            </span>
            <div className="table-pagination-actions">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="mx-2 text-sm text-secondary">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1055, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "14px" }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <FaExclamationTriangle />
                  {confirmModal.action === "empty"
                    ? "Empty Recycle Bin?"
                    : "Permanently Delete Item(s)?"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setConfirmModal(null)}
                  disabled={actionBusy}
                ></button>
              </div>
              <div className="modal-body py-3">
                {confirmModal.action === "empty" ? (
                  <p className="text-secondary mb-0">
                    Are you sure you want to empty the bin for category{" "}
                    <strong>{activeCategory === "all" ? "All Categories" : activeCategory}</strong>? This action{" "}
                    <strong>cannot be undone</strong> and all records will be permanently erased.
                  </p>
                ) : confirmModal.target ? (
                  <p className="text-secondary mb-0">
                    Are you sure you want to permanently erase{" "}
                    <strong>{confirmModal.target.title || confirmModal.target.name || "this item"}</strong>? This will remove all associated activities and data forever.
                  </p>
                ) : (
                  <p className="text-secondary mb-0">
                    Are you sure you want to permanently delete the <strong>{confirmModal.items?.length || 0} selected item(s)</strong>? This action is permanent and cannot be undone.
                  </p>
                )}
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-secondary px-4"
                  onClick={() => setConfirmModal(null)}
                  disabled={actionBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-4"
                  onClick={() => {
                    if (confirmModal.action === "empty") {
                      handleEmptyBin();
                    } else if (confirmModal.target) {
                      handlePermanentDelete(confirmModal.target);
                    } else if (confirmModal.items) {
                      handlePermanentDelete(confirmModal.items);
                    }
                  }}
                  disabled={actionBusy}
                >
                  {actionBusy ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MasterLayout>
  );
};

export default BinPage;