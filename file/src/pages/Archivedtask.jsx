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

const normalizeTask = (task, index) => ({
  id: task.id || task._id || index,
  title: task.title || task.name || "Untitled Task",
  subtitle: task.subtitle || task.description || task.type || "",
  assignedTo: task.assignedTo || task.assignee || task.assigned_to || "-",
  assignedBy: task.assignedBy || task.createdBy || task.created_by || "-",
  status: task.status || "Archived",
  priority: task.priority || "Medium",
  createdOn: formatDate(task.createdOn || task.createdAt || task.created_on),
  dueOn: formatDate(task.dueOn || task.dueDate || task.due_on),
});

const Archivedtask = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`${API_URL}/tasks?status=Archived`);

        if (!response.ok) {
          throw new Error(`Unable to fetch archived tasks: ${response.status}`);
        }

        const data = await response.json();
        const taskList = Array.isArray(data) ? data : data.tasks || data.data || [];
        const savedTasks = JSON.parse(window.localStorage.getItem("savedTasks") || "[]");

        if (isMounted) {
          setTasks(
            [...savedTasks, ...taskList]
              .map(normalizeTask)
              .filter((task) => task.status === "Archived")
          );
        }
      } catch (error) {
        if (isMounted) {
          const savedTasks = JSON.parse(window.localStorage.getItem("savedTasks") || "[]");
          setTasks(
            savedTasks
              .map(normalizeTask)
              .filter((task) => task.status === "Archived")
          );
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
          </div>

          <div className="archived-task-actions">
            <Link to="/table-basic" className="archived-task-add">
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
              {tasks.map((task) => (
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
          {tasks.length === 0 && (
            <div className="archived-task-empty">
              We couldn't find anything relevant for you.
            </div>
          )}
        </div>
      </div>

      <style>{`
        .archived-task-page {
          background: #fff;
          border-top: 1px solid #dfe4ea;
          margin: -24px -24px 0;
          min-height: calc(100vh - 160px);
        }

        .archived-task-toolbar {
          align-items: flex-start;
          display: flex;
          justify-content: space-between;
          padding: 10px 18px 18px 14px;
        }

        .archived-task-filter {
          appearance: auto;
          background: #fff;
          border: 1px solid #cdd5df;
          border-radius: 4px;
          color: #3f4650;
          font-size: 18px;
          height: 55px;
          padding: 0 10px;
          width: 441px;
        }

        .archived-task-total {
          color: #818b98;
          font-size: 14px;
          line-height: 1;
          margin: 14px 0 0;
          text-transform: uppercase;
        }

        .archived-task-actions {
          display: flex;
        }

        .archived-task-add {
          align-items: center;
          background: #673ab7;
          border: 1px solid #673ab7;
          border-radius: 5px 0 0 5px;
          color: #fff;
          display: inline-flex;
          font-size: 18px;
          font-weight: 600;
          height: 46px;
          justify-content: center;
          padding: 0 20px;
        }

        .archived-task-add:hover {
          color: #fff;
        }

        .archived-task-filter-btn {
          align-items: center;
          background: #fff;
          border: 1px solid #cdd5df;
          border-left: 0;
          border-radius: 0 5px 5px 0;
          color: #000;
          display: inline-flex;
          font-size: 25px;
          height: 46px;
          justify-content: center;
          width: 51px;
        }

        .archived-task-table-wrap {
          overflow-x: auto;
        }

        .archived-task-table {
          border-collapse: collapse;
          color: #394150;
          min-width: 1100px;
          table-layout: fixed;
          width: 100%;
        }

        .archived-task-table thead {
          background: #e9edf2;
        }

        .archived-task-table th {
          color: #4f5d6d;
          font-size: 14px;
          font-weight: 400;
          height: 50px;
          padding: 0 8px;
          text-align: left;
        }

        .archived-task-table th:nth-child(1) {
          width: 10%;
        }

        .archived-task-table th:nth-child(2) {
          width: 19%;
        }

        .archived-task-table th:nth-child(3),
        .archived-task-table th:nth-child(4),
        .archived-task-table th:nth-child(5),
        .archived-task-table th:nth-child(6) {
          width: 15%;
        }

        .archived-task-table th:nth-child(7) {
          text-align: right;
          width: 8%;
        }

        .archived-task-empty {
          align-items: center;
          border: 1px solid #cdd5df;
          border-radius: 4px;
          color: #8b949f;
          display: flex;
          font-size: 18px;
          height: 66px;
          justify-content: center;
          margin: 19px 28px 0 24px;
          min-width: 760px;
        }

        .archived-task-table td {
          border-bottom: 1px solid #e2e8f0;
          font-size: 18px;
          height: 62px;
          padding: 6px 8px;
          vertical-align: middle;
        }

        .archived-task-title {
          color: #3f4650;
          font-size: 18px;
          line-height: 1.25;
        }

        .archived-task-subtitle {
          color: #818b98;
          font-size: 16px;
          line-height: 1.45;
          margin-top: 3px;
        }

        .archived-task-action-cell {
          text-align: right;
        }

        .archived-task-menu {
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
          .archived-task-page {
            margin: -16px -16px 0;
          }

          .archived-task-toolbar {
            flex-direction: column;
            gap: 14px;
            padding: 14px;
          }

          .archived-task-filter {
            width: min(441px, calc(100vw - 28px));
          }

          .archived-task-empty {
            margin: 16px 14px 0;
            min-width: 0;
            padding: 0 16px;
            text-align: center;
          }
        }
      `}</style>
    </MasterLayout>
  );
};

export default Archivedtask;
