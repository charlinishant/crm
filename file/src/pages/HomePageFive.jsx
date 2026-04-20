import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import DashBoardLayerFive from "../components/DashBoardLayerFive";
import Exportbutton from "../components/child/Exportbutton";


const HomePageFive = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Conversation Tracker" />

        {/* DashBoardLayerFive */}
        <DashBoardLayerFive />
        
        <Exportbutton />


      </MasterLayout>
    </>
  );
};

export default HomePageFive;
