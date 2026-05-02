import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import WizardLayer from "../components/SiteVists";
import SiteVists from "../components/SiteVists";
import  WhatsApp from "../components/WhatsApp"


const WhatAppPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="WhatsApp" />

        
    <WhatsApp/>
      </MasterLayout>

    </>
  );
};

export default WhatAppPage ; 