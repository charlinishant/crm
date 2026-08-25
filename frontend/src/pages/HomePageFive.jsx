import React, { useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import DashBoardLayerFive from "../components/DashBoardLayerFive";
import Exportbutton from "../components/child/Exportbutton";
import UserWhatsAppPage from "../user/UserWhatsAppPage";

const conversationTabs = [
  { key: "calls", label: "Calls" },
  { key: "emails", label: "Emails" },
  { key: "sms", label: "SMS" },
  { key: "siteVisits", label: "Site visits" },
  { key: "whatsapp", label: "WhatsApp" },
];


const HomePageFive = () => {
  const [activeTab, setActiveTab] = useState("calls");

  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>

        {/* Breadcrumb */}
        <Breadcrumb title="Conversation Tracker" />

        <div className="card border-0 shadow-sm radius-12 mb-24">
          <div className="card-body p-16">
            <div className="d-flex flex-wrap gap-2">
              {conversationTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "whatsapp" ? (
          <UserWhatsAppPage />
        ) : activeTab === "calls" ? (
          <>
            <DashBoardLayerFive />
            <Exportbutton />
          </>
        ) : (
          <div className="card border-0 shadow-sm radius-12">
            <div className="card-body p-24 text-secondary-light">
              {activeTab === "emails" && "Email conversations will appear here."}
              {activeTab === "sms" && "SMS conversations will appear here."}
              {activeTab === "siteVisits" && "Site visit conversations will appear here."}
            </div>
          </div>
        )}


      </MasterLayout>
    </>
  );
};

export default HomePageFive;
