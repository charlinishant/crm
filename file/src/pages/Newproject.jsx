import React, { useState, useRef } from "react";
import MasterLayout from "../masterLayout/MasterLayout";

const NEWPROJECT = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    reraProjectId: "",
    sales: "",
    preSales: "",
    projectType: "residential",
    possession: false,
    address: "",
    street: "",
    country: "",
    state: "",
    city: "",
    zip: "",
    locality: "",
    latitude: "",
    longitude: "",
  });

  const editorRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const description = editorRef.current.innerHTML;
    console.log({ ...formData, description });
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
                <input name="name" onChange={handleChange} />
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
                  <input name="reraProjectId" onChange={handleChange} />
                </div>

                <div className="np-field">
                  <label>SALES</label>
                  <input name="sales" onChange={handleChange} />
                </div>
              </div>

              {/* PRE SALES */}
              <div className="np-field">
                <label>PRE SALES</label>
                <input name="preSales" onChange={handleChange} />
              </div>

              {/* POSSESSION + TYPE */}
              <div className="np-row">
                <div className="np-field">
                  <label>POSSESSION</label>
                  <input name="possession" onChange={handleChange} />
                </div>

                <div className="np-field">
                  <label>PROJECT TYPE</label>
                  <select name="projectType" onChange={handleChange}>
                    <option>Residential</option>
                    <option>Commercial</option>
                  </select>
                </div>
              </div>

              {/* SEARCH */}
              <div className="np-field">
                <label>SEARCH ADDRESS</label>
                <input name="searchAddress" onChange={handleChange} />
              </div>

              {/* ADDRESS + MAP */}
              <div className="np-row">

                {/* LEFT */}
                <div style={{ flex: 2 }}>

                  <div className="np-field">
                    <label>ADDRESS</label>
                    <input name="address" onChange={handleChange} />
                  </div>

                  <div className="np-row">
                    <div className="np-field">
                      <label>STREET</label>
                      <input name="street" onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>COUNTRY</label>
                      <select name="country" onChange={handleChange}>
                        <option>India</option>
                      </select>
                    </div>
                  </div>

                  <div className="np-row">
                    <div className="np-field">
                      <label>STATE</label>
                      <input name="state" onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>CITY</label>
                      <input name="city" onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>ZIP</label>
                      <input name="zip" onChange={handleChange} />
                    </div>
                  </div>

                  {/* LOCALITY ROW */}
                  <div className="np-row">
                    <div className="np-field" style={{ flex: 2 }}>
                      <label>LOCALITY</label>
                      <input name="locality" onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>LATITUDE</label>
                      <input name="latitude" onChange={handleChange} />
                    </div>

                    <div className="np-field">
                      <label>LONGITUDE</label>
                      <input name="longitude" onChange={handleChange} />
                    </div>
                  </div>

                </div>

                {/* MAP */}
                <div style={{ flex: 1 }}>
                  <iframe
                    title="map"
                    width="100%"
                    height="300"
                    src="https://www.google.com/maps?q=Pune&output=embed"
                  ></iframe>
                </div>

              </div>

              {/* BUTTONS */}
              <div className="np-buttons">
                <button type="submit" className="np-btn-save">Save</button>
                <button type="button" className="np-btn-cancel">Cancel</button>
              </div>

            </form>
          </div>
        </div>
      </>
    </MasterLayout>
  );
};

export default NEWPROJECT;