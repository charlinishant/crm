import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import SiteVists from "../components/SiteVists";


const SiteVistsPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Site Visits" />

       <SiteVists/>

      </MasterLayout>

    </>
  );
};

export default SiteVistsPage ; 
