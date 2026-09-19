import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import InventoryDrilldownBrowser from "../components/inventory/InventoryDrilldownBrowser";

const PreviewInventoryPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Preview Inventory" />
      <InventoryDrilldownBrowser />
    </MasterLayout>
  );
};

export default PreviewInventoryPage;
