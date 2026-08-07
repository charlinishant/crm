import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import UntouchedLeadsAttempts1 from "../components/UntouchedLeadsAttempts1"



const UntouchedLeadsAttemptsPage1 = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Untouched Leads Attempts Page 1" />

      
           <UntouchedLeadsAttempts1/>
      </MasterLayout>

    </>
  );
};

export default UntouchedLeadsAttemptsPage1 ; 