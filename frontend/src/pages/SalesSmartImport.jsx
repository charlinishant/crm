import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const SOURCE_OPTIONS = [
  "Use Excel Row Source (Fallback to Untagged Quarantine)",
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
];

const SalesSmartImport = ({ onImportComplete }) => {
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState(SOURCE_OPTIONS[0]);
  const [channelPartners, setChannelPartners] = useState([]);
  const [selectedChannelPartnerId, setSelectedChannelPartnerId] = useState("");
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    const loadChannelPartners = async () => {
      try {
        const response = await fetch(`${API_URL}/users?limit=1000`);
        const result = await response.json().catch(() => ({}));
        const users = Array.isArray(result) ? result : result?.data || result?.users || [];
        setChannelPartners(users.filter((user) =>
          user?.isActive !== false && String(user?.role || "").toUpperCase() === "CHANNEL_PARTNER"
        ));
      } catch (error) {
        setChannelPartners([]);
      }
    };
    loadChannelPartners();
  }, []);

  const importLeads = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage("Please select the filled Excel file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (source && source !== SOURCE_OPTIONS[0]) {
      formData.append("fundingSource", source);
    }
    if (source === "Channel Partner" && selectedChannelPartnerId) {
      const selectedPartner = channelPartners.find((user) => String(user.id) === String(selectedChannelPartnerId));
      if (selectedPartner) {
        const partnerName = [selectedPartner.firstName, selectedPartner.lastName].filter(Boolean).join(" ") || selectedPartner.username || selectedPartner.email;
        formData.append("channelPartner", partnerName);
        formData.append("channelPartnerReraId", selectedPartner.reraNumber || "");
      }
    }

    try {
      setUploading(true);
      setMessage("");
      setSummary(null);
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token");
      const response = await fetch(`${API_URL}/leads/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Lead import failed");
      setSummary(result);
      setMessage(result?.message || "Leads imported successfully.");
      if (onImportComplete) await onImportComplete();
      setTimeout(() => {
        navigate("/user/sales/leads", {
          replace: true,
          state: { refreshPanel: true, refreshLeads: Date.now() },
        });
      }, 1000);
    } catch (error) {
      setMessage(error.message || "Lead import failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="sales-card sales-smart-import-card">
      <div className="sales-card-head">
        <div>
          <h2>Smart Import Leads</h2>
          <p>Import leads directly into your Sales workspace</p>
        </div>
      </div>

      <div className="sales-import-info">
        Imported leads are automatically assigned to your account. Sales users cannot assign imported leads to another user.
      </div>

      <div className="sales-import-form">
        <label className="sales-import-label" htmlFor="salesLeadImportFile">Lead file</label>
        <div className="sales-import-file-row">
          <input
            id="salesLeadImportFile"
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setFileName(event.target.files?.[0]?.name || "");
              setMessage("");
            }}
          />
          <button type="button" className="sales-primary-btn" onClick={importLeads} disabled={uploading}>
            {uploading ? "Importing..." : "Import Leads"}
          </button>
        </div>
        {fileName && <small className="sales-import-file-name">Selected: {fileName}</small>}

        <div className="sales-import-options-row">
          <div className="sales-import-option">
            <label className="sales-import-label" htmlFor="salesLeadImportSource">Lead source</label>
            <select
              id="salesLeadImportSource"
              className="sales-import-select"
              value={source}
              onChange={(event) => {
                const nextSource = event.target.value;
                setSource(nextSource);
                if (nextSource !== "Channel Partner") {
                  setSelectedChannelPartnerId("");
                }
              }}
            >
              {SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          {source === "Channel Partner" && (
            <div className="sales-import-option">
              <label className="sales-import-label" htmlFor="salesLeadImportAssignee">Assign</label>
              <select
                id="salesLeadImportAssignee"
                className="sales-import-select"
                value={selectedChannelPartnerId}
                onChange={(event) => setSelectedChannelPartnerId(event.target.value)}
              >
                <option value="">No Channel Partner</option>
                {channelPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {[partner.firstName, partner.lastName].filter(Boolean).join(" ") || partner.username || partner.email}
                  </option>
                ))}
              </select>
              <small className="sales-import-file-name">
                Attribution only; ownership remains assigned to you.
              </small>
            </div>
          )}
        </div>

        <button type="button" className="sales-primary-btn sales-download-btn" onClick={() => { window.location.href = `${API_URL}/leads/sample-excel`; }}>
          Download Sample Excel
        </button>
      </div>

      {message && <div className="sales-alert">{message}</div>}
      {summary?.skippedDuplicateCount > 0 && (
        <small className="sales-import-file-name">{summary.skippedDuplicateCount} duplicate rows skipped.</small>
      )}
    </section>
  );
};

export default SalesSmartImport;
