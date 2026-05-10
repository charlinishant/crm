import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./addLead.css";


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

const ADDLEAD = () => {
  const [activeTab, setActiveTab] = useState("basic");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
      salutation:"",
      firstName:"",
      lastName:"",
      emails:[{ type: "Office", value: "" }],
      phones:[{ type: "Work", value: "" }],
      status:"Fresh_Lead",
      timeZone:"",
      tags:"",
      interestedProjects:"",
      teamId:"",
      channelPartner:"",
      conductSiteVisit:"",
      conductSiteDate:null,
      leadAddress:[{
        address:"",
        street:"",
        city:"",
        state:"",
        country:"India",
        zip:""
      }],
      companyName:"",
      type:"MEETINGROOMS",
      carpetArea:"",
      seats:0,
      tenure:0.0,
      gender:"MALE",
      occupations:"",
      age:0,
      birthday:null,
      maritalStatus:false,
      anniversary:null,
      industry:"",
      personalAddress:[{
        address:"",
        street:"",
        city:"",
        state:"",
        country:"",
        zip:""
      }],
      url:"",
      education:"",
      companyTitle:"",
      income:"",
      basiComment:"",
      purpose:"",
      nri:false,
      budgetMin:0,
      budgetMax:0,
      possessionMin:"",
      possessionMax:"",
      area:"",
      fundingSouurce:"",
      propertyType:"",
      configration:"",
      budget:"",
      bathroomPreferences:"",
      furnishing:"",
      facing:"",
      locationPreferences:"",
      requirementComment:"",
  });
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    `User #${user?.id}`;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const response = await fetch(`${API_URL}/projects/list`);

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
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch(`${API_URL}/users`);

        if (!response.ok) {
          throw new Error("Unable to load users");
        }

        const data = await response.json();
        const userList = Array.isArray(data) ? data : data?.data || data?.users || [];
        setUsers(Array.isArray(userList) ? userList : []);
      } catch (err) {
        console.error(err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [API_URL]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateLeadForm();
    setFormErrors(errors);

    if (Object.keys(errors).length) {
      setActiveTab("basic");
      return;
    }

    const payload = {
      ...formData,
      budgetMin: Number(formData.budgetMin) || 0,
      budgetMax: Number(formData.budgetMax) || 0,
      seats: Number(formData.seats) || 0,
      tenure: Number(formData.tenure) || 0,
      age: Number(formData.age) || 0,
    };

    console.log(payload);

    await fetch(`${API_URL}/leads`,
      {
        method:"POST",
        headers:{
          "Content-Type": "application/json"
        },
        body:JSON.stringify(payload),
      }
    ).then(res=>{
        if(res.status === 201){
          console.log("Created");
          navigate("/user/sales/leads")
        }
        else{
          console.log(res);
          alert("somwthing went wrong")
        }
        
    })
    .catch(err=>alert("somwthing went wrong"))

  };

  return (
    <>
      <div className="lead-page">
        <div className="lead-container">
          <p className="lead-title">Add New Leads</p>

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
                    <select name="salutation" onChange={handleChange}>
                      <option>Salutation</option>
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

                {/* TIMEZONE */}
                <div className="lead-group lead-full">
                  <label>Time zone</label>
                  <select name="timezone" onChange={handleChange}>
                    <option>Asia/Kolkata</option>
                    <option>UTC</option>
                  </select>
                </div>

                {/* TAGS */}
                <div className="lead-group lead-full">
                  <label>Tags</label>
                  <input name="tags" placeholder="Add tags" onChange={handleChange} />
                </div>

                {/* INTERESTED PROJECTS */}
                <div className="lead-group lead-full">
                  <label>Interested Projects</label>
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

                {/* TEAMS */}
                <div className="lead-group lead-full">
                  <label>TEAMS</label>
                  <select
                    name="teamId"
                    value={formData.teamId}
                    onChange={handleChange}
                    disabled={loadingUsers}
                  >
                    <option value="">
                      {loadingUsers ? "Loading users..." : "Select user"}
                    </option>
                    {users.map((user) => (
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
                    <select>
                      <option>Select Channel Partner</option>
                    </select>
                    <button type="button" className="lead-add">
                      + Add Channel Partner
                    </button>
                  </div>
                </div>

                {/* SITE VISIT */}
                <div className="lead-group lead-full">
                  <label>SCHEDULE AND CONDUCT SITE VISIT FOR PROJECT</label>
                  <input type="text" placeholder="Select Project / Schedule Visit" />
                </div>

                {/* ADDRESS & STREET */}
                <div className="lead-group lead-full">
                  <label>ADDRESS & STREET</label>
                  <div className="lead-grid">
                    <input type="text" placeholder="Address" />
                    <input type="text" placeholder="Street/Suburb/Town" />
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
                    <input type="text" name="city" placeholder="City" onChange={handleChange} />
                    <input type="text" name="zip" placeholder="Zip" onChange={handleChange} />
                  </div>
                </div>

                {/* COMPANY NAME */}
                <div className="lead-group lead-full">
                  <label>COMPANY NAME</label>
                  <select name="companyName" onChange={handleChange}>
                    <option value="">Company Name</option>
                    <option>Company A</option>
                    <option>Company B</option>
                  </select>
                </div>

                {/* TYPE */}
                <div className="lead-group lead-full">
                  <label>TYPE</label>
                  <select name="type" onChange={handleChange}>
                    <option value="">Type</option>
                    <option>Commercial</option>
                    <option>Residential</option>
                  </select>
                </div>

                {/* CARPET AREA */}
                <div className="lead-group lead-full">
                  <label>CARPET AREA</label>
                  <input type="text" name="carpetArea" placeholder="Carpet Area" onChange={handleChange} />
                </div>

                {/* SEATS */}
                <div className="lead-group lead-full">
                  <label>SEATS</label>
                  <input type="number" name="seats" placeholder="Seats" onChange={handleChange} />
                  {formErrors.seats && <p className="lead-error">{formErrors.seats}</p>}
                </div>

                {/* TENURE */}
                <div className="lead-group lead-full">
                  <label>TENURE (IN MONTHS)</label>
                  <input type="text" name="tenure" placeholder="Tenure (in Months)" onChange={handleChange} />
                  {formErrors.tenure && <p className="lead-error">{formErrors.tenure}</p>}
                </div>

                {/* LEAD REASSIGNED */}
                <div className="lead-group lead-full">
                  <label>LEAD REASSIGNED</label>
                  <select name="leadReassigned" onChange={handleChange}>
                    <option value="">Lead Reassigned</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>

                {/* GENDER */}
                <div className="lead-group lead-full">
                  <label>GENDER</label>
                  <input type="text" name="gender" placeholder="Gender" onChange={handleChange} />
                </div>

                {/* OCCUPATIONS */}
                <div className="lead-group lead-full">
                  <label>OCCUPATIONS</label>
                  <select name="occupations" onChange={handleChange}>
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
                {/* AGE, BIRTHDAY, GENDER */}
                <div className="personal-top-grid">
                  <div className="lead-group">
                    <label>AGE</label>
                    <select name="age" onChange={handleChange}>
                      <option value="">Age</option>
                      {Array.from({ length: 83 }, (_, i) => i + 18).map((age) => (
                        <option key={age}>{age}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lead-group">
                    <label>BIRTHDAY</label>
                    <input type="date" name="birthday" onChange={handleChange} />
                  </div>

                  <div className="lead-group">
                    <label>GENDER</label>
                    <select name="gender" onChange={handleChange}>
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
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
                        id="married"
                        onChange={(e) =>
                          setFormData({ ...formData, married: e.target.checked })
                        }
                      />
                      <label htmlFor="married">Married</label>
                    </div>
                  </div>

                  <div className="lead-group">
                    <label>ANNIVERSARY</label>
                    <input type="date" name="anniversary" onChange={handleChange} />
                  </div>
                </div>

                {/* INDUSTRY */}
                <div className="lead-group personal-industry">
                  <label>INDUSTRY</label>
                  <input type="text" name="industry" placeholder="Industry" onChange={handleChange} />
                </div>

                {/* ADDRESSES */}
                <AddSection
                  label="ADDRESSES"
                  renderFields={(item, index, onChange, onRemove) => (
                    <>
                      <div className="address-type-wrapper">
                        <div className="address-type-inner">
                          <label>ADDRESS TYPE</label>
                          <select
                            value={item.type}
                            onChange={(e) => onChange(index, "type", e.target.value)}
                          >
                            <option>Home Address</option>
                            <option>Work Address</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="section-delete-btn"
                          onClick={() => onRemove(index)}
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="section-field">
                        <label>ADDRESS & STREET</label>
                        <div className="section-grid-2">
                          <input placeholder="Address" value={item.address} onChange={(e) => onChange(index, "address", e.target.value)} />
                          <input placeholder="Street/Suburb/Town" value={item.street} onChange={(e) => onChange(index, "street", e.target.value)} />
                        </div>
                      </div>

                      <div className="section-field">
                        <label>COUNTRY & STATE</label>
                        <div className="section-grid-2">
                          <select value={item.country} onChange={(e) => onChange(index, "country", e.target.value)}>
                            <option value="">Select country</option>
                            <option>India</option>
                            <option>USA</option>
                            <option>UK</option>
                          </select>
                          <select value={item.state} onChange={(e) => onChange(index, "state", e.target.value)}>
                            <option value="">Select country First</option>
                            <option>Maharashtra</option>
                            <option>Delhi</option>
                          </select>
                        </div>
                      </div>

                      <div className="section-field">
                        <label>CITY & ZIP</label>
                        <div className="section-grid-2">
                          <input placeholder="City" value={item.city} onChange={(e) => onChange(index, "city", e.target.value)} />
                          <input placeholder="Zip" value={item.zip} onChange={(e) => onChange(index, "zip", e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}
                  defaultItem={{ type: "Home Address", address: "", street: "", country: "", state: "", city: "", zip: "" }}
                />

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
            <input type="checkbox" id="enduse" name="enduse" onChange={handleChange} />
            <label htmlFor="enduse">End use</label>
          </div>
          <div className="married-row">
            <input type="checkbox" id="investor" name="investor" onChange={handleChange} />
            <label htmlFor="investor">Investor</label>
          </div>
        </div>
      </div>

      <div className="lead-group">
        <label>NRI</label>
        <div className="married-row" style={{ marginTop: "5px" }}>
          <input type="checkbox" id="nri" name="nri" onChange={handleChange} />
          <label htmlFor="nri">Yes</label>
        </div>
      </div>
    </div>

    {/* BUDGET */}
    <div className="lead-group lead-full">
      <label>BUDGET</label>
      <div className="section-grid-2">
        <input type="number" name="budgetMin" placeholder="Min budget" onChange={handleChange} />
        <input type="number" name="budgetMax" placeholder="Max budget" onChange={handleChange} />
      </div>
      {formErrors.budget && <p className="lead-error">{formErrors.budget}</p>}
    </div>

    {/* POSSESSION */}
    <div className="lead-group lead-full">
      <label>POSSESSION</label>
      <div className="section-grid-2">
        <select name="possessionMin" onChange={handleChange}>
          <option value="">Min possession</option>
          <option>Ready to Move</option>
          <option>Within 6 Months</option>
          <option>Within 1 Year</option>
          <option>Within 2 Years</option>
          <option>Within 3 Years</option>
        </select>
        <select name="possessionMax" onChange={handleChange}>
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
      <input type="text" name="area" placeholder="Area" onChange={handleChange} />
    </div>

    {/* FUNDING SOURCE */}
    <div className="lead-group lead-full">
      <label>FUNDING SOURCE</label>
      <input type="text" name="fundingSource" placeholder="Funding Source" onChange={handleChange} />
    </div>

    {/* TRANSACTION TYPE */}
    <div className="lead-group lead-full">
      <label>TRANSACTION TYPE</label>
      <input type="text" name="transactionType" placeholder="Transaction Type" onChange={handleChange} />
    </div>

    {/* PROPERTY TYPES */}
    <div className="lead-group lead-full">
      <label>PROPERTY TYPES</label>
      <select name="propertyTypes" onChange={handleChange}>
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
        <input name="budget" onChange={handleChange} />
      </div>
     
    </div>

    {/* CONFIGURATION */}
<div className="lead-group lead-full">
  <label>CONFIGURATION</label>
  <input type="text" name="configuration" placeholder="Configuration" onChange={handleChange} />
</div>

{/* BATHROOM PREFERENCES */}
<div className="lead-group lead-full">
  <label>BATHROOM PREFERENCES</label>
  <input type="text" name="bathroomPreferences" placeholder="Bathroom preferences" onChange={handleChange} />
</div>

{/* FURNISHING */}
<div className="lead-group lead-full">
  <label>FURNISHING</label>
  <input type="text" name="furnishing" placeholder="Furnishing" onChange={handleChange} />
</div>

{/* FACING */}
<div className="lead-group lead-full">
  <label>FACING</label>
  <input type="text" name="facing" placeholder="Facing" onChange={handleChange} />
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
  <input type="text" name="locationPreferences" placeholder="Other location preferences" onChange={handleChange} />
</div>
  </>
)}

            {/* <textarea className="lead-comment" placeholder="Comment"></textarea> */}

            <div className="lead-buttons">
              <button type="submit" className="lead-save" >Save</button>
              <button type="button" className="lead-cancel">Cancel</button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export default ADDLEAD;
