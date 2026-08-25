import React from 'react';
import { useNavigate } from 'react-router-dom';
import LeadTableToolbar from './common/LeadTableToolbar';

const TableHeader = ({ onSearch, onRefresh }) => {
  const navigate = useNavigate();

  const emitLeadAction = (detail) => {
    window.dispatchEvent(new CustomEvent("leadToolbarAction", { detail }));
  };

  return (
    <div className="table-header-container" style={{ marginBottom: "16px" }}>
      <LeadTableToolbar
        onSearch={onSearch || ((query) => emitLeadAction({ type: "search", query }))}
        onRefresh={onRefresh || (() => emitLeadAction({ type: "refresh" }))}
        onImport={() => navigate("/import-leads")}
        onExport={() => emitLeadAction({ type: "export" })}
        onExportAll={() => emitLeadAction({ type: "exportAll" })}
        onAddLead={() => navigate("/add-lead", { state: { mode: "create" } })}
      />
    </div>
  );
};

export default TableHeader;