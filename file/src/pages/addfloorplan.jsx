import React, { useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const AddFloorplan = () => {
    const [formData, setFormData] = useState({
        project: "",
        projectTower: "",
        floorPlanName: "",
        type: "",
        category: "",
        bedrooms: "",
        bathrooms: "",
        measure: "sqft",
        carpetArea: "",
        saleableArea: "",
        loading: "",
        coveredArea: "",
        terraceArea: "",
        builtupArea: "",
        superArea: "",
        baseRate: "",
        basePrice: ""
    });

    const measures = [
        { value: "sqft", label: "Sq. Ft." },
        { value: "sqm", label: "Sq. M." }
    ];

    const projects = [
        { value: "", label: "Select a Project" },
        { value: "binghatti-hills", label: "Binghatti Hills" },
        { value: "nyati-baner", label: "Nyati Baner" },
        { value: "default-project", label: "Default Project" }
    ];

    const towers = [
        { value: "", label: "Select a Project Tower" },
        { value: "tower-d", label: "TOWER D" },
        { value: "tower-e", label: "TOWER E" },
        { value: "tower-f", label: "TOWER F" }
    ];

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("Save floor plan", formData);
        // TODO: submit the new floor plan to backend
    };

    return (
        <MasterLayout>
            <div className="container-fluid px-0">
                <Breadcrumb title="Add Floor Plan" />

                <div className="row gx-4">
                    <div className="col-12">
                        <div className="card radius-12 shadow-sm border-0 w-100" style={{ width: '100%' }}>
                            <div className="card-body p-30" style={{ width: '100%' }}>
                                <form onSubmit={handleSubmit}>
                                    <div className="row gx-4 gy-4 mb-4">
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label className="form-label fw-semibold text-dark">PROJECT <span className="text-danger">*</span></label>
                                                <select
                                                    name="project"
                                                    value={formData.project}
                                                    onChange={handleChange}
                                                    className="form-control form-control-lg"
                                                    required
                                                >
                                                    {projects.map((project) => (
                                                        <option key={project.value} value={project.value} disabled={!project.value}>
                                                            {project.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label className="form-label fw-semibold text-dark">PROJECT TOWER <span className="text-danger">*</span></label>
                                                <select
                                                    name="projectTower"
                                                    value={formData.projectTower}
                                                    onChange={handleChange}
                                                    className="form-control form-control-lg"
                                                    required
                                                >
                                                    {towers.map((tower) => (
                                                        <option key={tower.value} value={tower.value} disabled={!tower.value}>
                                                            {tower.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row gx-4 gy-4 mb-4">
                                        <div className="col-12">
                                            <div className="form-group">
                                                <label className="form-label fw-semibold text-dark">FLOOR PLAN NAME <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="floorPlanName"
                                                    value={formData.floorPlanName}
                                                    onChange={handleChange}
                                                    className="form-control form-control-lg"
                                                    placeholder="Floor Plan Name"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border rounded-3 p-4 mb-4">
                                        <h6 className="mb-4 fw-semibold">Details</h6>
                                        <div className="row gx-4 gy-4">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">TYPE <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="type"
                                                        value={formData.type}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        placeholder="Type"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">CATEGORY <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="category"
                                                        value={formData.category}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        placeholder="Category"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">BEDROOMS <span className="text-danger">*</span></label>
                                                    <input
                                                        type="number"
                                                        name="bedrooms"
                                                        value={formData.bedrooms}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        placeholder="Bedrooms"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">BATHROOMS <span className="text-danger">*</span></label>
                                                    <input
                                                        type="number"
                                                        name="bathrooms"
                                                        value={formData.bathrooms}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        placeholder="Bathrooms"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border rounded-3 p-4 mb-4">
                                        <h6 className="mb-4 fw-semibold">Areas</h6>
                                        <div className="row gx-4 gy-4">
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">MEASURE <span className="text-danger">*</span></label>
                                                    <select
                                                        name="measure"
                                                        value={formData.measure}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        required
                                                    >
                                                        {measures.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">CARPET <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            name="carpetArea"
                                                            value={formData.carpetArea}
                                                            onChange={handleChange}
                                                            className="form-control form-control-lg"
                                                            placeholder="Carpet Area"
                                                            required
                                                        />
                                                        <span className="input-group-text bg-base">Sq. ft.</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">SALEABLE <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            name="saleableArea"
                                                            value={formData.saleableArea}
                                                            onChange={handleChange}
                                                            className="form-control form-control-lg"
                                                            placeholder="Saleable Area"
                                                            required
                                                        />
                                                        <span className="input-group-text bg-base">Sq. ft.</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">LOADING <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            name="loading"
                                                            value={formData.loading}
                                                            onChange={handleChange}
                                                            className="form-control form-control-lg"
                                                            placeholder="Loading"
                                                            required
                                                        />
                                                        <span className="input-group-text bg-base">%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <p className="text-muted small mb-3">* Auto Calculation of Carpet and Saleable is On</p>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">COVERED/USABLE AREA <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            name="coveredArea"
                                                            value={formData.coveredArea}
                                                            onChange={handleChange}
                                                            className="form-control form-control-lg"
                                                            placeholder="Covered/Usable Area"
                                                            required
                                                        />
                                                        <span className="input-group-text bg-base">Sq. ft.</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">TERRACE AREA</label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            name="terraceArea"
                                                            value={formData.terraceArea}
                                                            onChange={handleChange}
                                                            className="form-control form-control-lg"
                                                            placeholder="Terrace Area"
                                                        />
                                                        <span className="input-group-text bg-base">Sq. ft.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border rounded-3 p-4 mb-4">
                                        <h6 className="mb-4 fw-semibold">Costing</h6>
                                        <div className="row gx-4 gy-4">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">BASE RATE <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="baseRate"
                                                        value={formData.baseRate}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        placeholder="Base Rate"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-dark">BASE PRICE <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="basePrice"
                                                        value={formData.basePrice}
                                                        onChange={handleChange}
                                                        className="form-control form-control-lg"
                                                        placeholder="Base Price"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end gap-3">
                                        <button type="submit" className="btn btn-primary px-30 py-12 radius-12">
                                            Save Floor Plan
                                        </button>
                                        <button type="button" className="btn btn-soft-dark px-30 py-12 radius-12">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MasterLayout>
    );
};

export default AddFloorplan;

