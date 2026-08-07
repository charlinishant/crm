import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import MasterLayout from "../masterLayout/MasterLayout";
import {
  buildDuplicateLeadGroups,
  formatLeadDateTime,
  getLeadIdValue,
  getLeadNameValue,
  getLeadReceivedValue,
  getLeadSourceValue,
  getLeadTeamValue,
} from "../utils/leadDuplicates";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getList = (result, key) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.[key])) return result[key];
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const getRequirement = (lead) =>
  lead?.requirementComment || lead?.configration || lead?.configuration || lead?.propertyType || lead?.type || "-";

const getChannelPartner = (lead) => lead?.channelPartner || lead?.cpName || lead?.partnerName || "-";

const getSpecificChannel = (lead) =>
  lead?.specificChannel || lead?.walkInPortal || lead?.portal || lead?.campaign || lead?.sourceDetail || "-";

const LeadMergePage = () => {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openGroupId, setOpenGroupId] = useState("");
  const navigate = useNavigate();

  const fetchDuplicateGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/leads/duplicates`);
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        const groups = getList(result, "groups");
        setDuplicateGroups(groups);
        setOpenGroupId((current) => current || groups[0]?.id || "");
        return;
      }

      const fallbackResponse = await fetch(`${API_URL}/leads`);
      const fallbackResult = await fallbackResponse.json().catch(() => ({}));
      if (!fallbackResponse.ok) throw new Error(result?.message || "Unable to load duplicate leads");

      const groups = buildDuplicateLeadGroups(getList(fallbackResult, "leads"));
      setDuplicateGroups(groups);
      setOpenGroupId((current) => current || groups[0]?.id || "");
    } catch (err) {
      setDuplicateGroups([]);
      setError(err.message || "Unable to load duplicate leads");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuplicateGroups();
  }, [fetchDuplicateGroups]);

  const totals = useMemo(() => {
    const duplicateCopies = duplicateGroups.reduce((sum, group) => sum + Math.max(0, group.records.length - 1), 0);
    const totalRecords = duplicateGroups.reduce((sum, group) => sum + group.records.length, 0);
    return { duplicateCopies, totalRecords };
  }, [duplicateGroups]);

  const handleView = (lead) => {
    window.sessionStorage.setItem("selectedLeadPreview", JSON.stringify(lead));
    window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
    const leadId = getLeadIdValue(lead);
    navigate(leadId ? `/details?leadId=${leadId}` : "/details", { state: { lead } });
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Lead Merge" />

      <section className="table-section site-visits-section lead-merge-section">
        <div className="site-visits-title-row lead-merge-title-row">
          <div>
            <p>Duplicate Lead Provenance</p>
            <span>Review matched records by source, owner, and first received time.</span>
          </div>
          <button
            type="button"
            className="btn btn-primary svp-export-btn text-sm btn-sm px-16 py-8 radius-8"
            onClick={fetchDuplicateGroups}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        <div className="lead-merge-summary">
          <div>
            <span>Disputes</span>
            <strong>{isLoading ? "..." : duplicateGroups.length}</strong>
          </div>
          <div>
            <span>Duplicate Copies</span>
            <strong>{isLoading ? "..." : totals.duplicateCopies}</strong>
          </div>
          <div>
            <span>Records Involved</span>
            <strong>{isLoading ? "..." : totals.totalRecords}</strong>
          </div>
        </div>

        {isLoading && <div className="site-visit-message">Loading duplicate provenance...</div>}
        {error && <div className="site-visit-message error">{error}.</div>}

        {!isLoading && duplicateGroups.length === 0 ? (
          <div className="lead-merge-empty">No duplicate lead disputes found.</div>
        ) : (
          <div className="lead-merge-groups">
            {duplicateGroups.map((group) => {
              const isOpen = openGroupId === group.id;
              return (
                <article className="lead-merge-group" key={group.id}>
                  <button
                    type="button"
                    className="lead-merge-group-head"
                    onClick={() => setOpenGroupId(isOpen ? "" : group.id)}
                  >
                    <span>
                      {group.matchedOn}: <strong>{group.matchValue}</strong>
                    </span>
                    <small>{group.records.length} records</small>
                  </button>

                  {isOpen && (
                    <div className="table-responsive">
                      <table border="1" cellPadding="0" cellSpacing="0">
                        <thead>
                          <tr>
                            <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Order</th>
                            <th>Lead ID</th>
                            <th>Name</th>
                            <th>Source</th>
                            <th>Channel Partner</th>
                            <th>Specific Channel</th>
                            <th>Received On</th>
                            <th>Team / Telecaller</th>
                            <th>Requirement</th>
                            <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.records.map((lead) => (
                            <tr key={getLeadIdValue(lead) || `${group.id}-${lead.duplicateRank}`}>
                              <td>
                                <span className={lead.isOriginalLead ? "lead-origin-pill original" : "lead-origin-pill"}>
                                  {lead.isOriginalLead ? "Original" : `#${lead.duplicateRank}`}
                                </span>
                              </td>
                              <td>{getLeadIdValue(lead) ? ` ${getLeadIdValue(lead)}` : "-"}</td>
                              <td>
                                <div className="lead-name-main" style={{ fontSize: "14px" }}>
                                  {getLeadNameValue(lead)}
                                </div>
                              </td>
                              <td>{getLeadSourceValue(lead)}</td>
                              <td>{getChannelPartner(lead)}</td>
                              <td>{getSpecificChannel(lead)}</td>
                              <td>{formatLeadDateTime(getLeadReceivedValue(lead))}</td>
                              <td>{getLeadTeamValue(lead)}</td>
                              <td>{getRequirement(lead)}</td>
                              <td>
                                <button type="button" className="lead-merge-view-btn" onClick={() => handleView(lead)}>
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="lead-merge-audit-note">
                        First-touch is decided by the earliest received timestamp, then lead id when timestamps are missing.
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </MasterLayout>
  );
};

export default LeadMergePage;
