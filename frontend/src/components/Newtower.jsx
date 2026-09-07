import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "./Breadcrumb";

const initialFormData = {
  towerName: "",
  project: "",
  totalFloors: "",
};

const Newtower = ({ onClose }) => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.projects)) return data.projects;
    if (Array.isArray(data?.towers)) return data.towers;
    return [];
  };
  const getProjectId = (project) => project?.id ?? project?.projectId;
  const getProjectName = (project) =>
    project?.name || project?.projectName || project?.title || (project?.id ? `Project #${project.id}` : "Project");

  const [formData, setFormData] = useState(initialFormData);
  const [projectOptions, setProjectOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        setError("");
        const res = await fetch(`${API_URL}/projects/list`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Unable to load projects");
        setProjectOptions(normalizeList(data));
      } catch (err) {
        console.error(
          "Project API failed:",
          err?.response?.status,
          err?.response?.data,
          err?.message || err
        );
        setError("Unable to load projects. Please try again.");
        setProjectOptions([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const totalFloors = Number(formData.totalFloors);
    if (!formData.project) {
      setError("Please select a project.");
      return;
    }
    if (!formData.towerName.trim()) {
      setError("Tower name is required.");
      return;
    }
    if (!Number.isInteger(totalFloors) || totalFloors < 1) {
      setError("Total floors must be greater than 0.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/tower`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.towerName.trim(),
          projectId: Number(formData.project),
          totalFloor: totalFloors,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result?.message || "Failed to create tower");
      }

      window.alert(result?.message || "Tower created successfully");
      setFormData(initialFormData);

      if (onClose) onClose();
      navigate("/towers", { replace: true });
    } catch (err) {
      console.error(
        "Tower API failed:",
        err?.response?.status,
        err?.response?.data,
        err?.message || err
      );
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MasterLayout>
      <div className="container-fluid px-0">
        <Breadcrumb title="New Tower" />

        {error && (
          <div className="alert alert-danger mt-4 mb-4">{error}</div>
        )}

        <div className="row gx-4">
          <div className="col-12 mb-4">
            <div className="d-flex align-items-center gap-3">
              <span className="text-uppercase fw-semibold text-secondary">
                Step 1
              </span>
              <h4 className="mb-0">All Project Towers</h4>
            </div>
          </div>
        </div>

        <div className="row gx-4">
          <div className="col-12">
            <div className="card radius-12 shadow-sm border-0">
              <div className="card-body p-30">
                <form onSubmit={handleSubmit}>
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h5 className="mb-1">Add New Tower</h5>
                      <p className="mb-0 text-secondary">Create a new tower and map it to a project.</p>
                    </div>
                    {onClose && (
                      <button
                        type="button"
                        className="btn btn-icon btn-soft-dark"
                        onClick={onClose}
                      >
                        <Icon icon="radix-icons:cross-2" />
                      </button>
                    )}
                  </div>

                  <div className="row gy-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Project *
                      </label>
                      <select
                        name="project"
                        value={formData.project}
                        onChange={handleChange}
                        className="form-control"
                        disabled={loadingProjects}
                        required
                      >
                        <option value="">{loadingProjects ? "Loading projects..." : "Select Project"}</option>
                        {projectOptions.map((project) => (
                          <option key={getProjectId(project)} value={getProjectId(project)}>
                            {getProjectName(project)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Tower Name *
                      </label>
                      <input
                        type="text"
                        name="towerName"
                        value={formData.towerName}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="e.g. TOWER F"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Total Floors *
                      </label>
                      <input
                        type="number"
                        name="totalFloors"
                        value={formData.totalFloors}
                        onChange={handleChange}
                        onWheel={(event) => event.currentTarget.blur()}
                        className="form-control"
                        min="1"
                        placeholder="1"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || loadingProjects}
                      >
                        {loading ? "Saving..." : "Save"}
                      </button>
                    </div>
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

export default Newtower;
