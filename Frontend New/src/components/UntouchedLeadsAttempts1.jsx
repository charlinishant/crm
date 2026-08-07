import React, { useState } from 'react';
import TableHeader from './TableHeader';

const UntouchedLeadsAttempts1 = () => {
  // State for data, pagination, and sorting
  const [leads, setLeads] = useState([]); // Currently empty as per your initial structure
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 1;

  // Handler functions for pagination
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="leads-container">
      <TableHeader />

      <div className="info-panel">
        <span className="info-count">{leads.length} items.</span>
        <span className="info-text">Sorted by Lead received on</span>
      </div>

      <div className="table-wrapper">
        <div className="table-header-row">
          <div className="col-checkbox">
            <input type="checkbox" disabled aria-label="Select all rows" />
          </div>
          <div className="col-item">LEAD ID</div>
          <div className="col-item">NAME</div>
          <div className="col-item">LAST SOURCE</div>
          <div className="col-item">STAGE</div>
          <div className="col-item">RECEIVED ON</div>
          <div className="col-item">REQUIREMENT</div>
          <div className="col-item">TAGS</div>
          <div className="col-item actions-header">
            ACTIONS
            <div className="sort-icons" role="button" aria-label="Sort leads">
              <span className="sort-up">▲</span>
              <span className="sort-down">▼</span>
            </div>
          </div>
        </div>

        {/* Dynamic Data / Empty State Renderer */}
        {leads.length === 0 ? (
          <div className="empty-data-row">
            <div className="empty-icon" aria-hidden="true">
              📭
            </div>
            <h4>No leads found</h4>
            <p>We couldn't find anything relevant for you at this time.</p>
          </div>
        ) : (
          // Insert table body rows here when data becomes available
          <div className="data-body-row"></div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="pagination-wrapper">
        <div className="arrow-group">
          <button 
            className="page-arrow" 
            onClick={handlePrevPage} 
            aria-label="Previous page"
          >
            <i className="fa fa-chevron-left" aria-hidden="true"></i>
          </button>
          
          <span className="page-indicator">
            Page {currentPage} of {totalPages}
          </span>

          <button 
            className="page-arrow right-arrow" 
            onClick={handleNextPage} 
            aria-label="Next page"
          >
            <i className="fa fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
        
        <div className="nav-buttons">
          <button className="nav-btn" onClick={handleFirstPage}>
            First
          </button>
          <button className="nav-btn" onClick={handleLastPage}>
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default UntouchedLeadsAttempts1;