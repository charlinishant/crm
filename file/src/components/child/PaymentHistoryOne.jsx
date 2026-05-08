import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV } from "react-icons/fa";

const PaymentHistoryOne = () => {
  const [leadData, setLeadData] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : "");

  const fetchLeadData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/leads/`);
      const result = await response.json();
      setLeadData(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

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

  const getLeadName = (lead) => {
    const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    return lead.name || fullName || "-";
  };

  const getLeadId = (lead) => {
    const leadId = lead.id || lead._id || lead.lead_id;
    return leadId ? `# ${leadId}` : "-";
  };

  const getLeadOwner = (lead) => {
    return lead.owner || lead.sales || getUserName(lead.team) || "Unassigned";
  };

  const getLastSource = (lead) => {
    return lead.source || lead.channelPartner || lead.tags || "-";
  };

  const getStage = (lead) => {
    return lead.lead_status || lead.status || lead.stage || "New";
  };

  const getReceivedOn = (lead) => {
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
  };

  const getRequirement = (lead) => {
    return lead.requirementComment || lead.configration || lead.configuration || lead.propertyType || lead.type || "-";
  };

  const getTags = (lead) => {
    return lead.tags || lead.source || "-";
  };

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
    const leadId = lead.id || lead._id || lead.lead_id || "";
    setOpenMenu(null);
    setMenuPosition(null);
    navigate(leadId ? `/preview?leadId=${leadId}` : "/preview", { state: { lead } });
  };

  const handleDetails = (lead) => {
    window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
    const leadId = lead.id || lead._id || lead.lead_id || "";
    setOpenMenu(null);
    setMenuPosition(null);
    navigate(leadId ? `/details?leadId=${leadId}` : "/details", { state: { lead } });
  };

  const formatValue = (value) => {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
      if (value.length === 0) return "-";
      return value
        .map((item) => {
          if (typeof item !== "object" || item === null) return String(item);
          return Object.entries(item)
            .filter(([key]) => !["id", "leadId"].includes(key))
            .map(([key, itemValue]) => `${key}: ${formatValue(itemValue)}`)
            .join(", ");
        })
        .join(" | ");
    }
    if (typeof value === "object") {
      return Object.entries(value)
        .map(([key, itemValue]) => `${key}: ${formatValue(itemValue)}`)
        .join(", ");
    }
    return String(value);
  };

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

  return (
    <>
      <style>{`
        /* ============================================
           TABLE SECTION
        ============================================ */
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

        /* ============================================
           TABLE BASE
        ============================================ */
        .table-section table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        /* ============================================
           HEADER
        ============================================ */
        .table-section table thead tr {
          background: #e9edf2;
        }

        .table-section table thead th {
          padding: 14px 15px;
          text-align: left;
          color: #405064;
          font-weight: 500;
          font-size: 12px;
          white-space: nowrap;
          text-transform: uppercase;
        }

        /* ============================================
           BODY ROWS
        ============================================ */
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        /* ============================================
           ZEBRA STRIPING
        ============================================ */
        .table-section table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .table-section table tbody tr:nth-child(even):hover {
          background: #f1f5f9;
        }

        /* ============================================
           EMPTY STATE
        ============================================ */
        .table-section .empty-state {
          text-align: center;
          color: #94a3b8;
          padding: 30px;
          font-size: 14px;
        }

        /* ============================================
           RESPONSIVE
        ============================================ */
        @media (max-width: 768px) {
          .table-section {
            overflow-x: auto;
          }

          .table-section table {
            min-width: 600px;
          }
        }
      `}</style>

      <div className="table-section">
        <p>Lead Data</p>

        <table>
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Name</th>
              <th>Last Source</th>
              <th>Stage</th>
              <th>Received On</th>
              <th>Requirement</th>
              <th>Team</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {leadData.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">
                  No Data Available
                </td>
              </tr>
            ) : (
              leadData.map((lead, i) => (
                <tr key={i}>
                  <td>{getLeadId(lead)}</td>
                  <td>
                    <div className="lead-name-main">{getLeadName(lead)}</div>
                    <div className="lead-name-owner">{getLeadOwner(lead)}</div>
                  </td>
                  <td>{getLastSource(lead)}</td>
                  <td>{getStage(lead)}</td>
                  <td>{renderReceivedOn(lead)}</td>
                  <td>{getRequirement(lead)}</td>
                  <td>
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
                  </td>
                  <td className="lead-tags-cell" title={getTags(lead)}>{getTags(lead)}</td>
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
                        <button
                          type="button"
                          onClick={() => handlePreview(lead)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDetails(lead)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(lead)}
                        >
                          Print
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PaymentHistoryOne;
