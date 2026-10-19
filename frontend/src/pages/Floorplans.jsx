import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const ROWS_PER_PAGE = 10;

const normalizeConfigurationLabel = (value) => {
    const label = String(value || "").trim();
    return label === "2 BHK, 3 BHK Jodi" ? "2 BHK, 3 BHK Mix" : label;
};

const Floorplans = () => {
    const navigate = useNavigate();
    const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

    const [floorplans, setFloorplans] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [openActionId, setOpenActionId] = useState(null);
    const [modalMode, setModalMode] = useState("");
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchFloorplans = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            const headers = {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };
            const res = await fetch(`${API_URL}/floor?limit=100`, { headers });
            const json = await res.json().catch(() => null);

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
                configurationLabel: normalizeConfigurationLabel(plan.configurationLabel),
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

    const filteredFloorplans = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return floorplans;

        return floorplans.filter((plan) =>
            [
                plan.name,
                plan.saleableArea,
                plan.carpetArea,
                plan.projectName,
                plan.towerName,
                plan.typeLabel,
                plan.status,
                plan.unitStream,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [floorplans, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filteredFloorplans.length / ROWS_PER_PAGE));
    const paginatedFloorplans = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        return filteredFloorplans.slice(startIndex, startIndex + ROWS_PER_PAGE);
    }, [currentPage, filteredFloorplans]);
    const pageStartIndex = (currentPage - 1) * ROWS_PER_PAGE;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        const handleOutsideClick = () => setOpenActionId(null);
        if (openActionId !== null) {
            window.addEventListener("click", handleOutsideClick);
        }
        return () => {
            window.removeEventListener("click", handleOutsideClick);
        };
    }, [openActionId]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const closeModal = () => {
        setModalMode("");
        setSelectedPlan(null);
    };

    const openViewPlan = async (plan) => {
        setOpenActionId(null);
        setViewLoading(true);
        setModalMode("view");

        try {
            const token = localStorage.getItem("authToken");
            const headers = {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };
            const response = await fetch(`${API_URL}/floor/${plan.id}`, { headers });
            if (!response.ok) throw new Error("Unable to load floor plan details");
            const detail = await response.json().catch(() => null);
            if (!detail) throw new Error("Floor plan details not available");
            setSelectedPlan({
                ...plan,
                ...detail,
                projectName: detail.project?.name || plan.projectName,
                towerName: detail.tower?.name || plan.towerName,
                saleableArea: detail.saleable ?? plan.saleableArea,
                carpetArea: detail.carpet ?? plan.carpetArea,
                typeLabel: detail.type || plan.typeLabel,
                configurationLabel: normalizeConfigurationLabel(detail.configurationLabel || plan.configurationLabel),
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
        const confirmDelete = window.confirm("Move this floor plan to the Bin?");
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(`${API_URL}/floor/${id}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!response.ok) throw new Error("Delete failed");

            alert("Moved to Bin successfully");
            fetchFloorplans();
        } catch (err) {
            alert(err.message || "Delete failed");
        }
    };

    return (
        <MasterLayout>
            <div className="container-fluid px-0 floor-dashboard">
                <Breadcrumb title="Floor Plans" />


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
                            {/* <button className="btn-filter">
                                <Icon icon="mdi:filter" width="18" />
                            </button> */}
                        </div>
                    </div>

                    <div className="table-responsive">
                        <label className="crm-table-search">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search floor plan..."
                                aria-label="Search floor plans"
                            />
                        </label>
                        <table className="floor-table">
                            <thead>
                                <tr>
                                    <th>SR. NO.</th>
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
                                        <td colSpan="8" className="floor-empty">Loading...</td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="8" className="floor-empty text-danger">{error}</td>
                                    </tr>
                                ) : filteredFloorplans.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="floor-empty">{searchQuery ? "No matching floor plans found" : "No Data Found"}</td>
                                    </tr>
                                ) : (
                                    paginatedFloorplans.map((plan, index) => (
                                        <tr key={plan.id}>
                                            <td className="fw-bold">{pageStartIndex + index + 1}</td>
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionId((current) => (current === plan.id ? null : plan.id));
                                                    }}
                                                    aria-label={`Actions for ${plan.name}`}
                                                >
                                                    <Icon icon="mdi:dots-vertical" />
                                                </button>

                                                {openActionId === plan.id && (
                                                    <div className={`floor-actions-dropdown ${index >= Math.max(0, paginatedFloorplans.length - 3) || index >= 5 ? "floor-actions-dropdown--up" : ""}`} onClick={(e) => e.stopPropagation()}>
                                                        <button type="button" onClick={() => navigate(`/addfloorplan/${plan.id}`)}>Edit</button>
                                                        <button type="button" onClick={() => openViewPlan(plan)}>View</button>
                                                        <button type="button" className="danger" onClick={() => handleDelete(plan.id)}>Move to Bin</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredFloorplans.length > ROWS_PER_PAGE && (
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        />
                    )}
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

const TablePagination = ({ currentPage, totalPages, onPrevious, onNext }) => (
    <div className="table-pagination">
        <span>
            Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
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
        title: "Costing",
        fields: [
            ["Rate Basis", "rateBasis"],
            ["Base Rate", "baseRate"],
            ["Base Price", "basePrice"],
            ["Floor Rise", "floorRiseEnabled"],
            ["Floor Rise / Sqft", "floorRisePerSqft"],
            ["Base Floor For Floor Rise", "baseFloorForFloorRise"],
            ["Corner PLC %", "cornerPlcPercent"],
            ["View PLC %", "viewPlcPercent"],
            ["Facing PLC %", "facingPlcPercent"],
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

export default Floorplans;
