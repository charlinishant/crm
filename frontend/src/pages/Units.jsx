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

const getUniqueOptions = (items, field) =>
  Array.from(
    new Set(
      items
        .map((item) => String(item[field] || "").trim())
        .filter((value) => value && value !== "-")
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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
  const [projectFilter, setProjectFilter] = useState("");
  const [towerFilter, setTowerFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/unit?limit=1000&includeOrphans=true`);
      if (!response.ok) {
        throw new Error("Unable to fetch units");
      }

      const json = await response.json();
      const unitGroups = Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.units)
              ? json.units
              : [];
      const mapped = unitGroups.flatMap((group) => {
        const unitList = Array.isArray(group.unitList)
          ? group.unitList
          : group.unit || group.floor || group.unitIndex || group.name
            ? [group]
            : [];
        return unitList.map((unit) => ({
          id: unit.id,
          groupId: group.id || unit.unit?.id,
          name: unit.name || "-",
          unitNumber: unit.name || "-",
          floor: formatDisplayValue(unit.floorNo ?? unit.floorNumber ?? unit.floor),
          baseRate: unit.baseRate ?? "",
          basePrice: unit.pricing?.finalPrice ?? unit.finalPrice ?? unit.basePrice ?? "",
          floorRiseRate: unit.pricing?.floorRisePerSqft ?? unit.floorRisePerSqft ?? "",
          floorRiseSteps: unit.pricing?.floorRiseSteps ?? unit.floorRiseSteps ?? "",
          floorRiseAmount: unit.pricing?.floorRiseAmount ?? unit.floorRiseAmount ?? "",
          reraArea: unit.pricing?.reraArea ?? unit.reraArea ?? "",
          status: formatDisplayValue(unit.status || "Available"),
          propertyPurpose: unit.propertyPurpose || "",
          unitIndex: unit.unitIndex ?? "-",
          tower: group.floor?.tower?.name || group.tower?.name || unit.unit?.tower?.name || "-",
          config: group.floor?.configurationLabel || group.floor?.name || unit.unit?.floor?.configurationLabel || unit.unit?.floor?.name || "-",
          project: group.floor?.project?.name || group.project?.name || unit.unit?.project?.name || unit.unit?.floor?.project?.name || "-",
          bedrooms: group.floor?.bedrooms ?? unit.unit?.floor?.bedrooms ?? "-",
          bathrooms: group.floor?.bathrooms ?? unit.unit?.floor?.bathrooms ?? "-",
          rateBasis: group.floor?.rateBasis || unit.unit?.floor?.rateBasis || "On Carpet",
          builtupArea: group.floor?.builtupArea ?? unit.unit?.floor?.builtupArea ?? "",
          saleableValue: group.floor?.saleable || unit.unit?.floor?.saleable || group.saleable || "",
          carpetValue: group.floor?.carpet || unit.unit?.floor?.carpet || group.carpet || "",
          saleable: group.floor?.saleable || unit.unit?.floor?.saleable || group.saleable
            ? `${group.floor?.saleable || unit.unit?.floor?.saleable || group.saleable} ${group.floor?.measure === "sqm" || unit.unit?.floor?.measure === "sqm" || group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
            : "-",
          carpet: group.floor?.carpet || unit.unit?.floor?.carpet || group.carpet
            ? `${group.floor?.carpet || unit.unit?.floor?.carpet || group.carpet} ${group.floor?.measure === "sqm" || unit.unit?.floor?.measure === "sqm" || group.measure === "sqm" ? "Sq. M." : "Sq. Ft."}`
            : "-",
          leads: "-",
          updated: "-",
        }));
      });
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

  const projectOptions = useMemo(() => getUniqueOptions(data, "project"), [data]);

  const towerOptions = useMemo(() => {
    const source = projectFilter
      ? data.filter((unit) => unit.project === projectFilter)
      : data;
    return getUniqueOptions(source, "tower");
  }, [data, projectFilter]);

  useEffect(() => {
    if (towerFilter && !towerOptions.includes(towerFilter)) {
      setTowerFilter("");
    }
  }, [towerFilter, towerOptions]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredByProjectAndTower = data.filter((unit) => {
      if (projectFilter && unit.project !== projectFilter) return false;
      if (towerFilter && unit.tower !== towerFilter) return false;
      return true;
    });

    if (!query) return filteredByProjectAndTower;

    return filteredByProjectAndTower.filter((unit) =>
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
  }, [data, searchQuery, projectFilter, towerFilter]);
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
  }, [searchQuery, projectFilter, towerFilter]);

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
        
        <div className="floor-card">
          <div className="floor-header d-flex justify-content-between align-items-center">
            <div className="item-count">
              <span>{displayedItemCount} {displayedItemCount === 1 ? "item" : "items"}.</span>
            </div>

            <div className="action-wrapper">
              <Link className="unit-add-link" to="/add-units">
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
            <div className="unit-simple-filters" aria-label="Filter units">
              <label>
                <span>Project</span>
                <select
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}
                  aria-label="Filter units by project"
                >
                  <option value="">All Projects</option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Tower</span>
                <select
                  value={towerFilter}
                  onChange={(event) => setTowerFilter(event.target.value)}
                  disabled={!towerOptions.length}
                  aria-label="Filter units by tower"
                >
                  <option value="">All Towers</option>
                  {towerOptions.map((tower) => (
                    <option key={tower} value={tower}>{tower}</option>
                  ))}
                </select>
              </label>
            </div>
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
        <Detail label="RERA Area" value={unit.reraArea} />
        <Detail label="Floor Rise Rate" value={unit.floorRiseRate} />
        <Detail label="Rise Steps" value={unit.floorRiseSteps} />
        <Detail label="Floor Rise Amount" value={unit.floorRiseAmount} />
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

export default Units;
