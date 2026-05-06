import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import SiteVists from "../components/SiteVists";


const FollowupsPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Site Vists" />

       <SiteVists/>

      </MasterLayout>

    </>
  );
};

export default FollowupsPage ; 
