import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const fallbackTasks = [
  {
    id: 1,
    title: "Need To Connect With The Customer",
    subtitle: "#8466",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Sales",
    status: "Completed",
    priority: "Medium",
    createdOn: "Dec 10, 2025",
    dueOn: "Dec 11, 2025",
  },
  {
    id: 2,
    title: "You Have To Pick Client 10pm 2mrw",
    subtitle: "Self task",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Mehta",
    status: "Completed",
    priority: "Medium",
    createdOn: "Sep 16, 2025",
    dueOn: "-",
  },
  {
    id: 3,
    title: "100 Call",
    subtitle: "Self task",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Mehta",
    status: "Completed",
    priority: "Medium",
    createdOn: "Jul 16, 2025",
    dueOn: "-",
  },
  {
    id: 4,
    title: "Call Rahul For Sv",
    subtitle: "#8495",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Sales",
    status: "Completed",
    priority: "Medium",
    createdOn: "Jul 14, 2025",
    dueOn: "-",
  },
  {
    id: 5,
    title: "Ankur Task",
    subtitle: "",
    assignedTo: "Tejas Sales",
    assignedBy: "Tejas Sales",
    status: "Completed",
    priority: "Medium",
    createdOn: "Jun 30, 2025",
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
  assignedTo: task.assignedTo || task.assignee || task.assigned_to || "-",
  assignedBy: task.assignedBy || task.createdBy || task.created_by || "-",
  status: task.status || "Completed",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const CompletedTask = () => {
  const [tasks, setTasks] = useState(fallbackTasks);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`${API_URL}/tasks?status=Completed`);

        if (!response.ok) {
          throw new Error(`Unable to fetch completed tasks: ${response.status}`);
        }

        const data = await response.json();
        const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];

        if (isMounted) {
          setTasks(
            taskList
              .map(normalizeTask)
              .filter((task) => task.status === "Completed")
          );
        }
      } catch (error) {
        if (isMounted) {
          setTasks(fallbackTasks);
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
      <div className="completed-task-page">
        <div className="completed-task-toolbar">
          <div>
            <select className="completed-task-filter" defaultValue="Completed">
              <option value="Completed">Completed</option>
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
            <p className="completed-task-total">
              {isLoading ? "LOADING TASKS..." : `TOTAL TASKS : ${tasks.length || 7}`}
            </p>
          </div>

          <div className="completed-task-actions">
            <Link to="/table-basic" className="completed-task-add">
              Add Task
            </Link>
            <button
              type="button"
              className="completed-task-filter-btn"
              aria-label="Filter tasks"
            >
              <Icon icon="mdi:filter" />
            </button>
          </div>
        </div>

        <div className="completed-task-table-wrap">
          <table className="completed-task-table">
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
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="completed-task-title">{task.title}</div>
                    {task.subtitle && (
                      <div className="completed-task-subtitle">{task.subtitle}</div>
                    )}
                  </td>
                  <td>
                    <div className="completed-task-title">{task.assignedTo}</div>
                    <div className="completed-task-subtitle">by {task.assignedBy}</div>
                  </td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.createdOn}</td>
                  <td>{task.dueOn}</td>
                  <td className="completed-task-action-cell">
                    <button
                      type="button"
                      className="completed-task-menu"
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
      </div>

      <style>{`
        .completed-task-page {
          background: #fff;
          border-top: 1px solid #dfe4ea;
          margin: -24px -24px 0;
          min-height: calc(100vh - 160px);
        }

        .completed-task-toolbar {
          align-items: flex-start;
          display: flex;
          justify-content: space-between;
          padding: 12px 18px 18px 15px;
        }

        .completed-task-filter {
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

        .completed-task-total {
          color: #818b98;
          font-size: 14px;
          line-height: 1;
          margin: 14px 0 0;
          text-transform: uppercase;
        }

        .completed-task-actions {
          display: flex;
        }

        .completed-task-add {
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

        .completed-task-add:hover {
          color: #fff;
        }

        .completed-task-filter-btn {
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

        .completed-task-table-wrap {
          overflow-x: auto;
        }

        .completed-task-table {
          border-collapse: collapse;
          color: #394150;
          min-width: 1100px;
          table-layout: fixed;
          width: 100%;
        }

        .completed-task-table thead {
          background: #e9edf2;
        }

        .completed-task-table th {
          color: #4f5d6d;
          font-size: 14px;
          font-weight: 400;
          height: 50px;
          padding: 0 8px;
          text-align: left;
        }

        .completed-task-table th:nth-child(1) {
          width: 32%;
        }

        .completed-task-table th:nth-child(2) {
          width: 13%;
        }

        .completed-task-table th:nth-child(3),
        .completed-task-table th:nth-child(4),
        .completed-task-table th:nth-child(5),
        .completed-task-table th:nth-child(6) {
          width: 10%;
        }

        .completed-task-table th:nth-child(7) {
          text-align: right;
          width: 7%;
        }

        .completed-task-table td {
          border-bottom: 1px solid #e2e8f0;
          font-size: 18px;
          height: 62px;
          padding: 6px 8px;
          vertical-align: middle;
        }

        .completed-task-title {
          color: #3f4650;
          font-size: 18px;
          line-height: 1.25;
        }

        .completed-task-subtitle {
          color: #818b98;
          font-size: 16px;
          line-height: 1.45;
          margin-top: 3px;
        }

        .completed-task-action-cell {
          text-align: right;
        }

        .completed-task-menu {
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

        @media (max-width: 767px) {
          .completed-task-page {
            margin: -16px -16px 0;
          }

          .completed-task-toolbar {
            flex-direction: column;
            gap: 14px;
            padding: 14px;
          }

          .completed-task-filter {
            width: min(436px, calc(100vw - 28px));
          }
        }
      `}</style>
    </MasterLayout>
  );
};

export default CompletedTask;
