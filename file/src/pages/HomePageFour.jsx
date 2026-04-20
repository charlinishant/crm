import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import DashBoardLayerFour from "../components/DashBoardLayerFour";
import MyReports from "./MyReports";


const HomePageFour = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="yReports" />


      
        <MyReports />


      </MasterLayout>
    </>
  );
};

export default HomePageFour;
