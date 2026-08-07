import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "./Breadcrumb";

const Newtower = ({ onClose }) => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    towerName: "",
    project: "",
    totalFloors: "",
    reraTowerId: "",
  });

  const [projectOptions, setProjectOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Handle Input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Fetch Projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_URL}/projects`);
        const data = await res.json();
        setProjectOptions(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load projects");
      }
    };

    fetchProjects();
  }, [API_URL]);

  // ✅ Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body = {
      name: formData.towerName,
      projectId: formData.project ? Number(formData.project) : null,
      totalFloor: formData.totalFloors
        ? Number(formData.totalFloors)
        : 0,
      reraTowerId: formData.reraTowerId,
    };

    try {
      const res = await fetch(`${API_URL}/tower`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let result;
      try {
        result = await res.json(); // safe parse
      } catch {
        result = {};
      }

      if (!res.ok) {
        throw new Error(result.message || "Failed to create tower");
      }

      console.log("Saved:", result);

      // ✅ Success Alert
      alert("Tower Created Successfully ✅");

      // ✅ Close modal if exists
      if (onClose) onClose();

      // ✅ Navigate
      navigate("/towers", { replace: true });

    } catch (err) {
      console.error(err);
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
                  
                  {/* Header */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">Add New Tower</h5>
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

                  {/* Form */}
                  <div className="row gy-4">

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
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Project *
                      </label>
                      <select
                        name="project"
                        value={formData.project}
                        onChange={handleChange}
                        className="form-control"
                        required
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
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
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        RERA Tower ID
                      </label>
                      <input
                        type="text"
                        name="reraTowerId"
                        value={formData.reraTowerId}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>

                    {/* Submit */}
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
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