import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const fallbackTasks = [
  {
    id: 1,
    title: "200 Call",
    subtitle: "Self task",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Mehta",
    status: "Open",
    priority: "Medium",
    createdOn: "May 1, 2026",
    dueOn: "-",
  },
  {
    id: 2,
    title: "Site Visit",
    subtitle: "#8449",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Sales",
    status: "Open",
    priority: "Medium",
    createdOn: "Mar 17, 2026",
    dueOn: "Mar 18, 2026",
  },
  {
    id: 3,
    title: "Loi Completion",
    subtitle: "#10177",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Sales",
    status: "Open",
    priority: "Medium",
    createdOn: "Feb 27, 2026",
    dueOn: "-",
  },
];

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

const normalizeTask = (task, index) => ({
  id: task.id || task._id || index,
  title: task.title || task.name || "Untitled Task",
  subtitle: task.subtitle || task.description || task.type || "",
  assignedTo: task.assignedTo || task.assignee || task.assigneeName || task.assigned_to || "-",
  assignedBy: task.assignedBy || task.assignedByName || task.createdBy || task.created_by || "-",
  status: task.status || "Open",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "");

const Alltask = () => {
  const [tasks, setTasks] = useState(fallbackTasks);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
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
          const savedTasks = JSON.parse(window.localStorage.getItem("savedTasks") || "[]");
          setTasks([...savedTasks, ...taskList].map(normalizeTask));
        }
      } catch (error) {
        if (isMounted) {
          const savedTasks = JSON.parse(window.localStorage.getItem("savedTasks") || "[]");
          setTasks([...savedTasks, ...fallbackTasks].map(normalizeTask));
          setFetchError("Showing sample tasks until the task API is available.");
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

  const totalTasks = tasks.length || 0;

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
            <p className="all-task-total">
              {isLoading ? "LOADING TASKS..." : `TOTAL TASKS : ${filteredTasks.length} / ${totalTasks}`}
            </p>
            {fetchError && <p className="all-task-error">{fetchError}</p>}
          </div>

          <div className="all-task-actions">
            <Link to="/table-basic" className="all-task-add">
              Add Task
            </Link>
            <button type="button" className="all-task-filter-btn" aria-label="Filter tasks">
              <Icon icon="mdi:filter" />
            </button>
          </div>
        </div>

        <div className="all-task-table-wrap">
          <table className="all-task-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>ASSIGNED TO</th>
                <th>STATUS</th>
                <th>PRIORITY</th>
                <th>CREATED ON</th>
                <th>DUE ON</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="all-task-title">{task.title}</div>
                    {task.subtitle && <div className="all-task-subtitle">{task.subtitle}</div>}
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
      </div>

      <style>{`
        .all-task-page {
          background: #fff;
          border-top: 1px solid #dfe4ea;
          margin: -24px -24px 0;
          min-height: calc(100vh - 160px);
        }

        .all-task-toolbar {
          align-items: flex-start;
          display: flex;
          justify-content: space-between;
          padding: 18px 18px 18px 14px;
        }

        .all-task-filter {
          appearance: auto;
          background: #fff;
          border: 1px solid #cdd5df;
          border-radius: 4px;
          color: #3f4650;
          font-size: 18px;
          height: 55px;
          padding: 0 10px;
          width: 436px;
        }

        .all-task-user-filter {
          margin-left: 12px;
          width: 320px;
        }

        .all-task-total,
        .all-task-error {
          color: #818b98;
          font-size: 14px;
          line-height: 1;
          margin: 14px 0 0;
          text-transform: uppercase;
        }

        .all-task-error {
          color: #b42318;
          text-transform: none;
        }

        .all-task-actions {
          display: flex;
          gap: 0;
        }

        .all-task-add {
          align-items: center;
          background: #673ab7;
          border: 1px solid #673ab7;
          border-radius: 5px 0 0 5px;
          color: #fff;
          display: inline-flex;
          font-size: 18px;
          font-weight: 600;
          height: 45px;
          justify-content: center;
          padding: 0 20px;
        }

        .all-task-add:hover {
          color: #fff;
        }

        .all-task-filter-btn {
          align-items: center;
          background: #fff;
          border: 1px solid #cdd5df;
          border-left: 0;
          border-radius: 0 5px 5px 0;
          color: #000;
          display: inline-flex;
          font-size: 25px;
          height: 45px;
          justify-content: center;
          width: 51px;
        }

        .all-task-table-wrap {
          overflow-x: auto;
        }

        .all-task-table {
          border-collapse: collapse;
          color: #394150;
          min-width: 1100px;
          table-layout: fixed;
          width: 100%;
        }

        .all-task-table thead {
          background: #e9edf2;
        }

        .all-task-table th {
          color: #4f5d6d;
          font-size: 14px;
          font-weight: 400;
          height: 50px;
          padding: 0 8px;
          text-align: left;
        }

        .all-task-table th:nth-child(1) {
          width: 32%;
        }

        .all-task-table th:nth-child(2) {
          width: 14%;
        }

        .all-task-table th:nth-child(3),
        .all-task-table th:nth-child(4),
        .all-task-table th:nth-child(5),
        .all-task-table th:nth-child(6) {
          width: 10%;
        }

        .all-task-table th:nth-child(7) {
          text-align: right;
          width: 7%;
        }

        .all-task-table td {
          border-bottom: 1px solid #e2e8f0;
          font-size: 18px;
          height: 62px;
          padding: 6px 8px;
          vertical-align: middle;
        }

        .all-task-title {
          color: #3f4650;
          font-size: 18px;
          line-height: 1.25;
        }

        .all-task-subtitle {
          color: #818b98;
          font-size: 16px;
          line-height: 1.45;
          margin-top: 3px;
        }

        .all-task-action-cell {
          text-align: right;
        }

        .all-task-menu {
          align-items: center;
          background: transparent;
          border: 0;
          color: #000;
          display: inline-flex;
          font-size: 27px;
          height: 32px;
          justify-content: center;
          padding: 0;
          width: 32px;
        }

        .all-task-status-select {
          appearance: auto;
          background: #fff;
          border: 1px solid #cdd5df;
          border-radius: 4px;
          color: #3f4650;
          font-size: 15px;
          min-height: 34px;
          padding: 0 8px;
          width: 130px;
        }

        @media (max-width: 767px) {
          .all-task-page {
            margin: -16px -16px 0;
          }

          .all-task-toolbar {
            gap: 14px;
            padding: 14px;
            flex-direction: column;
          }

          .all-task-filter {
            width: min(436px, calc(100vw - 28px));
          }

          .all-task-user-filter {
            margin-left: 0;
            margin-top: 10px;
            width: min(436px, calc(100vw - 28px));
          }
        }
      `}</style>
    </MasterLayout>
  );
};

export default Alltask;
