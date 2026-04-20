import React, { useEffect, useState } from "react";
import "./MyReports.css";

const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔗 API Call (Backend Integration Ready)
  useEffect(() => {
    fetch("http://localhost:5000/api/reports") // change when backend ready
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="reports-container">
      <p className="reports-title">My Reports</p>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Execute</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="no-data">
                  Loading...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  No data available in table
                </td>
              </tr>
            ) : (
              reports.map((report, index) => (
                <tr key={report.id}>
                  <td>{index + 1}</td>
                  <td>{report.name}</td>

                  <td>
                    <button className="execute-btn">
                      Run
                    </button>
                  </td>

                  <td>
                    <button className="action-btn">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyReports;