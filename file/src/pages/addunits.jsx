import React from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const AddUnits = () => (
  <MasterLayout>
    <div className="lead-page">
      <div className="lead-container">
        <div className="lead-form">
          <div className="section-card">
            <h2>Manual Unit Creation Retired</h2>
            <p className="floorplan-helper-text">
              Units are now generated only from floor plans using structured unit numbers like A-1301.
              Publish or update a floor plan to create inventory.
            </p>
            <div className="lead-buttons">
              <Link to="/floorplans" className="lead-save">
                Manage Floor Plans
              </Link>
              <Link to="/units" className="lead-cancel">
                View Inventory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MasterLayout>
);

export default AddUnits;
