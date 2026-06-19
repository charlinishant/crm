import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

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
    const [viewLoading, setViewLoading] = useState(false);

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
        setModalMode("");
        setSelectedPlan(null);
    };

    const openViewPlan = async (plan) => {
        setOpenActionId(null);
        setViewLoading(true);
        setModalMode("view");
    
        try {
            const response = await fetch(`${API_URL}/floor/${plan.id}`);
            if (!response.ok) throw new Error("Unable to load floor plan details");      
            const detail = await response.json();
            setSelectedPlan({
                ...plan,
                ...detail,
                projectName: detail.project?.name || plan.projectName,
                towerName: detail.tower?.name || plan.towerName,
                saleableArea: detail.saleable ?? plan.saleableArea,
                carpetArea: detail.carpet ?? plan.carpetArea,
                typeLabel: detail.type || plan.typeLabel,
            });
        } catch (err) {
            alert(err.message || "Unable to load floor plan details");
            closeModal();
        } finally {
            setViewLoading(false);
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
                                                        <button type="button" onClick={() => navigate(`/addfloorplan/${plan.id}`)}>Edit</button>
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

                {modalMode === "view" && (
                    <FloorPlanViewModal plan={selectedPlan} loading={viewLoading} onClose={closeModal} />
                )}
            </div>
        </MasterLayout>
    );
};

const Detail = ({ label, value }) => (
    <div>
        <span>{label}</span>
        <strong>{formatDetailValue(value)}</strong>
    </div>
);

const formatDetailValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
        if (!value.length) return "-";
        return value
            .map((item) => {
                if (typeof item === "object" && item !== null) return item.name || item.label || item.url || item.type || "File";
                return String(item);
            })
            .join(", ");
    }
    if (typeof value === "object") return JSON.stringify(value);
    return value;
};

