import { Link } from "react-router-dom";
import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";

const Units = () => {
  const data = [
    {
      price: "900",
      unitIndex: 0,
      tower: "TOWER D",
      config: "3 BHK (2165)",
      project: "Binghatti Hills",
      bedrooms: 3,
      bathrooms: 0,
      saleable: "2,500 Sq. Ft.",
      carpet: "1,400 Sq. Ft.",
      facing: 1,
      leads: 1,
      updated: "04/03/2026 05:22 PM",
    },
    {
      price: "925",
      unitIndex: 0,
      tower: "TOWER D",
      config: "3 BHK (2490)",
      project: "Binghatti Hills",
      bedrooms: 3,
      bathrooms: 3,
      saleable: "2,490 Sq. Ft.",
      carpet: "1,526 Sq. Ft.",
      facing: 4,
      leads: 4,
      updated: "20/04/2026 03:57 PM",
    },
    {
      price: "462.5",
      unitIndex: 0,
      tower: "TOWER D",
      config: "3 BHK (1725)",
      project: "Binghatti Hills",
      bedrooms: 3,
      bathrooms: 3,
      saleable: "1,725 Sq. Ft.",
      carpet: "1,132 Sq. Ft.",
      facing: 3,
      leads: 3,
      updated: "30/03/2026 04:20 PM",
    },
  ];

  return (
    <MasterLayout>
      <div style={{ padding: "20px", background: "#f8f9fb" }}>
        
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px"
        }}>
          <span>450 items.</span>



<Link to="/add-units">
  <button
    style={{
      background: "#6c5ce7",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: "6px",
      cursor: "pointer"
    }}
  >
    + New Unit
  </button>
</Link>
        </div>

        {/* Table */}
        <div style={{
          background: "#fff",
          borderRadius: "8px",
          overflowX: "auto"
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px"
          }}>
            
            {/* Table Head */}
            <thead style={{ background: "#f1f3f5" }}>
              <tr>
                {[
                  "LIVE PRICE",
                  "UNIT INDEX",
                  "PROJECT TOWER",
                  "UNIT CONFIG",
                  "PROJECT NAME",
                  "BEDROOMS",
                  "BATHROOMS",
                  "SALEABLE AREA",
                  "CARPET AREA",
                  "FACING",
                  "LEADS",
                  "UPDATED",
                  "ACTIONS"
                ].map((head, i) => (
                  <th key={i} style={{
                    padding: "12px",
                    textAlign: "left",
                    borderBottom: "1px solid #eee"
                  }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {data.map((item, index) => (
                <tr key={index} style={{
                  borderBottom: "1px solid #eee"
                }}>
                  <td style={cell}>{item.price}</td>
                  <td style={cell}>{item.unitIndex}</td>
                  <td style={cell}>{item.tower}</td>
                  <td style={cell}>{item.config}</td>
                  <td style={cell}>{item.project}</td>
                  <td style={cell}>{item.bedrooms}</td>
                  <td style={cell}>{item.bathrooms}</td>
                  <td style={cell}>{item.saleable}</td>
                  <td style={cell}>{item.carpet}</td>
                  <td style={cell}>{item.facing}</td>
                  <td style={cell}>
                    {item.leads}
                    <span style={infoIcon}>i</span>
                  </td>
                  <td style={cell}>{item.updated}</td>
                  <td style={cell}>⋮</td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </MasterLayout>
  );
};

// Reusable styles
const cell = {
  padding: "12px",
  textAlign: "left"
};

const infoIcon = {
  display: "inline-block",
  marginLeft: "6px",
  width: "16px",
  height: "16px",
  background: "#ddd",
  borderRadius: "50%",
  textAlign: "center",
  fontSize: "12px",
  lineHeight: "16px",
  cursor: "pointer"
};

export default Units;