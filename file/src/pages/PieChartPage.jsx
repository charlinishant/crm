import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import PieChartLayer from "../components/PieChartLayer";
import Projecttower from "../components/child/Projecttower";

const PieChartPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Project Tower" />

        {/* PieChartLayer */}
       
        <Projecttower />

      </MasterLayout>

    </>
  );
};

export default PieChartPage; 
