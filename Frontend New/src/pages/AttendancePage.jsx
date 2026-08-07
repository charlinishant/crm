import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import Attendance from "../components/Attendance";

const AttendancePage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="User Attendance" />
      <Attendance />
    </MasterLayout>
  );
};

export default AttendancePage;
