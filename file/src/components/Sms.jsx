import React, { useState } from 'react';

const Sms = () => {
  // State for dynamic features like the selected filter and data length
  const [currentFilter, setCurrentFilter] = useState('Inbox');
  const [smsData, setSmsData] = useState([]); // Empty state data
  const [filterCount, setFilterCount] = useState(1);

  const handleFilterChange = (e) => {
    setCurrentFilter(e.target.value);
    // Add additional filter logic / API calls here if needed
  };

  return (
    <div className="sms-container">
      {/* Header and Filter Controls */}
      <div className="controls-header">
        <div className="filter-wrapper">
          <select 
            className="filter-dropdown" 
            value={currentFilter}
            onChange={handleFilterChange}
            aria-label="Filter Messages"
          >
            <option value="Inbox">Inbox</option>
            <option value="Sent">Sent</option>
            <option value="Archive">Archive</option>
          </select>
        </div>
        
        <div className="filter-icon-wrapper" role="button" aria-label="Filter options">
          {filterCount > 0 && <span className="badge">{filterCount}</span>}
          <svg className="filter-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          </svg>
        </div>
      </div>

      <div className="table-wrapper">
        {/* Table Headers */}
        <div className="table-header-row">
          <div className="table-header-cell">LEAD ID</div>
          <div className="table-header-cell">LEAD NAME</div>
          <div className="table-header-cell">SUBJECT</div>
          <div className="table-header-cell">ACTIVITY OWNER</div>
          <div className="table-header-cell">ACTIVITY DATE</div>
          <div className="table-header-cell">ACTIONS</div>
        </div>

        {/* Dynamic Empty State / Data Renderer */}
        {smsData.length === 0 ? (
          <div className="empty-state-body">
            <div className="empty-icon" aria-hidden="true">
              ✉️
            </div>
            <div className="empty-state-title">No messages found</div>
            <div className="empty-state-message">
              We couldn't find anything relevant for you.
            </div>
          </div>
        ) : (
          // Insert your mapped table rows here
          <div className="data-body-row"></div>
        )}
      </div>
    </div>
  );
};

export default Sms;