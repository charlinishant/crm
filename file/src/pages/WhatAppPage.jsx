import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
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
