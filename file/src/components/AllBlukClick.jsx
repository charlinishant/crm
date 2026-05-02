import React from 'react';
import { MoreVertical, Filter } from 'lucide-react';

const AllBlukClick = ()=>{
const tableData = [
  {
    callingSearchListNames: 'Opportunity, fresh leads',
    initiatedBy: 'Tejas Sales',
    status: 'Completed',
    startedAt: 'Apr 13, 2026 at 2:09 PM',
    endedAt: 'Apr 13, 2026 at 2:10 PM',
    totalLeads: '7816',
    completedLeads: '0',
    totalTalktime: '0min 0sec',
  },
  {
    callingSearchListNames: 'Opportunity leads',
    initiatedBy: 'Tejas Sales',
    status: 'Draft',
    startedAt: 'Apr 13, 2026 at 1:14 PM',
    endedAt: '-',
    totalLeads: '57',
    completedLeads: '0',
    totalTalktime: '0min 0sec',
  }
];

  return (
    <div className="table-container">
      {/* Top Filter Bar */}
      <div className="table-header-controls">
        <div className="dropdown-wrapper">
          <select className="form-select">
            <option>All</option>
          </select>
        </div>
        
        <div className="filter-badge">
          <span className="badge-count">1</span>
          <Filter size={16} />
        </div>
      </div>

      {/* Table Component */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>CALLING SEARCH LIST NAMES</th>
              <th>INITIATED BY</th>
              <th>STATUS</th>
              <th>STARTED AT</th>
              <th>ENDED AT</th>
              <th>TOTAL LEADS</th>
              <th>COMPLETED LEADS</th>
              <th>TOTAL TALKTIME</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td className="fw-medium">{row.callingSearchListNames}</td>
                <td>{row.initiatedBy}</td>
                <td>
                  <span className={`status-pill status-${row.status.toLowerCase()}`}>
                    {row.status}
                  </span>
                </td>
                <td>
                  <div className="date-wrapper">
                    <span className="main-date">{row.startedAt.split(' at ')[0]}</span>
                    <span className="sub-time">{row.startedAt.split(' at ')[1] ? `at ${row.startedAt.split(' at ')[1]}` : ''}</span>
                  </div>
                </td>
                <td>
                  <div className="date-wrapper">
                    {row.endedAt !== '-' ? (
                      <>
                        <span className="main-date">{row.endedAt.split(' at ')[0]}</span>
                        <span className="sub-time">{row.endedAt.split(' at ')[1] ? `at ${row.endedAt.split(' at ')[1]}` : ''}</span>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </td>
                <td>{row.totalLeads}</td>
                <td>{row.completedLeads}</td>
                <td>{row.totalTalktime}</td>
                <td>
                  <button className="action-btn">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination button */}
      <div className="pagination-wrapper">
        <button className="pagination-btn">Next &raquo;</button>
      </div>
    </div>
  );
}
export default AllBlukClick;