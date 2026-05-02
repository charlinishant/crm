import React from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const Archivedtask = () => {
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
            <p className="archived-task-total">TOTAL TASKS : 0</p>
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
          </table>
          <div className="archived-task-empty">
            We couldn't find anything relevant for you.
          </div>
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
