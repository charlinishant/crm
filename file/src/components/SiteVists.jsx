import React from 'react';
import { Icon } from '@iconify/react';
import "./SiteVists.css"

const SiteVists = () => {

const tableData = [
  {
    id: '#8439',
    leadName: 'Shruti Agrawal',
    project: 'Binghatti Hills',
    initiatedBy: 'Tejas Sales',
    status: 'Pending',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 25, 2026 at 5:42 PM',
    createdAt: 'Created At: Apr 20, 2026',
    conductedOn: '-',
    conductedBy: '-',
  },
  {
    id: '#10492',
    leadName: 'Rajesh Khanna',
    project: 'Binghatti Hills',
    initiatedBy: 'Tejas Sales',
    status: 'Conducted',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 22, 2026 at 12:30 PM',
    createdAt: 'Created At: Apr 22, 2026',
    conductedOn: 'Apr 22, 2026 at 12:09 PM',
    conductedBy: 'Tejas Sales',
  },
  {
    id: '#8430',
    leadName: 'Kush Loothra',
    project: 'Binghatti Hills',
    initiatedBy: 'Tejas Sales',
    status: 'Pending',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 22, 2026 at 5:02 PM',
    createdAt: 'Created At: Apr 22, 2026',
    conductedOn: '-',
    conductedBy: '-',
  },
  {
    id: '#10495',
    leadName: 'Ajay',
    project: 'Binghatti Hills',
    initiatedBy: 'Rohit Pune Sales',
    status: 'Conducted',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 22, 2026 at 8:31 PM',
    createdAt: 'Created At: Apr 22, 2026',
    conductedOn: 'Apr 22, 2026 at 7:35 PM',
    conductedBy: 'Tejas Sales',
  },
  {
    id: '#8427',
    leadName: 'Sakshi Garg',
    project: 'Binghatti Hills',
    initiatedBy: 'Tejas Sales',
    status: 'Pending',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 23, 2026 at 1:23 PM',
    createdAt: 'Created At: Apr 23, 2026',
    conductedOn: '-',
    conductedBy: '-',
  },
  {
    id: '#10501',
    leadName: 'Kedar Habib',
    project: 'Binghatti Hills',
    initiatedBy: 'Rohit Pune Sales',
    status: 'Conducted',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 23, 2026 at 3:58 PM',
    createdAt: 'Created At: Apr 23, 2026',
    conductedOn: 'Apr 23, 2026 at 3:01 PM',
    conductedBy: 'Tejas Sales',
  },
  {
    id: '#10503',
    leadName: 'Ravi',
    project: 'Binghatti Hills',
    initiatedBy: 'Rohit Pune Sales',
    status: 'Pending',
    activityOwner: 'Tejas Sales',
    scheduledOn: 'Apr 23, 2026 at 4:08 PM',
    createdAt: 'Created At: Apr 23, 2026',
    conductedOn: '-',
    conductedBy: '-',
  }
];


  return (
    <div className="table-container">
      {/* Top Filter and Dropdown Bar */}
      <div className="table-header-controls">
        <div className="dropdown-wrapper">
          <select className="form-select">
            <option>All</option>
          </select>
        </div>
        
        <div className="filter-badge">
        
          <Icon icon="mdi:filter" width={16} height={16} />
        </div>
      </div>

      {/* Main Table */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>LEAD ID</th>
              <th>LEAD NAME</th>
              <th>PROJECT</th>
              <th>INITIATED BY</th>
              <th>STATUS</th>
              <th>ACTIVITY OWNER</th>
              <th>SCHEDULED ON</th>
              <th>CONDUCTED ON</th>
              <th>CONDUCTED BY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.id}>
                <td className="text-muted">{row.id}</td>
                <td className="fw-medium">{row.leadName}</td>
                <td>{row.project}</td>
                <td>{row.initiatedBy}</td>
                <td>
                  <span className={`status-pill status-${row.status.toLowerCase()}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.activityOwner}</td>
                <td>
                  <div className="scheduled-wrapper">
                    <span className="main-time">{row.scheduledOn}</span>
                    <span className="sub-time">{row.createdAt}</span>
                  </div>
                </td>
                <td>{row.conductedOn}</td>
                <td>{row.conductedBy}</td>
                <td>
                  <button className="action-btn">
                    <Icon icon="mdi:dots-vertical" width={16} height={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




export default SiteVists;
