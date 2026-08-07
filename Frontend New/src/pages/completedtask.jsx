import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

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
  title: task.title || task.name || "Untitled Task",
  subtitle: task.subtitle || task.description || task.type || "",
  assignedTo: getTaskUserLabel(task.assignedTo, task.assignee, task.assigneeName, task.assigned_to, task.assign),
  assignedBy: getTaskUserLabel(task.assignedByName, task.createdBy, task.created_by, task.assignedBy),
  status: task.status || "Completed",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const CompletedTask = () => {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [fetchError, setFetchError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      setIsLoading(true);
      setFetchError("");

      try {
        const response = await fetch(`${API_URL}/tasks?status=Completed`);

        if (!response.ok) {
          throw new Error(`Unable to fetch completed tasks: ${response.status}`);
        }

        const data = await response.json();
        const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];

        if (isMounted) {
          setTasks(
            taskList.map(normalizeTask).filter((task) => task.status === "Completed")
          );
        }
      } catch (error) {
        if (isMounted) {
          setTasks([]);
          setFetchError("Unable to load saved completed tasks from the database.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tasks;

    return tasks.filter((task) =>
      [
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
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, tasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [currentPage, filteredTasks]);
  const firstTaskNumber = filteredTasks.length === 0 ? 0 : (currentPage - 1) * TASKS_PER_PAGE + 1;
  const lastTaskNumber = Math.min(currentPage * TASKS_PER_PAGE, filteredTasks.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <MasterLayout>
      <div className="completed-task-page">
        <div className="completed-task-toolbar">
          <div className="completed-task-toolbar-summary">
            <p className="completed-task-total">
              {isLoading ? "LOADING TASKS..." : `${filteredTasks.length} items`}
            </p>
            {fetchError && <p className="completed-task-error">{fetchError}</p>}
          </div>

          <div className="completed-task-actions">
            <Link to="/new-task" className="completed-task-add">
              Add Task
            </Link>
          </div>
        </div>

        <div className="status-task-table-wrap">
          {/* <p>Completed Task Data</p> */}
          <label className="crm-table-search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search completed task..."
              aria-label="Search completed tasks"
            />
          </label>
          <table className="status-task-table">
            <thead>
              <tr>
                <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Title</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Due On</th>
                <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="status-task-empty">
                    {isLoading ? "Loading tasks..." : searchQuery ? "No matching completed tasks found." : "No saved completed tasks found."}
                  </td>
                </tr>
              ) : paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="status-task-title">{task.title}</div>
                    {task.subtitle && (
                      <div className="status-task-subtitle">{task.subtitle}</div>
                    )}
                  </td>
                  <td>
                    <div className="status-task-title">{task.assignedTo}</div>
                    <div className="status-task-subtitle">by {task.assignedBy}</div>
                  </td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.createdOn}</td>
                  <td>{task.dueOn}</td>
                  <td className="status-task-action-cell">
                    <button
                      type="button"
                      className="status-task-menu"
                      aria-label="Task actions"
                    >
                      <Icon icon="ph:dots-three-vertical-bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTasks.length > 0 && (
          <div className="status-task-pagination">
            <div className="status-task-page-info">
              Showing <strong>{firstTaskNumber}</strong> to <strong>{lastTaskNumber}</strong> of{" "}
              <strong>{filteredTasks.length}</strong> tasks
            </div>
            <div className="status-task-page-actions">
              <button
                type="button"
                className="status-task-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span className="status-task-page-count">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="status-task-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

export default CompletedTask;
