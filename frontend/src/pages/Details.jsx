import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import UserDetails from "../user/userDetails";

const Details = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Lead Details" />
      <UserDetails context="admin" />
    </MasterLayout>
  );
};

export default Details;
