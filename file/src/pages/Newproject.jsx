import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

const NEWPROJECT = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    reraProjectId: "",
    salesId: null,
    salesIds: [],
    projectType: "",
    possession: false,
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
  });
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const editorRef = useRef(null);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSalesChange = (e) => {
    const selectedSalesIds = Array.from(e.target.selectedOptions)
      .map((option) => option.value)
      .filter(Boolean)
      .slice(0, 3);

    setFormData({
      ...formData,
      salesId: selectedSalesIds[0] || null,
      salesIds: selectedSalesIds,
    });
  };

  const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : "");

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

    const newProject = {
      name: formData.name,
      description,
      reraProjectId: formData.reraProjectId ? Number(formData.reraProjectId) : null,
      salesId: formData.salesIds.length ? Number(formData.salesIds[0]) : null,
      projectType: formData.projectType,
      possession: parseBoolean(formData.possession),
      address: formData.address,
      street: formData.street,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      zip: formData.zip,
      locality: formData.locality,
      latitude: formData.latitude,
      longitude: formData.longitude,
      noOfTowers: Number(formData.noOfTowers) || 0,
      active: parseBoolean(formData.active),
      inventory: parseBoolean(formData.inventory),
      integratedPortals: formData.integratedPortals || "",
    };

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProject),
      });

      if (!response.ok) {
        throw new Error(`API save failed: ${response.status}`);
      }

      const savedProject = await response.json();
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
      navigate("/projects");
    } catch (error) {
      console.error("Unable to save project to database:", error);
      setSaveError("Project could not be saved to the database. Please make sure the backend and MySQL are running.");
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

          .np-field select[multiple] {
            min-height: 118px;
          }

          .np-help-text {
            color: #64748b;
            font-size: 12px;
            margin-top: 6px;
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
            <p className="np-title">New Project</p>

            <form onSubmit={handleSubmit}>

              {/* PROJECT NAME */}
              <div className="np-field">
                <label>PROJECT NAME *</label>
                <input name="name" value={formData.name} onChange={handleChange} required />
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
                  <input name="reraProjectId" value={formData.reraProjectId} onChange={handleChange} />
                </div>

                <div className="np-field">
                  <label>SALES</label>
                  <select
                    name="salesIds"
                    value={formData.salesIds}
                    onChange={handleSalesChange}
                    disabled={isLoadingUsers}
                    multiple
                  >
                    {isLoadingUsers && <option value="">Loading users...</option>}
                    {users.map((user) => (
                      <option key={user.id || user.email} value={user.id}>
                        {getUserName(user)}
                      </option>
                    ))}
                  </select>
                  <span className="np-help-text">Select up to 3 users.</span>
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
                  <select name="projectType" value={formData.projectType} onChange={handleChange}>
                    <option value="" disabled>Select</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              {/* SEARCH */}
              <div className="np-field">
                <label>SEARCH ADDRESS</label>
                <input name="searchAddress" value={formData.searchAddress || ""} onChange={handleChange} />
              </div>

              {/* ADDRESS + MAP */}
              <div className="np-row">

                {/* LEFT */}
                <div style={{ flex: 2 }}>

                  <div className="np-field">
                    <label>ADDRESS</label>
                    <input name="address" value={formData.address} onChange={handleChange} />
                  </div>

                  <div className="np-row">
                    <div className="np-field">
                      <label>STREET</label>
                      <input name="street" value={formData.street} onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>COUNTRY</label>
                      <select name="country" value={formData.country} onChange={handleChange}>
                        <option value="">Select Country</option>
                        <option value="India">India</option>
                      </select>
                    </div>
                  </div>

                  <div className="np-row">
                    <div className="np-field">
                      <label>STATE</label>
                      <select name="state" value={formData.state} onChange={handleChange}>
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
                      <input name="city" value={formData.city} onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>ZIP</label>
                      <input name="zip" value={formData.zip} onChange={handleChange} />
                    </div>
                  </div>

                  {/* LOCALITY ROW */}
                  <div className="np-row">
                    <div className="np-field" style={{ flex: 2 }}>
                      <label>LOCALITY</label>
                      <input name="locality" value={formData.locality} onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>LATITUDE</label>
                      <input name="latitude" value={formData.latitude} onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>LONGITUDE</label>
                      <input name="longitude" value={formData.longitude} onChange={handleChange} />
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
                <button type="submit" className="np-btn-save" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
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
