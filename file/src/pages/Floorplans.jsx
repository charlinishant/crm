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
            <div className="container-fluid px-0">
                <Breadcrumb title="Floor Plans" />

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 className="mb-1">All Floor Plans</h5>
                        <span className="text-muted">{totalItems} items</span>
                    </div>

                    <button
                        className="btn btn-primary d-flex align-items-center gap-2"
                        onClick={() => navigate("/addfloorplan")}
                    >
                        <Icon icon="ic:baseline-add" />
                        New Floor Plan
                    </button>
                </div>

                {/* TABLE */}
                <div className="card shadow-sm border-0">
                    <div className="table-responsive">
                        <table className="table align-middle mb-0">
                            <thead className="bg-primary text-white">
                                <tr>
                                    <th>Name</th>
                                    <th>Saleable</th>
                                    <th>Carpet</th>
                                    <th>Project</th>
                                    <th>Tower</th>
                                    <th>Type</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="7" className="text-center text-danger">
                                            {error}
                                        </td>
                                    </tr>
                                ) : floorplans.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    floorplans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="fw-semibold">{plan.name}</td>
                                            <td>{plan.saleableArea}</td>
                                            <td>{plan.carpetArea}</td>
                                            <td>{plan.project}</td>
                                            <td>{plan.tower}</td>
                                            <td>{plan.type}</td>

                                            {/* ✅ ACTIONS */}
                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2">

                                                    {/* VIEW */}
                                                    <button
                                                        className="btn btn-sm btn-light"
                                                        onClick={() => navigate(`/floor/${plan.id}`)}
                                                    >
                                                        <Icon icon="mdi:eye-outline" />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        className="btn btn-sm btn-warning text-white"
                                                        onClick={() => navigate(`/edit-floor/${plan.id}`)}
                                                    >
                                                        <Icon icon="mdi:pencil-outline" />
                                                    </button>

                                                    {/* DELETE */}
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDelete(plan.id)}
                                                    >
                                                        <Icon icon="mdi:delete-outline" />
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