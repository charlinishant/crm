import React, { useState, useRef } from "react";
import MasterLayout from "../masterLayout/MasterLayout";

const NEWPROJECT = () => {
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    reraProjectId: "",
    sales: "",
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
        /* ============================================
           PAGE WRAPPER
        ============================================ */
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
          color: #1e293b;
          margin-bottom: 28px;
        }

        /* ============================================
           FORM FIELD
        ============================================ */
        .np-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          width: 100%;
        }

        .np-field label {
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
        }

        .np-field label span.required {
          color: #ef4444;
          margin-left: 2px;
        }

        .np-field input,
        .np-field select {
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          color: #1e293b;
          background: #ffffff;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }

        .np-field input:focus,
        .np-field select:focus {
          border-color: #7c3aed;
        }

        .np-field input::placeholder {
          color: #94a3b8;
        }

        /* ============================================
           RICH TEXT EDITOR
        ============================================ */
        .np-editor-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }

        .np-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-wrap: wrap;
        }

        .np-toolbar-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          background: #ffffff;
          cursor: pointer;
          font-size: 14px;
          color: #334155;
          font-weight: 600;
          transition: all 0.15s;
        }

        .np-toolbar-btn:hover {
          background: #ede9fe;
          border-color: #7c3aed;
          color: #7c3aed;
        }

        .np-toolbar-divider {
          width: 1px;
          height: 24px;
          background: #e2e8f0;
          margin: 0 4px;
        }

        .np-font-size {
          padding: 4px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          background: #ffffff;
          font-size: 13px;
          color: #334155;
          cursor: pointer;
          outline: none;
          height: 34px;
        }

        .np-editor-body {
          min-height: 220px;
          padding: 14px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          line-height: 1.6;
        }

        .np-editor-body:empty:before {
          content: "Enter description...";
          color: #94a3b8;
        }

        /* ============================================
           BUTTONS
        ============================================ */
        .np-buttons {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .np-btn-save {
          background: #7c3aed;
          color: #ffffff;
          border: none;
          padding: 11px 28px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .np-btn-save:hover {
          background: #6d28d9;
        }

        .np-btn-cancel {
          background: #f1f5f9;
          color: #334155;
          border: none;
          padding: 11px 28px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .np-btn-cancel:hover {
          background: #e2e8f0;
        }

        /* ============================================
           RESPONSIVE
        ============================================ */
        @media (max-width: 768px) {
          .np-container {
            padding: 16px;
          }

          .np-toolbar {
            gap: 3px;
          }
        }
      `}</style>

      <div className="np-page">
        <div className="np-container">
          <p className="np-title">New Project</p>

          <form onSubmit={handleSubmit}>

            {/* PROJECT NAME */}
            <div className="np-field">
              <label>
                PROJECT NAME <span className="required">*</span>
              </label>
              <select name="projectName" onChange={handleChange}>
                <option value="">Name</option>
                <option>Project Alpha</option>
                <option>Project Beta</option>
                <option>Project Gamma</option>
              </select>
            </div>

            {/* DESCRIPTION - Rich Text Editor */}
            <div className="np-field">
              <label>DESCRIPTION</label>
              <div className="np-editor-wrapper">

                {/* TOOLBAR */}
                <div className="np-toolbar">

                  {/* Magic / AI */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="AI Assist"
                    onClick={() => {}}
                  >
                    ✨
                  </button>

                  <div className="np-toolbar-divider" />

                  {/* Bold */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Bold"
                    onClick={() => handleFormat("bold")}
                  >
                    <b>B</b>
                  </button>

                  {/* Italic */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Italic"
                    onClick={() => handleFormat("italic")}
                  >
                    <i>I</i>
                  </button>

                  {/* Underline */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Underline"
                    onClick={() => handleFormat("underline")}
                  >
                    <u>U</u>
                  </button>

                  {/* Strikethrough */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Strikethrough"
                    onClick={() => handleFormat("strikeThrough")}
                  >
                    <s>S</s>
                  </button>

                  <div className="np-toolbar-divider" />

                  {/* Font Size */}
                  <select
                    className="np-font-size"
                    onChange={(e) => handleFormat("fontSize", e.target.value)}
                    defaultValue="3"
                  >
                    <option value="1">10</option>
                    <option value="2">12</option>
                    <option value="3">14</option>
                    <option value="4">16</option>
                    <option value="5">18</option>
                    <option value="6">24</option>
                    <option value="7">32</option>
                  </select>

                  <div className="np-toolbar-divider" />

                  {/* Unordered List */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Bullet List"
                    onClick={() => handleFormat("insertUnorderedList")}
                  >
                    ☰
                  </button>

                  {/* Ordered List */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Numbered List"
                    onClick={() => handleFormat("insertOrderedList")}
                  >
                    ≡
                  </button>

                  {/* Justify */}
                  <button
                    type="button"
                    className="np-toolbar-btn"
                    title="Justify"
                    onClick={() => handleFormat("justifyFull")}
                  >
                    ▤
                  </button>
                </div>

                {/* EDITOR BODY */}
                <div
                  ref={editorRef}
                  className="np-editor-body"
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
            </div>

            {/* RERA PROJECT ID */}
            <div className="np-field">
              <label>RERA PROJECT ID</label>
              <input
                type="text"
                name="reraProjectId"
                placeholder="RERA PROJECT ID"
                onChange={handleChange}
              />
            </div>

            {/* SALES */}
            <div className="np-field">
              <label>SALES</label>
              <input
                type="text"
                name="sales"
                placeholder="Sales"
                onChange={handleChange}
              />
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