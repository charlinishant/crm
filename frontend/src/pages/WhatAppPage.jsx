import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import UserWhatsAppPage from "../user/UserWhatsAppPage";


const WhatAppPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>
        <div className="admin-whatsapp-container">
          <UserWhatsAppPage adminMode embedded />
        </div>
      </MasterLayout>

    </>
  );
};

export default WhatAppPage ; 
