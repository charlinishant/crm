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

const Alltask = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      setIsLoading(true);
      setFetchError("");

      try {
        const response = await fetch(`${API_URL}/tasks`);

        if (!response.ok) {
          throw new Error(`Unable to fetch tasks: ${response.status}`);
        }

        const data = await response.json();
        const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];

        if (isMounted) {
          setTasks(taskList.map(normalizeTask));
        }
      } catch (error) {
        if (isMounted) {
          setTasks([]);
          setFetchError("Unable to load saved tasks from the database.");
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

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/users?limit=100`);
        if (!response.ok) throw new Error("Unable to fetch users");

        const result = await response.json();
        const userList = Array.isArray(result) ? result : result?.data || result?.users || [];

        if (isMounted) {
          setUsers(userList);
        }
      } catch (error) {
        if (isMounted) {
          setUsers([]);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesAssignee = assigneeFilter === "All" || task.assignedTo === assigneeFilter;

      return matchesStatus && matchesAssignee;
    });
  }, [assigneeFilter, statusFilter, tasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [currentPage, filteredTasks]);
  const firstTaskNumber = filteredTasks.length === 0 ? 0 : (currentPage - 1) * TASKS_PER_PAGE + 1;
  const lastTaskNumber = Math.min(currentPage * TASKS_PER_PAGE, filteredTasks.length);
  const totalTasks = tasks.length || 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [assigneeFilter, statusFilter]);

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
    } catch (error) {
      setTasks(previousTasks);
      setFetchError(error.message || "Unable to update task status.");
    }
  };

  return (
    <MasterLayout>
      <div className="all-task-page">
        <div className="all-task-toolbar">
          <div>
            <div className="all-task-filter-row">
              <select
                className="all-task-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="Open">Open</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
              <select
                className="all-task-filter all-task-user-filter"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="All">All Users</option>
                {users.map((user) => {
                  const userName = getUserName(user);

                  if (!userName) return null;

                  return (
                    <option key={user.id || user.email} value={userName}>
                      {userName}
                      {user.role ? ` (${user.role})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="all-task-total">
              {isLoading ? "LOADING TASKS..." : `TOTAL TASKS : ${filteredTasks.length} / ${totalTasks}`}
            </p>
            {fetchError && <p className="all-task-error">{fetchError}</p>}
          </div>

          <div className="all-task-actions">
            <Link to="/new-task" className="all-task-add">
              Add Task
            </Link>
            {/* <button type="button" className="all-task-filter-btn" aria-label="Filter tasks">
              <Icon icon="mdi:filter" />
            </button> */}
          </div>
        </div>

        <div className="all-task-table-wrap">
          {/* <p>Task Data</p> */}
          <table className="all-task-table">
            <thead>
              <tr>
                <th style={{ borderStartStartRadius: '8px', borderEndStartRadius: '8px' }}>Title</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Due On</th>
                <th style={{ borderStartEndRadius: '8px', borderEndEndRadius: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="all-task-empty">
                    {isLoading ? "Loading tasks..." : "No saved tasks found."}
                  </td>
                </tr>
              ) : paginatedTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="all-task-title">{task.title}</div>
                    {/* {task.subtitle && <div className="all-task-subtitle">{task.subtitle}</div>} */}
                  </td>
                  <td>
                    <div className="all-task-title">{task.assignedTo}</div>
                    <div className="all-task-subtitle">by {task.assignedBy}</div>
                  </td>
                  <td>
                    <select
                      className="all-task-status-select"
                      value={task.status}
                      onChange={(event) => updateTaskStatus(task.id, event.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </td>
                  <td>{task.priority}</td>
                  <td>{task.createdOn}</td>
                  <td>{task.dueOn}</td>
                  <td className="all-task-action-cell">
                    <button type="button" className="all-task-menu" aria-label="Task actions">
                      <Icon icon="ph:dots-three-vertical-bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTasks.length > 0 && (
          <div className="all-task-pagination">
            <div className="all-task-page-info">
              Showing <strong>{firstTaskNumber}</strong> to <strong>{lastTaskNumber}</strong> of{" "}
              <strong>{filteredTasks.length}</strong> tasks
            </div>
            <div className="all-task-page-actions">
              <button
                type="button"
                className="all-task-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span className="all-task-page-count">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="all-task-page-btn"
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

export default Alltask;
