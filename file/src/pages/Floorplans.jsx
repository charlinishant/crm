import React, { useEffect, useState } from "react";
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

    const fetchFloorplans = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/floor?limit=100`);
            const json = await res.json();

            const list = Array.isArray(json) ? json : json?.data ?? [];

            const mapped = list.map((plan) => ({
                id: plan.id,
                name: plan.name || "-",
                saleableArea: plan.saleable ?? "-",
                carpetArea: plan.carpet ?? "-",
                project: plan.project?.name || "-",
                tower: plan.tower?.name || "-",
                type: plan.type || "-"
            }));

            setFloorplans(mapped);
            setTotalItems(json?.totalItems ?? mapped.length);

        } catch (err) {
            setError("Failed to load floor plans");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFloorplans();
    }, []);

    // ✅ DELETE
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Delete this floor plan?");
        if (!confirmDelete) return;

        try {
            await fetch(`${API_URL}/floor/${id}`, {
                method: "DELETE"
            });

            alert("Deleted Successfully ✅");
            fetchFloorplans(); // refresh table

        } catch (err) {
            alert("Delete failed ❌");
        }
    };

    return (
        <MasterLayout>
            <div className="container-fluid px-0 floor-dashboard">
                <Breadcrumb title="Floor Plans" />

                <div className="floor-card">
                    {/* HEADER */}
                    <div className="floor-header d-flex justify-content-between align-items-center">
                        <div>
                            <span className="item-count">{totalItems} items.</span>
                        </div>

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

                    {/* TABLE */}
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
                                    <th className="text-right">ACTIONS</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="floor-empty">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="7" className="floor-empty text-danger">
                                            {error}
                                        </td>
                                    </tr>
                                ) : floorplans.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="floor-empty">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    floorplans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="fw-bold">{plan.name}</td>
                                            <td>{plan.saleableArea}</td>
                                            <td>{plan.carpetArea}</td>
                                            <td className="text-muted">{plan.project}</td>
                                            <td className="text-muted">{plan.tower}</td>
                                            <td>{plan.type}</td>

                                            {/* ✅ ACTIONS */}
                                            <td className="text-right">
                                                <div className="d-flex justify-content-end gap-1">
                                                    {/* VIEW */}
                                                    <button
                                                        className="btn-action"
                                                        onClick={() => navigate(`/floor/${plan.id}`)}
                                                        title="View"
                                                    >
                                                        <Icon icon="mdi:eye-outline" width="16" />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        className="btn-action"
                                                        onClick={() => navigate(`/edit-floor/${plan.id}`)}
                                                        title="Edit"
                                                    >
                                                        <Icon icon="mdi:pencil-outline" width="16" />
                                                    </button>

                                                    {/* DELETE */}
                                                    <button
                                                        className="btn-action btn-action-delete"
                                                        onClick={() => handleDelete(plan.id)}
                                                        title="Delete"
                                                    >
                                                        <Icon icon="mdi:delete-outline" width="16" />
                                                    </button>
                                                </div>
                                            </td>
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

export default Floorplans;
