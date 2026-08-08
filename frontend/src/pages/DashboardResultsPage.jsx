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
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const type = record.resultType || (card.recordType === "task" ? "Task" : card.recordType === "duplicate" ? "Duplicate Group" : "Lead");
                  const id = record.id || record.leadId || record.groupId || record.matchValue || index + 1;
                  return (
                    <tr key={`${type}-${id}-${index}`}>
                      <td>{type}</td>
                      <td>{record.id ? `#${record.id}` : record.matchValue || "-"}</td>
                      <td>{record.records ? `${record.matchedOn}: ${record.matchValue}` : getName(record)}</td>
                      <td>{record.status || record.stage || "-"}</td>
                      <td>{record.records ? `${record.records.length} records` : getOwner(record)}</td>
                      <td>{record.tags || record.channelPartner || record.priority || record.type || "-"}</td>
                      <td>{formatDate(record.dueDate || record.conductSiteDate || record.siteVisitDate || record.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="lead-merge-view-btn"
                          onClick={() => record.records ? navigate("/lead-merge") : openRecord(record)}
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
