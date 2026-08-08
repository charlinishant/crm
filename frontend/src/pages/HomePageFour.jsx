import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import MyReports from "./MyReports";


const HomePageFour = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Reports" />


      
        <MyReports />


      </MasterLayout>
    </>
  );
};

export default HomePageFour;
