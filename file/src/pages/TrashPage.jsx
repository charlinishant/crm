import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import PaymentHistoryOne from "../components/child/PaymentHistoryOne";

const TrashPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title="Trash" />
      <PaymentHistoryOne trashMode />
    </MasterLayout>
  );
};

export default TrashPage;
