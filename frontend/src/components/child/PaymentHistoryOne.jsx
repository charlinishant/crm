import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaEllipsisV, FaLock, FaExclamationTriangle, FaTag } from "react-icons/fa";
import BulkActionToolbar from "../table/BulkActionToolbar";
import BulkDeleteConfirmation from "../table/BulkDeleteConfirmation";
import TableSelectionCheckbox from "../table/TableSelectionCheckbox";
import { useTableSelection } from "../table/useTableSelection";
import LeadTableToolbar from "../common/LeadTableToolbar";
import RoleUserDropdown, { useRoleUsers } from "../common/RoleUserDropdown";
import { matchesLeadSearch } from "../../utils/leadSearch";
import { getReportsSocket } from "../../services/socketClient";

const SOURCE_OPTIONS = [
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
];

const PaymentHistoryOne = ({ trashMode = false }) => {
  const [leadData, setLeadData] = useState([]);
  const { users: telecallers, loading: isLoadingSales } = useRoleUsers("SALES");
  const { users: channelPartners, loading: isLoadingCP } = useRoleUsers("CHANNEL_PARTNER");
  const isLoadingUsers = isLoadingSales || isLoadingCP;

  const users = useMemo(() => {
    const combined = [...(telecallers || []), ...(channelPartners || [])];
    const map = new Map();
    combined.forEach((u) => {
      if (u && u.id) map.set(String(u.id), u);
    });
    return Array.from(map.values());
  }, [telecallers, channelPartners]);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [teamMenu, setTeamMenu] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");

  // In-table Tag Modal State (No separate page needed)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [activeTargetLead, setActiveTargetLead] = useState(null);
  const [tagForm, setTagForm] = useState({
    fundingSource: "Channel Partner",
    channelPartnerId: "",
    channelPartner: "",
    channelPartnerReraId: "",
    teamId: "",
  });
  const [isConfirmedLock, setIsConfirmedLock] = useState(false);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const listUrl = trashMode ? `${API_URL}/leads/trash` : `${API_URL}/leads/`;
  const recordsPerPage = 10;

  const getUserName = useCallback((user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : ""), []);

  const fetchLeadData = useCallback(async (queryParam) => {
    try {
      const q = typeof queryParam === "string" ? queryParam : searchQuery;
      let url = listUrl;
      if (q && q.trim()) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}search=${encodeURIComponent(q.trim())}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      setLeadData(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }, [listUrl, searchQuery]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  useEffect(() => {
    if (location.state?.refreshLeads) {
      fetchLeadData();
    }
  }, [fetchLeadData, location.state?.refreshLeads]);

  useEffect(() => {
    let socketRef = null;
    let debounceTimer = null;

    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchLeadData();
      }, 300);
    };

    const setupSocket = async () => {
      try {
        const socket = await getReportsSocket();
        if (!socket || typeof socket.on !== "function") return;
        socketRef = socket;

        socket.on("reports:update", debouncedFetch);
        socket.on("lead:created", debouncedFetch);
        socket.on("lead:updated", debouncedFetch);
        socket.on("lead:assigned", debouncedFetch);
        socket.on("leads:imported", debouncedFetch);
        socket.on("crm:leads-changed", debouncedFetch);
      } catch (err) {
        console.warn("[PaymentHistoryOne] Socket connection error:", err);
      }
    };

    setupSocket();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (socketRef && typeof socketRef.off === "function") {
        socketRef.off("reports:update", debouncedFetch);
        socketRef.off("lead:created", debouncedFetch);
        socketRef.off("lead:updated", debouncedFetch);
        socketRef.off("lead:assigned", debouncedFetch);
        socketRef.off("leads:imported", debouncedFetch);
        socketRef.off("crm:leads-changed", debouncedFetch);
      }
    };
  }, [fetchLeadData]);


  const getLeadName = useCallback((lead) => {
    const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    return lead.name || fullName || "-";
  }, []);

  const getLeadId = useCallback((lead) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    return leadId ? ` ${leadId}` : "-";
  }, []);

  const getLeadKey = useCallback((lead) => lead.id || lead._id || lead.lead_id, []);

  const getLeadOwner = useCallback((lead) => {
    return lead.owner || lead.sales || getUserName(lead.team) || "Unassigned";
  }, [getUserName]);

  const getLastSourceInfo = useCallback((lead) => {
    const tags = typeof lead.tags === 'string' ? lead.tags : '';
    const isLocked = tags.includes('sourceLocked:true') ||
      (lead.fundingSource && lead.fundingSource !== 'Untagged') ||
      (lead.channelPartner && lead.channelPartner !== 'Untagged');

    // Extract clean source from tags or direct fields
    let source = '';
    let cpName = '';
    let isUntagged = false;

    if (isLocked) {
      // Parse from tag string first
      const srcMatch = tags.match(/source:\s*([^|]+)/i);
      source = (srcMatch && srcMatch[1] ? srcMatch[1] : '').trim();
      const cpMatch = tags.match(/cp:\s*([^|]+)/i);
      cpName = (cpMatch && cpMatch[1] ? cpMatch[1] : '').trim();

      // Fallback to direct lead fields (preferred, cleaner)
      if (!source && lead.fundingSource && lead.fundingSource !== 'Untagged') {
        source = lead.fundingSource;
      }
      if (!cpName && lead.channelPartner && lead.channelPartner !== 'Untagged') {
        cpName = lead.channelPartner;
      }
      // Normalize
      if (source.toLowerCase() === 'channel_partner') source = 'Channel Partner';
    } else {
      isUntagged = true;
    }

    return { isLocked, isUntagged, source, cpName };
  }, []);

  const getLastSource = useCallback((lead) => {
    const { isLocked, isUntagged, source, cpName } = getLastSourceInfo(lead);
    if (isUntagged) return 'Untagged';
    return [source, cpName].filter(Boolean).join(' / ') || '-';
  }, [getLastSourceInfo]);

  const getStage = useCallback((lead) => {
    const rawStage = lead.lead_status || lead.status || lead.stage || "New";
    let stage = String(rawStage).replace(/_/g, " ").trim();
    
    const lowerStage = stage.toLowerCase();
    if (lowerStage === "booking" || lowerStage === "booked") {
      stage = "Booked";
    } else if (lowerStage === "qualified" || lowerStage === "quified") {
      stage = "Qualified";
    }

    return stage;
  }, []);

  const getReceivedOn = useCallback((lead) => {
    const value = lead.createdAt || lead.created_at || lead.received_on;
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }, []);

  const getRequirement = useCallback((lead) => {
    return lead.requirementComment || lead.configration || lead.configuration || lead.propertyType || lead.type || "-";
  }, []);

  const getTags = useCallback((lead) => {
    return lead.tags || lead.source || "-";
  }, []);

  const getSearchText = useCallback((lead) => {
    return [
      getLeadId(lead),
      getLeadName(lead),
      getLeadOwner(lead),
      getLastSource(lead),
      getStage(lead),
      getRequirement(lead),
      getTags(lead),
      lead.email,
      lead.phone,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
  }, [getLeadId, getLeadName, getLeadOwner, getLastSource, getStage, getRequirement, getTags]);

  const filteredLeadData = leadData.filter((lead) => {
    return matchesLeadSearch(lead, searchQuery);
  });
  const totalPages = Math.max(1, Math.ceil(filteredLeadData.length / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * recordsPerPage;
  const paginatedLeadData = filteredLeadData.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const pageEndIndex = Math.min(pageStartIndex + paginatedLeadData.length, filteredLeadData.length);
  const tableSelection = useTableSelection({ rows:paginatedLeadData, getRowId:getLeadKey, disabled:bulkBusy });
  const clearTableSelection = tableSelection.clearSelection;

  useEffect(() => {
    setCurrentPage(1);
    setOpenMenu(null);
    setMenuPosition(null);
    setTeamMenu(null);
    setTeamSearch("");
    clearTableSelection();
  }, [clearTableSelection, searchQuery, trashMode]);

  useEffect(() => {
    const closeTeamMenu = () => {
      setTeamMenu(null);
      setTeamSearch("");
    };

    document.addEventListener("mousedown", closeTeamMenu);
    return () => document.removeEventListener("mousedown", closeTeamMenu);
  }, []);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const renderReceivedOn = (lead) => {
    const receivedOn = getReceivedOn(lead);

    if (typeof receivedOn === "string") return receivedOn;

    return (
      <>
        <div>{receivedOn.date}</div>
        <div className="lead-received-time">at {receivedOn.time}</div>
      </>
    );
  };

  const handlePreview = (lead) => {
    window.sessionStorage.setItem("selectedLeadPreview", JSON.stringify(lead));
    window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
    const leadId = lead.id || lead._id || lead.lead_id || "";
    setOpenMenu(null);
    setMenuPosition(null);
    navigate(leadId ? `/details?leadId=${leadId}` : "/details", { state: { lead } });
  };

  const handleEdit = (lead) => {
    window.sessionStorage.setItem("selectedLeadEdit", JSON.stringify(lead));
    const leadId = lead.id || lead._id || lead.lead_id || "";
    setOpenMenu(null);
    setMenuPosition(null);
    navigate(leadId ? `/add-lead?editLeadId=${leadId}` : "/add-lead", { state: { lead } });
  };

  const formatValue = useCallback((value) => {
    const formatNestedValue = (itemValue) => {
      if (itemValue === undefined || itemValue === null || itemValue === "") return "-";
      if (typeof itemValue === "boolean") return itemValue ? "Yes" : "No";
      if (Array.isArray(itemValue)) {
        if (itemValue.length === 0) return "-";
        return itemValue
          .map((item) => {
            if (typeof item !== "object" || item === null) return String(item);
            return Object.entries(item)
              .filter(([key]) => !["id", "leadId"].includes(key))
              .map(([key, nestedValue]) => `${key}: ${formatNestedValue(nestedValue)}`)
              .join(", ");
          })
          .join(" | ");
      }
      if (typeof itemValue === "object") {
        return Object.entries(itemValue)
          .map(([key, nestedValue]) => `${key}: ${formatNestedValue(nestedValue)}`)
          .join(", ");
      }
      return String(itemValue);
    };

    return formatNestedValue(value);
  }, []);

  const escapeCsvValue = useCallback((value) => {
    const text = formatValue(value);
    return `"${text.replace(/"/g, '""')}"`;
  }, [formatValue]);

  const downloadLeadsCsv = useCallback((leads, fileName) => {
    if (!leads.length) {
      alert("No leads found to export.");
      return;
    }

    const columns = [
      ["srNo", "Sr. No"],
      ["id", "Lead ID"],
      ["name", "Name"],
      ["owner", "Owner"],
      ["source", "Last Source"],
      ["stage", "Stage"],
      ["receivedOn", "Received On"],
      ["requirement", "Requirement"],
      ["tags", "Tags"],
    ];

    const rows = leads.map((lead, index) => ({
      srNo: index + 1,
      id: getLeadId(lead),
      name: getLeadName(lead),
      owner: getLeadOwner(lead),
      source: getLastSource(lead),
      stage: getStage(lead),
      receivedOn:
        typeof getReceivedOn(lead) === "string"
          ? getReceivedOn(lead)
          : `${getReceivedOn(lead).date} at ${getReceivedOn(lead).time}`,
      requirement: getRequirement(lead),
      tags: getTags(lead),
    }));

    const csv = [
      columns.map(([, label]) => escapeCsvValue(label)).join(","),
      ...rows.map((row) =>
        columns.map(([key]) => escapeCsvValue(row[key])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    escapeCsvValue,
    getLeadId,
    getLeadName,
    getLeadOwner,
    getLastSource,
    getStage,
    getReceivedOn,
    getRequirement,
    getTags,
  ]);

  useEffect(() => {
    const handleToolbarAction = (event) => {
      const action = event.detail || {};

      if (action.type === "search") {
        setSearchQuery(action.query || "");
        setCurrentPage(1);
        return;
      }

      if (action.type === "refresh") {
        fetchLeadData();
        return;
      }

      if (action.type === "export") {
        downloadLeadsCsv(filteredLeadData, "filtered-leads.csv");
        return;
      }

      if (action.type === "exportAll") {
        downloadLeadsCsv(leadData, "all-leads.csv");
      }
    };

    window.addEventListener("leadToolbarAction", handleToolbarAction);
    return () => window.removeEventListener("leadToolbarAction", handleToolbarAction);
  }, [downloadLeadsCsv, fetchLeadData, filteredLeadData, leadData]);

  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  };

  const buildPrintHtml = (lead) => {
    const hiddenKeys = new Set(["password"]);
    const rows = Object.entries(lead)
      .filter(([key]) => !hiddenKeys.has(key))
      .map(
        ([key, value]) => `
          <tr>
            <th>${formatLabel(key)}</th>
            <td>${formatValue(value)}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <title>Lead Details - ${getLeadName(lead)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              color: #263241;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 28px;
            }
            .print-header {
              align-items: center;
              border-bottom: 2px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              margin-bottom: 24px;
              padding-bottom: 18px;
            }
            .print-logo {
              height: 44px;
              object-fit: contain;
            }
            .print-title {
              text-align: right;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 6px;
            }
            .print-subtitle {
              color: #64748b;
              font-size: 13px;
            }
            .lead-summary {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              display: grid;
              gap: 10px;
              grid-template-columns: repeat(4, 1fr);
              margin-bottom: 22px;
              padding: 16px;
            }
            .summary-label {
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
            }
            .summary-value {
              font-size: 15px;
              font-weight: 600;
              margin-top: 4px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th,
            td {
              border: 1px solid #e2e8f0;
              font-size: 13px;
              padding: 10px 12px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              width: 230px;
            }
            @media print {
              body { padding: 18px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img class="print-logo" src="${window.location.origin}/assets/images/logo.png" alt="Logo" />
            <div class="print-title">
              <h1>Lead Details</h1>
              <div class="print-subtitle">Generated on ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="lead-summary">
            <div>
              <div class="summary-label">Lead ID</div>
              <div class="summary-value">${getLeadId(lead)}</div>
            </div>
            <div>
              <div class="summary-label">Name</div>
              <div class="summary-value">${getLeadName(lead)}</div>
            </div>
            <div>
              <div class="summary-label">Stage</div>
              <div class="summary-value">${getStage(lead)}</div>
            </div>
            <div>
              <div class="summary-label">Source</div>
              <div class="summary-value">${getLastSource(lead)}</div>
            </div>
          </div>

          <table>
            <tbody>${rows}</tbody>
          </table>

          <script>
            window.addEventListener("load", function () {
              window.print();
            });
          </script>
        </body>
      </html>
    `;
  };

  const handlePrint = async (lead) => {
    setOpenMenu(null);
    setMenuPosition(null);

    let printableLead = lead;
    const leadId = lead.id || lead._id || lead.lead_id;

    if (leadId) {
      try {
        const response = await fetch(`${API_URL}/leads/${leadId}`);
        if (response.ok) {
          printableLead = await response.json();
        }
      } catch (error) {
        console.error("Unable to load full lead for print:", error);
      }
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(printableLead));
    printWindow.document.close();
  };

  const handleDelete = async (lead) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    if (!leadId) return;
    if (!window.confirm("Move this lead to the Bin? Its call logs and history will be kept and can be restored.")) return;

    setOpenMenu(null);
    setMenuPosition(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "DELETE",
        headers:token ? { Authorization:`Bearer ${token}` } : {},
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || result || "Unable to move lead to Bin");
      setLeadData((current) =>
        current.filter((item) => (item.id || item._id || item.lead_id) !== leadId)
      );
    } catch (error) {
      console.error("Unable to delete lead:", error);
      alert(error.message || "Unable to delete lead");
    }
  };

  const handleRestore = async (lead) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    if (!leadId) return;

    setOpenMenu(null);
    setMenuPosition(null);

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}/restore`, {
        method: "PATCH",
      });

      if (!response.ok) throw new Error("Unable to restore lead");
      setLeadData((current) =>
        current.filter((item) => (item.id || item._id || item.lead_id) !== leadId)
      );
    } catch (error) {
      console.error("Unable to restore lead:", error);
      alert(error.message || "Unable to restore lead");
    }
  };

  const handlePermanentDelete = async (lead) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    if (!leadId) return;
    if (!window.confirm("Permanently delete this lead? This cannot be undone.")) return;

    setOpenMenu(null);
    setMenuPosition(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/leads/${leadId}/permanent`, {
        method: "DELETE",
        headers:token ? { Authorization:`Bearer ${token}` } : {},
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || result || "Unable to permanently delete lead");
      }
      setLeadData((current) =>
        current.filter((item) => (item.id || item._id || item.lead_id) !== leadId)
      );
    } catch (error) {
      console.error("Unable to permanently delete lead:", error);
      alert(error.message || "Unable to permanently delete lead");
    }
  };

  const runBulkLeadAction = async () => {
    const ids = tableSelection.selectedIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    if (!ids.length || !bulkAction) return;
    setBulkBusy(true);
    setBulkMessage("");
    setBulkError("");

    const token = localStorage.getItem("authToken");
    const actionConfig = {
      trash:{ url:`${API_URL}/leads/bulk/trash`, method:"PATCH", success:"Selected leads moved to Trash." },
      restore:{ url:`${API_URL}/leads/bulk/restore`, method:"PATCH", success:"Selected leads restored." },
      permanent:{ url:`${API_URL}/leads/bulk/permanent`, method:"DELETE", success:"Selected leads permanently deleted." },
    }[bulkAction];

    try {
      const response = await fetch(actionConfig.url, {
        method:actionConfig.method,
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization:`Bearer ${token}` } : {}),
        },
        body:JSON.stringify({ ids, force: bulkAction === "permanent" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 207) {
        throw new Error(result?.message || "Unable to process selected leads");
      }

      const processedIds = (bulkAction === "restore" ? result.restoredIds : result.deletedIds) || [];
      if (!processedIds.length) {
        throw new Error(result?.message || "No selected leads were changed");
      }
      const processedSet = new Set(processedIds.map(String));
      setLeadData((current) => current.filter((lead) => !processedSet.has(String(getLeadKey(lead)))));
      tableSelection.removeSelectedIds(processedIds);
      setBulkAction(null);
      await fetchLeadData();

      if (result.failed > 0) {
        const reasons = (result.failures || []).map((item) => `#${item.id}: ${item.reason}`).join("; ");
        setBulkError(`${result.deleted || result.restored || 0} processed. ${result.failed} failed. ${reasons}`);
      } else {
        setBulkMessage(actionConfig.success);
      }

      const remainingOnPage = paginatedLeadData.filter((lead) => !processedSet.has(String(getLeadKey(lead)))).length;
      if (remainingOnPage === 0) setCurrentPage((page) => Math.max(1, page - 1));
    } catch (error) {
      setBulkError(error.message || "Unable to process selected leads");
    } finally {
      setBulkBusy(false);
    }
  };

  const getBulkEntityText = (singular, plural = `${singular}s`) =>
    tableSelection.selectedCount === 1 ? `selected ${singular}` : `${tableSelection.selectedCount} selected ${plural}`;

  const handleActionToggle = (event, index) => {
    if (openMenu === index) {
      setOpenMenu(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setOpenMenu(index);
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.right - 182,
    });
  };

  const handleTeamChange = async (lead, userId) => {
    const { isUntagged } = getLastSourceInfo(lead);
    if (isUntagged && userId) {
      alert("Untagged lead is quarantined and cannot be assigned to telecallers. Please tag lead source first.");
      return;
    }

    const leadId = getLeadKey(lead);
    const previousData = leadData;
    const nextTeam = users.find((user) => String(user.id) === String(userId)) || null;
    const nextTeamId = userId ? Number(userId) : null;

    setLeadData((current) =>
      current.map((item) =>
        (item.id || item._id || item.lead_id) === leadId
          ? { ...item, teamId: nextTeamId, team: nextTeam }
          : item
      )
    );

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId: nextTeamId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to assign lead");
      await fetchLeadData();
    } catch (error) {
      console.error("Unable to assign lead:", error);
      setLeadData(previousData);
      alert(error.message || "Unable to assign lead");
    }
  };

  const handleTeamMenuToggle = (event, lead) => {
    event.stopPropagation();
    if (isLoadingUsers) return;

    const { isUntagged } = getLastSourceInfo(lead);
    if (isUntagged) return;

    const leadId = getLeadKey(lead);
    if (teamMenu?.leadId === leadId) {
      setTeamMenu(null);
      setTeamSearch("");
      return;
    }

    setTeamMenu({
      leadId,
    });
    setTeamSearch("");
  };

  const handleTeamSelect = async (lead, userId) => {
    setTeamMenu(null);
    setTeamSearch("");
    await handleTeamChange(lead, userId);
  };

  const handleTagsChange = (lead, nextTags) => {
    const leadId = lead.id || lead._id || lead.lead_id;

    setLeadData((current) =>
      current.map((item) =>
        (item.id || item._id || item.lead_id) === leadId
          ? { ...item, tags: nextTags }
          : item
      )
    );
  };

  const handleTagsSave = async (lead, nextTags) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    if (!leadId) return;

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: nextTags }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update tags");
      await fetchLeadData();
    } catch (error) {
      console.error("Unable to update tags:", error);
      await fetchLeadData();
      alert(error.message || "Unable to update tags");
    }
  };

  const getSelectedTeamName = (lead) => {
    const selectedUser =
      users.find((user) => String(user.id) === String(lead.teamId || "")) ||
      lead.team;

    return getUserName(selectedUser) || "Unassigned";
  };

  const renderTeamDropdown = (lead) => {
    const leadId = getLeadKey(lead);
    if (teamMenu?.leadId !== leadId) return null;

    const selectedTeamId = String(lead.teamId || "");

    return (
      <RoleUserDropdown
        role="SALES"
        mode="menu"
        value={selectedTeamId}
        searchPlaceholder="Search team..."
        includeUnassigned={true}
        unassignedLabel="Unassigned"
        autoFocus={true}
        onClose={() => setTeamMenu(null)}
        onChange={(userId) => handleTeamSelect(lead, userId)}
      />
    );
  };

  const selectedUntaggedCount = paginatedLeadData
    .filter((lead) => tableSelection.isSelected(getLeadKey(lead)) && getLastSourceInfo(lead).isUntagged)
    .length;

  const openTagModalForSingle = (lead) => {
    setActiveTargetLead(lead);
    setTagForm({
      fundingSource: "Channel Partner",
      channelPartnerId: "",
      channelPartner: "",
      channelPartnerReraId: "",
      teamId: "",
    });
    setIsConfirmedLock(false);
    setIsTagModalOpen(true);
  };

  const openTagModalForBulk = () => {
    setActiveTargetLead(null);
    setTagForm({
      fundingSource: "Channel Partner",
      channelPartnerId: "",
      channelPartner: "",
      channelPartnerReraId: "",
      teamId: "",
    });
    setIsConfirmedLock(false);
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
    if (!isConfirmedLock) {
      alert("Please confirm the permanent lock checkbox before proceeding.");
      return;
    }

    if (tagForm.fundingSource === "Channel Partner" && !tagForm.channelPartner) {
      alert("Please select a registered Channel Partner.");
      return;
    }

    const token = localStorage.getItem("authToken");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      setIsSubmittingTag(true);
      const isSingle = Boolean(activeTargetLead);
      const targetIds = isSingle
        ? [Number(getLeadKey(activeTargetLead))]
        : paginatedLeadData
            .filter((lead) => tableSelection.isSelected(getLeadKey(lead)) && getLastSourceInfo(lead).isUntagged)
            .map((l) => Number(getLeadKey(l)))
            .filter((id) => Number.isInteger(id) && id > 0);

      const url = isSingle
        ? `${API_URL}/leads/${getLeadKey(activeTargetLead)}/tag-source`
        : `${API_URL}/leads/bulk/tag-source`;

      const payload = isSingle
        ? {
            fundingSource: tagForm.fundingSource,
            channelPartner: tagForm.channelPartner || null,
            channelPartnerReraId: tagForm.channelPartnerReraId || null,
            teamId: tagForm.teamId ? Number(tagForm.teamId) : null,
          }
        : {
            ids: targetIds,
            fundingSource: tagForm.fundingSource,
            channelPartner: tagForm.channelPartner || null,
            channelPartnerReraId: tagForm.channelPartnerReraId || null,
            teamId: tagForm.teamId ? Number(tagForm.teamId) : null,
          };

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Failed to tag and release lead(s)");
      }

      setBulkMessage(
        isSingle
          ? `Lead #${getLeadKey(activeTargetLead)} source permanently locked to "${tagForm.fundingSource}" and released!`
          : `${result.processedCount || targetIds.length} leads tagged, locked, and released to calling queues!`
      );

      setIsTagModalOpen(false);
      if (!isSingle) tableSelection.clearSelection();
      await fetchLeadData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while tagging lead.");
    } finally {
      setIsSubmittingTag(false);
    }
  };

  return (
    <>
      <div  className="table-section fa-2x">
        {/* <p>{trashMode ? "Trash" : "Lead Data"}</p> */}
        {/* <label className="crm-table-search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search customer, project, unit..."
            aria-label="Search leads"
          />
         </label> */}

        <LeadTableToolbar
          searchValue={searchQuery}
          onSearch={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
            fetchLeadData(query);
          }}
          onRefresh={() => fetchLeadData(searchQuery)}
          onImport={() => navigate("/import-leads")}
          onExportAll={() => downloadLeadsCsv(leadData, "all-leads.csv")}
          onAddLead={() => {
            window.sessionStorage.removeItem("selectedLeadEdit");
            navigate("/add-lead", { state: { mode: "create" } });
          }}
        />
        {bulkMessage && <div className="bulk-lead-message success">{bulkMessage}</div>}
        {bulkError && <div className="bulk-lead-message error">{bulkError}</div>}
        {tableSelection.selectedCount > 0 && (
          <BulkActionToolbar
            count={tableSelection.selectedCount}
            entityLabel="leads"
            isDeleting={bulkBusy}
            onClear={() => {
              tableSelection.clearSelection();
              setBulkMessage("");
              setBulkError("");
            }}
            onDelete={() => setBulkAction(trashMode ? "permanent" : "trash")}
            deleteLabel={trashMode ? "Delete forever" : "Move selected to Bin"}
          />
        )}
        {trashMode && tableSelection.selectedCount > 0 && (
          <div className="bulk-secondary-actions">
            <button type="button" onClick={() => setBulkAction("restore")} disabled={bulkBusy}>
              Restore selected
            </button>
          </div>
        )}
        {!trashMode && tableSelection.selectedCount > 0 && selectedUntaggedCount > 0 && (
          <div className="bulk-secondary-actions" style={{ marginTop: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              className="btn btn-sm btn-warning d-inline-flex align-items-center gap-1"
              onClick={openTagModalForBulk}
              disabled={bulkBusy}
              style={{ padding: '6px 14px', borderRadius: '6px', fontWeight: 600, background: '#f59e0b', color: '#1e293b', border: '1px solid #d97706' }}
            >
              <FaTag size={12} /> Bulk Tag & Release ({selectedUntaggedCount} Untagged)
            </button>
          </div>
        )}

        <div className="table-responsive">
          <table border="1" cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: '8px', borderEndStartRadius: '8px' }}>
                <TableSelectionCheckbox
                  checked={tableSelection.allVisibleSelected}
                  indeterminate={tableSelection.isHeaderIndeterminate}
                  label="Select visible leads"
                  onChange={tableSelection.toggleVisible}
                  disabled={bulkBusy || paginatedLeadData.length === 0}
                />
              </th>
              <th>Sr. No</th>
              <th>Lead ID</th>
              <th>Name</th>
              <th>Last Source</th>
              <th>Stage</th>
              <th>Received On</th>
              <th>Requirement</th>
              <th>Team</th>
              <th style={{ borderStartEndRadius: '8px', borderEndEndRadius: '8px' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLeadData.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-state">
                  {searchQuery ? "No matching leads found" : trashMode ? "Trash is empty" : "No Data Available"}
                </td>
              </tr>
            ) : (
              paginatedLeadData.map((lead, i) => (
                <tr className={tableSelection.isSelected(getLeadKey(lead)) ? "selected" : ""} key={getLeadKey(lead) || i}>
                  <td>
                    <TableSelectionCheckbox
                      checked={tableSelection.isSelected(getLeadKey(lead))}
                      label={`Select lead ${getLeadKey(lead)}`}
                      onChange={() => tableSelection.toggleRow(getLeadKey(lead))}
                      disabled={bulkBusy}
                    />
                  </td>
                  <td style={{ color: '#64748b', fontWeight: 600, fontSize: '13px', width: '60px' }}>
                    {pageStartIndex + i + 1}
                  </td>
                  <td style={{ fontWeight: 700, color: '#1e293b' }}>
                    {getLeadId(lead) ? `#${getLeadId(lead)}` : '-'}
                  </td>
                  <td>
                    <div className="lead-name-main" style={{ fontSize: '14px' }}>{getLeadName(lead)}</div>
                    {/* <div className="lead-name-owner">{getLeadOwner(lead)}</div> */}
                  </td>
                  <td>
                    {(() => {
                      const { isLocked, isUntagged, source, cpName } = getLastSourceInfo(lead);
                      if (isUntagged) {
                        return (
                          <button
                            type="button"
                            onClick={() => openTagModalForSingle(lead)}
                            title="Untagged lead quarantined from callers — Click to tag source and release"
                            style={{
                              fontSize: '12px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#fef9c3',
                              color: '#92400e',
                              fontWeight: 600,
                              border: '1px solid #fde68a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></span>
                            Untagged (Tag Source)
                          </button>
                        );
                      }
                      return (
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            🔒 {source || 'Source Locked'}
                          </span>
                          {cpName && <span style={{ fontSize: '11px', color: '#64748b' }}>CP: {cpName}</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{getStage(lead)}</td>
                  <td>{renderReceivedOn(lead)}</td>
                  <td>{getRequirement(lead)}</td>
                  <td>
                    {trashMode ? (
                      getLeadOwner(lead)
                    ) : (() => {
                      const { isUntagged } = getLastSourceInfo(lead);
                      if (isUntagged) {
                        return (
                          <div
                            className="lead-team-quarantined"
                            title="Untagged lead is quarantined and cannot be assigned until source is tagged"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 9px',
                              borderRadius: '5px',
                              background: '#fffbeb',
                              border: '1px solid #fef3c7',
                              color: '#b45309',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'not-allowed',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{ fontSize: '11px' }}>🔒</span>
                            <span>Quarantined</span>
                          </div>
                        );
                      }
                      return (
                        <div className="lead-team-dropdown">
                          <button
                            type="button"
                            className="lead-team-select"
                            onClick={(event) => handleTeamMenuToggle(event, lead)}
                            disabled={isLoadingUsers}
                          >
                            <span>{isLoadingUsers ? "Loading users..." : getSelectedTeamName(lead)}</span>
                          </button>
                          {renderTeamDropdown(lead)}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="lead-action-cell">
                    <button
                      type="button"
                      className="lead-action-btn"
                      onClick={(event) => handleActionToggle(event, i)}
                      aria-label="Open lead actions"
                    >
                      <FaEllipsisV />
                    </button>

                    {openMenu === i && menuPosition && (
                      <div
                        className="lead-action-menu"
                        style={{
                          left: `${menuPosition.left}px`,
                          top: `${menuPosition.top}px`,
                        }}
                      >
                        {trashMode ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRestore(lead)}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePreview(lead)}
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(lead)}
                            >
                              Delete Forever
                            </button>
                          </>
                        ) : (
                          <>
                            {getLastSourceInfo(lead).isUntagged && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  setMenuPosition(null);
                                  openTagModalForSingle(lead);
                                }}
                                style={{ color: '#d97706', fontWeight: 600 }}
                              >
                                Tag Source & Release
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePreview(lead)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(lead)}
                            >
                              Edit
                            </button>
                            {/* <button
                              type="button"
                              onClick={() => handlePrint(lead)}
                            >
                              Print
                            </button> */}
                            <button
                              type="button"
                              onClick={() => handleDelete(lead)}
                            >
                              Move to Bin
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        {filteredLeadData.length > 0 && (
          <div className="lead-pagination">
            <div className="lead-pagination-info">
              Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{filteredLeadData.length}</strong> leads
            </div>
            <div className="lead-pagination-actions">
              <button
                type="button"
                className="lead-pagination-btn"
                onClick={() => {
                  setOpenMenu(null);
                  setMenuPosition(null);
                  setCurrentPage((page) => Math.max(1, page - 1));
                }}
                disabled={activePage === 1}
              >
                Previous
              </button>
              <span className="lead-pagination-page">
                {activePage} / {totalPages}
              </span>
              <button
                type="button"
                className="lead-pagination-btn"
                onClick={() => {
                  setOpenMenu(null);
                  setMenuPosition(null);
                  setCurrentPage((page) => Math.min(totalPages, page + 1));
                }}
                disabled={activePage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {bulkAction && (
          <BulkDeleteConfirmation
            count={tableSelection.selectedCount}
            entityLabel="leads"
            isDeleting={bulkBusy}
              confirmLabel={bulkAction === "restore" ? "Restore selected" : bulkAction === "permanent" ? "Permanently delete" : "Move selected to Bin"}
            title={
              bulkAction === "restore"
                ? `Restore ${getBulkEntityText("lead")}?`
                : bulkAction === "permanent"
                  ? `Permanently delete ${getBulkEntityText("lead")}?`
                  : `Delete ${getBulkEntityText("lead")}?`
            }
            message={
              bulkAction === "restore"
                ? "The selected leads will return to active leads."
                : bulkAction === "permanent"
                  ? "This action cannot be undone. Leads with confirmed bookings or protected financial records will be skipped."
                  : "The selected leads will be moved to Trash and removed from active dashboard totals."
            }
            names={paginatedLeadData.filter((lead) => tableSelection.isSelected(getLeadKey(lead))).map(getLeadName)}
            onCancel={() => setBulkAction(null)}
            onConfirm={runBulkLeadAction}
          />
        )}
      </div>

      {/* In-table Source Tagging & Hard Lock Modal */}
      {isTagModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1055, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ width: "90%", maxWidth: "650px", margin: "auto" }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: "12px", overflow: "hidden" }}>
              <div className="modal-header text-white" style={{ background: "#2563eb", padding: "16px 20px" }}>
                <h5 className="modal-title d-flex align-items-center gap-2" style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#fff" }}>
                  <FaLock />
                  {activeTargetLead
                    ? `Tag Source & Release Lead #${getLeadKey(activeTargetLead)} (${getLeadName(activeTargetLead)})`
                    : `Bulk Tag & Release ${selectedUntaggedCount || tableSelection.selectedCount} Leads`}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsTagModalOpen(false)}
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              </div>

              <form onSubmit={handleSubmitTagRelease}>
                <div className="modal-body p-4" style={{ background: "#ffffff" }}>
                  <div
                    className="alert alert-warning d-flex align-items-start gap-2 mb-3"
                    style={{ fontSize: "13px", padding: "12px 14px", background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: "8px" }}
                  >
                    <FaExclamationTriangle className="mt-1 flex-shrink-0" size={16} />
                    <div>
                      <strong>Permanent Lock Rule:</strong> Once source attribution is saved, it is{" "}
                      <strong>permanently immutable for the life of the lead</strong> (hard lock, no override by anyone including Admin).
                    </div>
                  </div>

                  {activeTargetLead && (
                    <div className="p-3 mb-3 bg-light rounded border" style={{ fontSize: "13.5px" }}>
                      <strong>Lead:</strong> {getLeadName(activeTargetLead)} | <strong>Phone:</strong>{" "}
                      {activeTargetLead.phones?.[0]?.value || activeTargetLead.phone || "-"}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-bold" style={{ fontSize: "13px", color: "#334155" }}>Select Source Category *</label>
                    <select
                      className="form-select"
                      value={tagForm.fundingSource}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      required
                      style={{ height: "42px", borderRadius: "6px" }}
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
                        <label className="form-label fw-bold" style={{ fontSize: "13px", color: "#334155" }}>Select Registered Channel Partner *</label>
                        <select
                          className="form-select"
                          value={tagForm.channelPartnerId}
                          onChange={(e) => handleCPChange(e.target.value)}
                          required
                          style={{ height: "42px", borderRadius: "6px" }}
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
                        <label className="form-label fw-bold" style={{ fontSize: "13px", color: "#334155" }}>Auto CP RERA ID (Read-only)</label>
                        <input
                          type="text"
                          className="form-control bg-white"
                          value={tagForm.channelPartnerReraId ? `RERA: ${tagForm.channelPartnerReraId}` : "Auto from CP master"}
                          readOnly
                          style={{ height: "42px", borderRadius: "6px", fontWeight: "600", color: "#475569" }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-bold" style={{ fontSize: "13px", color: "#334155" }}>Assign Telecaller / Sales Executive (Optional)</label>
                    <select
                      className="form-select"
                      value={tagForm.teamId}
                      onChange={(e) => setTagForm((prev) => ({ ...prev, teamId: e.target.value }))}
                      style={{ height: "42px", borderRadius: "6px" }}
                    >
                      <option value="">Leave Unassigned / Round-Robin</option>
                      {telecallers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getUserName(user)} ({user.role})
                        </option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-1">
                      Once released, the lead becomes visible in the selected caller's queue.
                    </small>
                  </div>

                  {/* Deliberate Confirmation Checkbox */}
                  <div className="p-3 bg-danger-subtle rounded border border-danger" style={{ background: "#fee2e2", borderColor: "#fca5a5" }}>
                    <div className="form-check d-flex align-items-start gap-2">
                      <input
                        className="form-check-input mt-1"
                        type="checkbox"
                        id="permanentLockConfirmInTable"
                        checked={isConfirmedLock}
                        onChange={(e) => setIsConfirmedLock(e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }}
                      />
                      <label
                        className="form-check-label fw-bold text-danger"
                        htmlFor="permanentLockConfirmInTable"
                        style={{ fontSize: "13px", cursor: "pointer" }}
                      >
                        I understand this source tag is PERMANENT and will be LOCKED FOREVER. It cannot be altered or reverted by any user or administrator.
                      </label>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light" style={{ padding: "14px 20px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsTagModalOpen(false)}
                    disabled={isSubmittingTag}
                    style={{ padding: "7px 16px", borderRadius: "6px", fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger d-flex align-items-center gap-2"
                    disabled={!isConfirmedLock || isSubmittingTag}
                    style={{ padding: "7px 18px", borderRadius: "6px", fontWeight: 600 }}
                  >
                    <FaLock /> {isSubmittingTag ? "Locking & Releasing..." : "Confirm & Lock Permanently"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentHistoryOne;
