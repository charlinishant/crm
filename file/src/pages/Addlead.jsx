import React, { useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import "./addLead.css";

const ADDLEAD = () => {
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    project: "",
    status: "",
    nextCallDate: today,
    assignTo: "",
    closingExecutive: "",
    source: "",
    city: "",
    locality: "",
    configuration: "",
    budget: "",
    possession: "",
  });

  const [leads, setLeads] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLeads([...leads, formData]);

    setFormData({
      name: "",
      mobile: "",
      email: "",
      project: "",
      status: "",
      nextCallDate: today,
      assignTo: "",
      closingExecutive: "",
      source: "",
      city: "",
      locality: "",
      configuration: "",
      budget: "",
      possession: "",
    });
  };

  return (
    <MasterLayout>
      <div className="container">
        <p className="title1">Add New Leads</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="grid">

            <div className="form-group">
              <label>Name</label>
              <input name="name" placeholder="Enter Name" value={formData.name} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Mobile</label>
              <input name="mobile" placeholder="Enter Mobile" value={formData.mobile} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input name="email" placeholder="Enter Email" value={formData.email} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Project</label>
              <select name="project"   value={formData.project} onChange={handleChange}>
                <option value="">Select</option>
                <option value="A">Project A</option>
                <option value="B">Project B</option>
              </select>
            </div>

            <div className="form-group">
              <label>Lead Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="">Lead Status</option>
                <option value="New">New</option>
                <option value="Interested">Interested</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* ✅ DATE PICKER */}
            <div className="form-group">
              <label>Next Call Date</label>
              <input
                type="date"
                name="nextCallDate"
                value={formData.nextCallDate}
                onChange={handleChange}
                min={today}
              />
             </div>

            <div className="form-group">
              <label>Assign To</label>
              <select name="assignTo" value={formData.assignTo} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Sales">Sales</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Closing Executive</label>
              <select name="closingExecutive" value={formData.closingExecutive} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Exec1">Exec1</option>
                <option value="Exec2">Exec2</option>
              </select>
            </div>

            <div className="form-group">
              <label>Source</label>
              <select name="source" value={formData.source} onChange={handleChange}>
                <option value="">Source</option>
                <option value="Website">Website</option>
                <option value="Call">Call</option>
              </select>
            </div>

            <div className="form-group">
              <label>City</label>
              <select name="city" placeholder="Select City" value={formData.city} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>


            <div className="form-group">
              <label>Locality</label>
              <select name="city" placeholder="Select City" value={formData.city} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div className="form-group">
              <label>Configuration</label>
              <select name="city" placeholder="Select City" value={formData.city} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div className="form-group">
              <label>Budget</label>
              <select name="city" placeholder="Select City" value={formData.city} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div className="form-group">
              <label>Possession Required</label>
              <select name="city" placeholder="Select City" value={formData.city} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

          </div>

          <textarea placeholder="Comment" className="comment"></textarea>

          <div className="buttons">
            <button type="submit" className="save">Save</button>
            <button type="button" className="cancel">Cancel</button>
          </div>
        </form>
      </div>
    </MasterLayout>
  );
};

export default ADDLEAD;