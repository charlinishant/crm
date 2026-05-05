import React from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const floorplans = [
  { id: 1, name: "3 BHK (2165)", saleableArea: 2165, carpetArea: 1324, project: "Binghatti Hills", tower: "TOWER D", type: "Apartment" },
  { id: 2, name: "3 BHK (2490)", saleableArea: 2490, carpetArea: 1526, project: "Binghatti Hills", tower: "TOWER D", type: "Apartment" },
  { id: 3, name: "3 BHK (1725)", saleableArea: 1725, carpetArea: 1132, project: "Binghatti Hills", tower: "TOWER D", type: "Apartment" },
  { id: 4, name: "2.5 BHK (1500)", saleableArea: 1500, carpetArea: 967, project: "Binghatti Hills", tower: "TOWER D", type: "Apartment" },
  { id: 5, name: "3 BHK (2150)", saleableArea: 2150, carpetArea: 1372, project: "Binghatti Hills", tower: "TOWER D", type: "Apartment" },
  { id: 6, name: "3 BHK (2045)", saleableArea: 2045, carpetArea: 1255, project: "Binghatti Hills", tower: "TOWER E", type: "Apartment" }
];

const Floorplans = () => {
    const navigate = useNavigate();

    return (
        <MasterLayout>
            <div className="container-fluid px-0">
                <Breadcrumb title="Floor Plans" />

                <div className="d-flex align-items-center justify-content-between gap-3 mb-24">
                    <div className="d-flex flex-column">
                        <span className="text-muted text-sm">{floorplans.length} items</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-primary px-24 py-13 radius-12 d-flex align-items-center gap-2"
                            onClick={() => navigate('/addfloorplan')}
                        >
                            <Icon icon="ic:baseline-add" className="icon text-lg" />
                            New Floor Plan
                        </button>
                        <button type="button" className="btn btn-soft-dark px-20 py-12 radius-12 d-flex align-items-center gap-2">
                            <Icon icon="ic:round-tune" className="icon text-lg" />
                            Actions
                        </button>
                        <button type="button" className="btn btn-soft-dark btn-icon btn-sm radius-12">
                            <Icon icon="ic:round-filter-list" className="icon text-lg" />
                        </button>
                    </div>
                </div>

                <div className="card radius-12 shadow-sm border-0 overflow-hidden w-100" style={{ width: '100%' }}>
                    <div className="table-responsive overflow-hidden" style={{ width: '100%' }}>
                        <table className="table table-hover mb-0" style={{ width: '100%', minWidth: '900px' }}>
                            <thead style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>
                                <tr>
                                    <th className="text-uppercase text-xs fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>NAME</th>
                                    <th className="text-uppercase text-xs fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>SALEABLE AREA</th>
                                    <th className="text-uppercase text-xs fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>CARPET AREA</th>
                                    <th className="text-uppercase text-xs fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>PROJECT</th>
                                    <th className="text-uppercase text-xs fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>TOWER</th>
                                    <th className="text-uppercase text-xs fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>TYPE</th>
                                    <th className="text-uppercase text-xs fw-semibold text-white text-end" style={{ backgroundColor: '#0d6efd', color: '#ffffff', width: '120px' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {floorplans.map((plan) => (
                                    <tr key={plan.id} className="align-middle border-bottom">
                                        <td className="fw-semibold">{plan.name}</td>
                                        <td>{plan.saleableArea}</td>
                                        <td>{plan.carpetArea}</td>
                                        <td>{plan.project}</td>
                                        <td>{plan.tower}</td>
                                        <td>{plan.type}</td>
                                        <td className="text-end">
                                            <button type="button" className="btn btn-soft-dark btn-icon btn-sm radius-12">
                                                <Icon icon="lucide:more-vertical" className="icon text-lg" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MasterLayout>
    )
}

export default Floorplans;