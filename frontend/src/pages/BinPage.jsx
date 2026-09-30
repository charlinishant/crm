import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { FaTrashAlt, FaUndo, FaTrash, FaExclamationTriangle, FaFilter } from "react-icons/fa";
import { getReportsSocket } from "../services/socketClient";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

const ITEMS_PER_PAGE = 15;

const BinPage = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, leads: 0, projects: 0, towers: 0, calllogs: 0, floorplans: 0, units: 0, tasks: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [projectsList, setProjectsList] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null); // { action: 'permanent' | 'empty' | 'restore', target: ... }
  const [actionBusy, setActionBusy] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch available projects for filtering
  useEffect(() => {
    fetch(`${API_URL}/projects`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProjectsList(data);
      })
      .catch(() => {});
  }, []);

  // Fetch Bin Items
  const fetchBinItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.append("category", activeCategory);
      if (projectFilter) params.append("projectId", projectFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const response = await fetch(`${API_URL}/api/bin?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Failed to load bin items");

      setItems(Array.isArray(result.data) ? result.data : []);
      if (result.counts) setCounts(result.counts);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error fetching bin items:", err);
      setError(err.message || "Failed to load items in the Bin");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, projectFilter, searchQuery]);

  useEffect(() => {
    fetchBinItems();
  }, [fetchBinItems]);

  // Real-time socket updates
  useEffect(() => {
    let socketRef = null;
    getReportsSocket()
      .then((socket) => {
        socketRef = socket;
        const handleUpdate = () => fetchBinItems();
        socket.on("reports:update", handleUpdate);
      })
      .catch(() => {});

    return () => {
      if (socketRef) {
        socketRef.off("reports:update");
      }
    };
  }, [fetchBinItems]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      paginatedItems.forEach((item) => next.add(`${item.category}:${item.id}`));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectItem = (category, id) => {
    const key = `${category}:${id}`;
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedIds(next);
  };

  // Restore Action
  const handleRestore = async (itemOrItems) => {
    setActionBusy(true);
    setStatusMessage("");
    setError("");
    try {
      if (Array.isArray(itemOrItems)) {
        // Group by category
        const byCategory = {};
        itemOrItems.forEach((it) => {
          if (!byCategory[it.category]) byCategory[it.category] = [];
          byCategory[it.category].push(it.id);
        });

        for (const [cat, ids] of Object.entries(byCategory)) {
          const res = await fetch(`${API_URL}/api/bin/restore`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ category: cat, ids }),
          });
          if (!res.ok) {
            const r = await res.json();
            throw new Error(r?.message || `Failed to restore ${cat}`);
          }
        }
        setStatusMessage(`Successfully restored ${itemOrItems.length} selected item(s)!`);
      } else {
        const res = await fetch(`${API_URL}/api/bin/restore`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ category: itemOrItems.category, id: itemOrItems.id }),
        });
        if (!res.ok) {
          const r = await res.json();
          throw new Error(r?.message || "Failed to restore item");
        }
        setStatusMessage(`Restored "${itemOrItems.title}" successfully!`);
      }
      setConfirmModal(null);
      await fetchBinItems();
    } catch (err) {
      setError(err.message || "Unable to restore item");
    } finally {
      setActionBusy(false);
    }
  };

  // Permanent Delete Action
  const handlePermanentDelete = async (itemOrItems) => {
    setActionBusy(true);
    setStatusMessage("");
    setError("");
    try {
      if (Array.isArray(itemOrItems)) {
        const byCategory = {};
        itemOrItems.forEach((it) => {
          if (!byCategory[it.category]) byCategory[it.category] = [];
          byCategory[it.category].push(it.id);
        });

        for (const [cat, ids] of Object.entries(byCategory)) {
          const res = await fetch(`${API_URL}/api/bin/permanent-delete`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ category: cat, ids }),
          });
          if (!res.ok) {
            const r = await res.json();
            throw new Error(r?.message || `Failed to permanently delete ${cat}`);
          }
        }
        setStatusMessage(`Permanently deleted ${itemOrItems.length} item(s)!`);
      } else {
        const res = await fetch(`${API_URL}/api/bin/permanent-delete`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ category: itemOrItems.category, id: itemOrItems.id }),
        });
        if (!res.ok) {
          const r = await res.json();
          throw new Error(r?.message || "Failed to delete item permanently");
        }
        setStatusMessage(`Permanently deleted "${itemOrItems.title}"!`);
      }
      setConfirmModal(null);
      await fetchBinItems();
    } catch (err) {
      setError(err.message || "Unable to permanently delete item");
    } finally {
      setActionBusy(false);
    }
  };

  // Empty Bin Action
  const handleEmptyBin = async () => {
    setActionBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/bin/empty`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ category: activeCategory }),
      });
      if (!res.ok) throw new Error("Failed to empty bin");
      setStatusMessage("Bin emptied successfully!");
      setConfirmModal(null);
      await fetchBinItems();
    } catch (err) {
      setError(err.message || "Unable to empty bin");
    } finally {
      setActionBusy(false);
    }
  };

  // Selected items objects
  const selectedItemsList = useMemo(() => {
    return items.filter((it) => selectedIds.has(`${it.category}:${it.id}`));
  }, [items, selectedIds]);

  // Pagination calculations
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageEndIndex = Math.min(items.length, currentPage * ITEMS_PER_PAGE);

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
            {counts.all > 0 && (
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
            const count = counts[cat.id] ?? 0;
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
                  {p.name}
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
                    Loading bin items...
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
                  const key = `${item.category}:${item.id}`;
                  const isSelected = selectedIds.has(key);
                  const formattedDate = item.deletedAt ? new Date(item.deletedAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "-";

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
                          onChange={() => handleToggleSelectItem(item.category, item.id)}
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
                              item.category === "leads"
                                ? "#dbeafe"
                                : item.category === "projects"
                                ? "#e0e7ff"
                                : item.category === "floorplans"
                                ? "#dcfce7"
                                : item.category === "units"
                                ? "#fef3c7"
                                : item.category === "tasks"
                                ? "#f3e8ff"
                                : item.category === "users"
                                ? "#fee2e2"
                                : "#f1f5f9",
                            color:
                              item.category === "leads"
                                ? "#1e40af"
                                : item.category === "projects"
                                ? "#3730a3"
                                : item.category === "floorplans"
                                ? "#15803d"
                                : item.category === "units"
                                ? "#92400e"
                                : item.category === "tasks"
                                ? "#6b21a8"
                                : item.category === "users"
                                ? "#b91c1c"
                                : "#334155",
                          }}
                        >
                          {item.categoryLabel || item.category}
                        </span>
                      </td>
                      <td style={{ padding: "12px 15px", verticalAlign: "middle", color: "#334155" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                          {item.title}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "12px" }}>{item.subtitle}</div>
                        {item.meta && <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>{item.meta}</div>}
                      </td>
                      <td style={{ padding: "12px 15px", verticalAlign: "middle" }}>
                        <span className="badge bg-light text-dark border px-2 py-1">
                          {item.project || "General"}
                        </span>
                        {item.tower && <span className="badge bg-light text-muted border ms-1">{item.tower}</span>}
                      </td>
                      <td style={{ padding: "12px 15px", verticalAlign: "middle", color: "#64748b", fontSize: "13px" }}>{formattedDate}</td>
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
              Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
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
                    <strong>{confirmModal.target.title}</strong>? This will remove all associated activities and data forever.
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
