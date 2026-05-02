 import React from 'react';
import './Sms.css';

const Sms = () => {
    return (

    <div className="empty-state-container">
      {/* Header and Filter Controls */}
      <div className="controls-header">
        <div className="filter-wrapper">
          <select className="filter-dropdown" defaultValue="Inbox">
            <option value="Inbox">Inbox</option>
            <option value="Sent">Sent</option>
            <option value="Archive">Archive</option>
          </select>
        </div>
        
        <div className="filter-icon-wrapper">
          <span className="badge">1</span>
          <svg className="filter-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          </svg>
        </div>
      </div>

      {/* Table Headers */}
      <div className="table-header-row">
        <div className="table-header-cell">LEAD ID</div>
        <div className="table-header-cell">LEAD NAME</div>
        <div className="table-header-cell">SUBJECT</div>
        <div className="table-header-cell">ACTIVITY OWNER</div>
        <div className="table-header-cell">ACTIVITY DATE</div>
        <div className="table-header-cell">ACTIONS</div>
      </div>

      {/* Empty State Body */}
      <div className="empty-state-body">
        <div className="empty-state-message">
          We couldn't find anything relevant for you.
        </div>
      </div>
    </div>
  );
};

export default Sms;