import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const fallbackTowers = [
    { id: 1, name: "TOWER D", project: "Binghatti Hills" },
    { id: 2, name: "TOWER E", project: "Binghatti Hills" },
    { id: 3, name: "Aa", project: "Binghatti Hills" },
    { id: 4, name: "A", project: "Binghatti Hills" },
    { id: 5, name: "Default Tower", project: "Nyati Baner" },
    { id: 6, name: "Towe", project: "Binghatti Hills" },
    { id: 7, name: "Default Tower", project: "Lodha Greens" },
    { id: 8, name: "Default Tower", project: "ABC" },
    { id: 9, name: "Default Tower", project: "Vasant utsav" },
    { id: 10, name: "T1", project: "Binghatti Hills" },
    { id: 11, name: "Default Tower", project: "Adhinn PG" }
];

const AddFloorplan = () => {
    const navigate = useNavigate();
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
    const [projects, setProjects] = useState([]);
    const [towers, setTowers] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const measures = [
        { value: "sqft", label: "Sq. Ft." },
        { value: "sqm", label: "Sq. M." }
    ];

    const toNumberOrNull = (value) => {
        if (value === "" || value === null || value === undefined) return null;
        const number = Number(value);
        return Number.isNaN(number) ? null : number;
    };

    const readStoredTowers = () => {
        try {
            const stored = JSON.parse(window.localStorage.getItem("projectTowers") || "[]");
            return Array.isArray(stored) && stored.length ? stored : fallbackTowers;
        } catch {
            return fallbackTowers;
        }
    };

    const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.value)) return data.value;
        return [];
    };

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                setLoadingOptions(true);
                setError("");

                const [projectResponse, towerResponse] = await Promise.all([
                    fetch(`${API_URL}/projects/list`),
                    fetch(`${API_URL}/tower/list`)
                ]);

                if (!projectResponse.ok) {
                    throw new Error("Unable to load projects");
                }
                if (!towerResponse.ok) {
                    throw new Error("Unable to load project towers");
                }

                const projectData = await projectResponse.json();
                const towerData = await towerResponse.json();
                const backendTowers = normalizeList(towerData);
                const storedTowers = readStoredTowers();

                setProjects(normalizeList(projectData));
                setTowers(backendTowers.length ? backendTowers : storedTowers);
            } catch (err) {
                console.error(err);
                const storedTowers = readStoredTowers();
                if (storedTowers.length) {
                    setTowers(storedTowers);
                }
                setError(err.message || "Unable to load form options");
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [API_URL]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        const payload = {
            name: formData.floorPlanName.trim(),
            projectId: toNumberOrNull(formData.project),
            towerId: toNumberOrNull(formData.projectTower),
            type: formData.type.trim(),
            category: formData.category.trim(),
            bedrooms: toNumberOrNull(formData.bedrooms),
            bathrooms: toNumberOrNull(formData.bathrooms),
            measure: formData.measure,
            carpet: toNumberOrNull(formData.carpetArea),
            saleable: toNumberOrNull(formData.saleableArea),
            loading: toNumberOrNull(formData.loading),
            coverArea: toNumberOrNull(formData.coveredArea),
            terraceArea: toNumberOrNull(formData.terraceArea),
            baseRate: toNumberOrNull(formData.baseRate),
            basePrice: toNumberOrNull(formData.basePrice)
        };

        try {
            const response = await fetch(`${API_URL}/floor`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            let result = {};
            try {
                result = await response.json();
            } catch {
                result = {};
            }

            if (!response.ok) {
                throw new Error(result?.message || "Failed to create floor plan");
            }

            navigate("/floorplans", { replace: true });
        } catch (err) {
            console.error(err);
            setError(err.message || "Something went wrong while saving floor plan");
        } finally {
            setSaving(false);
        }
    };

    return (
        <MasterLayout>
            <div className="container-fluid px-0">
                <Breadcrumb title="Add Floor Plan" />

                {error && (
                    <div className="alert alert-danger mb-4" role="alert">
                        {error}
                    </div>
                )}

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
                                                    disabled={loadingOptions}
                                                >
                                                    <option value="" disabled>
                                                        {loadingOptions ? "Loading projects..." : "Select a Project"}
                                                    </option>
                                                    {projects.map((project) => (
                                                        <option key={project.id} value={project.id}>
                                                            {project.name}
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
                                                    disabled={loadingOptions}
                                                >
                                                    <option value="" disabled>
                                                        {loadingOptions ? "Loading towers..." : "Select a Project Tower"}
                                                    </option>
                                                    {towers.map((tower) => (
                                                        <option key={tower.id} value={tower.id}>
                                                            {tower.name}
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
                                                        <span className="input-group-text bg-base">{formData.measure === "sqm" ? "Sq. m." : "Sq. ft."}</span>
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
                                                        <span className="input-group-text bg-base">{formData.measure === "sqm" ? "Sq. m." : "Sq. ft."}</span>
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
                                                        <span className="input-group-text bg-base">{formData.measure === "sqm" ? "Sq. m." : "Sq. ft."}</span>
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
                                                        <span className="input-group-text bg-base">{formData.measure === "sqm" ? "Sq. m." : "Sq. ft."}</span>
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
                                        <button type="submit" className="btn btn-primary px-30 py-12 radius-12" disabled={saving}>
                                            {saving ? "Saving..." : "Save Floor Plan"}
                                        </button>
                                        <button type="button" className="btn btn-soft-dark px-30 py-12 radius-12" onClick={() => navigate("/floorplans")}>
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

