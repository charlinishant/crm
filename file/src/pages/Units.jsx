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
  status: "Available",
};

const UNIT_STATUS_OPTIONS = [
  "Available",
  "Held",
  "Blocked",
  "Booked",
  "Registered",
  "Possession_Given",
  "Cancelled",
  "Refuge",
  "Investor",
];

const FLOORS_PER_PAGE = 10;

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

const formatDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    return value.map(formatDisplayValue).join(", ");
  }
  if (typeof value === "object") {
    return value.name || value.label || value.title || value.id || "-";
  }
  return value;
};

const getFloorSortValue = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? Number.NEGATIVE_INFINITY : number;
};

const getPositionSortValue = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? Number.MAX_SAFE_INTEGER : number;
};

const getFloorGroupKey = (unit) =>
  [
    unit.project,
    unit.tower,
    unit.config,
    unit.floor,
  ].map((value) => String(value || "-")).join("|");

const Units = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openActionId, setOpenActionId] = useState(null);
  const [modalMode, setModalMode] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/unit?limit=1000`);
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
          unitNumber: unit.name || "-",
          floor: formatDisplayValue(unit.floorNo ?? unit.floorNumber ?? unit.floor),
          baseRate: unit.baseRate ?? "",
          basePrice: unit.basePrice ?? "",
          status: formatDisplayValue(unit.status || "Available"),
          propertyPurpose: unit.propertyPurpose || "",
          unitIndex: unit.unitIndex ?? "-",
          tower: group.floor?.tower?.name || group.tower?.name || "-",
          config: group.floor?.configurationLabel || group.floor?.name || "-",
          project: group.floor?.project?.name || group.project?.name || "-",
          bedrooms: group.floor?.bedrooms ?? "-",
          bathrooms: group.floor?.bathrooms ?? "-",
          rateBasis: group.floor?.rateBasis || "On Carpet",
          builtupArea: group.floor?.builtupArea ?? "",
          saleableValue: group.floor?.saleable || group.saleable || "",
          carpetValue: group.floor?.carpet || group.carpet || "",
          saleable: group.floor?.saleable || group.saleable
            ? `${group.floor?.saleable || group.saleable} ${group.floor?.measure === "sqm" || group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
            : "-",
          carpet: group.floor?.carpet || group.carpet
            ? `${group.floor?.carpet || group.carpet} ${group.floor?.measure === "sqm" || group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
            : "-",
          leads: "-",
          updated: "-",
        }))
      );
      mapped.forEach((unit) => {
        unit.basePrice = unit.basePrice || calculateBasePrice(unit.baseRate, unit);
        unit.price = unit.basePrice || "-";
      });

      setData(mapped);
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
        unit.leads,
        unit.updated,
        unit.name,
        unit.unitNumber,
        unit.floor,
        unit.status,
        unit.propertyPurpose,
        unit.baseRate,
        unit.basePrice,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data, searchQuery]);
  const floorGroups = useMemo(() => {
    const groups = new Map();

    filteredData.forEach((unit) => {
      const key = getFloorGroupKey(unit);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          floor: unit.floor,
          project: unit.project,
          tower: unit.tower,
          config: unit.config,
          units: [],
        });
      }
      groups.get(key).units.push(unit);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const floorDiff = getFloorSortValue(b.floor) - getFloorSortValue(a.floor);
      if (floorDiff) return floorDiff;
      return String(a.key).localeCompare(String(b.key));
    }).map((group) => ({
      ...group,
      units: group.units.slice().sort((a, b) => {
        const positionDiff = getPositionSortValue(a.unitIndex) - getPositionSortValue(b.unitIndex);
        if (positionDiff) return positionDiff;
        return String(a.unitNumber).localeCompare(String(b.unitNumber));
      }),
    }));
  }, [filteredData]);

  const totalPages = Math.max(1, Math.ceil(floorGroups.length / FLOORS_PER_PAGE));
  const paginatedFloorGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * FLOORS_PER_PAGE;
    return floorGroups.slice(startIndex, startIndex + FLOORS_PER_PAGE);
  }, [currentPage, floorGroups]);
  const paginatedData = useMemo(
    () => paginatedFloorGroups.flatMap((group) => group.units),
    [paginatedFloorGroups]
  );
  const orderedData = useMemo(
    () => floorGroups.flatMap((group) => group.units),
    [floorGroups]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const displayedItemCount = filteredData.length;
  const displayedFloorCount = floorGroups.length;
  const pageStartFloor = displayedFloorCount === 0 ? 0 : (currentPage - 1) * FLOORS_PER_PAGE + 1;
  const pageEndFloor = Math.min(currentPage * FLOORS_PER_PAGE, displayedFloorCount);

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
      basePrice: unit.basePrice || calculateBasePrice(unit.baseRate, unit) || "",
      propertyPurpose: unit.propertyPurpose || "",
      status: unit.status || "Available",
    });
    setModalMode("edit");
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => {
      const next = { ...current, [name]: value };
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
          floor: toNumberOrNull(editForm.floor),
          unitIndex: toNumberOrNull(editForm.unitIndex),
          propertyPurpose: editForm.propertyPurpose,
          status: editForm.status,
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
              <span>{displayedItemCount} {displayedItemCount === 1 ? "item" : "items"}.</span>
            </div>

            <div className="action-wrapper">
              <Link to="/add-units" style={{ textDecoration: "none" }}>
                <button className="btn-new-plan">Add Units</button>
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
                    "SR. NO.",
                    "UNIT NUMBER",
                    "FLOOR",
                    "UNIT POSITION",
                    "PROJECT TOWER",
                    "UNIT CONFIG",
                    "PROJECT NAME",
                    "PROPERTY PURPOSE",
                    "BEDROOMS",
                    "BATHROOMS",
                    "SALEABLE AREA",
                    "CARPET AREA",
                    "BASE RATE",
                    "BASE PRICE",
                    "STATUS",
                    "ACTIONS",
                  ].map((head) => (
                    <th key={head}>{head}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="16" className="floor-empty">Loading units...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="16" className="floor-empty text-danger">{error}</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="16" className="floor-empty">{searchQuery ? "No matching units found." : "No units found."}</td>
                  </tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold">{orderedData.findIndex((unit) => unit.id === item.id) + 1}</td>
                      <td className="fw-bold">{item.unitNumber}</td>
                      <td>{item.floor}</td>
                      <td>{item.unitIndex}</td>
                      <td className="text-muted">{item.tower}</td>
                      <td>{item.config}</td>
                      <td className="text-muted">{item.project}</td>
                      <td>{item.propertyPurpose || "-"}</td>
                      <td>{item.bedrooms}</td>
                      <td>{item.bathrooms}</td>
                      <td>{item.saleable}</td>
                      <td>{item.carpet}</td>
                      <td>{item.baseRate || "-"}</td>
                      <td className="fw-bold">{item.price}</td>
                      <td><span className={`unit-status-badge ${String(item.status).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{item.status}</span></td>
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
            {floorGroups.length > FLOORS_PER_PAGE && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageStartFloor={pageStartFloor}
                pageEndFloor={pageEndFloor}
                floorCount={displayedFloorCount}
                unitCount={displayedItemCount}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            )}
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
    <strong>{formatDisplayValue(value)}</strong>
  </div>
);

