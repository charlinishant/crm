import { Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";

const Units = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/unit?limit=100`);
        if (!response.ok) {
          throw new Error("Unable to fetch units");
        }

        const json = await response.json();
        const unitGroups = Array.isArray(json) ? json : json?.data ?? [];
        const mapped = unitGroups.flatMap((group) =>
          (group.unitList || []).map((unit) => ({
            id: unit.id,
            price: unit.basePrice ?? "-",
            unitIndex: unit.unitIndex ?? "-",
            tower: group.tower?.name || "-",
            config: group.floor?.name || "-",
            project: group.project?.name || "-",
            bedrooms: group.bedrooms ?? "-",
            bathrooms: group.bathrooms ?? "-",
            saleable: group.saleable
              ? `${group.saleable} ${group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
              : "-",
            carpet: group.carpet
              ? `${group.carpet} ${group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
              : "-",
            facing: "-",
            leads: "-",
            updated: "-",
          }))
        );

        setData(mapped);
        setTotalItems(json?.totalItems ?? mapped.length);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load units");
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [API_URL]);

  return (
    <MasterLayout>
      <div style={{ padding: "20px", background: "#f8f9fb" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px"
        }}>
          <span>{totalItems} items.</span>

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
                ].map((head) => (
                  <th key={head} style={{
                    padding: "12px",
                    textAlign: "left",
                    borderBottom: "1px solid #eee"
                  }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" style={{ ...cell, textAlign: "center" }}>
                    Loading units...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="13" style={{ ...cell, textAlign: "center", color: "#dc3545" }}>
                    {error}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ ...cell, textAlign: "center" }}>
                    No units found.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
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
                    <td style={cell}>...</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MasterLayout>
  );
};

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
