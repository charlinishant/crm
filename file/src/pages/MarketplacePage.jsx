import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import MarketplaceLayer from "../components/MarketplaceLayer";
import PaymentHistoryOne from "../components/child/PaymentHistoryOne";



const MarketplacePage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="All Leads" />

        {/* MarketplaceLayer */}
        {/* <MarketplaceLayer /> */}
        <PaymentHistoryOne />

      </MasterLayout>

    </>
  );
};

export default MarketplacePage; 
