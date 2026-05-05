import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import NewEnquiries from "../components/NewEnquiries"



const NewEnquiriesPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="New Enquiries " />

      
        <NewEnquiries/>

      </MasterLayout>

    </>
  );
};

export default NewEnquiriesPage ; 