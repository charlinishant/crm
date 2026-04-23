import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const PaymentHistoryOne = () => {
  const [leadData, setLeadData] = useState([]);

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        const response = await fetch("http://localhost:5000/leads/");
        const result = await response.json(); // directly parse JSON
        setLeadData(result);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };

    fetchLeadData();
  }, []); // runs only once on component mount

  return (
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
              <td colSpan="5" style={{ textAlign: "center" }}>
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
  );
};

export default PaymentHistoryOne;