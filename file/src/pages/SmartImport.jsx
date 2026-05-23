import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./smartImport.css";

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "");

const SmartImport = () => {
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [message, setMessage] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch(`${API_URL}/users?limit=100`);
        if (!response.ok) throw new Error("Unable to load users");
        const result = await response.json();
        const userList = Array.isArray(result) ? result : result?.data || result?.users || [];
        setUsers(userList.filter((user) => user.isActive !== false));
      } catch (error) {
        console.error("Unable to load users:", error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [API_URL]);

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
    if (selectedUserId) {
      formData.append("teamId", selectedUserId);
    }

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
      setMessage(result?.message || "Leads imported successfully.");
      setTimeout(() => navigate("/dashboard", { state: { refreshLeads: Date.now() } }), 1200);
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

        <div className="smart-import-field">
          <label htmlFor="leadImportAssignee">Assign imported leads to</label>
          <select
            id="leadImportAssignee"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={isLoadingUsers}
          >
            <option value="">
              {isLoadingUsers ? "Loading users..." : "Auto assign / use Excel Team"}
            </option>
            {users.map((user) => (
              <option key={user.id || user.email} value={user.id}>
                {getUserName(user)}
                {user.role ? ` (${user.role})` : ""}
              </option>
            ))}
          </select>
        </div>

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
            {importSummary.skippedDuplicateCount > 0 && (
              <div className="import-duplicates">
                {importSummary.skippedDuplicateCount} duplicate rows skipped
              </div>
            )}
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
            Download the sample Excel, fill lead data, choose a user if every row should go to the same assignee, then upload it here. Without a selected user, the Team column is used first and remaining rows are auto assigned.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImport;
