import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./smartImport.css";

const SmartImport = () => {
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [selectedFileName, setSelectedFileName] = useState("");
  const [message, setMessage] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleBrowse = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name || "");
    setMessage("");
    setImportSummary(null);
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
      setImportSummary(null);

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

      setImportSummary(result && typeof result === "object" ? result : null);
      setMessage("Leads imported successfully and assigned equally.");
      setTimeout(() => navigate("/marketplace"), 1200);
    } catch (error) {
      console.error("Lead import failed:", error);
      setMessage(error.message || "Lead import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="smart-import-container">
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
            {isUploading ? "Uploading..." : "Import"}
          </button>
        </div>

        {selectedFileName && (
          <div className="selected-file">Selected file: {selectedFileName}</div>
        )}

        <div className="smart-import-actions">
          <button type="button" className="download-btn" onClick={handleDownloadSample}>
            Download Sample Excel
          </button>
        </div>

        {message && <div className="import-message">{message}</div>}

        {importSummary?.assignmentCounts && (
          <div className="assignment-summary">
            <div className="assignment-summary__head">
              <span>Assignment Summary</span>
              <strong>{importSummary.importedCount || 0} leads</strong>
            </div>
            <div className="assignment-summary__grid">
              {Object.entries(importSummary.assignmentCounts).map(([userName, count]) => (
                <div className="assignment-summary__item" key={userName}>
                  <span>{userName}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="magic-fields">
          <p>Excel import flow:</p>
          <div className="fields-box">
            Download the sample Excel, fill lead data, then upload it here. Imported leads are assigned equally to all active users automatically.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImport;