const detailSections = [
    {
        title: "Header / Identity",
        fields: [
            ["Project", (plan) => plan.projectName || plan.project?.name],
            ["Tower", (plan) => plan.towerName || plan.tower?.name],
            ["Floor Plan Name", "name"],
            ["Configuration", "configurationLabel"],
            ["Status", "status"],
            ["Unit Stream", "unitStream"],
            ["RERA Reference", "reraReference"],
            ["RERA Number", "reraNumber"],
            ["RERA Date", "reraDate"],
            ["Possession Date", "possessionDate"],
            ["Type", "type"],
            ["Category", "category"],
        ],
    },
    {
        title: "Details / Configuration",
        fields: [
            ["Bedrooms", "bedrooms"],
            ["Bathrooms", "bathrooms"],
            ["Balconies", "balconies"],
            ["Kitchen", "kitchenType"],
            ["Additional Rooms", "additionalRooms"],
        ],
    },
    {
        title: "Position & Inventory",
        fields: [
            ["Applicable Floor From", "applicableFloorFrom"],
            ["Applicable Floor To", "applicableFloorTo"],
            ["Unit Position", "unitPosition"],
            ["Skipped Floors", "skippedFloors"],
            ["Unit Numbers", "unitNumbers"],
            ["Total Units", "totalUnitsOfPlan"],
            ["Facing", "facing"],
            ["Corner Unit", "cornerUnit"],
            ["View", "view"],
        ],
    },
    {
        title: "Areas",
        fields: [
            ["Auto Calc", "autoCalc"],
            ["Measure", "measure"],
            ["Carpet Area", "carpet"],
            ["Built-up Area", "builtupArea"],
            ["Saleable Area", "saleable"],
            ["Loading %", "loading"],
            ["Loading Basis", "loadingBasis"],
            ["Balcony Area", "balconyArea"],
            ["Enclosed Balcony / Utility", "enclosedBalconyUtility"],
            ["Terrace Area", "terraceArea"],
            ["Flower Bed / Pocket Terrace", "flowerBedPocketTerrace"],
            ["Service Slab / AC Ledge", "serviceSlabAcLedge"],
            ["Refuge Area Share", "refugeAreaShare"],
        ],
    },
    {
        title: "Parking & Extras",
        fields: [
            ["Parking Required", "parkingRequired"],
            ["Car Parking Slots", "carParkingSlots"],
            ["Parking Type", "parkingType"],
            ["Two Wheeler Slots", "twoWheelerSlots"],
            ["Basement Storeroom", "basementStoreroom"],
        ],
    },
    {
        title: "Costing",
        fields: [
            ["Rate Basis", "rateBasis"],
            ["Base Rate", "baseRate"],
            ["Base Price", "basePrice"],
            ["Floor Rise / Sqft", "floorRisePerSqft"],
            ["Base Floor For Floor Rise", "baseFloorForFloorRise"],
            ["Corner PLC %", "cornerPlcPercent"],
            ["View PLC %", "viewPlcPercent"],
            ["Facing PLC %", "facingPlcPercent"],
            ["Club Membership", "clubMembership"],
        ],
    },
    {
        title: "Other Charges",
        fields: [
            ["Development Charges", "infrastructureDevelopmentCharges"],
            ["Development Charge Basis", "infrastructureDevelopmentChargeBasis"],
            ["Legal Documentation", "legalDocumentation"],
            ["GST %", "gstPercent"],
            ["Stamp Duty %", "stampDutyPercent"],
            ["Registration %", "registrationPercent"],
            ["Registration Amount", "registrationAmount"],
            ["Parking Charges", "parkingCharges"],
            ["Advance Maintenance Months", "advanceMaintenanceMonths"],
            ["Maintenance Rate / Sqft / Month", "maintenanceRatePerSqftPerMonth"],
            ["Sinking Fund Corpus", "sinkingFundCorpus"],
            ["Society Formation Charges", "societyFormationCharges"],
        ],
    },
    {
        title: "Documents & Media",
        fields: [
            ["Floor Plan Images", "floorPlanImages"],
            ["Brochure Page Reference", "brochurePageReference"],
            ["3D Walkthrough Link", "walkthrough3dLink"],
            ["Payment Plan", "paymentPlan"],
            ["Allotment Letter Template", "allotmentLetterTemplate"],
            ["Agreement Template", "agreementTemplate"],
        ],
    },
];

const getDetailValue = (plan, field) =>
    typeof field === "function" ? field(plan) : plan?.[field];

const FloorPlanViewModal = ({ plan, loading, onClose }) => (
    <div className="floor-modal-backdrop">
        <section className="floor-modal" role="dialog" aria-modal="true" aria-labelledby="floor-view-title">
            <div className="floor-modal-head">
                <div>
                    <h2 id="floor-view-title">{plan?.name || "Floor Plan"}</h2>
                    <p>Floor plan details</p>
                </div>
                <button type="button" className="floor-modal-close" onClick={onClose}>x</button>
            </div>

            {loading ? (
                <div className="floor-empty">Loading details...</div>
            ) : (
                detailSections.map((section) => (
                    <div className="floor-detail-section" key={section.title}>
                        <div className="floor-detail-section-title">{section.title}</div>
                        <div className="floor-detail-grid">
                            {section.fields.map(([label, field]) => (
                                <Detail key={label} label={label} value={getDetailValue(plan, field)} />
                            ))}
                        </div>
                    </div>
                ))
            )}
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

    .floor-modal .floor-modal-head h2 {
        color: #0f172a;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.35;
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

    .floor-detail-section {
        margin-top: 18px;
    }

    .floor-modal .floor-detail-section-title {
        color: #0f172a;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        margin: 0 0 10px;
    }

    .floor-detail-grid {
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

    .floor-detail-grid span {
        color: #64748b;
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
    }

    .floor-modal .floor-detail-grid strong {
        color: #1e293b;
        display: block;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        overflow-wrap: anywhere;
    }

    @media (max-width: 768px) {
        .floor-detail-grid {
            grid-template-columns: 1fr;
        }
    }
`;

export default Floorplans;
