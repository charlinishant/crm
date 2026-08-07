import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import CallLater from "../components/CallLater";


const CallLaterPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Call LateR" />
           <CallLater/>
      

      </MasterLayout>

    </>
  );
};

export default CallLaterPage ; 