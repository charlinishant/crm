import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import RoleUserDropdown, { useRoleUsers, getUserDisplayName } from "../components/common/RoleUserDropdown";

// ✅ AddSection defined OUTSIDE ADDLEAD
const AddSection = ({ label, renderFields, defaultItem }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    setItems([...items, { ...defaultItem }]);
    setIsOpen(true);
  };

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleRemove = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    if (updated.length === 0) setIsOpen(false);
  };

  return (
    <div className="section-wrapper">
      <div className="section-header">
        <span className="section-header-label">{label}</span>
        <button type="button" className="section-add-btn" onClick={handleAdd}>
          + Add
        </button>
      </div>

      {isOpen &&
        items.map((item, index) => (
          <div key={index} className="section-card">
            {renderFields(item, index, handleChange, handleRemove)}
          </div>
        ))}
    </div>
  );
};

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const LEAD_STATUSES = [
  "New",
  "Qualified",
  "In_sourcing",
  "In_closing",
  "Booked",
  "Nurture",
];

const createEmptyLeadForm = () => ({
  salutation: "",
  firstName: "",
  lastName: "",
  emails: [{ type: "Office", value: "" }],
  phones: [{ type: "Work", value: "" }],
  status: "New",
  timeZone: "",
  tags: "",
  interestedProjects: "",
  teamId: "",
  channelPartner: "",
  conductSiteVisit: "",
  conductSiteDate: null,
  leadAddress: [{
    address: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    zip: ""
  }],
  companyName: "",
  type: "MEETINGROOMS",
  carpetArea: "",
  seats: 0,
  tenure: 0.0,
  gender: "MALE",
  occupations: "",
  age: 0,
  birthday: null,
  maritalStatus: false,
  married: false,
  anniversary: null,
  industry: "",
  personalAddress: [{
    address: "",
    street: "",
    city: "",
    state: "",
    country: "",
    zip: ""
  }],
  url: "",
  education: "",
  companyTitle: "",
  income: "",
  basiComment: "",
  purpose: "",
  enduse: false,
  investor: false,
  nri: false,
  budgetMin: 0,
  budgetMax: 0,
  possessionMin: "",
  possessionMax: "",
  area: "",
  fundingSouurce: "",
  propertyType: "",
  configration: "",
  budget: "",
  bathroomPreferences: "",
  furnishing: "",
  facing: "",
  locationPreferences: "",
  requirementComment: "",
});

const getLeadRecordId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const normalizeLeadStatus = (value) => {
  const normalizedValue = String(value || "").trim()
  const statusMap = {
    "New": "New",
    "new": "New",
    "Qualified": "Qualified",
    "qualified": "Qualified",
    "In_sourcing": "In_sourcing",
    "In Sourcing": "In_sourcing",
    "in_sourcing": "In_sourcing",
    "in sourcing": "In_sourcing",
    "In_closing": "In_closing",
    "In Closing": "In_closing",
    "in_closing": "In_closing",
    "in closing": "In_closing",
    "Booked": "Booked",
    "booked": "Booked",
    "Nurture": "Nurture",
    "nurture": "Nurture",
  };

  return statusMap[normalizedValue] || "New";
};

