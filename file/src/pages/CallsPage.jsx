import React from "react";
import MasterLayout from "../masterLayout/MasterLayout.jsx";
import Breadcrumb from "../components/Breadcrumb.jsx";
import FormPageLayer from "../components/Calls.jsx.jsx";
import Calls from "../components/Calls.jsx.jsx";



const CallsPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Input Form" />

      <Calls/>
      </MasterLayout>

    </>
  );
};

export default CallsPage;
