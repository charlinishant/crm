import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import TypographyLayer from "../components/Booking";
import Booking from "../components/Booking";


const BookingPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Components / Typography" />

        {/* Booking */}
        <Booking/>

      </MasterLayout>

    </>
  );
};

export default BookingPage; 
