import React from "react";
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

     const navigate = useNavigate();

  return (
    <div style={styles.container}>
      
      {/* LEFT SIDE */}
      <div style={styles.left}>
        {/* Search Box */}
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search leads"
            style={styles.input}
          />
          <FaSearch style={styles.icon} />
          <FaSyncAlt style={styles.icon} />
        </div>

        {/* Smart Search */}
        <button style={styles.smartBtn}>
          <FaSlidersH /> Smart Search
        </button>
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>
        <button style={styles.outlineBtn}>
          <FaFileCsv /> Import
        </button>

        <button style={styles.outlineBtn}>
          <FaFileCsv /> Export
        </button>

        <button style={styles.outlineBtn}>
          <FaFileCsv /> Export All
        </button>

        <button style={styles.outlineBtn}>
          <FaCalendarAlt /> Calendar
        </button>

         <button
          style={styles.primaryBtn}
          onClick={() => navigate("/add-lead")}
        >
          <FaPlus /> Add Lead
        </button>
      </div>
    </div>
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
};

export default ButtonLead;