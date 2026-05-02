
import React, { useState } from 'react';
import "./Calls.css"

const Calls = () => {
  const [leadData, setLeadData] = useState([
    {
      id: '#8439',
      name: 'Shruti Agrawal',
      status: 'Answered',
      duration: '00:01:59',
      activityOwner: 'Tejas Sales',
      leadOwner: 'Tejas Sales',
      activityDate: 'Apr 19, 2026 at 11:16 AM',
    },
    {
      id: '#10268',
      name: 'Zainab Shaikh',
      status: 'Answered',
      duration: '00:01:59',
      activityOwner: 'Tejas Sales',
      leadOwner: 'Tejas Sales',
      activityDate: 'Apr 3, 2026 at 11:37 AM',
    },
    {
      id: '#8460',
      name: 'Gupta Boda',
      status: 'Answered',
      duration: '00:01:59',
      activityOwner: 'Tejas Sales',
      leadOwner: 'Tejas Sales',
      activityDate: 'Apr 2, 2026 at 3:59 PM',
    },
  ]);

  return (
    <div className="leads-container">
      {/* Header and Filter Controls */}
      <div className="leads-header">
        <div className="filter-wrapper">
          <select className="filter-dropdown" defaultValue="Inbound">
            <option value="Inbound">Inbound</option>
            <option value="Outbound">Outbound</option>
          </select>
        </div>
        <div className="filter-icon-wrapper">
          <span className="badge">1</span>
          <svg className="filter-icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          </svg>
        </div>
      </div>

      {/* Leads Table */}
      <div className="table-responsive">
        <table className="leads-table">
          <thead>
            <tr>
              <th>LEAD ID</th>
              <th>LEAD NAME</th>
              <th>STATUS</th>
              <th>DURATION</th>
              <th>ACTIVITY OWNER</th>
              <th>LEAD OWNER</th>
              <th>ACTIVITY DATE</th>
              <th>CALL RECORDING</th>
              <th>CALL</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {leadData.map((lead) => (
              <tr key={lead.id}>
                <td className="lead-id">{lead.id}</td>
                <td className="lead-name">{lead.name}</td>
                <td>
                  <span className="status-badge">{lead.status}</span>
                </td>
                <td className="duration">{lead.duration}</td>
                <td>{lead.activityOwner}</td>
                <td>{lead.leadOwner}</td>
                <td className="activity-date">{lead.activityDate}</td>
                <td>
                  <div className="audio-player">
                    <button className="play-button">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <span className="audio-time">0:00 / 1:58</span>
                    <div className="audio-slider">
                      <div className="audio-slider-fill"></div>
                    </div>
                    <button className="audio-volume">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.74 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    </button>
                    <button className="menu-dot-button">⋮</button>
                  </div>
                </td>
                <td>
                  <button className="icon-action-btn">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.12.35.03.75-.24 1.02l-2.2 2.2z" />
                    </svg>
                  </button>
                </td>
                <td>
                  <button className="icon-action-btn">⋮</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-wrapper">
        <button className="pagination-btn">Next »</button>
      </div>
    </div>
  );
};

export default Calls;