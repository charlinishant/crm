import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import MasterLayout from "../masterLayout/MasterLayout";
import { buildDuplicateLeadGroups } from "../utils/leadDuplicates";
import {
  filterDashboardRecords,
  getDashboardCard,
  normalizeList,
} from "../utils/dashboardResultFilters";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getName = (record) =>
  [record?.firstName, record?.lastName].filter(Boolean).join(" ") ||
  record?.name ||
  record?.title ||
  record?.companyName ||
  "-";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day:"2-digit",
    month:"short",
    year:"numeric",
    hour:"2-digit",
    minute:"2-digit",
  });
};

const getOwner = (record) =>
  [record?.team?.firstName, record?.team?.lastName].filter(Boolean).join(" ") ||
  record?.team?.username ||
  record?.team?.email ||
  record?.assigneeName ||
  record?.assign?.username ||
  "Unassigned";

const DashboardResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cardKey = searchParams.get("card") || "active-tasks";
  const card = getDashboardCard(cardKey);
  const [data, setData] = useState({ leads:[], tasks:[], duplicateGroups:[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = useCallback(async (endpoint) => {
    const response = await fetch(`${API_URL}${endpoint}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.message || `Unable to load ${endpoint}`);
    return normalizeList(result);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [leads, tasks, duplicateGroupsResult] = await Promise.all([
        fetchList("/leads"),
        fetchList("/tasks"),
        fetchList("/leads/duplicates"),
      ]);
      setData({
        leads,
        tasks,
        duplicateGroups:duplicateGroupsResult.length ? duplicateGroupsResult : buildDuplicateLeadGroups(leads),
      });
    } catch (loadError) {
      setData({ leads:[], tasks:[], duplicateGroups:[] });
      setError(loadError.message || "Unable to load dashboard results");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const records = useMemo(() => filterDashboardRecords(card.key, data), [card.key, data]);

  const openRecord = (record) => {
    if (card.recordType === "task" || record.resultType === "Task") {
      navigate("/all-tasks");
      return;
    }
    const leadId = record?.id || record?.leadId;
    if (leadId) navigate(`/details?leadId=${leadId}`, { state:{ lead:record } });
  };

  return (
    <MasterLayout>
      <Breadcrumb title={card.title} />
      <section className="table-section site-visits-section dashboard-results-section">
        <div className="site-visits-title-row">
          <div>
            <p>{card.title}</p>
            <span>{card.subtitle} result count: {loading ? "..." : records.length}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary svp-export-btn text-sm btn-sm px-16 py-8 radius-8"
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading && <div className="site-visit-message">Loading results...</div>}
        {error && <div className="site-visit-message error">{error}</div>}
        {!loading && !error && records.length === 0 && (
          <div className="site-visit-message">No records found for {card.title}.</div>
        )}
        {!loading && !error && records.length > 0 && (
          <div className="table-responsive">
            <table border="1" cellPadding="0" cellSpacing="0">
              <thead>
                {card.recordType === "duplicate" ? (
                  <tr>
                    <th style={{ borderStartStartRadius:"8px", borderEndStartRadius:"8px" }}>Type</th>
                    <th>Group ID</th>
                    <th>Match Criteria</th>
                    <th>Records</th>
                    <th>Original Source</th>
                    <th>Assigned Caller</th>
                    <th>First Received</th>
                    <th style={{ borderStartEndRadius:"8px", borderEndEndRadius:"8px" }}>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ borderStartStartRadius:"8px", borderEndStartRadius:"8px" }}>Type</th>
                    <th>ID</th>
                    <th>Name / Title</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Source / Priority</th>
                    <th>Date</th>
                    <th style={{ borderStartEndRadius:"8px", borderEndEndRadius:"8px" }}>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {records.map((record, index) => {
                  if (card.recordType === "duplicate") {
                    const originalLead = record.original || record.records?.[0] || {};
                    const groupId = record.id || record.matchValue || `group-${index}`;
                    const originalSource =
                      originalLead.source ||
                      originalLead.channelPartner ||
                      originalLead.fundingSource ||
                      "-";
                    const owners = Array.from(
                      new Set(
                        (record.records || [])
                          .map(getOwner)
                          .filter((o) => o && o !== "Unassigned")
                      )
                    );
                    const ownerDisplay =
                      owners.length === 0
                        ? "Unassigned"
                        : owners.length === 1
                        ? owners[0]
                        : `${owners[0]} (+${owners.length - 1})`;
                    const firstReceived =
                      originalLead.createdAt ||
                      originalLead.created_at ||
                      originalLead.received_on ||
                      originalLead.receivedOn;

                    return (
                      <tr key={`dup-${groupId}-${index}`}>
                        <td style={{ verticalAlign: "middle" }}>
                          <span
                            className="duplicate-type-pill"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontWeight: 600,
                              fontSize: "12px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              whiteSpace: "nowrap",
                              position: "static",
                            }}
                          >
                            Duplicate Group
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#1e293b", verticalAlign: "middle" }}>#{groupId}</td>
                        <td style={{ verticalAlign: "middle" }}>
                          <strong>{record.matchedOn || "Match"}:</strong> {record.matchValue}
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              background: "#fef3c7",
                              color: "#92400e",
                              fontWeight: 700,
                              fontSize: "12px",
                              position: "static",
                            }}
                          >
                            {record.records?.length || 0} records
                          </span>
                        </td>
                        <td style={{ verticalAlign: "middle" }}>{originalSource}</td>
                        <td style={{ verticalAlign: "middle" }}>{ownerDisplay}</td>
                        <td style={{ verticalAlign: "middle" }}>{formatDate(firstReceived)}</td>
                        <td style={{ verticalAlign: "middle" }}>
                          <button
                            type="button"
                            className="lead-merge-view-btn"
                            onClick={() =>
                              navigate(`/lead-merge?groupId=${encodeURIComponent(groupId)}`, {
                                state: { groupId },
                              })
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const type = record.resultType || (card.recordType === "task" ? "Task" : "Lead");
                  const id = record.id || record.leadId || index + 1;
                  return (
                    <tr key={`${type}-${id}-${index}`}>
                      <td>{type}</td>
                      <td>{record.id ? `#${record.id}` : "-"}</td>
                      <td>{getName(record)}</td>
                      <td>{record.status || record.stage || "-"}</td>
                      <td>{getOwner(record)}</td>
                      <td>{record.tags || record.channelPartner || record.fundingSource || record.priority || record.type || "-"}</td>
                      <td>{formatDate(record.dueDate || record.conductSiteDate || record.siteVisitDate || record.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="lead-merge-view-btn"
                          onClick={() => openRecord(record)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </MasterLayout>
  );
};

export default DashboardResultsPage;
