import React, { useState } from "react";

import MasterLayout from "../masterLayout/MasterLayout";
import PaymentHistoryOne from "../components/child/PaymentHistoryOne";
import "./addLead.css";

const ADDLEAD = () => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    project: "",
    status: "",
    city: "",
  });

  const [leads, setLeads] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
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
      city: "",
    });
  };

  return (
    <MasterLayout>
      <div className="container">
        <h2>Add New Leads</h2>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="form">
          <div className="grid">

            <div className="form-group">
              <label>Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter Name"
              />
            </div>

            <div className="form-group">
              <label>Mobile</label>
              <input
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter Contact"
              />
            </div>

            <div className="form-group">
              <label>Primary Email</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter Email"
              />
            </div>

            <div className="form-group">
              <label>Project</label>
              <select
                name="project"
                value={formData.project}
                onChange={handleChange}
              >
                <option value="">Please Select</option>
                <option value="Project A">Project A</option>
                <option value="Project B">Project B</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="">Lead Status</option>
                <option value="New">New</option>
                <option value="Interested">Interested</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
              >
                <option value="">Select City</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assign To</label>
              <select
                name="Assign to"
                value={formData.Assign_to}
                onChange={handleChange}
              >
                <option value="">Manager</option>
                <option value="Pune">Sales</option>
                <option value="Mumbai">SuperAdmin</option>
              </select>
            </div>

          </div>

          <textarea
            placeholder="Comment"
            className="comment"
          ></textarea>

          <div className="buttons">
            <button type="submit" className="save">Save</button>
            <button type="button" className="cancel">Cancel</button>
          </div>
        </form>

        {/* ✅ TABLE COMPONENT */}
        <PaymentHistoryOne leads={leads} />

      </div>

      
    </MasterLayout>
  );
};

export default ADDLEAD;