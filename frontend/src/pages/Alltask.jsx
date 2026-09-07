import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import TableSelectionCheckbox from "../components/table/TableSelectionCheckbox";
import { useTableSelection } from "../components/table/useTableSelection";
import BulkActionToolbar from "../components/table/BulkActionToolbar";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const TASKS_PER_PAGE = 10;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "");

const getTaskUserLabel = (...values) => {
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "object") {
      const name = getUserName(value);
      if (name) return name;
      continue;
    }
    return value;
  }

  return "-";
};

const normalizeTask = (task, index) => ({
  id: task.id || task._id || index,
  raw: task,
  title: task.title || task.name || "Untitled Task",
  subtitle: task.subtitle || task.description || task.type || "",
  assignedTo: getTaskUserLabel(task.assignedTo, task.assignee, task.assigneeName, task.assigned_to, task.assign),
  assignedBy: getTaskUserLabel(task.assignedByName, task.createdBy, task.created_by, task.assignedBy),
  status: task.status || "Open",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const Alltask = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [openActionId, setOpenActionId] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchTasks = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setFetchError("");

    try {
      const response = await fetch(`${API_URL}/tasks`);

      if (!response.ok) {
        throw new Error(`Unable to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];
      setTasks(taskList.map(normalizeTask));
    } catch (error) {
      setTasks([]);
      setFetchError("Unable to load saved tasks from the database.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (statusFilter !== "All" && task.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (!query) return true;

      return [
        task.title,
        task.subtitle,
        task.assignedTo,
        task.assignedBy,
        task.status,
        task.priority,
        task.createdOn,
        task.dueOn,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchQuery, statusFilter, tasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [currentPage, filteredTasks]);
  const firstTaskNumber = filteredTasks.length === 0 ? 0 : (currentPage - 1) * TASKS_PER_PAGE + 1;
  const lastTaskNumber = Math.min(currentPage * TASKS_PER_PAGE, filteredTasks.length);

  const tableSelection = useTableSelection({
    rows: paginatedTasks,
    getRowId: (item) => item.id,
    disabled: bulkDeleting,
    pruneOnRowsChange: true,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const updateTaskStatus = async (taskId, status) => {
    const previousTasks = tasks;
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task))
    );

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update task");

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? normalizeTask({ ...task, ...result }, task.id) : task
        )
      );
      setStatusMessage(`Task #${taskId} updated to ${status}.`);
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (error) {
      setTasks(previousTasks);
      setFetchError(error.message || "Unable to update task status.");
    }
  };

  const handleEditTask = (task) => {
    setOpenActionId(null);
    navigate(`/new-task?editTaskId=${task.id}`, { state: { task: task.raw || task } });
  };

  const handleViewTask = (task) => {
    setOpenActionId(null);
    setViewTask(task);
  };

  const handleDeleteTask = async (taskId) => {
    setOpenActionId(null);
    if (!window.confirm("Delete this task?")) return;

    const previousTasks = tasks;
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setFetchError("");

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to delete task");
      setStatusMessage("Task deleted successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (error) {
      setTasks(previousTasks);
      setFetchError(error.message || "Unable to delete task.");
    }
  };

  const handleBulkDelete = async () => {
    if (tableSelection.selectedCount === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${tableSelection.selectedCount} selected task(s)?`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      const deletePromises = tableSelection.selectedIds.map((id) =>
        fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" })
      );
      await Promise.all(deletePromises);
      setTasks((prev) => prev.filter((t) => !tableSelection.selectedIds.includes(t.id)));
      tableSelection.clearSelection();
      setStatusMessage("Selected tasks deleted successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      setFetchError("Failed to delete selected tasks.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <MasterLayout>
      <div className="floor-dashboard booking-dashboard">
        <div className="floor-card booking-card">
          {/* Header Controls */}
          <div className="floor-header d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <select
                className="form-select booking-dropdown"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter tasks by status"
              >
                <option value="All">All Tasks</option>
                <option value="Open">Open</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
              <span className="item-count">{filteredTasks.length} items.</span>
            </div>

            <div className="action-wrapper d-flex align-items-center gap-2">
              <div className="search-container">
                <input
                  type="text"
                  className="form-control form-control-sm search-input-override"
                  placeholder="Search task..."
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
              <button
                type="button"
                className="btn btn-outline-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
                style={{ height: "40px", borderRadius: "8px", fontWeight: 600, fontSize: "14px", padding: "0 16px", whiteSpace: "nowrap" }}
                onClick={() => fetchTasks(true)}
                disabled={isLoading}
                title="Refresh tasks"
              >
                <Icon icon="tabler:refresh" className={isLoading ? "spin" : ""} /> Refresh
              </button>
              <Link
                to="/new-task"
                className="btn btn-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
                style={{ height: "40px", borderRadius: "8px", fontWeight: 600, fontSize: "14px", padding: "0 18px", whiteSpace: "nowrap" }}
              >
                <Icon icon="solar:add-circle-linear" width={18} /> Add Task
              </Link>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="booking-status-message mb-3">{statusMessage}</div>
          )}
          {fetchError && (
            <div className="admin-email-error mb-3">{fetchError}</div>
          )}

          {/* Bulk Action Toolbar */}
          {tableSelection.selectedCount > 0 && (
            <BulkActionToolbar
              count={tableSelection.selectedCount}
              entityLabel="tasks"
              isDeleting={bulkDeleting}
              onClear={() => {
                tableSelection.clearSelection();
                setStatusMessage("");
              }}
              onDelete={handleBulkDelete}
              deleteLabel="Delete selected"
            />
          )}

          {/* Table */}
          <div className="table-responsive">
            <table className="floor-table">
              <thead>
                <tr>
                  <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px", width: "48px", textAlign: "center", padding: "14px 12px" }}>
                    <TableSelectionCheckbox
                      checked={tableSelection.allVisibleSelected}
                      indeterminate={tableSelection.isHeaderIndeterminate}
                      label="Select visible tasks"
                      onChange={tableSelection.toggleVisible}
                      disabled={bulkDeleting || paginatedTasks.length === 0}
                    />
                  </th>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created On</th>
                  <th>Due On</th>
                  <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        {searchQuery ? "No matching tasks found." : "No saved tasks found."}
                      </div>
                      <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                        Create a new task to get started.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={tableSelection.isSelected(task.id) ? "selected" : ""}
                    >
                      <td style={{ textAlign: "center", padding: "14px 12px" }}>
                        <TableSelectionCheckbox
                          checked={tableSelection.isSelected(task.id)}
                          label={`Select task ${task.id}`}
                          onChange={() => tableSelection.toggleRow(task.id)}
                          disabled={bulkDeleting}
                        />
                      </td>
                      <td>
                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>
                          {task.title}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{task.assignedTo}</div>
                        {task.assignedBy && (
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            by {task.assignedBy}
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{
                            minWidth: "120px",
                            height: "36px",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "13px",
                            borderColor: "#cbd5e1"
                          }}
                          value={task.status}
                          onChange={(event) => updateTaskStatus(task.id, event.target.value)}
                        >
                          <option value="Open">Open</option>
                          <option value="Completed">Completed</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            task.priority === "High"
                              ? "bg-danger-focus text-danger-main"
                              : task.priority === "Low"
                              ? "bg-neutral-200 text-neutral-600"
                              : "bg-warning-focus text-warning-main"
                          }`}
                          style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "20px" }}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td>{task.createdOn}</td>
                      <td>{task.dueOn}</td>
                      <td className="text-center">
                        <div className="position-relative d-inline-block">
                          <button
                            type="button"
                            className="booking-action-button"
                            aria-label="Task actions"
                            onClick={() => setOpenActionId((current) => (current === task.id ? null : task.id))}
                          >
                            <Icon icon="ph:dots-three-vertical-bold" width={18} />
                          </button>
                          {openActionId === task.id && (
                            <div
                              className="all-task-action-dropdown"
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                zIndex: 100,
                                background: "#ffffff",
                                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                                borderRadius: "8px",
                                padding: "6px 0",
                                minWidth: "120px",
                                border: "1px solid #e2e8f0"
                              }}
                            >
                              <button
                                type="button"
                                style={{ width: "100%", textAlign: "left", padding: "8px 16px", border: "none", background: "none", fontSize: "13px" }}
                                onClick={() => handleViewTask(task)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                style={{ width: "100%", textAlign: "left", padding: "8px 16px", border: "none", background: "none", fontSize: "13px" }}
                                onClick={() => handleEditTask(task)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                style={{ width: "100%", textAlign: "left", padding: "8px 16px", border: "none", background: "none", fontSize: "13px", color: "#ef4444" }}
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && filteredTasks.length > 0 && (
            <div className="booking-pagination">
              <span className="booking-pagination-info">
                Showing {firstTaskNumber}-{lastTaskNumber} of {filteredTasks.length}
              </span>
              <div className="booking-pagination-actions">
                <button
                  type="button"
                  className="booking-page-button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <span className="booking-page-count">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="booking-page-button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {viewTask && <TaskViewModal task={viewTask} onClose={() => setViewTask(null)} />}
        </div>
      </div>
    </MasterLayout>
  );
};

const TaskViewModal = ({ task, onClose }) => {
  const raw = task.raw || {};
  const details = [
    ["Title", task.title],
    ["Assigned To", task.assignedTo],
    ["Assigned By", task.assignedBy],
    ["Status", task.status],
    ["Priority", task.priority],
    ["Created On", task.createdOn],
    ["Due On", task.dueOn],
    ["Due Time", raw.dueTime || "-"],
    ["Description", raw.description || task.subtitle || "-"],
    ["Remark", raw.remark || "-"],
  ];

  return (
    <div className="admin-email-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="admin-email-modal" role="dialog" aria-modal="true" aria-labelledby="task-view-title">
        <div className="admin-email-modal-head">
          <div>
            <h5 id="task-view-title">{task.title}</h5>
            <p>Task details</p>
          </div>
          <button type="button" className="admin-email-close" onClick={onClose} aria-label="Close">
            <Icon icon="material-symbols:close-rounded" className="text-xl" />
          </button>
        </div>
        <div className="admin-email-details">
          {details.map(([label, value]) => (
            <div className="admin-email-detail" key={label}>
              <span>{label}</span>
              <strong>{value || "-"}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Alltask;
