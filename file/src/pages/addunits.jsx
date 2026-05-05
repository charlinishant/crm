import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";

const AddUnits = () => {
  return (
    <MasterLayout>
      <div style={{ padding: "20px", background: "#f4f7fb" }}>

        {/* BASIC DETAILS */}
        <div style={card}>
          <div style={grid3}>
            <FormField label="PROJECT *" placeholder="Select a Project" />
            <FormField label="PROJECT TOWER *" placeholder="Select a Project Tower" />
            <FormField label="UNIT CONFIGURATION *" placeholder="Select a Floor Plan" />
          </div>

          <div style={grid6}>
            <FormField label="NAME *" placeholder="Unit Name" />
            <FormField label="FLOOR *" placeholder="0" />
            <FormField label="UNIT INDEX *" placeholder="0" />
            <FormField label="BASE RATE *" />
            <FormField label="BASE PRICE *" />
            <FormField label="PROPERTY PURPOSE *" placeholder="Sale" />
          </div>

          <button style={secondaryBtn}>+ Add Another Unit</button>
        </div>

        {/* DETAILS */}
        <div style={card}>
          <h3 style={sectionTitle}>Details</h3>

          <div style={grid2}>
            <FormField label="TYPE" />
            <FormField label="CATEGORY" />
          </div>

          <div style={grid2}>
            <FormField label="BEDROOMS" placeholder="0 (Disabled by admin)" />
            <FormField label="BATHROOMS" placeholder="0 (Disabled by admin)" />
          </div>
        </div>

        {/* AREAS */}
        <div style={card}>
          <h3 style={sectionTitle}>Areas</h3>

          <div style={grid3}>
            <FormField label="MEASURE *" placeholder="Sq. Ft." />
            <InputWithSuffix label="CARPET" suffix="Sq. ft." />
            <InputWithSuffix label="SALEABLE" suffix="Sq. ft." />
          </div>

          <div style={{ width: "33%" }}>
            <InputWithSuffix label="LOADING" suffix="%" />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div style={card}>
          <h3 style={sectionTitle}>Description</h3>

          <div style={toolbar}>
            <button style={toolBtn}>B</button>
            <button style={toolBtn}>I</button>
            <button style={toolBtn}>U</button>
            <button style={toolBtn}>•</button>
            <button style={toolBtn}>1.</button>
          </div>

          <textarea
            placeholder="Enter description..."
            style={textarea}
          />
        </div>

        {/* SAVE BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button style={primaryBtn}>Save</button>
        </div>

      </div>
    </MasterLayout>
  );
};

export default AddUnits;

/* ================= COMPONENTS ================= */

const FormField = ({ label, placeholder }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <input placeholder={placeholder} style={inputStyle} />
  </div>
);

const InputWithSuffix = ({ label, suffix }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <div style={inputGroup}>
      <input defaultValue="0.0" style={inputNoBorder} />
      <span style={suffixStyle}>{suffix}</span>
    </div>
  </div>
);

/* ================= STYLES ================= */

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "20px",
  border: "1px solid #e3e8ef"
};

const sectionTitle = {
  marginBottom: "15px",
  color: "#2c3e50"
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "15px",
  marginBottom: "15px"
};

const grid6 = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "15px",
  marginBottom: "15px"
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "15px",
  marginBottom: "15px"
};

const labelStyle = {
  fontSize: "12px",
  marginBottom: "5px",
  color: "#5c6b7a",
  fontWeight: "500"
};

const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #cfd8e3",
  outline: "none",
  fontSize: "14px"
};

const inputGroup = {
  display: "flex",
  border: "1px solid #cfd8e3",
  borderRadius: "6px",
  overflow: "hidden"
};

const inputNoBorder = {
  flex: 1,
  padding: "10px",
  border: "none",
  outline: "none"
};

const suffixStyle = {
  background: "#eef2f7",
  padding: "10px",
  borderLeft: "1px solid #cfd8e3",
  fontSize: "13px"
};

const secondaryBtn = {
  background: "#fff",
  border: "1px solid #4a6cf7",
  color: "#4a6cf7",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer"
};

const primaryBtn = {
  background: "#5b3cc4",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500"
};

/* Description */
const toolbar = {
  display: "flex",
  gap: "8px",
  marginBottom: "10px"
};

const toolBtn = {
  padding: "6px 10px",
  border: "1px solid #d0d7e2",
  background: "#fff",
  cursor: "pointer",
  borderRadius: "4px"
};

const textarea = {
  width: "100%",
  height: "150px",
  borderRadius: "6px",
  border: "1px solid #cfd8e3",
  padding: "10px",
  outline: "none",
  resize: "none"
};