const TablePagination = ({ currentPage, totalPages, pageStartFloor, pageEndFloor, floorCount, unitCount, onPrevious, onNext }) => (
  <div className="table-pagination">
    <span>
      Showing floors <strong>{pageStartFloor}-{pageEndFloor}</strong> of <strong>{floorCount}</strong>
      {" "}(<strong>{unitCount}</strong> units)
    </span>
    <div className="table-pagination-actions">
      <button type="button" onClick={onPrevious} disabled={currentPage === 1}>
        Previous
      </button>
      <button type="button" onClick={onNext} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
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
        <Detail label="Unit Number" value={unit.unitNumber} />
        <Detail label="Unit Position" value={unit.unitIndex} />
        <Detail label="Floor" value={unit.floor} />
        <Detail label="Project" value={unit.project} />
        <Detail label="Tower" value={unit.tower} />
        <Detail label="Unit Config" value={unit.config} />
        <Detail label="Live Price" value={unit.price} />
        <Detail label="Base Rate" value={unit.baseRate} />
        <Detail label="Base Price" value={unit.basePrice} />
        <Detail label="Status" value={unit.status} />
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
          <span>Generated Unit Number</span>
          <input name="name" value={form.name} readOnly />
        </label>
        <label>
          <span>Floor</span>
          <input name="floor" type="number" value={form.floor} onChange={onChange} />
        </label>
        <label>
          <span>Unit Position</span>
          <input name="unitIndex" type="number" value={form.unitIndex} onChange={onChange} />
        </label>
        <label>
          <span>Base Rate</span>
          <input name="baseRate" type="number" value={form.baseRate} readOnly />
        </label>
        <label>
          <span>Base Price</span>
          <input name="basePrice" type="number" value={form.basePrice} readOnly />
        </label>
        <label>
          <span>Purpose</span>
          <input name="propertyPurpose" value={form.propertyPurpose} onChange={onChange} />
        </label>
        <label>
          <span>Status</span>
          <select name="status" value={form.status || "Available"} onChange={onChange}>
            {UNIT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status.replace("_", " ")}</option>
            ))}
          </select>
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

  .table-pagination {
    align-items: center;
    color: #64748b;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    padding: 16px 2px 0;
  }

  .table-pagination strong {
    color: #0f172a;
  }

  .table-pagination-actions {
    display: flex;
    gap: 8px;
  }

  .table-pagination-actions button {
    background: #ffffff;
    border: 1px solid #d6dee9;
    border-radius: 8px;
    color: #334155;
    cursor: pointer;
    font-weight: 700;
    min-height: 38px;
    padding: 0 14px;
  }

  .table-pagination-actions button:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #487fff;
    color: #2557d6;
  }

  .table-pagination-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .unit-status-badge {
    background: #e8f1ff;
    border-radius: 999px;
    color: #1d4ed8;
    display: inline-flex;
    font-size: 12px;
    font-weight: 800;
    justify-content: center;
    min-width: 82px;
    padding: 6px 10px;
    white-space: nowrap;
  }

  .unit-status-badge.available {
    background: #dcfce7;
    color: #166534;
  }

  .unit-status-badge.booked,
  .unit-status-badge.blocked {
    background: #fee2e2;
    color: #991b1b;
  }

  .unit-status-badge.held {
    background: #fef3c7;
    color: #92400e;
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
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #334155;
    cursor: pointer;
    display: inline-flex;
    font-size: 22px;
    height: 36px;
    justify-content: center;
    line-height: 1;
    padding: 0;
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

  .unit-edit-form input,
  .unit-edit-form select {
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
