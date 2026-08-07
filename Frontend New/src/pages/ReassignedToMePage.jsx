import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import ReassignedToMe from "../components/ReassignedToMe"



const ReassignedToMePage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Reassigned To Me" />

        <ReassignedToMe/>

      </MasterLayout>

    </>
  );
};

export default ReassignedToMePage ; 