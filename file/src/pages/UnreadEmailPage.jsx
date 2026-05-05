import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import UnreadEmails from "../components/UnreadEmails"



const UnreadEmailPage = () => {
  return (
    <>

      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Unread Emails" />

       <UnreadEmails/>

      </MasterLayout>

    </>
  );
};

export default UnreadEmailPage ; 