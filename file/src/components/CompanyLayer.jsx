import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useState } from "react";

const CompanyLayer = () => {
    const [formData, setFormData] = useState({
        companyName: "SWAMI",
        email: "",
        phone: "",
        website: "",
        gstNumber: "",
        reraNumber: "",
        address: "",
        city: "",
        state: "",
        pinCode: "",
        description: "",
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    return (
        <div className="company-settings-layout">
            <aside className="company-settings-brand">
                <div className="company-settings-logo">
                    <img src="assets/images/logo.png" alt="SWAMI" />
                </div>
                <h3>SWAMI</h3>
                <p>Company profile used across CRM documents, dashboards, and communication screens.</p>

                <div className="company-settings-meta">
                    <div>
                        <Icon icon="solar:letter-bold" />
                        <span>Email</span>
                        <strong>{formData.email || "Not added"}</strong>
                    </div>
                    <div>
                        <Icon icon="solar:phone-bold" />
                        <span>Phone</span>
                        <strong>{formData.phone || "Not added"}</strong>
                    </div>
                    <div>
                        <Icon icon="solar:map-point-bold" />
                        <span>Location</span>
                        <strong>{[formData.city, formData.state].filter(Boolean).join(", ") || "Not added"}</strong>
                    </div>
                </div>
            </aside>

            <section className="company-settings-card">
                <div className="company-settings-header">
                    <div>
                        <h3>Company Details</h3>
                        <p>Update only the details that appear in your CRM identity.</p>
                    </div>
                </div>

                <form action="#" className="company-settings-form">
                    <div className="company-settings-section">
                        <h4>Basic Information</h4>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label htmlFor="companyName">Company Name</label>
                                <input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    placeholder="Enter company name"
                                />
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter company email"
                                />
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="phone">Phone</label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                />
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="website">Website</label>
                                <input
                                    id="website"
                                    name="website"
                                    type="url"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="company-settings-section">
                        <h4>Registration Details</h4>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label htmlFor="gstNumber">GST Number</label>
                                <input
                                    id="gstNumber"
                                    name="gstNumber"
                                    type="text"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                    placeholder="Enter GST number"
                                />
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="reraNumber">RERA Number</label>
                                <input
                                    id="reraNumber"
                                    name="reraNumber"
                                    type="text"
                                    value={formData.reraNumber}
                                    onChange={handleChange}
                                    placeholder="Enter RERA number"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="company-settings-section">
                        <h4>Office Address</h4>
                        <div className="row g-3">
                            <div className="col-12">
                                <label htmlFor="address">Address</label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter office address"
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="city">City</label>
                                <input
                                    id="city"
                                    name="city"
                                    type="text"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="Enter city"
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="state">State</label>
                                <input
                                    id="state"
                                    name="state"
                                    type="text"
                                    value={formData.state}
                                    onChange={handleChange}
                                    placeholder="Enter state"
                                />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="pinCode">PIN Code</label>
                                <input
                                    id="pinCode"
                                    name="pinCode"
                                    type="text"
                                    value={formData.pinCode}
                                    onChange={handleChange}
                                    placeholder="Enter PIN code"
                                />
                            </div>
                            <div className="col-12">
                                <label htmlFor="description">Short Note</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Add a short company note"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="company-settings-actions">
                        <button type="reset" className="company-settings-secondary">
                            Reset
                        </button>
                        <button type="submit" className="company-settings-primary">
                            Save Changes
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
};

export default CompanyLayer;
