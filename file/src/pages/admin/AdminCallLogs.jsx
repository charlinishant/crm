import React from "react";
import Breadcrumb from "../../components/Breadcrumb";
import CallLogsTable from "../../components/CallLogsTable";
import MasterLayout from "../../masterLayout/MasterLayout";

const AdminCallLogs = () => (
  <MasterLayout>
    <Breadcrumb title="Call Logs" />
    <CallLogsTable scope="admin" />
  </MasterLayout>
);

export default AdminCallLogs;
