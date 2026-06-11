import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaEllipsisV } from "react-icons/fa";

const PaymentHistoryOne = ({ trashMode = false }) => {
  const [leadData, setLeadData] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  const fetchLeadData = useCallback(async () => {
    try {
      const response = await fetch(listUrl);
      const result = await response.json();
      setLeadData(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }, [listUrl]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  useEffect(() => {
    if (location.state?.refreshLeads) {
      fetchLeadData();
    }
  }, [fetchLeadData, location.state?.refreshLeads]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error("Unable to load users");
        const result = await response.json();
        const userList = Array.isArray(result) ? result : result?.data || result?.users || [];
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [API_URL]);

  const getLeadName = useCallback((lead) => {
    const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    return lead.name || fullName || "-";
  }, []);

  const getLeadId = useCallback((lead) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    return leadId ? ` ${leadId}` : "-";
  }, []);

  const getLeadOwner = useCallback((lead) => {
    return lead.owner || lead.sales || getUserName(lead.team) || "Unassigned";
  }, [getUserName]);

  const getLastSource = useCallback((lead) => {
    return lead.source || lead.channelPartner || lead.tags || "-";
  }, []);

  const getStage = useCallback((lead) => {
    const stage = lead.lead_status || lead.status || lead.stage || "New";
    return String(stage).replace(/_/g, " ");
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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return getSearchText(lead).includes(query);
  });
  const totalPages = Math.max(1, Math.ceil(filteredLeadData.length / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * recordsPerPage;
  const paginatedLeadData = filteredLeadData.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const pageEndIndex = Math.min(pageStartIndex + paginatedLeadData.length, filteredLeadData.length);

  useEffect(() => {
    setCurrentPage(1);
    setOpenMenu(null);
    setMenuPosition(null);
  }, [leadData, searchQuery, trashMode]);

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
      ["id", "Lead ID"],
      ["name", "Name"],
      ["owner", "Owner"],
      ["source", "Last Source"],
      ["stage", "Stage"],
      ["receivedOn", "Received On"],
      ["requirement", "Requirement"],
      ["tags", "Tags"],
    ];

    const rows = leads.map((lead) => ({
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
    if (!window.confirm("Move this lead to trash?")) return;

    setOpenMenu(null);
    setMenuPosition(null);

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Unable to delete lead");
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
      const response = await fetch(`${API_URL}/leads/${leadId}/permanent`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Unable to permanently delete lead");
      setLeadData((current) =>
        current.filter((item) => (item.id || item._id || item.lead_id) !== leadId)
      );
    } catch (error) {
      console.error("Unable to permanently delete lead:", error);
      alert(error.message || "Unable to permanently delete lead");
    }
  };

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
    const leadId = lead.id || lead._id || lead.lead_id;
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

  return (
    <>
      <style>{`
        .table-section {
          padding: 20px;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .table-section p {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 15px;
        }

        .table-section table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

     
        
        

        .table-section table thead th {
          background: #487fff !important;
          padding: 14px 15px;
          text-align: left;
          color: #ffffff !important;      
          white-space: nowrap;      
          
        }

        .table-section table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: background 0.2s;
        }

        .table-section table tbody tr:hover {
          background: #f1f5f9;
        }

        .table-section table tbody td {
          padding: 12px 15px;
          color: #334155;
          font-size: 14px;
          position: relative;
          vertical-align: middle;
        }

        .lead-name-main {
          color: #000000;
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 3px;
        }

        .lead-name-owner,
        .lead-received-time {
          color: #7b8491;
          font-size: 13px;
        }

        .lead-tags-cell {
          max-width: 360px;
          min-width: 180px;
        }

        .lead-tags-input {
          width: 100%;
          min-width: 160px;
          height: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          color: #334155;
          padding: 0 10px;
        }

        .lead-tags-input:focus {
          border-color: #487fff;
          box-shadow: 0 0 0 3px rgba(72, 127, 255, 0.12);
          outline: none;
        }

        .lead-team-select {
          min-width: 180px;
          height: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          color: #334155;
          padding: 0 10px;
        }

        .lead-action-cell {
          overflow: visible;
          position: relative;
        }

        .lead-action-btn {
          width: 32px;
          height: 32px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #ffffff;
          color: #475569;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .lead-action-menu {
          position: fixed;
          min-width: 142px;
          width: 182px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
          display: flex;
          flex-direction: column;
          overflow: visible;
          z-index: 9999;
        }

        .lead-action-menu button {
          width: 100%;
          border: 0;
          background: #ffffff;
          padding: 12px 14px;
          text-align: left;
          color: #334155;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.2;
        }

        .lead-action-menu button:hover {
          background: #f8fafc;
        }

        .lead-action-menu button + button {
          border-top: 1px solid #e2e8f0;
        }

        .lead-pagination {
          align-items: center;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          margin-top: 8px;
          padding-top: 16px;
        }

        .lead-pagination-info {
          color: #64748b;
          font-size: 13px;
        }

        .lead-pagination-info strong {
          color: #334155;
          font-weight: 600;
        }

        .lead-pagination-actions {
          align-items: center;
          display: flex;
          gap: 8px;
        }

        .lead-pagination-btn {
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          font-size: 14px;
          font-weight: 500;
          height: 36px;
          justify-content: center;
          min-width: 88px;
          padding: 0 14px;
        }

        .lead-pagination-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .lead-pagination-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .lead-pagination-page {
          align-items: center;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          color: #1d4ed8;
          display: inline-flex;
          font-size: 13px;
          font-weight: 600;
          height: 36px;
          justify-content: center;
          min-width: 78px;
          padding: 0 12px;
        }

        .table-section table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .table-section table tbody tr:nth-child(even):hover {
          background: #f1f5f9;
        }

        .table-section .empty-state {
          text-align: center;
          color: #94a3b8;
          padding: 30px;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .table-section {
            overflow-x: auto;
          }

          .table-section table {
            min-width: 600px;
          }

          .lead-pagination {
            align-items: stretch;
            flex-direction: column;
          }

          .lead-pagination-actions {
            justify-content: space-between;
          }

          .lead-pagination-btn {
            flex: 1;
          }
        }
      `}</style>

      <div  className="table-section fa-2x">
        <p>{trashMode ? "Trash" : "Lead Data"}</p>

        <table border="1" cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: '8px', borderEndStartRadius: '8px' }}>Lead ID</th>
              <th>Name</th>
              <th>Last Source</th>
              <th>Stage</th>
              <th>Received On</th>
              <th>Requirement</th>
              <th>Team</th>
              <th>Tags</th>
              <th style={{ borderStartEndRadius: '8px', borderEndEndRadius: '8px' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLeadData.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">
                  {searchQuery ? "No matching leads found" : trashMode ? "Trash is empty" : "No Data Available"}
                </td>
              </tr>
            ) : (
              paginatedLeadData.map((lead, i) => (
                <tr key={i}>
                  <td>{getLeadId(lead)}</td>
                  <td>
                    <div className="lead-name-main" style={{ fontSize: '14px' }}>{getLeadName(lead)}</div>
                    {/* <div className="lead-name-owner">{getLeadOwner(lead)}</div> */}
                  </td>
                  <td>{getLastSource(lead)}</td>
                  <td>{getStage(lead)}</td>
                  <td>{renderReceivedOn(lead)}</td>
                  <td>{getRequirement(lead)}</td>
                  <td>
                    {trashMode ? (
                      getLeadOwner(lead)
                    ) : (
                      <select
                        className="lead-team-select"
                        value={lead.teamId || ""}
                        onChange={(event) => handleTeamChange(lead, event.target.value)}
                        disabled={isLoadingUsers}
                      >
                        <option value="">
                          {isLoadingUsers ? "Loading users..." : "Unassigned"}
                        </option>
                        {users.map((user) => (
                          <option key={user.id || user.email} value={user.id}>
                            {getUserName(user)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="lead-tags-cell" title={lead.tags || ""}>
                    <input
                      type="text"
                      className="lead-tags-input"
                      value={lead.tags || ""}
                      onChange={(event) => handleTagsChange(lead, event.target.value)}
                      onBlur={(event) => handleTagsSave(lead, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      placeholder="Tags"
                      disabled={trashMode}
                    />
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
                              Delete
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
      </div>
    </>
  );
};

export default PaymentHistoryOne;
