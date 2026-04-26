import { useState, useEffect } from "react";

const PaymentHistoryOne = () => {
  const [leadData, setLeadData] = useState([]);

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
            </tr>
          </thead>

          <tbody>
            {leadData.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
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