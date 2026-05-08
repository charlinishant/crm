import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./smartImport.css";

const SmartImport = () => {
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [selectedFileName, setSelectedFileName] = useState("");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleBrowse = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name || "");
    setMessage("");
  };

  const handleDownloadSample = () => {
    window.location.href = `${API_URL}/leads/sample-excel`;
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      setMessage("Please select the filled Excel file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      setMessage("");

      const response = await fetch(`${API_URL}/leads/import`, {
        method: "POST",
        body: formData,
      });

      let result = "";
      try {
        result = await response.json();
      } catch {
        result = "";
      }

      if (!response.ok) {
        throw new Error(result?.message || result || "Lead import failed");
      }

      setMessage("Leads imported successfully. Opening All Leads...");
      setTimeout(() => navigate("/marketplace"), 700);
    } catch (error) {
      console.error("Lead import failed:", error);
      setMessage(error.message || "Lead import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="smart-import-container">
      <p className="title">Smart Import</p>

      <div className="card smart-import-card">
        <div className="file-upload">
          <input
            type="file"
            ref={fileRef}
            className="file-input"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />

          <button type="button" className="browse-btn" onClick={handleBrowse}>
            Browse
          </button>

          <button
            type="button"
            className="upload-btn"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {selectedFileName && (
          <div className="selected-file">Selected file: {selectedFileName}</div>
        )}

        <button type="button" className="download-btn" onClick={handleDownloadSample}>
          Download Sample Excel
        </button>

        {message && <div className="import-message">{message}</div>}

        <div className="magic-fields">
          <p>Excel import flow:</p>
          <div className="fields-box">
            Download the sample Excel, fill lead data, set Team to a user name/email/id, then upload it here.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImport;
