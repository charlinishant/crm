import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const initialProjectForm = {
  name: "",
  description: "",
  reraProjectId: "",
  salesId: null,
  salesIds: [],
  projectType: "",
  possession: false,
  postSales: false,
  searchAddress: "",
  address: "",
  street: "",
  country: "",
  state: "",
  city: "",
  zip: "",
  locality: "",
  latitude: "",
  longitude: "",
  noOfTowers: "",
  active: false,
  inventory: false,
  integratedPortals: "",
};

const normalizeProjectType = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s*\+\s*/g, "_").replace(/\s+/g, "_");
  if (normalized === "residential") return "residential";
  if (normalized === "commercial") return "commercial";
  if (normalized === "residential_commercial") return "residential_commercial";
  return value || "";
};

const NEWPROJECT = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const editProjectId = searchParams.get("editProjectId");
  const isEditMode = Boolean(editProjectId);

  const [formData, setFormData] = useState(initialProjectForm);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");

  const editorRef = useRef(null);
  const salesDropdownRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch(`${API_URL}/users?limit=1000`);
        if (!response.ok) throw new Error(`Users API failed: ${response.status}`);

        const result = await response.json();
        const userList = Array.isArray(result) ? result : result?.data || result?.users || [];
        setUsers(userList);
      } catch (error) {
        console.error("Unable to load users:", error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [API_URL]);

  useEffect(() => {
    if (!editProjectId) {
      setFormData(initialProjectForm);
      if (editorRef.current) editorRef.current.innerHTML = "";
      return;
    }

    const fetchProject = async () => {
      try {
        setIsLoadingProject(true);
        setSaveError("");

        const response = await fetch(`${API_URL}/projects/${editProjectId}`);
        const project = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(project?.message || "Unable to load project details.");
        }

        const salesIds = Array.isArray(project.salesIds)
          ? project.salesIds.map(String)
          : project.salesId
          ? [String(project.salesId)]
          : [];

        setFormData({
          ...initialProjectForm,
          name: project.name || "",
          description: project.description || "",
          reraProjectId: project.reraProjectId || "",
          salesId: salesIds[0] || null,
          salesIds,
          projectType: normalizeProjectType(project.projectType),
          possession: parseBoolean(project.possession),
          postSales: parseBoolean(project.postSales),
          searchAddress: project.searchAddress || "",
          address: project.address || "",
          street: project.street || "",
          country: project.country || "",
          state: project.state || "",
          city: project.city || "",
          zip: project.zip || "",
          locality: project.locality || "",
          latitude: project.latitude || "",
          longitude: project.longitude || "",
          noOfTowers: project.noOfTowers || "",
          active: parseBoolean(project.active),
          inventory: parseBoolean(project.inventory),
          integratedPortals: project.integratedPortals || "",
        });

        if (editorRef.current) {
          editorRef.current.innerHTML = project.description || "";
        }
      } catch (error) {
        console.error("Unable to load project:", error);
        setSaveError(error.message || "Unable to load project details.");
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProject();
  }, [API_URL, editProjectId]);

  useEffect(() => {
    const closeSalesDropdown = (event) => {
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target)) {
        setIsSalesOpen(false);
      }
    };

    document.addEventListener("mousedown", closeSalesDropdown);
    return () => document.removeEventListener("mousedown", closeSalesDropdown);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : "");

  const selectedSalesUsers = formData.salesIds
    .map((id) => users.find((user) => String(user.id) === String(id)))
    .filter(Boolean);

  const filteredSalesUsers = users.filter((user) =>
    getUserName(user).toLowerCase().includes(salesSearch.trim().toLowerCase())
  );

  const toggleSalesUser = (userId) => {
    const id = String(userId);
    setFormData((current) => {
      const isSelected = current.salesIds.includes(id);
      if (!isSelected && current.salesIds.length >= 3) {
        setSaveError("Select at most 3 sales users.");
        return current;
      }

      const salesIds = isSelected
        ? current.salesIds.filter((selectedId) => selectedId !== id)
        : [...current.salesIds, id];

      setSaveError("");
      return {
        ...current,
        salesIds,
        salesId: salesIds[0] || null,
      };
    });
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  const parseBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (!value) return false;
    const normalized = value.toString().trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  };

  const mapQuery =
    formData.latitude && formData.longitude
      ? `${formData.latitude},${formData.longitude}`
      : [
        formData.searchAddress,
        formData.address,
        formData.street,
        formData.locality,
        formData.city,
        formData.state,
        formData.country,
        formData.zip,
      ]
        .filter(Boolean)
        .join(", ");
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery || "India")}&output=embed`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError("");

    if (formData.salesIds.length > 3) {
      setIsSaving(false);
      setSaveError("Select at most 3 sales users.");
      return;
    }

    const description = editorRef.current?.innerHTML || "";

    const projectPayload = {
      name: formData.name,
      description,
      reraProjectId: formData.reraProjectId ? Number(formData.reraProjectId) : null,
      salesId: formData.salesIds.length ? Number(formData.salesIds[0]) : null,
      salesIds: formData.salesIds.map(Number),
      projectType: formData.projectType,
      possession: parseBoolean(formData.possession),
      postSales: parseBoolean(formData.postSales),
      address: formData.address,
      street: formData.street,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      zip: formData.zip,
      locality: formData.locality,
      latitude: formData.latitude,
      longitude: formData.longitude,
      integratedPortals: formData.integratedPortals || "",
    };

    try {
      const response = await fetch(`${API_URL}/projects${isEditMode ? `/${editProjectId}` : ""}`, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectPayload),
      });

      const savedProject = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(savedProject?.message || `API save failed: ${response.status}`);
      }

      if (!isEditMode) {
        const savedProjects = JSON.parse(
          window.localStorage.getItem("savedProjects") || "[]"
        );
        const projectToStore = {
          id: savedProject.id || Date.now(),
          ...savedProject,
          createdAt: savedProject.createdAt || new Date().toISOString(),
        };

        window.localStorage.setItem(
          "savedProjects",
          JSON.stringify([...savedProjects, projectToStore])
        );
      }

      window.alert(isEditMode ? "Project updated successfully!" : "Project created successfully!");
      navigate("/projects");
    } catch (error) {
      console.error("Unable to save project to database:", error);
      setSaveError(error.message || "Project could not be saved to the database. Please make sure the backend and MySQL are running.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MasterLayout>
      <>
        <style>{`
          .np-page {
            padding: 24px;
            background: #f8fafc;
            min-height: 100vh;
          }

          .np-container {
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            padding: 30px;
            max-width: 1200px;
            margin: auto;
          }

          .np-title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 28px;
          }

          .np-field {
            display: flex;
            flex-direction: column;
            margin-bottom: 20px;
            width: 100%;
          }

          .np-field label {
            font-size: 13px;
            margin-bottom: 6px;
            color: #475569;
          }

          .np-field input,
          .np-field select {
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }

          .np-help-text {
            color: #64748b;
            font-size: 12px;
            margin-top: 6px;
          }

          .np-multi-select {
            position: relative;
          }

          .np-multi-control {
            min-height: 48px;
            width: 100%;
            padding: 7px 38px 7px 8px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #fff;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            cursor: pointer;
            text-align: left;
          }

          .np-multi-control:focus,
          .np-multi-control.open {
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
            outline: none;
          }

          .np-multi-placeholder {
            color: #94a3b8;
          }

          .np-sales-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 8px;
            border-radius: 5px;
            background: #ede9fe;
            color: #6d28d9;
            font-size: 12px;
            font-weight: 600;
          }

          .np-chip-remove {
            border: 0;
            padding: 0;
            background: transparent;
            color: #6d28d9;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
          }

          .np-multi-arrow {
            position: absolute;
            right: 13px;
            top: 14px;
            color: #64748b;
            pointer-events: none;
          }

          .np-multi-menu {
            position: absolute;
            z-index: 20;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            padding: 8px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
          }

          .np-sales-search {
            width: 100%;
            margin-bottom: 7px;
            padding: 9px 10px !important;
          }

          .np-sales-options {
            max-height: 210px;
            overflow-y: auto;
          }

          .np-sales-option {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 0 !important;
            padding: 9px 8px;
            border-radius: 5px;
            color: #334155 !important;
            cursor: pointer;
          }

          .np-sales-option:hover {
            background: #f5f3ff;
          }

          .np-sales-option.selected {
            background: #f8f5ff;
            color: #1e293b !important;
            font-weight: 600;
          }

          .np-sales-option.disabled {
            opacity: 0.48;
            cursor: not-allowed;
          }

          .np-sales-option input {
            height: 1px;
            opacity: 0;
            pointer-events: none;
            position: absolute;
            width: 1px;
          }

          .np-sales-option-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .np-sales-option-tick {
            color: #2563eb;
            font-size: 18px;
            font-weight: 800;
            line-height: 1;
            min-width: 18px;
            text-align: right;
          }

          .np-sales-empty {
            padding: 12px;
            color: #64748b;
            text-align: center;
            font-size: 13px;
          }

          .np-row {
            display: flex;
            gap: 20px;
          }

          .np-editor-wrapper {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }

          .np-toolbar {
            display: flex;
            gap: 5px;
            padding: 8px;
            border-bottom: 1px solid #e2e8f0;
          }

          .np-toolbar-btn {
            padding: 5px 8px;
            border: 1px solid #ddd;
            cursor: pointer;
            background: #fff;
          }

          .np-editor-body {
            min-height: 150px;
            padding: 10px;
          }

          .np-buttons {
            display: flex;
            gap: 10px;
          }

          .np-btn-save {
            background: #7c3aed;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
          }

          .np-btn-cancel {
            background: #ddd;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
          }
        `}</style>

        <div className="np-page">
          <div className="np-container">
            <p className="np-title">{isEditMode ? "Edit Project" : "New Project"}</p>

            <form onSubmit={handleSubmit}>

              {/* PROJECT NAME */}
              <div className="np-field">
                <label>PROJECT NAME *</label>
                <input name="name" value={formData.name} onChange={handleChange} required disabled={isLoadingProject} />
              </div>

              {/* DESCRIPTION */}
              <div className="np-field">
                <label>DESCRIPTION</label>
                <div className="np-editor-wrapper">
                  <div className="np-toolbar">
                    <button type="button" onClick={() => handleFormat("bold")} className="np-toolbar-btn">B</button>
                    <button type="button" onClick={() => handleFormat("italic")} className="np-toolbar-btn">I</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    className="np-editor-body"
                  ></div>
                </div>
              </div>

              {/* RERA + SALES */}
              <div className="np-row">
                <div className="np-field">
                  <label>RERA PROJECT ID</label>
                  <input name="reraProjectId" value={formData.reraProjectId} onChange={handleChange} disabled={isLoadingProject} />
                </div>

                <div className="np-field">
                  <label>SALES</label>
                  <div className="np-multi-select" ref={salesDropdownRef}>
                    <button
                      type="button"
                      className={`np-multi-control ${isSalesOpen ? "open" : ""}`}
                      onClick={() => !isLoadingUsers && !isLoadingProject && setIsSalesOpen((open) => !open)}
                      disabled={isLoadingUsers || isLoadingProject}
                    >
                      {selectedSalesUsers.length ? selectedSalesUsers.map((user) => (
                        <span className="np-sales-chip" key={user.id}>
                          {getUserName(user)}
                          <span
                            className="np-chip-remove"
                            role="button"
                            tabIndex={0}
                            aria-label={`Remove ${getUserName(user)}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSalesUser(user.id);
                            }}
                          >×</span>
                        </span>
                      )) : (
                        <span className="np-multi-placeholder">
                          {isLoadingUsers ? "Loading users..." : "Select sales users"}
                        </span>
                      )}
                    </button>
                    <span className="np-multi-arrow">⌄</span>

                    {isSalesOpen && (
                      <div className="np-multi-menu">
                        <input
                          type="search"
                          className="np-sales-search"
                          placeholder="Search users..."
                          value={salesSearch}
                          onChange={(event) => setSalesSearch(event.target.value)}
                          autoFocus
                        />
                        <div className="np-sales-options">
                          {filteredSalesUsers.length ? filteredSalesUsers.map((user) => {
                            const id = String(user.id);
                            const isSelected = formData.salesIds.includes(id);
                            return (
                              <label
                                className={`np-sales-option ${isSelected ? "selected" : ""}`}
                                key={user.id || user.email}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSalesUser(id)}
                                />
                                <span className="np-sales-option-name">{getUserName(user)}</span>
                                <span className="np-sales-option-tick" aria-hidden="true">
                                  {isSelected ? "✓" : ""}
                                </span>
                              </label>
                            );
                          }) : (
                            <div className="np-sales-empty">No users found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="np-help-text">Select up to 3 sales users.</span>
                </div>
              </div>

              {/* PRE SALES */}
              {/*  */}

              {/* POSSESSION + TYPE */}
              <div className="np-row">
                {/* <div className="np-field">
                  <label>POSSESSION</label>
                  <input name="possession" value={formData.possession} onChange={handleChange} />
                </div> */}

                <div className="np-field">
                  <label>PROJECT TYPE</label>
                  <select name="projectType" value={formData.projectType} onChange={handleChange} disabled={isLoadingProject}>
                    <option value="" disabled>Select</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="residential_commercial">Residential + Commercial</option>
                  </select>
                </div>

                <div className="np-field">
                  <label>POST SALES</label>
                  <select name="postSales" value={String(formData.postSales)} onChange={handleChange} disabled={isLoadingProject}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>

              {/* SEARCH */}
              <div className="np-field">
                <label>SEARCH ADDRESS</label>
                <input name="searchAddress" value={formData.searchAddress || ""} onChange={handleChange} disabled={isLoadingProject} />
              </div>

              {/* ADDRESS + MAP */}
              <div className="np-row">

                {/* LEFT */}
                <div style={{ flex: 2 }}>

                  <div className="np-field">
                    <label>ADDRESS</label>
                    <input name="address" value={formData.address} onChange={handleChange} disabled={isLoadingProject} />
                  </div>

                  <div className="np-row">
                    <div className="np-field">
                      <label>STREET</label>
                      <input name="street" value={formData.street} onChange={handleChange} disabled={isLoadingProject} />
                    </div>

                    <div className="np-field">
                      <label>COUNTRY</label>
                      <select name="country" value={formData.country} onChange={handleChange} disabled={isLoadingProject}>
                        <option value="">Select Country</option>
                        <option value="India">India</option>
                      </select>
                    </div>
                  </div>

                  <div className="np-row">
                    <div className="np-field">
                      <label>STATE</label>
                      <select name="state" value={formData.state} onChange={handleChange} disabled={isLoadingProject}>
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="np-field">
                      <label>CITY</label>
                      <input name="city" value={formData.city} onChange={handleChange} disabled={isLoadingProject} />
                    </div>

                    <div className="np-field">
                      <label>ZIP</label>
                      <input name="zip" value={formData.zip} onChange={handleChange} disabled={isLoadingProject} />
                    </div>
                  </div>

                  {/* LOCALITY ROW */}
                  <div className="np-row">
                    <div className="np-field" style={{ flex: 2 }}>
                      <label>LOCALITY</label>
                      <input name="locality" value={formData.locality} onChange={handleChange} disabled={isLoadingProject} />
                    </div>

                    <div className="np-field">
                      <label>LATITUDE</label>
                      <input name="latitude" value={formData.latitude} onChange={handleChange} disabled={isLoadingProject} />
                    </div>

                    <div className="np-field">
                      <label>LONGITUDE</label>
                      <input name="longitude" value={formData.longitude} onChange={handleChange} disabled={isLoadingProject} />
                    </div>
                  </div>

                </div>

                {/* MAP */}
                <div style={{ flex: 1 }}>
                  <iframe
                    title="map"
                    width="100%"
                    height="300"
                    src={mapSrc}
                  ></iframe>
                </div>

              </div>

              {/* BUTTONS */}
              {saveError && (
                <p style={{ color: "#dc2626", marginBottom: 12 }}>{saveError}</p>
              )}
              <div className="np-buttons">
                <button type="submit" className="np-btn-save" disabled={isSaving || isLoadingProject}>
                  {isSaving ? "Saving..." : isEditMode ? "Update" : "Save"}
                </button>
                <button type="button" className="np-btn-cancel" onClick={() => navigate("/projects")}>Cancel</button>
              </div>

            </form>
          </div>
        </div>
      </>
    </MasterLayout>
  );
};

export default NEWPROJECT;
