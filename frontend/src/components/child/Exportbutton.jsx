import React from "react";

const Exportbutton = () => {
  return (
    <div className="export-container">

      {/* LEFT */}
      <button className="smart-btn">
        ⚙ Smart Search
      </button>

      {/* RIGHT */}
      <button className="export-btn">
        📄 Export
      </button>

    </div>
  );
};

export default Exportbutton;