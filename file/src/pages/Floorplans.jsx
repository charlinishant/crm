import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const emptyEditForm = {
    name: "",
    type: "",
    configurationLabel: "",
    status: "",
    saleable: "",
    carpet: "",
};

const Floorplans = () => {
    const navigate = useNavigate();
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

    const [floorplans, setFloorplans] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [openActionId, setOpenActionId] = useState(null);
    const [modalMode, setModalMode] = useState("");
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [saving, setSaving] = useState(false);

    const fetchFloorplans = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/floor?limit=100`);
            const json = await res.json();

            const list = Array.isArray(json) ? json : json?.data ?? [];
            const mapped = list.map((plan) => ({
                ...plan,
                id: plan.id,
                name: plan.name || "-",
                saleableArea: plan.saleable ?? "-",
                carpetArea: plan.carpet ?? "-",
                projectName: plan.project?.name || "-",
                towerName: plan.tower?.name || "-",
                typeLabel: plan.type || "-",
            }));

            setFloorplans(mapped);
            setTotalItems(json?.totalItems ?? mapped.length);
            setError("");
        } catch (err) {
            setError("Failed to load floor plans");
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    useEffect(() => {
        fetchFloorplans();
    }, [fetchFloorplans]);

    const closeModal = () => {
        if (saving) return;
        setModalMode("");
        setSelectedPlan(null);
        setEditForm(emptyEditForm);
    };

    const openViewPlan = (plan) => {
        setOpenActionId(null);
        setSelectedPlan(plan);
        setModalMode("view");
    };

    const openEditPlan = (plan) => {
        setOpenActionId(null);
        setSelectedPlan(plan);
        setEditForm({
            name: plan.name === "-" ? "" : plan.name,
            type: plan.type || "",
            configurationLabel: plan.configurationLabel || "",
            status: plan.status || "",
            saleable: plan.saleable ?? "",
            carpet: plan.carpet ?? "",
        });
        setModalMode("edit");
    };

    const handleEditChange = (event) => {
        const { name, value } = event.target;
        setEditForm((current) => ({ ...current, [name]: value }));
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        if (!selectedPlan?.id) return;

        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/floor/${selectedPlan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name.trim(),
                    type: editForm.type,
                    configurationLabel: editForm.configurationLabel,
                    status: editForm.status,
                    saleable: editForm.saleable === "" ? null : Number(editForm.saleable),
                    carpet: editForm.carpet === "" ? null : Number(editForm.carpet),
                }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result?.message || "Unable to update floor plan");
            }

            await fetchFloorplans();
            closeModal();
        } catch (err) {
            alert(err.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setOpenActionId(null);
        const confirmDelete = window.confirm("Delete this floor plan?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`${API_URL}/floor/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Delete failed");

            alert("Deleted Successfully");
            fetchFloorplans();
        } catch (err) {
            alert(err.message || "Delete failed");
        }
    };

    return (
        <MasterLayout>
            <div className="container-fluid px-0 floor-dashboard">
                <Breadcrumb title="Floor Plans" />
                <style>{floorPlanStyles}</style>

                <div className="floor-card">
                    <div className="floor-header d-flex justify-content-between align-items-center">
                        <span className="item-count">{totalItems} items.</span>

                        <div className="action-wrapper">
                            <button
                                className="btn-new-plan d-flex align-items-center gap-2"
                                onClick={() => navigate("/addfloorplan")}
                            >
                                <Icon icon="ic:baseline-add" width="16" />
                                New Floor Plan
                            </button>
                            <button className="btn-filter">
                                <Icon icon="mdi:filter" width="18" />
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="floor-table">
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>SALEABLE AREA</th>
                                    <th>CARPET AREA</th>
                                    <th>PROJECT</th>
                                    <th>TOWER</th>
                                    <th>TYPE</th>
                                    <th className="text-center">ACTIONS</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="floor-empty">Loading...</td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="7" className="floor-empty text-danger">{error}</td>
                                    </tr>
                                ) : floorplans.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="floor-empty">No Data Found</td>
                                    </tr>
                                ) : (
                                    floorplans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="fw-bold">{plan.name}</td>
                                            <td>{plan.saleableArea}</td>
                                            <td>{plan.carpetArea}</td>
                                            <td className="text-muted">{plan.projectName}</td>
                                            <td className="text-muted">{plan.towerName}</td>
                                            <td>{plan.typeLabel}</td>
                                            <td className="floor-actions-cell">
                                                <button
                                                    className="floor-actions-menu-btn"
                                                    type="button"
                                                    onClick={() => setOpenActionId((current) => (current === plan.id ? null : plan.id))}
                                                    aria-label={`Actions for ${plan.name}`}
                                                >
                                                    <Icon icon="mdi:dots-vertical" />
                                                </button>

                                                {openActionId === plan.id && (
                                                    <div className="floor-actions-dropdown">
                                                        <button type="button" onClick={() => openEditPlan(plan)}>Edit</button>
                                                        <button type="button" onClick={() => openViewPlan(plan)}>View</button>
                                                        <button type="button" className="danger" onClick={() => handleDelete(plan.id)}>Delete</button>
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

                {modalMode === "view" && selectedPlan && (
                    <FloorPlanViewModal plan={selectedPlan} onClose={closeModal} />
                )}

                {modalMode === "edit" && selectedPlan && (
                    <FloorPlanEditModal
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

const FloorPlanViewModal = ({ plan, onClose }) => (
    <div className="floor-modal-backdrop">
        <section className="floor-modal" role="dialog" aria-modal="true" aria-labelledby="floor-view-title">
            <div className="floor-modal-head">
                <div>
                    <h2 id="floor-view-title">{plan.name}</h2>
                    <p>Floor plan details</p>
                </div>
                <button type="button" className="floor-modal-close" onClick={onClose}>x</button>
            </div>

            <div className="floor-detail-grid">
                <Detail label="Project" value={plan.projectName} />
                <Detail label="Tower" value={plan.towerName} />
                <Detail label="Type" value={plan.type || plan.typeLabel} />
                <Detail label="Configuration" value={plan.configurationLabel} />
                <Detail label="Status" value={plan.status} />
                <Detail label="Saleable Area" value={plan.saleableArea} />
                <Detail label="Carpet Area" value={plan.carpetArea} />
                <Detail label="Bedrooms" value={plan.bedrooms} />
                <Detail label="Bathrooms" value={plan.bathrooms} />
                <Detail label="Balconies" value={plan.balconies} />
            </div>
        </section>
    </div>
);

const FloorPlanEditModal = ({ form, saving, onChange, onClose, onSubmit }) => (
    <div className="floor-modal-backdrop">
        <section className="floor-modal" role="dialog" aria-modal="true" aria-labelledby="floor-edit-title">
            <div className="floor-modal-head">
                <div>
                    <h2 id="floor-edit-title">Edit Floor Plan</h2>
                    <p>Update floor plan details</p>
                </div>
                <button type="button" className="floor-modal-close" onClick={onClose} disabled={saving}>x</button>
            </div>

            <form className="floor-edit-form" onSubmit={onSubmit}>
                <label>
                    <span>Name *</span>
                    <input name="name" value={form.name} onChange={onChange} required />
                </label>
                <label>
                    <span>Type</span>
                    <input name="type" value={form.type} onChange={onChange} />
                </label>
                <label>
                    <span>Configuration</span>
                    <input name="configurationLabel" value={form.configurationLabel} onChange={onChange} />
                </label>
                <label>
                    <span>Status</span>
                    <input name="status" value={form.status} onChange={onChange} />
                </label>
                <label>
                    <span>Saleable Area</span>
                    <input name="saleable" type="number" value={form.saleable} onChange={onChange} />
                </label>
                <label>
                    <span>Carpet Area</span>
                    <input name="carpet" type="number" value={form.carpet} onChange={onChange} />
                </label>

                <div className="floor-modal-actions">
                    <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="primary" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </section>
    </div>
);

const floorPlanStyles = `
    .floor-actions-cell {
        overflow: visible;
        position: relative;
        text-align: center;
    }

    .floor-actions-menu-btn {
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

    .floor-actions-menu-btn svg {
        height: 18px;
        width: 18px;
    }

    .floor-actions-dropdown {
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

    .floor-actions-dropdown button {
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

    .floor-actions-dropdown button:hover {
        background: #f1f5f9;
    }

    .floor-actions-dropdown .danger {
        color: #dc2626;
    }

    .floor-modal-backdrop {
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

    .floor-modal {
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
        max-height: 86vh;
        max-width: 880px;
        overflow-y: auto;
        padding: 22px;
        width: 100%;
    }

    .floor-modal-head {
        align-items: flex-start;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        margin-bottom: 18px;
        padding-bottom: 14px;
    }

    .floor-modal-head h2 {
        color: #0f172a;
        font-size: 20px;
        margin: 0 0 4px;
    }

    .floor-modal-head p {
        color: #64748b;
        margin: 0;
    }

    .floor-modal-close {
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

    .floor-detail-grid,
    .floor-edit-form {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .floor-detail-grid div {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
    }

    .floor-detail-grid span,
    .floor-edit-form span {
        color: #64748b;
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
    }

    .floor-detail-grid strong {
        color: #1e293b;
        display: block;
        overflow-wrap: anywhere;
    }

    .floor-edit-form input {
        border: 1px solid #d6dee9;
        border-radius: 8px;
        color: #1e293b;
        font: inherit;
        min-height: 40px;
        padding: 0 12px;
        width: 100%;
    }

    .floor-modal-actions {
        display: flex;
        gap: 10px;
        grid-column: 1 / -1;
        justify-content: flex-end;
    }

    .floor-modal-actions button {
        background: #ffffff;
        border: 1px solid #d6dee9;
        border-radius: 8px;
        color: #334155;
        cursor: pointer;
        font-weight: 700;
        min-height: 40px;
        padding: 0 16px;
    }

    .floor-modal-actions .primary {
        background: #487fff;
        border-color: #487fff;
        color: #ffffff;
    }

    @media (max-width: 768px) {
        .floor-detail-grid,
        .floor-edit-form {
            grid-template-columns: 1fr;
        }
    }
`;

export default Floorplans;
