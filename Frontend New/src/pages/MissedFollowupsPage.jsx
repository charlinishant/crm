import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import MissedFollowups from "../components/MissedFollowups"


const MissedFollowupsPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Missed Followups" />

      <MissedFollowups/>

      </MasterLayout>

    </>
  );
};

export default MissedFollowupsPage; 