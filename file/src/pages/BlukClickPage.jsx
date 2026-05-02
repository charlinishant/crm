import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import WizardLayer from "../components/SiteVists";
import SiteVists from "../components/SiteVists";
import AllBlukClick from "../components/AllBlukClick";


const BlukClickPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Bluk Click To Calls" />

      
              <AllBlukClick/>
      </MasterLayout>

    </>
  );
};

export default BlukClickPage ; 