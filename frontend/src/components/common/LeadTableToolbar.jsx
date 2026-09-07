import React, { useState } from "react";
import { FaSearch, FaSyncAlt, FaFileCsv, FaPlus } from "react-icons/fa";

/**
 * Standardized Reference Lead Table Toolbar Component
 * Matching the exact visual specifications from reference UI.
 */
const LeadTableToolbar = ({
  searchValue = "",
  onSearch,
  onRefresh,
  onImport,
  onExport,
  onExportAll,
  onAddLead,
  showImport = true,
  showExport = false,
  showExportAll = true,
  showAddLead = true,
  isRefreshing = false,
  placeholder = "Search leads",
  className = "",
  style = {},
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [spinning, setSpinning] = useState(false);

  // Sync internal state if prop changes
  React.useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setLocalSearch(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearchTrigger = () => {
    if (onSearch) {
      onSearch(localSearch);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearchTrigger();
    }
  };

  const handleRefreshClick = () => {
    setSpinning(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <div className={`lead-table-toolbar-container ${className}`} style={style}>
      {/* LEFT SIDE: Search Box */}
      <div className="lead-tb-left">
        <div className="lead-tb-search-wrap">
          <input
            type="text"
            className="lead-tb-search-input"
            placeholder={placeholder}
            value={localSearch}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            aria-label={placeholder}
          />
          <button
            type="button"
            className="lead-tb-icon-btn"
            onClick={handleSearchTrigger}
            title="Search"
            aria-label="Search leads"
          >
            <FaSearch className="lead-tb-search-icon" />
          </button>
          <button
            type="button"
            className="lead-tb-icon-btn"
            onClick={handleRefreshClick}
            title="Refresh leads"
            aria-label="Refresh lead data"
          >
            <FaSyncAlt className={`lead-tb-refresh-icon ${spinning || isRefreshing ? "spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: Action Buttons */}
      {((showImport && onImport) || (showExport && onExport) || (showExportAll && onExportAll) || (showAddLead && onAddLead)) && (
        <div className="lead-tb-right">
          {showImport && onImport && (
            <button
              type="button"
              className="lead-tb-btn secondary"
              onClick={onImport}
              title="Import Leads CSV"
            >
              <FaFileCsv className="lead-tb-csv-icon" />
              <span>Import</span>
            </button>
          )}

          {showExport && onExport && (
            <button
              type="button"
              className="lead-tb-btn secondary"
              onClick={onExport}
              title="Export Leads CSV"
            >
              <FaFileCsv className="lead-tb-csv-icon" />
              <span>Export</span>
            </button>
          )}

          {showExportAll && onExportAll && (
            <button
              type="button"
              className="lead-tb-btn secondary"
              onClick={onExportAll}
              title="Export All Leads CSV"
            >
              <FaFileCsv className="lead-tb-csv-icon" />
              <span>Export All</span>
            </button>
          )}

          {showAddLead && onAddLead && (
            <button
              type="button"
              className="lead-tb-btn primary"
              onClick={onAddLead}
              title="Add New Lead"
            >
              <FaPlus className="lead-tb-plus-icon" />
              <span>Add Lead</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadTableToolbar;
