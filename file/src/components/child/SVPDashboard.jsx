import React from "react";
import "./svpDashboard.css";

const SVPDashboard = () => {
  const data = [
    {
      name: "Sheetal Shah",
      date: "19-04-2026",
      day: "Sunday",
      time: "12:00",
      assigned: "Sales1",
      project: "Test Project 1",
      description: "16-04-26 15:58 PM (Sales Head): Client will visit...",
    },
  ];

  return (
    <div className="svp-container">
      {/* Header */}
      <div className="svp-header">
        <div>
          <p className="breadcrumb">Home / Scheduled Visit Planned Report</p>
          <p className="svp-title">Scheduled Visit Planned Report</p>
        </div>

        <div className="svp-actions">
          <button className="btn-outline">Export</button>
          <button className="btn-outline">Calendar</button>
        </div>
      </div>

      {/* Card */}
      <div className="svp-card">
        <div className="count-box">1</div>
        <div>
          <p className="card-title">Lead Visited</p>
          <span className="card-sub">Visited</span>
        </div>
      </div>

      {/* Smart Search */}
      <button className="smart-btn">⚙ Smart Search</button>
    

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Scheduled Date</th>
              <th>Day</th>
              <th>Time</th>
              <th>Assigned To</th>
              <th>Project</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.date}</td>
                <td>{item.day}</td>
                <td>{item.time}</td>
                <td>{item.assigned}</td>
                <td>{item.project}</td>
                <td>
                  {item.description}
                  <span className="show-more"> Show More &gt;</span>
                </td>
                <td>
                  <button className="edit-btn">✏</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SVPDashboard;