const normalizeGender = (value) => {
  const gender = String(value || "").trim().toUpperCase();
  if (gender === "FEMALE") return "FEMALE";
  if (gender === "MALE") return "MALE";
  if (gender === "OTHER") return null;
  return null;
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (String(value).toLowerCase() === "yes") return true;
  if (String(value).toLowerCase() === "no") return false;
  return Boolean(value);
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const normalizeContactList = (value, fallbackType) => {
  if (Array.isArray(value) && value.length) {
    return value.map((item) => {
      if (typeof item === "string") return { type: fallbackType, value: item };
      return { type: item?.type || fallbackType, value: item?.value || "" };
    });
  }

  if (typeof value === "string" && value.trim()) {
    return [{ type: fallbackType, value }];
  }

  return [{ type: fallbackType, value: "" }];
};

const buildLeadFormData = (lead) => {
  const emptyForm = createEmptyLeadForm();
  const leadAddress = Array.isArray(lead?.leadAddress) && lead.leadAddress.length
    ? lead.leadAddress
    : [{
      ...emptyForm.leadAddress[0],
      address: lead?.address || "",
      street: lead?.street || "",
      city: lead?.city || "",
      state: lead?.state || "",
      country: lead?.country || "India",
      zip: lead?.zip || "",
    }];

  return {
    ...emptyForm,
    ...lead,
    emails: normalizeContactList(lead?.emails || lead?.email, "Office"),
    phones: normalizeContactList(lead?.phones || lead?.phone, "Work"),
    leadAddress,
    personalAddress: Array.isArray(lead?.personalAddress) && lead.personalAddress.length
      ? lead.personalAddress
      : emptyForm.personalAddress,
    birthday: formatDateInput(lead?.birthday),
    anniversary: formatDateInput(lead?.anniversary),
    conductSiteDate: formatDateInput(lead?.conductSiteDate),
    teamId: lead?.teamId ? String(lead.teamId) : "",
    maritalStatus: Boolean(lead?.maritalStatus || lead?.married),
    married: Boolean(lead?.maritalStatus || lead?.married),
    enduse: String(lead?.purpose || "").toLowerCase().includes("end use") || Boolean(lead?.enduse),
    investor: String(lead?.purpose || "").toLowerCase().includes("investor") || Boolean(lead?.investor),
    nri: Boolean(lead?.nri),
  };
};

const buildLeadPayload = (data, mode = "create") => {
  const payload = {
    salutation: data.salutation,
    firstName: data.firstName,
    lastName: data.lastName,
    emails: data.emails,
    phones: data.phones,
    status: normalizeLeadStatus(data.status),
    timeZone: data.timeZone,
    tags: data.tags,
    interestedProjects: data.interestedProjects,
    teamId: data.teamId ? Number(data.teamId) : null,
    channelPartner: data.channelPartner,
    conductSiteVisit: data.conductSiteVisit,
    conductSiteDate: data.conductSiteDate || null,
    companyName: data.companyName,
    type: data.type,
    carpetArea: data.carpetArea,
    seats: Number(data.seats) || 0,
    tenure: Number(data.tenure) || 0,
    leadReassigned: normalizeBoolean(data.leadReassigned),
    gender: normalizeGender(data.gender),
    occupations: data.occupations,
    age: Number(data.age) || 0,
    birthday: data.birthday || null,
    maritalStatus: normalizeBoolean(data.maritalStatus),
    anniversary: data.anniversary || null,
    industry: data.industry || "",
    url: data.url,
    education: data.education,
    companyTitle: data.companyTitle,
    income: data.income,
    purpose: data.enduse && data.investor ? "End use, Investor" : data.enduse ? "End use" : data.investor ? "Investor" : data.purpose || "",
    nri: normalizeBoolean(data.nri),
    budgetMin: Number(data.budgetMin) || 0,
    budgetMax: Number(data.budgetMax) || 0,
    possessionMin: data.possessionMin,
    possessionMax: data.possessionMax,
    area: data.area,
    fundingSource: data.fundingSource || data.fundingSouurce || "",
    propertyType: data.propertyType || data.propertyTypes || "",
    configration: data.configration || data.configuration || "",
    budget: data.budget,
    bathroomPreferences: data.bathroomPreferences,
    furnishing: data.furnishing,
    facing: data.facing,
    locationPreferences: data.locationPreferences,
    basiComment: data.basiComment || "", // Add comment field
  };

  const leadAddress = (Array.isArray(data.leadAddress) ? data.leadAddress : [])
    .map(({ address, street, city, state, country, zip }) => ({
      address,
      street,
      city,
      state,
      country,
      zip,
    }));
  const personalAddress = (Array.isArray(data.personalAddress) ? data.personalAddress : [])
    .map(({ address, street, city, state, country, zip }) => ({
      address,
      street,
      city,
      state,
      country,
      zip,
    }));

  if (mode === "create") {
    payload.leadAddress = leadAddress;
    payload.personalAddress = personalAddress;
  }

  if (mode === "update") {
    payload.leadAddress = {
      deleteMany: {},
      create: leadAddress,
    };
    payload.personalAddress = {
      deleteMany: {},
      create: personalAddress,
    };
  }

  return payload;
};

const ADDLEAD = () => {
  const [activeTab, setActiveTab] = useState("basic");
  const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");
  
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState(createEmptyLeadForm);
  const [editLeadId, setEditLeadId] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { users: salesUsers, loading: loadingSales } = useRoleUsers("SALES");
  const { users: channelPartners, loading: loadingCP } = useRoleUsers("CHANNEL_PARTNER");
  const loadingUsers = loadingSales || loadingCP;
  const users = useMemo(() => [...(salesUsers || []), ...(channelPartners || [])], [salesUsers, channelPartners]);
  const [formErrors, setFormErrors] = useState({});

  const getUserName = (user) => getUserDisplayName(user);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_URL}/projects/list`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Unable to load projects");
        }

        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [API_URL]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryLeadId = params.get("editLeadId") || "";
    const stateLead = location.state?.lead || null;
    const isCreateMode = location.state?.mode === "create" || (!queryLeadId && !stateLead);
    let storedLead = null;

    if (isCreateMode) {
      window.sessionStorage.removeItem("selectedLeadEdit");
      setEditLeadId("");
      setFormData(createEmptyLeadForm());
      setFormErrors({});
      setActiveTab("basic");
      return;
    }

    try {
      storedLead = JSON.parse(window.sessionStorage.getItem("selectedLeadEdit") || "null");
    } catch (error) {
      storedLead = null;
    }

    const seedLead = stateLead || storedLead;
    const nextEditLeadId = queryLeadId || getLeadRecordId(seedLead);

    if (!nextEditLeadId && !seedLead) {
      setEditLeadId("");
      return;
    }

    setEditLeadId(nextEditLeadId);

    if (seedLead) {
      setFormData(buildLeadFormData(seedLead));
    }

    if (!nextEditLeadId) return;

    const fetchLeadForEdit = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_URL}/leads/${nextEditLeadId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const lead = await response.json();
        setFormData(buildLeadFormData(lead?.data || lead));
      } catch (error) {
        console.error("Unable to load lead for edit:", error);
      }
    };

    fetchLeadForEdit();
  }, [API_URL, location.search, location.state]);

  const handleCheckboxToggle = (name, forceVal) => {
    setFormData((prev) => {
      const nextVal = typeof forceVal === "boolean" ? forceVal : !prev[name];
      const updates = { [name]: nextVal };
      if (name === "maritalStatus") {
        updates.married = nextVal;
      }
      return { ...prev, ...updates };
    });
    setFormErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const resolvedValue = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const updates = { [name]: resolvedValue };
      if (name === "maritalStatus") {
        updates.married = resolvedValue;
      }
      return {
        ...prev,
        ...updates,
      };
    });
    setFormErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleLeadAddressChange = (field, value) => {
    setFormData((prev) => {
      const leadAddress = prev.leadAddress.length ? [...prev.leadAddress] : [{}];
      leadAddress[0] = {
        ...leadAddress[0],
        [field]: value,
        ...(field === "country" ? { state: "" } : {}),
      };

      return { ...prev, leadAddress };
    });
  };

  // EMAIL
  const handleEmailChange = (index, field, value) => {
    const updated = [...formData.emails];
    updated[index][field] = value;
    setFormData({ ...formData, emails: updated });
    setFormErrors((current) => ({ ...current, emails: "" }));
  };

  const addEmail = () => {
    setFormData({
      ...formData,
      emails: [...formData.emails, { type: "Office", value: "" }],
    });
  };

  const removeEmail = (index) => {
    const updated = formData.emails.filter((_, i) => i !== index);
    setFormData({ ...formData, emails: updated });
  };

  // PHONE
  const handlePhoneChange = (index, field, value) => {
    const updated = [...formData.phones];
    updated[index][field] = field === "value" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setFormData({ ...formData, phones: updated });
    setFormErrors((current) => ({ ...current, phones: "" }));
  };

  const addPhone = () => {
    setFormData({
      ...formData,
      phones: [...formData.phones, { type: "Work", value: "" }],
    });
  };

  const removePhone = (index) => {
    const updated = formData.phones.filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updated });
  };

  const validateLeadForm = () => {
    const errors = {};
    const validEmails = formData.emails.filter((email) => email.value?.trim());
    const validPhones = formData.phones.filter((phone) => phone.value?.trim());

    if (!formData.firstName.trim()) errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
    if (!validEmails.length) errors.emails = "Primary email is required.";
    if (validEmails.some((email) => !EMAIL_REGEX.test(email.value.trim()))) {
      errors.emails = "Enter a valid email address.";
    }
    if (!validPhones.length) errors.phones = "Primary phone is required.";
    if (validPhones.some((phone) => !PHONE_REGEX.test(phone.value.trim()))) {
      errors.phones = "Phone number must be exactly 10 digits.";
    }
    if (Number(formData.budgetMin) < 0 || Number(formData.budgetMax) < 0) {
      errors.budget = "Budget cannot be negative.";
    }
    if (Number(formData.budgetMax) && Number(formData.budgetMin) > Number(formData.budgetMax)) {
      errors.budget = "Min budget cannot be greater than max budget.";
    }
    if (Number(formData.seats) < 0) errors.seats = "Seats cannot be negative.";
    if (Number(formData.tenure) < 0) errors.tenure = "Tenure cannot be negative.";

    return errors;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors = validateLeadForm();
    setFormErrors(errors);

    if (Object.keys(errors).length) {
      setActiveTab("basic");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildLeadPayload(formData, editLeadId ? "update" : "create");
      const requestUrl = editLeadId ? `${API_URL}/leads/${editLeadId}` : `${API_URL}/leads`;
      const requestMethod = editLeadId ? "PATCH" : "POST";
      const token = localStorage.getItem("authToken");

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        window.sessionStorage.removeItem("selectedLeadEdit");
        alert(`Lead ${editLeadId ? "updated" : "created"} successfully!`);
        navigate("/leads", { state: { refreshLeads: Date.now() } });
      } else {
        const errorMessage = responseData?.message || 
                           responseData?.error || 
                           `Error: ${response.status} ${response.statusText}`;
        console.error("❌ Save failed:", errorMessage);
        alert(`Failed to save lead: ${errorMessage}`);
      }
    } catch (err) {
      console.error("❌ Network/Server Error:", err);
      alert(`Error saving lead: ${err.message || "Something went wrong"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MasterLayout>
      <div className="lead-page">
        <div className="lead-container">
          <p className="lead-title">{editLeadId ? "Edit Lead" : "Add New Leads"}</p>

          {/* Tabs */}
          <div className="lead-tabs">
            <button
              className={activeTab === "basic" ? "active" : ""}
              onClick={() => setActiveTab("basic")}
            >
              Basic Profile
            </button>

            <button
              className={activeTab === "personal" ? "active" : ""}
              onClick={() => setActiveTab("personal")}
            >
              Personal Details
            </button>

            <button
              className={activeTab === "requirement" ? "active" : ""}
              onClick={() => setActiveTab("requirement")}
            >
              Requirement
            </button>
          </div>

          <form onSubmit={handleSubmit} className="lead-form">

            {/* ===================== BASIC PROFILE ===================== */}
            {activeTab === "basic" && (
              <>
                {/* NAME */}
                <div className="lead-group lead-full">
                  <label>SALUTATION & NAME</label>
                  <div className="lead-row">
                    <select name="salutation" value={formData.salutation} onChange={handleChange}>
                      <option>Select option</option>
                      <option>Dr.</option>
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                    </select>
                    <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                    <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
                  </div>
                  {formErrors.firstName && <p className="lead-error">{formErrors.firstName}</p>}
                  {formErrors.lastName && <p className="lead-error">{formErrors.lastName}</p>}
                </div>

                {/* EMAIL */}
                <div className="lead-group lead-full">
                  <label>PRIMARY EMAIL *</label>
                  {formData.emails.map((email, index) => (
                    <div className="lead-row lead-row-action" key={index}>
                      <select
                        value={email.type}
                        onChange={(e) => handleEmailChange(index, "type", e.target.value)}
                      >
                        <option>Office</option>
                        <option>Personal</option>
                      </select>
                      <input
                        type="email"
                        placeholder={index === 0 ? "Primary Email" : "Secondary Email"}
                        value={email.value}
                        onChange={(e) => handleEmailChange(index, "value", e.target.value)}
                        required={index === 0}
                      />
                      {index === 0 ? (
                        <button type="button" className="lead-add" onClick={addEmail}>+ Add</button>
                      ) : (
                        <button type="button" className="lead-remove" onClick={() => removeEmail(index)}>❌</button>
                      )}
                    </div>
                  ))}
                  {formErrors.emails && <p className="lead-error">{formErrors.emails}</p>}
                </div>

                {/* PHONE */}
                <div className="lead-group lead-full">
                  <label>PRIMARY PHONE *</label>
                  {formData.phones.map((phone, index) => (
                    <div className="lead-row lead-row-action" key={index}>
                      <select
                        value={phone.type}
                        onChange={(e) => handlePhoneChange(index, "type", e.target.value)}
                      >
                        <option>Work</option>
                        <option>Personal</option>
                      </select>
                      <div className="lead-phone">
                        <span>🇮🇳</span>
                        <input
                          placeholder={index === 0 ? "Primary Phone" : "Secondary Phone"}
                          value={phone.value}
                          inputMode="numeric"
                          maxLength={10}
                          pattern="[0-9]{10}"
                          onChange={(e) => handlePhoneChange(index, "value", e.target.value)}
                          required={index === 0}
                        />
                      </div>
                      {index === 0 ? (
                        <button type="button" className="lead-add" onClick={addPhone}>+ Add</button>
                      ) : (
                        <button type="button" className="lead-remove" onClick={() => removePhone(index)}>❌</button>
                      )}
                    </div>
                  ))}
                  <p className="lead-hint">Enter phone number (country code pre-added).</p>
                  {formErrors.phones && <p className="lead-error">{formErrors.phones}</p>}
                </div>

                {/* GENDER */}
                <div className="lead-group lead-full">
                  <label>GENDER</label>
                  <select name="gender" value={formData.gender || ""} onChange={handleChange}>
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* TIMEZONE */}
                <div className="lead-group lead-full">
                  <label>STATUS</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TIMEZONE */}
                <div className="lead-group lead-full">
                  <label>TIME ZONE</label>
                  <select name="timeZone" value={formData.timeZone} onChange={handleChange}>
                    <option>Asia/Kolkata</option>
                    <option>UTC</option>
                  </select>
                </div>

                {/* TAGS */}
                {/* <div className="lead-group lead-full">
                  <label>TAGS</label>
                  <input name="tags" placeholder="Add tags" value={formData.tags} onChange={handleChange} />
                </div> */}

                {/* INTERESTED PROJECTS */}
                <div className="lead-group lead-full">
                  <label>INTERESTED PROJECTS</label>
                  <select
                    name="interestedProjects"
                    value={formData.interestedProjects}
                    onChange={handleChange}
                    disabled={loadingProjects}
                  >
                    <option value="">
                      {loadingProjects ? "Loading projects..." : "Select project"}
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ASSIGNED TO / SALES EXECUTIVE */}
                <div className="lead-group lead-full">
                  <label>ASSIGNED TO (SALES EXECUTIVE)</label>
                  <select
                    name="teamId"
                    value={formData.teamId}
                    onChange={handleChange}
                    disabled={loadingUsers}
                  >
                    <option value="">
                      {loadingUsers ? "Loading users..." : "Select sales executive"}
                    </option>
                    {salesUsers.map((user) => (
                      <option key={user.id || user.email} value={user.id}>
                        {getUserName(user)}
                        {user.role ? ` (${user.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CHANNEL PARTNER */}
                <div className="lead-group lead-full">
                  <label>CHANNEL PARTNER</label>
                  <div className="lead-row-action">
                    <select
                      name="channelPartner"
                      value={formData.channelPartner}
                      onChange={handleChange}
                      disabled={loadingUsers}
                    >
                      <option value="">
                        {loadingUsers ? "Loading channel partners..." : "Select Channel Partner"}
                      </option>
                      {formData.channelPartner && !channelPartners.some(
                        (user) => getUserName(user) === formData.channelPartner
                      ) && (
                        <option value={formData.channelPartner}>{formData.channelPartner}</option>
                      )}
                      {channelPartners.map((user) => {
                        const name = getUserName(user);
                        return (
                          <option key={user.id || user.email} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    {/* <button type="button" className="lead-add">
                      + Add Channel Partner
                    </button> */}
                  </div>
                </div>

                {/* SITE VISIT */}
                <div className="lead-group lead-full">
                  <label>SCHEDULE AND CONDUCT SITE VISIT FOR PROJECT</label>
                  <input type="text" name="conductSiteVisit" placeholder="Select Project / Schedule Visit" value={formData.conductSiteVisit} onChange={handleChange} />
                </div>

                {/* ADDRESS & STREET */}
                <div className="lead-group lead-full">
                  <label>ADDRESS & STREET</label>
                  <div className="lead-grid">
                    <input type="text" placeholder="Address" value={formData.leadAddress[0]?.address || ""} onChange={(e) => handleLeadAddressChange("address", e.target.value)} />
                    <input type="text" placeholder="Street/Suburb/Town" value={formData.leadAddress[0]?.street || ""} onChange={(e) => handleLeadAddressChange("street", e.target.value)} />
                  </div>
                </div>

                {/* COUNTRY & STATE */}
                <div className="lead-group lead-full">
                  <label>COUNTRY & STATE</label>
                  <div className="lead-grid">
                    <select
                      value={formData.leadAddress[0]?.country || "India"}
                      onChange={(e) => handleLeadAddressChange("country", e.target.value)}
                    >
                      <option value="India">India</option>
                    </select>
                    <select
                      value={formData.leadAddress[0]?.state || ""}
                      onChange={(e) => handleLeadAddressChange("state", e.target.value)}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CITY & ZIP */}
                <div className="lead-group lead-full">
                  <label>CITY & ZIP</label>
                  <div className="lead-grid">
                    <input type="text" name="city" placeholder="City" value={formData.leadAddress[0]?.city || ""} onChange={(e) => handleLeadAddressChange("city", e.target.value)} />
                    <input type="text" name="zip" placeholder="Zip" value={formData.leadAddress[0]?.zip || ""} onChange={(e) => handleLeadAddressChange("zip", e.target.value)} />
                  </div>
                </div>

                {/* COMPANY NAME */}
                <div className="lead-group lead-full">
                  <label>COMPANY NAME</label>
                  <select name="companyName" value={formData.companyName} onChange={handleChange}>
                    <option value="">Company Name</option>
                    <option>Company A</option>
                    <option>Company B</option>
                  </select>
                </div>

                {/* TYPE */}
                <div className="lead-group lead-full">
                  <label>TYPE</label>
                  <select name="type" value={formData.type} onChange={handleChange}>
                    <option value="">Type</option>
                    <option>Commercial</option>
                    <option>Residential</option>
                  </select>
                </div>

                {/* CAPITAL */}
                <div className="lead-group lead-full">
                  <label>CAPITAL</label>
                  <input type="text" name="carpetArea" placeholder="Capital" value={formData.carpetArea} onChange={handleChange} />
                </div>

                {/* SEATS */}
                <div className="lead-group lead-full">
                  <label>SEATS</label>
                  <input type="number" name="seats" placeholder="Seats" value={formData.seats} onChange={handleChange} />
                  {formErrors.seats && <p className="lead-error">{formErrors.seats}</p>}
                </div>

                {/* TENURE */}
                <div className="lead-group lead-full">
                  <label>TENURE (IN MONTHS)</label>
                  <input type="text" name="tenure" placeholder="Tenure (in Months)" value={formData.tenure} onChange={handleChange} />
                  {formErrors.tenure && <p className="lead-error">{formErrors.tenure}</p>}
                </div>

                {/* LEAD REASSIGNED */}
                <div className="lead-group lead-full">
                  <label>LEAD REASSIGNED</label>
                  <select name="leadReassigned" value={formData.leadReassigned || ""} onChange={handleChange}>
                    <option value="">Lead Reassigned</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>

                {/* OCCUPATIONS */}
                <div className="lead-group lead-full">
                  <label>OCCUPATIONS</label>
                  <select name="occupations" value={formData.occupations} onChange={handleChange}>
                    <option value="">Occupations</option>
                    <option>Salaried</option>
                    <option>Self Employed</option>
                    <option>Business</option>
                    <option>Retired</option>
                  </select>
                </div>
              </>
            )}

            {/* ===================== PERSONAL DETAILS ===================== */}
            {activeTab === "personal" && (
              <>
                {/* AGE & BIRTHDAY */}
                <div className="personal-top-grid">
                  <div className="lead-group">
                    <label>AGE</label>
                    <select name="age" value={formData.age} onChange={handleChange}>
                      <option value="">Age</option>
                      {Array.from({ length: 83 }, (_, i) => i + 18).map((age) => (
                        <option key={age}>{age}</option>
                      ))}
                    </select>
                  </div>
                  

                  <div className="lead-group">
                    <label>BIRTHDAY</label>
                    <input type="date" name="birthday" value={formData.birthday || ""} onChange={handleChange} />
                  </div>
                </div>

                {/* MARITAL STATUS & ANNIVERSARY */}
                <div className="personal-mid-grid">
                  <div className="lead-group">
                    <label>MARITAL STATUS</label>
                    <div className="married-row">
                      <input
                        type="checkbox"
                        name="maritalStatus"
                        id="maritalStatus"
                        checked={Boolean(formData.maritalStatus)}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maritalStatus: e.target.checked,
                            married: e.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="maritalStatus">Married</label>
                    </div>
                  </div>

                  <div className="lead-group">
                    <label>ANNIVERSARY</label>
                    <input type="date" name="anniversary" value={formData.anniversary || ""} onChange={handleChange} />
                  </div>
                </div>

                {/* INDUSTRY */}
                <div className="lead-group personal-industry">
                  <label>INDUSTRY</label>
                  <input type="text" name="industry" placeholder="Industry" value={formData.industry} onChange={handleChange} />
                </div>


                {/* URL */}
                <AddSection
                  label="URL"
                  renderFields={(item, index, onChange, onRemove) => (
                    <div className="section-single-row">
                      <div className="section-field">
                        <label>URL</label>
                        <input placeholder="https://example.com" value={item.url} onChange={(e) => onChange(index, "url", e.target.value)} />
                      </div>
                      <button type="button" className="section-delete-btn" onClick={() => onRemove(index)}>🗑️</button>
                    </div>
                  )}
                  defaultItem={{ url: "" }}
                />

                {/* EDUCATION */}
                <AddSection
                  label="EDUCATION"
                  renderFields={(item, index, onChange, onRemove) => (
                    <div className="section-single-row">
                      <div className="section-field">
                        <label>EDUCATION</label>
                        <input placeholder="Education" value={item.education} onChange={(e) => onChange(index, "education", e.target.value)} />
                      </div>
                      <button type="button" className="section-delete-btn" onClick={() => onRemove(index)}>🗑️</button>
                    </div>
                  )}
                  defaultItem={{ education: "" }}
                />

                {/* TITLE & COMPANY */}
                <AddSection
                  label="TITLE & COMPANY"
                  renderFields={(item, index, onChange, onRemove) => (
                    <div className="section-single-row">
                      <div className="section-field">
                        <label>TITLE & COMPANY</label>
                        <div className="section-grid-2">
                          <input placeholder="Title" value={item.title} onChange={(e) => onChange(index, "title", e.target.value)} />
                          <input placeholder="Company" value={item.company} onChange={(e) => onChange(index, "company", e.target.value)} />
                        </div>
                      </div>
                      <button type="button" className="section-delete-btn" onClick={() => onRemove(index)}>🗑️</button>
                    </div>
                  )}
                  defaultItem={{ title: "", company: "" }}
                />

                {/* INCOME */}
                <AddSection
                  label="INCOME"
                  renderFields={(item, index, onChange, onRemove) => (
                    <div className="section-single-row">
                      <div className="section-field">
                        <label>INCOME</label>
                        <input placeholder="Income" value={item.income} onChange={(e) => onChange(index, "income", e.target.value)} />
                      </div>
                      <button type="button" className="section-delete-btn" onClick={() => onRemove(index)}>🗑️</button>
                    </div>
                  )}
                  defaultItem={{ income: "" }}
                />

                {/* BANK & LOANS */}
                <AddSection
                  label="BANK & LOANS"
                  renderFields={(item, index, onChange, onRemove) => (
                    <div className="section-single-row">
                      <div className="section-field">
                        <select value={item.bankType} onChange={(e) => onChange(index, "bankType", e.target.value)}>
                          <option value="">Select</option>
                          <option>Home Loan</option>
                          <option>Personal Loan</option>
                          <option>Car Loan</option>
                          <option>Business Loan</option>
                        </select>
                      </div>
                      <div className="section-field">
                        <input type="text" placeholder="Bank Name" value={item.bankName} onChange={(e) => onChange(index, "bankName", e.target.value)} />
                      </div>
                      <div className="section-field">
                        <input type="text" placeholder="Amount" value={item.amount} onChange={(e) => onChange(index, "amount", e.target.value)} />
                      </div>
                      <button type="button" className="section-delete-btn" onClick={() => onRemove(index)}>🗑️</button>
                    </div>
                  )}
                  defaultItem={{ bankType: "", bankName: "", amount: "" }}
                />
              </>
            )}

            {/* ===================== REQUIREMENT ===================== */}
            {/* ===================== REQUIREMENT ===================== */}
{activeTab === "requirement" && (
  <>
    {/* PURPOSE & NRI */}
    <div className="lead-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="lead-group">
        <label>PURPOSE</label>
        <div style={{ display: "flex", gap: "20px", marginTop: "5px" }}>
          <div className="married-row">
            <input
              type="checkbox"
              id="enduse"
              name="enduse"
              checked={Boolean(formData.enduse)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  enduse: e.target.checked,
                }))
              }
            />
            <label htmlFor="enduse">End use</label>
          </div>
          <div className="married-row">
            <input
              type="checkbox"
              id="investor"
              name="investor"
              checked={Boolean(formData.investor)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  investor: e.target.checked,
                }))
              }
            />
            <label htmlFor="investor">Investor</label>
          </div>
        </div>
      </div>

      <div className="lead-group">
        <label>NRI</label>
        <div style={{ marginTop: "5px" }}>
          <div className="married-row">
            <input
              type="checkbox"
              id="nri"
              name="nri"
              checked={Boolean(formData.nri)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  nri: e.target.checked,
                }))
              }
            />
            <label htmlFor="nri">Yes</label>
          </div>
        </div>
      </div>
    </div>

    {/* BUDGET */}
    <div className="lead-group lead-full">
      <label>BUDGET</label>
      <div className="section-grid-2">
        <input type="number" name="budgetMin" placeholder="Min budget" value={formData.budgetMin} onChange={handleChange} />
        <input type="number" name="budgetMax" placeholder="Max budget" value={formData.budgetMax} onChange={handleChange} />
      </div>
      {formErrors.budget && <p className="lead-error">{formErrors.budget}</p>}
    </div>

    {/* POSSESSION */}
    <div className="lead-group lead-full">
      <label>POSSESSION</label>
      <div className="section-grid-2">
        <select name="possessionMin" value={formData.possessionMin} onChange={handleChange}>
          <option value="">Min possession</option>
          <option>Ready to Move</option>
          <option>Within 6 Months</option>
          <option>Within 1 Year</option>
          <option>Within 2 Years</option>
          <option>Within 3 Years</option>
        </select>
        <select name="possessionMax" value={formData.possessionMax} onChange={handleChange}>
          <option value="">Max possession</option>
          <option>Ready to Move</option>
          <option>Within 6 Months</option>
          <option>Within 1 Year</option>
          <option>Within 2 Years</option>
          <option>Within 3 Years</option>
        </select>
      </div>
    </div>

    {/* AREA */}
    <div className="lead-group lead-full">
      <label>AREA</label>
      <input type="text" name="area" placeholder="Area" value={formData.area} onChange={handleChange} />
    </div>

    {/* LEAD SOURCE & CHANNEL PARTNER ATTRIBUTION */}
    <div className="lead-group lead-full p-3 rounded" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="fw-bold mb-0" style={{ color: "#1e293b", fontSize: "14px" }}>
          LEAD SOURCE ATTRIBUTION {Boolean(editLeadId && (formData.tags?.includes("sourceLocked:true") || formData.fundingSource || formData.channelPartner)) ? (
            <span className="badge bg-danger ms-2" style={{ fontSize: "11px" }}>🔒 PERMANENTLY LOCKED</span>
          ) : (
            <span className="badge bg-warning text-dark ms-2" style={{ fontSize: "11px" }}>🔒 Will lock permanently on save</span>
          )}
        </label>
      </div>

      {Boolean(editLeadId && (formData.tags?.includes("sourceLocked:true") || formData.fundingSource || formData.channelPartner)) ? (
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control bg-light"
              value={formData.fundingSource || "Direct / Other"}
              readOnly
              disabled
              style={{ cursor: "not-allowed", fontWeight: "600" }}
            />
          </div>
          {formData.channelPartner && (
            <>
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control bg-light"
                  value={`CP: ${formData.channelPartner}`}
                  readOnly
                  disabled
                  style={{ cursor: "not-allowed", fontWeight: "600" }}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control bg-light"
                  value={formData.channelPartnerReraId ? `RERA: ${formData.channelPartnerReraId}` : "RERA Verified"}
                  readOnly
                  disabled
                  style={{ cursor: "not-allowed" }}
                />
              </div>
            </>
          )}
          <small className="text-muted mt-1">
            🔒 Lead source attribution is permanently immutable for the life of this lead (no edit or admin override).
          </small>
        </div>
      ) : (
        <div className="row g-2">
          <div className="col-md-4">
            <select
              className="form-select"
              name="fundingSource"
              value={formData.fundingSource || ""}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  fundingSource: val,
                  ...(val !== "Channel Partner" ? { channelPartner: "", channelPartnerReraId: "" } : {}),
                }));
              }}
            >
              <option value="">Select Source</option>
              <option value="Channel Partner">Channel Partner</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Website">Website</option>
              <option value="Portal">Portal</option>
              <option value="Reference">Reference</option>
              <option value="Direct">Direct</option>
            </select>
          </div>

          {formData.fundingSource === "Channel Partner" && (
            <>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={formData.channelPartner || ""}
                  onChange={(e) => {
                    const cpName = e.target.value;
                    const cp = users.find(
                      (u) =>
                        String(u.role).toUpperCase() === "CHANNEL_PARTNER" &&
                        ([u.firstName, u.lastName].filter(Boolean).join(" ") === cpName || u.username === cpName || u.email === cpName)
                    );
                    setFormData((prev) => ({
                      ...prev,
                      channelPartner: cpName,
                      channelPartnerReraId: cp?.reraNumber || "",
                    }));
                  }}
                >
                  <option value="">Select Channel Partner</option>
                  {users
                    .filter((u) => String(u.role).toUpperCase() === "CHANNEL_PARTNER")
                    .map((cp) => {
                      const name = [cp.firstName, cp.lastName].filter(Boolean).join(" ") || cp.username || cp.email;
                      return (
                        <option key={cp.id} value={name}>
                          {name} {cp.reraNumber ? `(${cp.reraNumber})` : ""}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control bg-light"
                  placeholder="CP RERA ID (Auto-filled)"
                  value={formData.channelPartnerReraId ? `RERA: ${formData.channelPartnerReraId}` : ""}
                  readOnly
                  style={{ cursor: "not-allowed", fontWeight: "600", color: "#334155" }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>

    {/* TRANSACTION TYPE */}
    <div className="lead-group lead-full">
      <label>TRANSACTION TYPE</label>
      <input type="text" name="transactionType" placeholder="Transaction Type" value={formData.transactionType || ""} onChange={handleChange} />
    </div>

    {/* PROPERTY TYPES */}
    <div className="lead-group lead-full">
      <label>PROPERTY TYPES</label>
      <select name="propertyTypes" value={formData.propertyTypes || formData.propertyType || ""} onChange={handleChange}>
        <option value="">Select Property Type</option>
        <option>Apartment</option>
        <option>Villa</option>
        <option>Plot</option>
        <option>Commercial</option>
        <option>Office Space</option>
      </select>
    </div>

    {/* BUDGET & CONFIGURATION (existing) */}
    <div className="lead-grid">
      <div className="lead-group">
        <label>Budget</label>
        <input name="budget" value={formData.budget} onChange={handleChange} />
      </div>
     
    </div>

    {/* CONFIGURATION */}
<div className="lead-group lead-full">
  <label>CONFIGURATION</label>
  <input type="text" name="configuration" placeholder="Configuration" value={formData.configuration || formData.configration || ""} onChange={handleChange} />
</div>

{/* BATHROOM PREFERENCES */}
<div className="lead-group lead-full">
  <label>BATHROOM PREFERENCES</label>
  <input type="text" name="bathroomPreferences" placeholder="Bathroom preferences" value={formData.bathroomPreferences} onChange={handleChange} />
</div>

{/* FURNISHING */}
<div className="lead-group lead-full">
  <label>FURNISHING</label>
  <input type="text" name="furnishing" placeholder="Furnishing" value={formData.furnishing} onChange={handleChange} />
</div>

{/* FACING */}
<div className="lead-group lead-full">
  <label>FACING</label>
  <input type="text" name="facing" placeholder="Facing" value={formData.facing} onChange={handleChange} />
</div>

{/* LOCATION PREFERENCES */}
<div className="lead-group lead-full">
  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    LOCATION PREFERENCES
    <span
      title="Enter preferred location details"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        background: "#94a3b8",
        color: "#fff",
        fontSize: "11px",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      i
    </span>
  </label>
  <input type="text" name="locationPreferences" placeholder="Other location preferences" value={formData.locationPreferences} onChange={handleChange} />
</div>
  </>
)}

            {/* <textarea className="lead-comment" placeholder="Comment"></textarea> */}

            <div className="lead-buttons">
              <button type="submit" className="lead-save" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editLeadId ? "Update" : "Save"}
              </button>
              <button type="button" className="lead-cancel" onClick={() => navigate("/dashboard")} disabled={isSubmitting}>Cancel</button>
            </div>

          </form>
        </div>
      </div>
    </MasterLayout>
  );
};

export default ADDLEAD;
