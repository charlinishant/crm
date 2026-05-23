import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  status: task.status || "Archived",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const Archivedtask = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      setIsLoading(true);
      setFetchError("");

      try {
        const response = await fetch(`${API_URL}/tasks?status=Archived`);

        if (!response.ok) {
          throw new Error(`Unable to fetch archived tasks: ${response.status}`);
        }

        const data = await response.json();
        const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];

        if (isMounted) {
          setTasks(
            taskList.map(normalizeTask).filter((task) => task.status === "Archived")
          );
        }
      } catch (error) {
        if (isMounted) {
          setTasks([]);
          setFetchError("Unable to load saved archived tasks from the database.");
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

  return (
    <MasterLayout>
      <div className="archived-task-page">
        <div className="archived-task-toolbar">
          <div>
            <select className="archived-task-filter" defaultValue="Archived">
              <option value="Archived">Archived</option>
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="Completed">Completed</option>
            </select>
            <p className="archived-task-total">
              {isLoading ? "LOADING TASKS..." : `TOTAL TASKS : ${tasks.length}`}
            </p>
            {fetchError && <p className="archived-task-error">{fetchError}</p>}
          </div>

          <div className="archived-task-actions">
            <Link to="/new-task" className="archived-task-add">
              Add Task
            </Link>
            <button
              type="button"
              className="archived-task-filter-btn"
              aria-label="Filter tasks"
            >
              <Icon icon="mdi:filter" />
            </button>
          </div>
        </div>

        <div className="archived-task-table-wrap">
          <table className="archived-task-table">
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
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="archived-task-empty">
                    {isLoading ? "Loading tasks..." : "No saved archived tasks found."}
                  </td>
                </tr>
              ) : tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="archived-task-title">{task.title}</div>
                    {task.subtitle && <div className="archived-task-subtitle">{task.subtitle}</div>}
                  </td>
                  <td>
                    <div className="archived-task-title">{task.assignedTo}</div>
                    <div className="archived-task-subtitle">by {task.assignedBy}</div>
                  </td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.createdOn}</td>
                  <td>{task.dueOn}</td>
                  <td className="archived-task-action-cell">
                    <button type="button" className="archived-task-menu" aria-label="Task actions">
                      <Icon icon="ph:dots-three-vertical-bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MasterLayout>
  );
};

export default Archivedtask;
