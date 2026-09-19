import React, { useState, useEffect, useCallback, useMemo } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { FaLock, FaShieldAlt, FaTag, FaCheck, FaExclamationTriangle, FaUserCheck } from "react-icons/fa";
import { matchesLeadSearch } from "../utils/leadSearch";

const SOURCE_OPTIONS = [
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
];

const UntaggedLeadsPage = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Tag Modal State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [activeTargetLead, setActiveTargetLead] = useState(null); // null if bulk
  const [tagForm, setTagForm] = useState({
    fundingSource: "Channel Partner",
    channelPartnerId: "",
    channelPartner: "",
    channelPartnerReraId: "",
    teamId: "",
  });
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: "", type: "" });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : "");

  const channelPartners = useMemo(
    () => users.filter((u) => String(u?.role || "").toUpperCase() === "CHANNEL_PARTNER"),
    [users]
  );

  const telecallers = useMemo(
    () => users.filter((u) => ["SALES", "PRE_SALES", "POST_SALES"].includes(String(u?.role || "").toUpperCase())),
    [users]
  );

  const fetchUntaggedLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/leads/untagged`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch untagged leads:", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/users?limit=1000`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      const userList = Array.isArray(data) ? data : data?.data || data?.users || [];
      setUsers(userList);
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsers([]);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchUntaggedLeads();
    fetchUsers();
  }, [fetchUntaggedLeads, fetchUsers]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    return leads.filter((lead) => matchesLeadSearch(lead, searchQuery));
  }, [leads, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openTagModalForSingle = (lead) => {
    setActiveTargetLead(lead);
    setTagForm({
      fundingSource: "Channel Partner",
      channelPartnerId: "",
      channelPartner: "",
      channelPartnerReraId: "",
      teamId: "",
    });
    setIsConfirmed(false);
    setIsTagModalOpen(true);
  };

  const openTagModalForBulk = () => {
    if (!selectedIds.length) return;
    setActiveTargetLead(null);
    setTagForm({
      fundingSource: "Channel Partner",
      channelPartnerId: "",
      channelPartner: "",
      channelPartnerReraId: "",
      teamId: "",
    });
    setIsConfirmed(false);
    setIsTagModalOpen(true);
  };

  const handleCPChange = (cpId) => {
    const cp = channelPartners.find((u) => String(u.id) === String(cpId));
    setTagForm((prev) => ({
      ...prev,
      channelPartnerId: cpId,
      channelPartner: cp ? getUserName(cp) : "",
      channelPartnerReraId: cp?.reraNumber || "",
    }));
  };

  const handleSourceChange = (source) => {
    setTagForm((prev) => ({
      ...prev,
      fundingSource: source,
      ...(source !== "Channel Partner"
        ? { channelPartnerId: "", channelPartner: "", channelPartnerReraId: "" }
        : {}),
    }));
  };

  const handleSubmitTagRelease = async (e) => {
    e.preventDefault();
    if (!isConfirmed) {
      alert("Please confirm the permanent lock checkbox before proceeding.");
      return;
    }

    if (tagForm.fundingSource === "Channel Partner" && !tagForm.channelPartner) {
      alert("Please select a registered Channel Partner.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isSingle = Boolean(activeTargetLead);
      const url = isSingle
        ? `${API_URL}/leads/${activeTargetLead.id}/tag-source`
        : `${API_URL}/leads/bulk/tag-source`;

      const payload = isSingle
        ? {
          fundingSource: tagForm.fundingSource,
          channelPartner: tagForm.channelPartner || null,
          channelPartnerReraId: tagForm.channelPartnerReraId || null,
          teamId: tagForm.teamId ? Number(tagForm.teamId) : null,
        }
        : {
          ids: selectedIds,
          fundingSource: tagForm.fundingSource,
          channelPartner: tagForm.channelPartner || null,
          channelPartnerReraId: tagForm.channelPartnerReraId || null,
          teamId: tagForm.teamId ? Number(tagForm.teamId) : null,
        };

      const response = await fetch(url, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Failed to tag and release lead(s)");
      }

      setFeedbackMessage({
        text: isSingle
          ? `Lead #${activeTargetLead.id} source permanently locked to ${tagForm.fundingSource} and released from quarantine!`
          : `${selectedIds.length} leads tagged, locked, and released to calling queue!`,
        type: "success",
      });

      setIsTagModalOpen(false);
      setSelectedIds([]);
      await fetchUntaggedLeads();
      setTimeout(() => setFeedbackMessage({ text: "", type: "" }), 5000);
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while tagging lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Untagged Leads Holding Area" />
      <div className="container-fluid py-3">
        {/* Banner Alert */}
        {/* <div
          className="p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between"
          style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
            border: "1px solid #fdba74",
            color: "#9a3412",
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: "42px", height: "42px", background: "#ea580c", color: "#fff", flexShrink: 0 }}
            >
              <FaShieldAlt size={20} />
            </div>
            <div>
              <h6 className="mb-0 fw-bold" style={{ color: "#7c2d12" }}>
                Untagged Leads Quarantine (Held from Telecallers)
              </h6>
              <p className="mb-0 small text-muted" style={{ color: "#9a3412" }}>
                Leads arriving without attribution are quarantined here. They are <strong>never assigned to telecallers</strong> until a verified source is set. Once tagged, the source is <strong>hard-locked permanently</strong>.
              </p>
            </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-danger rounded-pill px-3 py-2 fs-6">
            {leads.length} Quarantined
          </span>
        </div>
      </div> */}

        {feedbackMessage.text && (
          <div className={`alert alert-${feedbackMessage.type} alert-dismissible fade show`} role="alert">
            {feedbackMessage.text}
          </div>
        )}

        {/* Toolbar & Search */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: "450px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by ID, name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={openTagModalForBulk}
                disabled={!selectedIds.length}
              >
                <FaTag /> Bulk Tag & Release ({selectedIds.length})
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={fetchUntaggedLeads}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "40px" }} className="text-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Lead ID</th>
                  <th>Customer Name</th>
                  <th>Phone & Email</th>
                  <th>Project Interest</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      Loading quarantined leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div className="d-flex flex-column align-items-center gap-2">
                        <FaUserCheck size={36} className="text-success" />
                        <h6 className="mb-0 fw-bold">No Untagged Leads in Quarantine</h6>
                        <small>All incoming leads carry locked sources and are active in calling queues.</small>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedIds.includes(lead.id);
                    const leadName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || lead.name || "-";
                    const phone = lead.phones?.[0]?.value || "-";
                    const email = lead.emails?.[0]?.value || "-";

                    return (
                      <tr key={lead.id} className={isSelected ? "table-active" : ""}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(lead.id)}
                          />
                        </td>
                        <td>
                          <span className="fw-semibold text-primary">#{lead.id}</span>
                        </td>
                        <td>
                          <strong>{leadName}</strong>
                        </td>
                        <td>
                          <div>📱 {phone}</div>
                          {email !== "-" && <small className="text-muted">✉️ {email}</small>}
                        </td>
                        <td>{lead.interestedProjects || "-"}</td>
                        <td>
                          <span className="badge bg-warning text-dark">Untagged (Quarantine)</span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "-"}
                          </small>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            onClick={() => openTagModalForSingle(lead)}
                          >
                            <FaLock size={12} /> Tag & Release
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tag Source & Release Modal */}
      {
        isTagModalOpen && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title d-flex align-items-center gap-2">
                    <FaLock />
                    {activeTargetLead
                      ? `Tag Source & Release Lead #${activeTargetLead.id}`
                      : `Bulk Tag & Release ${selectedIds.length} Leads`}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setIsTagModalOpen(false)}
                  />
                </div>

                <form onSubmit={handleSubmitTagRelease}>
                  <div className="modal-body p-4">
                    <div
                      className="alert alert-warning d-flex align-items-start gap-2 mb-3"
                      style={{ fontSize: "13.5px" }}
                    >
                      <FaExclamationTriangle className="mt-1 flex-shrink-0" size={16} />
                      <div>
                        <strong>Permanent Lock Rule:</strong> Once source attribution is submitted, it is{" "}
                        <strong>permanently immutable for the life of the lead</strong>. No admin override or edit path exists. Please verify details carefully.
                      </div>
                    </div>

                    {activeTargetLead && (
                      <div className="p-3 mb-3 bg-light rounded border">
                        <strong>Lead:</strong> {activeTargetLead.firstName} {activeTargetLead.lastName} (Phone:{" "}
                        {activeTargetLead.phones?.[0]?.value || "-"})
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-bold">Select Source Category *</label>
                      <select
                        className="form-select"
                        value={tagForm.fundingSource}
                        onChange={(e) => handleSourceChange(e.target.value)}
                        required
                      >
                        {SOURCE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {tagForm.fundingSource === "Channel Partner" && (
                      <div className="row g-3 mb-3 p-3 bg-light rounded border">
                        <div className="col-md-7">
                          <label className="form-label fw-bold">Select Registered Channel Partner *</label>
                          <select
                            className="form-select"
                            value={tagForm.channelPartnerId}
                            onChange={(e) => handleCPChange(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Channel Partner --</option>
                            {channelPartners.map((cp) => (
                              <option key={cp.id} value={cp.id}>
                                {getUserName(cp)} {cp.reraNumber ? `(RERA: ${cp.reraNumber})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-5">
                          <label className="form-label fw-bold">Auto-filled CP RERA ID (Read-only)</label>
                          <input
                            type="text"
                            className="form-control bg-white"
                            value={tagForm.channelPartnerReraId}
                            readOnly
                            placeholder="Auto-populated from CP record"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-bold">Assign Telecaller / Sales Executive (Optional)</label>
                      <select
                        className="form-select"
                        value={tagForm.teamId}
                        onChange={(e) => setTagForm((prev) => ({ ...prev, teamId: e.target.value }))}
                      >
                        <option value="">Leave Unassigned / Round-Robin</option>
                        {telecallers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {getUserName(user)} ({user.role})
                          </option>
                        ))}
                      </select>
                      <small className="text-muted">
                        Once released, the lead becomes visible in the selected caller's queue.
                      </small>
                    </div>

                    {/* Hard lock deliberate confirmation checkbox */}
                    <div className="p-3 bg-danger-subtle rounded border border-danger">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="permanentLockConfirmCheck"
                          checked={isConfirmed}
                          onChange={(e) => setIsConfirmed(e.target.checked)}
                        />
                        <label
                          className="form-check-label fw-bold text-danger"
                          htmlFor="permanentLockConfirmCheck"
                          style={{ fontSize: "13.5px" }}
                        >
                          I understand this source tag is PERMANENT and will be LOCKED FOREVER. It cannot be altered or reverted by any user or administrator.
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsTagModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger d-flex align-items-center gap-2"
                      disabled={!isConfirmed || isSubmitting}
                    >
                      <FaLock /> {isSubmitting ? "Locking & Releasing..." : "Confirm & Lock Permanently"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </MasterLayout >
  );
};

export default UntaggedLeadsPage;
