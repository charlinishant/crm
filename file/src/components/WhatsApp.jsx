import React from 'react';
import { MoreVertical, Filter } from 'lucide-react';
import './WhatsApp.css';

const WhatsApp =()=>{
const tableData = [
  {
    id: '#10703',
    leadName: 'Ankur s',
    status: 'Error',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 2, 2026',
    content: 'We are pleased to inform that your visit to Binghatti Hills has been sch...',
  },
  {
    id: '#10703',
    leadName: 'Ankur s',
    status: 'Read',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 2, 2026',
    content: 'Hello ankur s ! 🌟 Thank you for visiting Binghatti Hills , where tradition an...',
  },
  {
    id: '#10703',
    leadName: 'Ankur s',
    status: 'Error',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 2, 2026',
    content: "Hey there! 👋 Thanks a ton for your interest in ABC Properties! 🏠 We're th...",
  },
  {
    id: '#10703',
    leadName: 'Ankur s',
    status: 'Error',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 2, 2026',
    content: "Hey there! 👋 Thanks a ton for your interest in ABC Properties! 🏠 We're th...",
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Delivered',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 2, 2026',
    content: 'Hello chetan agrawal, 🌟 I hope this message finds you well! 🌟 I am excit...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Delivered',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 1, 2026',
    content: 'Hello, We are glad to inform that your booking is confirmed at our Proj...',
  },
  {
    id: '#10700',
    leadName: 'Rajkumar',
    status: 'Failed',
    activityOwner: 'Tejas Sales',
    activityDate: 'May 1, 2026',
    content: 'Hello Rajkumar ! 🌟 We are thrilled to invite you for an exclusive tour of Bin...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Error',
    activityOwner: 'Tejas Sales',
    activityDate: 'Apr 30, 2026',
    content: 'Dear Customer, this is a gentle reminder for your visit today at Binghatti Hil...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Failed',
    activityOwner: 'Tejas Sales',
    activityDate: 'Apr 30, 2026',
    content: 'Hello chetan agrawal ! 🌟 We are thrilled to invite you for an exclusive tour ...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Delivered',
    activityOwner: 'Tejas Sales',
    activityDate: 'Apr 30, 2026',
    content: 'Hello chetan agrawal, 🌟 I hope this message finds you well! 🌟 I am excit...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Error',
    activityOwner: 'Tejas Sales',
    activityDate: 'Apr 30, 2026',
    content: 'We are pleased to inform that your visit to Binghatti Hills has been sch...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Delivered',
    activityOwner: 'Tejas Sales',
    activityDate: 'Apr 30, 2026',
    content: 'Hello chetan agrawal ! 🌟 Thank you for visiting Binghatti Hills , where trad...',
  },
  {
    id: '#10702',
    leadName: 'Chetan agrawal',
    status: 'Error',
    activityOwner: 'Tejas Sales',
    activityDate: 'Apr 30, 2026',
    content: "Hey there! 👋 Thanks a ton for your interest in ABC Properties! 🏠 We're th...",
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
              <th>LEAD ID</th>
              <th>LEAD NAME</th>
              <th>STATUS</th>
              <th>ACTIVITY OWNER</th>
              <th>ACTIVITY DATE</th>
              <th>CONTENT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td className="text-muted">{row.id}</td>
                <td className="fw-medium">{row.leadName}</td>
                <td>
                  <span className={`status-pill status-${row.status.toLowerCase()}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.activityOwner}</td>
                <td>{row.activityDate}</td>
                <td className="content-cell">{row.content}</td>
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
    </div>
  );
}
export default WhatsApp