import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import Sms from "../components/Sms";


const SmsPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="SMS" />
        
        <Sms/>

      </MasterLayout>

    </>
  );
};

export default SmsPage;

