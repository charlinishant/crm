import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import SalesFollowupsTable from "../components/SalesFollowupsTable";


const FollowupsPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Followups" />

       <SalesFollowupsTable/>

      </MasterLayout>

    </>
  );
};

export default FollowupsPage ; 
