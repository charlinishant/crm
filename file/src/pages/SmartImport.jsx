import React, { useRef } from "react";
import "./smartImport.css"; // your main CSS file

const SmartImport = () => {
  const fileRef = useRef();

  const handleBrowse = () => {
    fileRef.current.click(); // trigger hidden input
  };

  const handleUpload = () => {
    const file = fileRef.current.files[0];
    if (!file) {
      alert("Please select a file first");
      return;
    }

    console.log("Uploading:", file);
    // 👉 Later: send to backend
  };

  return (
    <div className="smart-import-container">
      <p className="title">Smart Import</p>

      <div className="card">
        {/* File Upload Section */}
        <div className="file-upload">
          <input
            type="file"
            ref={fileRef}
            className="file-input"
          />

          <button
            type="button"
            className="browse-btn"
            onClick={handleBrowse}
          >
            Browse
          </button>

          <button
            type="button"
            className="upload-btn"
            onClick={handleUpload}
          >
            ⬆ Upload
          </button>
        </div>

        {/* Download CSV */}
        <button className="download-btn">
          Download Sample CSV
        </button>

        {/* Magic Fields */}
        <div className="magic-fields">
          <p>MagicFields To Update:</p>
          <div className="fields-box">
            Configuration, RangeBudget, PossessionRequired
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImport;