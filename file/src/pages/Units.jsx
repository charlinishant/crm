import { Link } from "react-router-dom";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import { FaEllipsisV } from "react-icons/fa";

const emptyEditForm = {
  name: "",
  floor: "",
  unitIndex: "",
  baseRate: "",
  basePrice: "",
  propertyPurpose: "",
};

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const getRateBasisArea = (unit) => {
  if (unit?.rateBasis === "On Built-up") return toNumberOrNull(unit.builtupArea) || 0;
  if (unit?.rateBasis === "On Saleable") return toNumberOrNull(unit.saleableValue) || 0;
  return toNumberOrNull(unit?.carpetValue) || 0;
};

const calculateBasePrice = (baseRate, unit) => {
  const rate = toNumberOrNull(baseRate) || 0;
  const area = getRateBasisArea(unit);
  if (!rate || !area) return 0;
  return Number((rate * area).toFixed(2));
};

const Units = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openActionId, setOpenActionId] = useState(null);
  const [modalMode, setModalMode] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUnits = useCallback(async () => {
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
          groupId: group.id,
          name: unit.name || "-",
          floor: unit.floor ?? "-",
          baseRate: unit.baseRate ?? "",
          propertyPurpose: unit.propertyPurpose || "",
          unitIndex: unit.unitIndex ?? "-",
          tower: group.tower?.name || "-",
          config: group.floor?.name || "-",
          project: group.project?.name || "-",
          bedrooms: group.bedrooms ?? "-",
          bathrooms: group.bathrooms ?? "-",
          rateBasis: group.floor?.rateBasis || "On Carpet",
          builtupArea: group.floor?.builtupArea ?? "",
          saleableValue: group.saleable || group.floor?.saleable || "",
          carpetValue: group.carpet || group.floor?.carpet || "",
          saleable: group.saleable || group.floor?.saleable
            ? `${group.saleable || group.floor?.saleable} ${group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
            : "-",
          carpet: group.carpet || group.floor?.carpet
            ? `${group.carpet || group.floor?.carpet} ${group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
            : "-",
          facing: "-",
          leads: "-",
          updated: "-",
        }))
      );
      mapped.forEach((unit) => {
        unit.basePrice = calculateBasePrice(unit.baseRate, unit);
        unit.price = unit.basePrice || "-";
      });

      setData(mapped);
      setTotalItems(json?.totalItems ?? mapped.length);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load units");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;

    return data.filter((unit) =>
      [
        unit.price,
        unit.unitIndex,
        unit.tower,
        unit.config,
        unit.project,
        unit.bedrooms,
        unit.bathrooms,
        unit.saleable,
        unit.carpet,
        unit.facing,
        unit.leads,
        unit.updated,
        unit.name,
        unit.floor,
        unit.propertyPurpose,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  const closeModal = () => {
    if (saving) return;
    setModalMode("");
    setSelectedUnit(null);
    setEditForm(emptyEditForm);
  };

  const openViewUnit = (unit) => {
    setOpenActionId(null);
    setSelectedUnit(unit);
    setModalMode("view");
  };

  const openEditUnit = (unit) => {
    setOpenActionId(null);
    setSelectedUnit(unit);
    setEditForm({
      name: unit.name === "-" ? "" : unit.name,
      floor: unit.floor === "-" ? "" : unit.floor,
      unitIndex: unit.unitIndex === "-" ? "" : unit.unitIndex,
      baseRate: unit.baseRate ?? "",
      basePrice: calculateBasePrice(unit.baseRate, unit) || "",
      propertyPurpose: unit.propertyPurpose || "",
    });
    setModalMode("edit");
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "baseRate") {
        next.basePrice = calculateBasePrice(value, selectedUnit) || "";
      }
      return next;
    });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUnit?.id) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/unit/item/${selectedUnit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          floor: toNumberOrNull(editForm.floor),
          unitIndex: toNumberOrNull(editForm.unitIndex),
          baseRate: toNumberOrNull(editForm.baseRate),
          basePrice: calculateBasePrice(editForm.baseRate, selectedUnit),
          propertyPurpose: editForm.propertyPurpose,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update unit");

      await fetchUnits();
      closeModal();
      window.alert("Unit updated successfully!");
    } catch (err) {
      alert(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unit) => {
    setOpenActionId(null);
    const confirmDelete = window.confirm(`Delete unit ${unit.name || unit.unitIndex}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/unit/item/${unit.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Delete failed");

      alert("Deleted Successfully");
      fetchUnits();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <MasterLayout>
      <div className="floor-dashboard">
        <style>{unitStyles}</style>
        <div className="floor-card">
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

          <div className="table-responsive">
            <label className="crm-table-search">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search unit..."
                aria-label="Search units"
              />
            </label>
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
                    <td colSpan="13" className="floor-empty">Loading units...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="13" className="floor-empty text-danger">{error}</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="floor-empty">{searchQuery ? "No matching units found." : "No units found."}</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
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
                        <span className="info-icon" title="View Lead Information">i</span>
                      </td>
                      <td>{item.updated}</td>
                      <td className="unit-actions-cell">
                        <button
                          className="unit-actions-menu-btn"
                          type="button"
                          onClick={() => setOpenActionId((current) => (current === item.id ? null : item.id))}
                          aria-label={`Actions for ${item.name}`}
                        >
                          <FaEllipsisV />
                        </button>

                        {openActionId === item.id && (
                          <div className="unit-actions-dropdown">
                            <button type="button" onClick={() => openEditUnit(item)}>Edit</button>
                            <button type="button" onClick={() => openViewUnit(item)}>View</button>
                            <button type="button" className="danger" onClick={() => handleDelete(item)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalMode === "view" && selectedUnit && (
          <UnitViewModal unit={selectedUnit} onClose={closeModal} />
        )}

        {modalMode === "edit" && selectedUnit && (
          <UnitEditModal
            form={editForm}
            saving={saving}
            onChange={handleEditChange}
            onClose={closeModal}
            onSubmit={handleEditSubmit}
          />
        )}
      </div>
    </MasterLayout>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </div>
);

const UnitViewModal = ({ unit, onClose }) => (
  <div className="unit-modal-backdrop">
    <section className="unit-modal" role="dialog" aria-modal="true" aria-labelledby="unit-view-title">
      <div className="unit-modal-head">
        <div>
          <h2 id="unit-view-title">{unit.name}</h2>
          <p>Unit details</p>
        </div>
        <button type="button" className="unit-modal-close" onClick={onClose}>x</button>
      </div>

      <div className="unit-detail-grid">
        <Detail label="Unit Index" value={unit.unitIndex} />
        <Detail label="Floor" value={unit.floor} />
        <Detail label="Project" value={unit.project} />
        <Detail label="Tower" value={unit.tower} />
        <Detail label="Unit Config" value={unit.config} />
        <Detail label="Live Price" value={unit.price} />
        <Detail label="Base Rate" value={unit.baseRate} />
        <Detail label="Rate Basis" value={unit.rateBasis} />
        <Detail label="Bedrooms" value={unit.bedrooms} />
        <Detail label="Bathrooms" value={unit.bathrooms} />
        <Detail label="Saleable Area" value={unit.saleable} />
        <Detail label="Carpet Area" value={unit.carpet} />
        <Detail label="Purpose" value={unit.propertyPurpose} />
      </div>
    </section>
  </div>
);

const UnitEditModal = ({ form, saving, onChange, onClose, onSubmit }) => (
  <div className="unit-modal-backdrop">
    <section className="unit-modal" role="dialog" aria-modal="true" aria-labelledby="unit-edit-title">
      <div className="unit-modal-head">
        <div>
          <h2 id="unit-edit-title">Edit Unit</h2>
          <p>Update unit details</p>
        </div>
        <button type="button" className="unit-modal-close" onClick={onClose} disabled={saving}>x</button>
      </div>

      <form className="unit-edit-form" onSubmit={onSubmit}>
        <label>
          <span>Name *</span>
          <input name="name" value={form.name} onChange={onChange} required />
        </label>
        <label>
          <span>Floor</span>
          <input name="floor" type="number" value={form.floor} onChange={onChange} />
        </label>
        <label>
          <span>Unit Index</span>
          <input name="unitIndex" type="number" value={form.unitIndex} onChange={onChange} />
        </label>
        <label>
          <span>Base Rate</span>
          <input name="baseRate" type="number" value={form.baseRate} onChange={onChange} />
        </label>
        <label>
          <span>Base Price</span>
          <input name="basePrice" type="number" value={form.basePrice} readOnly />
        </label>
        <label>
          <span>Purpose</span>
          <input name="propertyPurpose" value={form.propertyPurpose} onChange={onChange} />
        </label>

        <div className="unit-modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  </div>
);

const unitStyles = `
  .unit-actions-cell {
    overflow: visible;
    position: relative;
    text-align: center;
  }

  .unit-actions-menu-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .unit-actions-menu-btn svg {
    height: 14px;
    width: 14px;
  }

  .unit-actions-dropdown {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
    min-width: 142px;
    overflow: hidden;
    position: absolute;
    right: 10px;
    top: 36px;
    z-index: 999;
  }

  .unit-actions-dropdown button {
    background: #ffffff;
    border: none;
    color: #334155;
    cursor: pointer;
    display: block;
    font-size: 14px;
    padding: 12px 14px;
    text-align: left;
    width: 100%;
  }

  .unit-actions-dropdown button:hover {
    background: #f1f5f9;
  }

  .unit-actions-dropdown .danger {
    color: #dc2626;
  }

  .unit-modal-backdrop {
    align-items: center;
    background: rgba(15, 23, 42, 0.42);
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    padding: 24px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 1600;
  }

  .unit-modal {
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
    max-height: 86vh;
    max-width: 880px;
    overflow-y: auto;
    padding: 22px;
    width: 100%;
  }

  .unit-modal-head {
    align-items: flex-start;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 18px;
    padding-bottom: 14px;
  }

  .unit-modal-head h2 {
    color: #0f172a;
    font-size: 20px;
    margin: 0 0 4px;
  }

  .unit-modal-head p {
    color: #64748b;
    margin: 0;
  }

  .unit-modal-close {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #334155;
    cursor: pointer;
    font-size: 22px;
    height: 36px;
    line-height: 1;
    width: 36px;
  }

  .unit-detail-grid,
  .unit-edit-form {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .unit-detail-grid div {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
  }

  .unit-detail-grid span,
  .unit-edit-form span {
    color: #64748b;
    display: block;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .unit-detail-grid strong {
    color: #1e293b;
    display: block;
    overflow-wrap: anywhere;
  }

  .unit-edit-form input {
    border: 1px solid #d6dee9;
    border-radius: 8px;
    color: #1e293b;
    font: inherit;
    min-height: 40px;
    padding: 0 12px;
    width: 100%;
  }

  .unit-modal-actions {
    display: flex;
    gap: 10px;
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .unit-modal-actions button {
    background: #ffffff;
    border: 1px solid #d6dee9;
    border-radius: 8px;
    color: #334155;
    cursor: pointer;
    font-weight: 700;
    min-height: 40px;
    padding: 0 16px;
  }

  .unit-modal-actions .primary {
    background: #487fff;
    border-color: #487fff;
    color: #ffffff;
  }

  @media (max-width: 768px) {
    .unit-detail-grid,
    .unit-edit-form {
      grid-template-columns: 1fr;
    }
  }
`;

export default Units;
