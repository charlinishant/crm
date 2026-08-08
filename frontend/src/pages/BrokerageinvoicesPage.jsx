import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import BrokerageInvoices from "../components/BrokerageInvoices";



const BrokerageinvoicesPage = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Brokerage Invoices" />

        {/* ColorsLayer */}
      <BrokerageInvoices/>


      </MasterLayout>
    </>
  );
};

export default BrokerageinvoicesPage;
