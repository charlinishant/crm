import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "");

const SmartImport = () => {
  const fileRef = useRef(null);
  const userPickerRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
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

  useEffect(() => {
    const closePicker = (event) => {
      if (!userPickerRef.current?.contains(event.target)) {
        setIsUserPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) =>
      [
        getUserName(user),
        user?.role,
        user?.department,
        user?.email,
        user?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [userSearch, users]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(String(user.id))),
    [selectedUserIds, users]
  );

  const selectedUserLabel = isLoadingUsers
    ? "Loading users..."
    : selectedUsers.length
      ? `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} selected`
      : "Auto assign / use Excel Team";

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
    if (selectedUserIds.length) {
      formData.append("teamIds", JSON.stringify(selectedUserIds));
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

  const toggleUserSelection = (userId) => {
    const normalizedId = String(userId);
    setSelectedUserIds((current) =>
      current.includes(normalizedId)
        ? current.filter((id) => id !== normalizedId)
        : [...current, normalizedId]
    );
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
          <label htmlFor="leadImportAssignee">Assign imported leads to :-</label>
          <div className="lead-import-user-picker" ref={userPickerRef}>
            <button
              type="button"
              id="leadImportAssignee"
              className="lead-import-user-trigger"
              onClick={() => setIsUserPickerOpen((isOpen) => !isOpen)}
              disabled={isLoadingUsers}
              aria-haspopup="listbox"
              aria-expanded={isUserPickerOpen}
            >
              <span>{selectedUserLabel}</span>
            </button>

            {isUserPickerOpen && (
              <div className="lead-import-user-menu">
                <input
                  type="search"
                  className="lead-import-user-search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search users..."
                  aria-label="Search users"
                  autoFocus
                />
                <div className="lead-import-user-options" role="listbox" aria-multiselectable="true">
                  {filteredUsers.length === 0 ? (
                    <div className="lead-import-user-empty">No users found</div>
                  ) : (
                    filteredUsers.map((user) => {
                      const userId = String(user.id);
                      const isSelected = selectedUserIds.includes(userId);

                      return (
                        <label
                          className={`lead-import-user-option${isSelected ? " selected" : ""}`}
                          key={user.id || user.email}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserSelection(userId)}
                          />
                          <span className="lead-import-user-check" aria-hidden="true" />
                          <span className="lead-import-user-name">
                            {getUserName(user)}
                            {user.role ? <small>{user.role}</small> : null}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    className="lead-import-user-clear"
                    onClick={() => setSelectedUserIds([])}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedUsers.length > 0 && (
            <div className="lead-import-selected-users">
              {selectedUsers.map((user) => (
                <span key={user.id || user.email}>{getUserName(user)}</span>
              ))}
            </div>
          )}
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
            Download the sample Excel, fill lead data, select users here to distribute imported leads equally, then upload it. Without selected users, the Team column is used first and remaining rows are auto assigned.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImport;
