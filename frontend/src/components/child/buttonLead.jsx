import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LeadTableToolbar from "../common/LeadTableToolbar";

const ButtonLead = () => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const emitLeadAction = (detail) => {
    window.dispatchEvent(new CustomEvent("leadToolbarAction", { detail }));
  };

  const handleSearch = (value) => {
    setSearchText(value);
    emitLeadAction({ type: "search", query: value });
  };

  const handleRefresh = () => {
    setSearchText("");
    emitLeadAction({ type: "search", query: "" });
    emitLeadAction({ type: "refresh" });
  };

  return (
    <LeadTableToolbar
      searchValue={searchText}
      onSearch={handleSearch}
      onRefresh={handleRefresh}
      onImport={() => navigate("/import-leads")}
      onExportAll={() => emitLeadAction({ type: "exportAll" })}
      onAddLead={() => {
        window.sessionStorage.removeItem("selectedLeadEdit");
        navigate("/add-lead", { state: { mode: "create" } });
      }}
    />
  );
};

const styles = {
  container: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    gap: "8px",
  },

  input: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#111827",
    fontSize: "14px",
  },

  icon: {
    color: "#6b7280",
    cursor: "pointer",
  },

  smartBtn: {
    background: "#eef2ff",
    border: "1px solid #3b82f6",
    color: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
  },

  outlineBtn: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    color: "#374151",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  primaryBtn: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "9px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1050,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },

  modalCard: {
    width: "100%",
    maxWidth: "380px",
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
    padding: "18px",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },

  modalTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "18px",
    fontWeight: 700,
  },

  closeBtn: {
    border: "none",
    background: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "26px",
    lineHeight: 1,
  },

  modalBody: {
    display: "grid",
    gap: "14px",
  },

  modalLabel: {
    display: "grid",
    gap: "8px",
    color: "#374151",
    fontSize: "14px",
    fontWeight: 600,
  },

  modalInput: {
    width: "100%",
    minHeight: "42px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    color: "#111827",
    padding: "0 12px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
  },

  cancelBtn: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    color: "#374151",
    padding: "9px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default ButtonLead;
