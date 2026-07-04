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
  status: task.status || "Open",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const OpenTask = () => {
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
        const response = await fetch(`${API_URL}/tasks?status=Open`);

        if (!response.ok) {
          throw new Error(`Unable to fetch open tasks: ${response.status}`);
        }

        const data = await response.json();
        const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];

        if (isMounted) {
          setTasks(
            taskList.map(normalizeTask).filter((task) => task.status === "Open")
          );
        }
      } catch (error) {
        if (isMounted) {
          setTasks([]);
          setFetchError("Unable to load saved open tasks from the database.");
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
      <div className="open-task-page">
        <div className="open-task-toolbar">
          <div>
            <select className="open-task-filter" defaultValue="Open">
              <option value="Open">Open</option>
              <option value="All">All</option>
              <option value="Closed">Closed</option>
              <option value="Completed">Completed</option>
            </select>
            <p className="open-task-total">
              {isLoading ? "LOADING TASKS..." : `TOTAL TASKS : ${tasks.length}`}
            </p>
            {fetchError && <p className="open-task-error">{fetchError}</p>}
          </div>

          <div className="open-task-actions">
            <Link to="/new-task" className="open-task-add">
              Add Task
            </Link>
            <button type="button" className="open-task-filter-btn" aria-label="Filter tasks">
              <Icon icon="mdi:filter" />
            </button>
          </div>
        </div>

        <div className="open-task-table-wrap">
          {/* <p>Open Task Data</p> */}
          <label className="crm-table-search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search open task..."
              aria-label="Search open tasks"
            />
          </label>
          <table className="open-task-table">
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
                  <td colSpan="7" className="open-task-empty">
                    {isLoading ? "Loading tasks..." : searchQuery ? "No matching open tasks found." : "No saved open tasks found."}
                  </td>
                </tr>
              ) : paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="open-task-title">{task.title}</div>
                    {/* {task.subtitle && <div className="open-task-subtitle">{task.subtitle}</div>} */}
                  </td>
                  <td>
                    <div className="open-task-title">{task.assignedTo}</div>
                    <div className="open-task-subtitle">by {task.assignedBy}</div>
                  </td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.createdOn}</td>
                  <td>{task.dueOn}</td>
                  <td className="open-task-action-cell">
                    <button type="button" className="open-task-menu" aria-label="Task actions">
                      <Icon icon="ph:dots-three-vertical-bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTasks.length > 0 && (
          <div className="open-task-pagination">
            <div className="open-task-page-info">
              Showing <strong>{firstTaskNumber}</strong> to <strong>{lastTaskNumber}</strong> of{" "}
              <strong>{filteredTasks.length}</strong> tasks
            </div>
            <div className="open-task-page-actions">
              <button
                type="button"
                className="open-task-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span className="open-task-page-count">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="open-task-page-btn"
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

export default OpenTask;
