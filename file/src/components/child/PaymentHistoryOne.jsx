import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV } from "react-icons/fa";

const PaymentHistoryOne = () => {
  const [leadData, setLeadData] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        const response = await fetch("http://localhost:5000/leads/");
        const result = await response.json();
        console.log("API Response:", result);
        setLeadData(result);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };

    fetchLeadData();
  }, []);

  const handlePreview = (lead) => {
    window.sessionStorage.setItem("selectedLeadPreview", JSON.stringify(lead));
    const leadId = lead.id || lead._id || lead.lead_id || "";
    navigate(leadId ? `/preview?leadId=${leadId}` : "/preview", { state: { lead } });
  };

  const handleDetails = (lead) => {
    window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
    const leadId = lead.id || lead._id || lead.lead_id || "";
    navigate(leadId ? `/details?leadId=${leadId}` : "/details", { state: { lead } });
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
          background: #2563eb;
        }

        .table-section table thead th {
          padding: 12px 15px;
          text-align: left;
          color: #ffffff;
          font-weight: 600;
          font-size: 13px;
          white-space: nowrap;
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
          position: absolute;
          right: 14px;
          top: 42px;
          min-width: 128px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
          z-index: 10;
          overflow: hidden;
        }

        .lead-action-menu button {
          width: 100%;
          border: 0;
          background: #ffffff;
          padding: 10px 12px;
          text-align: left;
          color: #334155;
          cursor: pointer;
          font-size: 14px;
        }

        .lead-action-menu button:hover {
          background: #f8fafc;
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
              <th>Name</th>
              <th>Lead Status</th>
              <th>Source</th>
              <th>City</th>
              <th>Budget</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {leadData.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No Data Available
                </td>
              </tr>
            ) : (
              leadData.map((lead, i) => (
                <tr key={i}>
                  <td>{lead.name || "-"}</td>
                  <td>{lead.lead_status || "-"}</td>
                  <td>{lead.source || "-"}</td>
                  <td>{lead.city || "-"}</td>
                  <td>{lead.budget || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="lead-action-btn"
                      onClick={() => setOpenMenu(openMenu === i ? null : i)}
                      aria-label="Open lead actions"
                    >
                      <FaEllipsisV />
                    </button>

                    {openMenu === i && (
                      <div className="lead-action-menu">
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
