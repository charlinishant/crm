import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaSyncAlt,
  FaSlidersH,
  FaFileCsv,
  FaCalendarAlt,
  FaPlus,
} from "react-icons/fa";

const ButtonLead = () => {
  const [searchText, setSearchText] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarValue, setCalendarValue] = useState({
    date: "",
    time: "",
  });

     const navigate = useNavigate();

  const emitLeadAction = (detail) => {
    window.dispatchEvent(new CustomEvent("leadToolbarAction", { detail }));
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchText(value);
    emitLeadAction({ type: "search", query: value });
  };

  const handleSmartSearch = () => {
    emitLeadAction({ type: "search", query: searchText });
  };

  const handleRefresh = () => {
    setSearchText("");
    emitLeadAction({ type: "search", query: "" });
    emitLeadAction({ type: "refresh" });
  };

  const handleCalendarChange = (event) => {
    const { name, value } = event.target;
    setCalendarValue((current) => ({ ...current, [name]: value }));
  };

  return (
    <>
    <div style={styles.container}>
      
      {/* LEFT SIDE */}
      <div style={styles.left}>
        {/* Search Box */}
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search leads"
            style={styles.input}
            value={searchText}
            onChange={handleSearchChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSmartSearch();
            }}
          />
          <FaSearch style={styles.icon} onClick={handleSmartSearch} title="Search leads" />
          <FaSyncAlt style={styles.icon} onClick={handleRefresh} title="Refresh leads" />
        </div>

        {/* Smart Search */}
        <button type="button" style={styles.smartBtn} onClick={handleSmartSearch}>
          <FaSlidersH /> Smart Search
        </button>
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>
        <button type="button" style={styles.outlineBtn} onClick={() => navigate("/index-2")}>
          <FaFileCsv /> Import
        </button>

        <button type="button" style={styles.outlineBtn} onClick={() => emitLeadAction({ type: "export" })}>
          <FaFileCsv /> Export
        </button>

        <button type="button" style={styles.outlineBtn} onClick={() => emitLeadAction({ type: "exportAll" })}>
          <FaFileCsv /> Export All
        </button>

        {/* <button type="button" style={styles.outlineBtn} onClick={() => setIsCalendarOpen(true)}>
          <FaCalendarAlt /> Calendar
        </button> */}

         <button
          style={styles.primaryBtn}
          onClick={() => {
            window.sessionStorage.removeItem("selectedLeadEdit");
            navigate("/add-lead", { state: { mode: "create" } });
          }}
        >
          <FaPlus /> Add Lead
        </button>
      </div>
    </div>

    {isCalendarOpen && (
      <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Select date and time">
        <div style={styles.modalCard}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Select Date & Time</h3>
            <button
              type="button"
              style={styles.closeBtn}
              onClick={() => setIsCalendarOpen(false)}
              aria-label="Close calendar popup"
            >
              ×
            </button>
          </div>

          <div style={styles.modalBody}>
            <label style={styles.modalLabel}>
              Date
              <input
                type="date"
                name="date"
                value={calendarValue.date}
                onChange={handleCalendarChange}
                style={styles.modalInput}
              />
            </label>

            <label style={styles.modalLabel}>
              Time
              <input
                type="time"
                name="time"
                value={calendarValue.time}
                onChange={handleCalendarChange}
                style={styles.modalInput}
              />
            </label>
          </div>

          <div style={styles.modalActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => setIsCalendarOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              style={styles.primaryBtn}
              onClick={() => setIsCalendarOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
