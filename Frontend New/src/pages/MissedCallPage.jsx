import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import MissedCall from "../components/MissedCall"



const MissedCallPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Missed Call" />

        <MissedCall/>

      </MasterLayout>

    </>
  );
};

export default MissedCallPage ; 