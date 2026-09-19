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
  elevationPhoto: "",
  image: "",
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
          elevationPhoto: project.elevationPhoto || project.image || "",
          image: project.image || project.elevationPhoto || "",
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

  const areAllSalesUsersSelected = users.length > 0 && users.every((user) =>
    formData.salesIds.includes(String(user.id))
  );

  const toggleAllSalesUsers = () => {
    setFormData((current) => {
      const salesIds = areAllSalesUsersSelected ? [] : users.map((user) => String(user.id));

      return {
        ...current,
        salesIds,
        salesId: salesIds[0] || null,
      };
    });
    setSaveError("");
  };

  const toggleSalesUser = (userId) => {
    const id = String(userId);
    setFormData((current) => {
      const isSelected = current.salesIds.includes(id);
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

              {/* BUILDING ELEVATION / PROJECT PHOTO */}
              <div className="np-field">
                <label>BUILDING ELEVATION / PHOTO</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input
                    type="text"
                    name="elevationPhoto"
                    placeholder="Enter image URL or browse image file"
                    value={formData.elevationPhoto || formData.image || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, elevationPhoto: val, image: val }));
                    }}
                    disabled={isLoadingProject}
                  />
                  <label className="np-file-upload-btn" style={{ cursor: "pointer", background: "#f1f5f9", padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", whiteSpace: "nowrap", fontWeight: "500", fontSize: "13px" }}>
                    📁 Browse
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const dataUrl = event.target?.result;
                            if (dataUrl) {
                              setFormData((prev) => ({ ...prev, elevationPhoto: dataUrl, image: dataUrl }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {(formData.elevationPhoto || formData.image) && (
                  <div style={{ marginTop: "10px", position: "relative", display: "inline-block" }}>
                    <img
                      src={formData.elevationPhoto || formData.image}
                      alt="Building Elevation Preview"
                      style={{ height: "110px", width: "180px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, elevationPhoto: "", image: "" }))}
                      style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                )}
                <span className="np-help-text">Elevation/building image displayed on Level 1 of Preview Inventory.</span>
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
                          <label className={`np-sales-option np-sales-option-all ${areAllSalesUsersSelected ? "selected" : ""}`}>
                            <input
                              type="checkbox"
                              checked={areAllSalesUsersSelected}
                              onChange={toggleAllSalesUsers}
                            />
                            <span className="np-sales-option-name">Select all</span>
                            <span className="np-sales-option-tick" aria-hidden="true">
                              {areAllSalesUsersSelected ? "✓" : ""}
                            </span>
                          </label>
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
                  <span className="np-help-text">Select one or more sales users.</span>
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
                <div className="np-address-panel">

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
                    <div className="np-field np-field-wide">
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
                <div className="np-map-panel">
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
                <p className="np-save-error">{saveError}</p>
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
