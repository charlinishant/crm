import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import UserWhatsAppPage from "../user/UserWhatsAppPage";


const WhatAppPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>
        <UserWhatsAppPage />
      </MasterLayout>

    </>
  );
};

export default WhatAppPage ; 
