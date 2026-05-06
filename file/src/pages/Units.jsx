import { Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import "./Units.css";

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
      <div className="floor-dashboard">
        <div className="floor-card">
          {/* Header Section */}
          <div className="floor-header d-flex justify-content-between align-items-center">
            <div className="item-count">
              <span>{totalItems} items.</span>
            </div>

            <div className="action-wrapper">
              <Link to="/add-units" style={{ textDecoration: "none" }}>
                <button className="btn-new-plan">+ New Unit</button>
              </Link>
            </div>
          </div>

          {/* Table Section */}
          <div className="table-responsive">
            <table className="floor-table">
              <thead>
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
                    "ACTIONS",
                  ].map((head) => (
                    <th key={head}>{head}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="13" className="text-center py-4">
                      Loading units...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="13" className="text-center text-danger py-4">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="text-center py-4">
                      No units found.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold">{item.price}</td>
                      <td>{item.unitIndex}</td>
                      <td className="text-muted">{item.tower}</td>
                      <td>{item.config}</td>
                      <td className="text-muted">{item.project}</td>
                      <td>{item.bedrooms}</td>
                      <td>{item.bathrooms}</td>
                      <td>{item.saleable}</td>
                      <td>{item.carpet}</td>
                      <td>{item.facing}</td>
                      <td>
                        {item.leads}
                        <span className="info-icon" title="View Lead Information">
                          i
                        </span>
                      </td>
                      <td>{item.updated}</td>
                      <td className="text-right">...</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default Units;