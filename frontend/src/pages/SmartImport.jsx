import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "");

const SOURCE_OPTIONS = [
  "Use Excel Row Source (Fallback to Untagged Quarantine)",
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
];

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

  // Bulk Source Tagging State
  const [selectedSource, setSelectedSource] = useState(SOURCE_OPTIONS[0]);
  const [selectedCpId, setSelectedCpId] = useState("");
  const [selectedCpRera, setSelectedCpRera] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirmedLock, setIsConfirmedLock] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch(`${API_URL}/users?limit=1000`);
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

  const channelPartners = useMemo(
    () => users.filter((user) => String(user?.role || "").toUpperCase() === "CHANNEL_PARTNER"),
    [users]
  );

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

  const handleCpSelectionChange = (cpId) => {
    setSelectedCpId(cpId);
    const cp = channelPartners.find((user) => String(user.id) === String(cpId));
    setSelectedCpRera(cp?.reraNumber || "");
  };

  const handleSourceChange = (source) => {
    setSelectedSource(source);
    if (source !== "Channel Partner") {
      setSelectedCpId("");
      setSelectedCpRera("");
    }
  };

  const handlePreUploadCheck = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage("Please select the filled Excel file first.");
      return;
    }

    if (selectedSource === "Channel Partner" && !selectedCpId) {
      setMessage("Please select a registered Channel Partner for batch attribution.");
      return;
    }

    // Open one-time confirmation modal
    setIsConfirmedLock(false);
    setShowConfirmModal(true);
  };

  const handleConfirmAndUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (selectedUserIds.length) {
      formData.append("teamIds", JSON.stringify(selectedUserIds));
    }

    // Bulk Source Tagging parameters
    if (selectedSource && selectedSource !== SOURCE_OPTIONS[0]) {
      formData.append("fundingSource", selectedSource);
    }
    if (selectedSource === "Channel Partner" && selectedCpId) {
      const selectedCp = channelPartners.find((u) => String(u.id) === String(selectedCpId));
      formData.append("channelPartner", selectedCp ? getUserName(selectedCp) : "");
      formData.append("channelPartnerReraId", selectedCpRera || "");
    }

    try {
      setShowConfirmModal(false);
      setIsUploading(true);
      setMessage("");
      setImportSummary(null);

      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/leads/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      setMessage(result?.message || "Leads imported successfully with locked source attribution.");
      setTimeout(() => navigate("/leads", { state: { refreshLeads: Date.now() } }), 1500);
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

  const selectedCpName = useMemo(() => {
    const cp = channelPartners.find((u) => String(u.id) === String(selectedCpId));
    return cp ? getUserName(cp) : "";
  }, [channelPartners, selectedCpId]);

  return (
    <div className="smart-import-container">
      <div className="card smart-import-card">
        {/* Header alert about hard locked tags & quarantine */}
        {/* <div
          className="p-3 mb-4 rounded-3 d-flex align-items-center gap-3"
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
          }}
        >
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{ width: "38px", height: "38px", background: "#2563eb", color: "#fff", flexShrink: 0 }}
          >
            <FaShieldAlt size={18} />
          </div>
          <div style={{ fontSize: "13.5px" }}>
            <strong style={{ color: "#1e3a8a" }}>Lead Source Attribution & Hard Lock Policy:</strong>
            <div className="text-muted" style={{ color: "#1e40af" }}>
              Every lead imported will have its source permanently locked. Leads arriving without a source will land in the <strong>Untagged Quarantine Area</strong> and will <strong>not</strong> enter calling queues until verified.
            </div>
          </div>
        </div> */}

        {/* File Upload Row */}
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
            onClick={handlePreUploadCheck}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Import"}
          </button>
        </div>

        {selectedFileName && (
          <div className="selected-file">Selected file: {selectedFileName}</div>
        )}

        {/* ── Single row: Tag Lead Source + Assign Leads side-by-side ── */}
        <div className="row g-3 align-items-start" style={{ marginTop: "20px" }}>

          {/* Left: Bulk Source Tagging */}
          <div className="col-md-6">
            <div className="smart-import-field">
              <label htmlFor="leadImportSource" className="fw-bold d-flex align-items-center gap-2">
                <FaLock size={13} className="text-danger" /> Tag Lead Source for this Batch :-
              </label>
              <div className="row g-2 align-items-center">
                <div className="col-12">
                  <select
                    id="leadImportSource"
                    className="form-select"
                    value={selectedSource}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    style={{ height: "44px", borderRadius: "8px" }}
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSource === "Channel Partner" && (
                  <>
                    <div className="col-12">
                      <select
                        className="form-select"
                        value={selectedCpId}
                        onChange={(e) => handleCpSelectionChange(e.target.value)}
                        style={{ height: "44px", borderRadius: "8px" }}
                        required
                      >
                        <option value="">-- Select Channel Partner --</option>
                        {channelPartners.map((cp) => (
                          <option key={cp.id} value={cp.id}>
                            {getUserName(cp)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control bg-light"
                        placeholder="Auto CP RERA ID"
                        value={selectedCpRera ? `RERA: ${selectedCpRera}` : "No RERA Registered"}
                        readOnly
                        style={{ height: "44px", borderRadius: "8px", fontWeight: "600", color: "#334155" }}
                      />
                    </div>
                  </>
                )}
              </div>
              <small className="text-muted d-block mt-1">
                {selectedSource === SOURCE_OPTIONS[0]
                  ? "Per-row source from Excel column will be used. Rows missing source will land in Untagged quarantine."
                  : `All rows in this Excel will be bulk-tagged as "${selectedSource}" and permanently locked upon entry.`}
              </small>
            </div>
          </div>

          {/* Right: Assign imported leads to */}
          <div className="col-md-6">
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
          </div>

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
            Download the sample Excel, fill lead data, optionally select a batch source or CP attribution (or provide in column), select users to distribute imported leads equally, then upload. Untagged rows are safely quarantined.
          </div>
        </div>
      </div>

      {/* Deliberate Confirmation Modal for Permanent Lock */}
      {showConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FaLock /> Confirm Permanent Source Tagging
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowConfirmModal(false)}
                />
              </div>

              <div className="modal-body p-4">
                <div className="alert alert-warning d-flex align-items-start gap-2 mb-3">
                  <FaExclamationTriangle className="mt-1 flex-shrink-0" size={18} />
                  <div>
                    <strong>HARD LOCK WARNING:</strong> Once imported, each lead's source and Channel Partner attribution is{" "}
                    <strong>permanently locked forever</strong>. There is <strong>no edit path and no admin override</strong>.
                  </div>
                </div>

                <div className="bg-light p-3 rounded mb-3 border">
                  <div>
                    <strong>Selected Batch Source:</strong>{" "}
                    <span className="text-primary fw-semibold">{selectedSource}</span>
                  </div>
                  {selectedSource === "Channel Partner" && (
                    <>
                      <div className="mt-1">
                        <strong>Attributed Partner:</strong> {selectedCpName}
                      </div>
                      <div className="mt-1">
                        <strong>Auto-populated RERA ID:</strong> {selectedCpRera || "None"}
                      </div>
                    </>
                  )}
                  {selectedSource === SOURCE_OPTIONS[0] && (
                    <div className="mt-1 text-muted small">
                      Row-level "Funding source" and "Channel partner" from the Excel will be permanently locked on entry. Leads without a source will be quarantined in the Untagged holding area.
                    </div>
                  )}
                </div>

                <div className="form-check p-3 bg-danger-subtle rounded border border-danger">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="importPermanentLockConfirm"
                    checked={isConfirmedLock}
                    onChange={(e) => setIsConfirmedLock(e.target.checked)}
                  />
                  <label
                    className="form-check-label fw-bold text-danger"
                    htmlFor="importPermanentLockConfirm"
                    style={{ fontSize: "13px" }}
                  >
                    Source will be locked permanently and cannot be changed — confirm?
                  </label>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-flex align-items-center gap-2"
                  disabled={!isConfirmedLock}
                  onClick={handleConfirmAndUpload}
                >
                  <FaLock /> Confirm & Import Leads
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartImport;
