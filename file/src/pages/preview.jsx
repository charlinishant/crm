import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBriefcase,
  FaCalendarAlt,
  FaCommentAlt,
  FaEdit,
  FaEllipsisV,
  FaEnvelope,
  FaHome,
  FaListAlt,
  FaPhoneAlt,
  FaQuoteLeft,
  FaRegClock,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import MasterLayout from "../masterLayout/MasterLayout";

const fallbackLead = {
  id: 10702,
  name: "chetan agrawal",
  lead_status: "Booked",
  source: "channel_partner",
  city: "India",
  budget: "-",
  owner: "Tejas Sales",
  tags: "channel_partner, channel_partn...",
};

const readStoredLead = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem("selectedLeadPreview") || "null");
  } catch (error) {
    return null;
  }
};

const getLeadValue = (lead, keys, fallback = "-") => {
  for (const key of keys) {
    const value = lead?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const formatLeadDate = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const Preview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [lead, setLead] = useState(location.state?.lead || readStoredLead() || fallbackLead);
  const leadIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("leadId"),
    [location.search]
  );

  useEffect(() => {
    if (location.state?.lead) {
      setLead(location.state.lead);
      window.sessionStorage.setItem(
        "selectedLeadPreview",
        JSON.stringify(location.state.lead)
      );
      return;
    }

    const storedLead = readStoredLead();
    const storedLeadId = storedLead?.id || storedLead?._id || storedLead?.lead_id;

    if (storedLead && (!leadIdFromUrl || String(storedLeadId) === String(leadIdFromUrl))) {
      setLead(storedLead);
      return;
    }

    if (!leadIdFromUrl) return;

    const fetchLeadById = async () => {
      try {
        const response = await fetch(`${API_URL}/leads/`);
        const result = await response.json();
        const leads = Array.isArray(result) ? result : result?.data || [];
        const foundLead = leads.find((item) => {
          const itemId = item.id || item._id || item.lead_id;
          return String(itemId) === String(leadIdFromUrl);
        });

        if (foundLead) {
          setLead(foundLead);
          window.sessionStorage.setItem("selectedLeadPreview", JSON.stringify(foundLead));
        }
      } catch (error) {
        console.error("Unable to load lead preview:", error);
      }
    };

    fetchLeadById();
  }, [API_URL, leadIdFromUrl, location.state]);

  const leadName = getLeadValue(
    lead,
    ["name", "full_name", "customer_name"],
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "chetan agrawal"
  );
  const leadId = getLeadValue(lead, ["id", "_id", "lead_id"], "10702");
  const leadStatus = getLeadValue(lead, ["lead_status", "status", "stage"], "Booked");
  const statusOptions = ["Booked", "New", "Follow Up", "Closed"].includes(leadStatus)
    ? ["Booked", "New", "Follow Up", "Closed"]
    : ["Booked", "New", "Follow Up", "Closed", leadStatus];
  const leadSource = getLeadValue(lead, ["source", "lead_source"], "channel_partner");
  const leadSubSource = getLeadValue(lead, ["sub_source", "subSource", "channel_partner"], "Zeeshan Khan (Our N...");
  const projectName = getLeadValue(lead, ["project_name", "projectName", "interestedProjects"], "Binghatti Hills");
  const cpName = getLeadValue(lead, ["cp_name", "channel_partner_name", "broker_name"], "Our Nest Realty(Zeeshan Khan)");
  const owner = getLeadValue(lead, ["owner", "assigned_to", "sales"], "Tejas Sales");
  const country = getLeadValue(lead, ["country", "lead_country", "city"], "India");
  const receivedOn = formatLeadDate(
    getLeadValue(lead, ["createdAt", "created_at", "received_on"], ""),
    "Thu, Apr 30, 2026 4:44 PM"
  );
  const campaignReceivedOn = formatLeadDate(
    getLeadValue(lead, ["createdAt", "created_at", "received_on"], ""),
    "April 30, 2026 4:44 PM"
  );

  const detailRows = [
    ["RECEIVED ON", receivedOn],
    ["LEAD AGE", getLeadValue(lead, ["lead_age", "age"], "01 day")],
    ["TAGS", getLeadValue(lead, ["tags", "source"], "channel_partner, channel_partn...")],
    ["LAST CONTACT", lead.last_contact || receivedOn],
    ["OWNER", owner],
    ["LAST CALL", getLeadValue(lead, ["last_call"], "No recording available")],
    ["PHONE VERIFIED", getLeadValue(lead, ["phone_verified"], "No")],
    ["LEAD COUNTRY", country],
    ["LEAD'S CURRENT TIME", lead.current_time || "02/05/2026 10:47 AM"],
    ["LAST CONTACT ATTEMPTED BY LEAD", lead.last_contact_attempted_by_lead || "-"],
    ["LAST CONTACT BY LEAD", lead.last_contact_by_lead || "-"],
    ["LAST CONTACT ATTEMPTED BY SALES", lead.last_contact_attempted_by_sales || "-"],
    ["LAST CONTACT BY SALES", lead.last_contact_by_sales || "-"],
  ];

  return (
    <MasterLayout>
      <>
        <style>{`
          .preview-page {
            min-height: 100vh;
            background: #f4f6f8;
            padding: 0 16px 32px;
          }

          .lead-preview-shell {
            width: min(100%, 960px);
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cfd6df;
            border-radius: 5px 5px 0 0;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
            overflow: hidden;
          }

          .lead-preview-topbar {
            height: 62px;
            background: #666666;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
          }

          .lead-preview-title {
            font-size: 22px !important;
            font-weight: 400;
            margin: 0;
            line-height: 1.2;
            max-width: calc(100% - 56px);
            overflow: hidden;
            text-overflow: ellipsis;
            text-transform: lowercase;
            white-space: nowrap;
          }

          .lead-preview-close {
            border: 0;
            background: transparent;
            color: #d2d2d2;
            font-size: 26px;
            line-height: 1;
            cursor: pointer;
          }

          .lead-preview-body {
            position: relative;
            padding: 24px 20px 0;
          }

          .lead-preview-tooltip {
            position: absolute;
            top: -36px;
            left: 50%;
            transform: translateX(-50%);
            background: #454545;
            color: #ffffff;
            border-radius: 4px;
            padding: 7px 11px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
          }

          .lead-preview-tooltip::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: -7px;
            transform: translateX(-50%);
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 7px solid #454545;
          }

          .lead-preview-summary {
            display: grid;
            grid-template-columns: minmax(330px, 1fr) 120px 120px;
            align-items: center;
            gap: 22px;
            padding-bottom: 14px;
            border-bottom: 1px solid #dbe1e8;
          }

          .lead-preview-person {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            min-width: 0;
          }

          .lead-preview-person-info {
            min-width: 0;
          }

          .lead-preview-flag {
            width: 27px;
            height: 18px;
            box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
            background: linear-gradient(to bottom, #ff9933 0 33%, #ffffff 33% 66%, #138808 66% 100%);
            position: relative;
          }

          .lead-preview-flag::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 5px;
            height: 5px;
            border: 1px solid #1a4fb5;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          }

          .lead-preview-id {
            color: #8f96a3;
            font-size: 14px;
            line-height: 1.2;
            margin-bottom: 7px;
          }

          .lead-preview-name {
            color: #45515f;
            font-size: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            line-height: 1.2;
            min-width: 0;
            text-transform: lowercase;
          }

          .lead-preview-name-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .lead-preview-edit {
            color: #000000;
            font-size: 13px;
          }

          .lead-preview-whatsapp {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            border-radius: 50%;
            background: #42b755;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 21px;
            margin-top: 16px;
          }

          .lead-preview-count {
            text-align: center;
            color: #3f4650;
            font-size: 14px;
          }

          .lead-preview-badge {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #41ad50;
            color: #ffffff;
            font-size: 18px;
            font-weight: 700;
          }

          .lead-preview-main {
            display: grid;
            grid-template-columns: 230px 1fr;
            gap: 62px;
            padding: 20px 0 36px;
          }

          .lead-preview-score {
            position: relative;
            width: 104px;
            height: 104px;
            margin: 0 auto 26px;
            border-radius: 50%;
            background: conic-gradient(#42ad50 0 42%, #f8f8f8 42% 100%);
          }

          .lead-preview-score::before {
            content: "";
            position: absolute;
            inset: 8px;
            border-radius: 50%;
            background: #ffffff;
          }

          .lead-preview-score-text {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #c2c5ca;
            font-size: 18px;
            font-weight: 700;
          }

          .lead-preview-score-number {
            position: absolute;
            right: -12px;
            top: 0;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #62666e;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 700;
          }

          .lead-preview-stage {
            display: grid;
            grid-template-columns: repeat(2, minmax(160px, 1fr));
            gap: 28px 64px;
            margin-bottom: 42px;
          }

          .lead-preview-label {
            color: #939aa5;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }

          .lead-preview-value {
            color: #404a57;
            font-size: 18px;
            line-height: 1.35;
          }

          .lead-preview-select {
            width: 102px;
            height: 29px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            color: #5c35d8;
            background: #ffffff;
            padding: 0 10px;
            font-size: 14px;
          }

          .lead-preview-details {
            display: grid;
            grid-template-columns: repeat(3, minmax(160px, 1fr));
            gap: 34px 64px;
          }

          .lead-preview-section {
            border-top: 1px solid #e4e8ee;
            padding: 0;
          }

          .lead-preview-section h3 {
            margin: 0;
            color: #45515f;
            font-size: 23px;
            font-weight: 400;
          }

          .lead-preview-section-title {
            min-height: 78px;
            display: flex;
            align-items: center;
            padding: 0 20px;
            border-bottom: 1px solid #e4e8ee;
          }

          .lead-preview-partner-body {
            padding: 24px 20px 34px;
          }

          .lead-preview-field-label {
            color: #89919d;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }

          .lead-preview-field-value {
            color: #000000;
            font-size: 18px;
            line-height: 1.35;
          }

          .lead-preview-lower {
            display: flex;
            flex-direction: column;
            gap: 37px;
            padding: 38px 0 12px;
          }

          .lead-preview-panel {
            border: 1px solid #cfd6df;
            border-radius: 5px;
            background: #ffffff;
            overflow: hidden;
          }

          .lead-preview-panel-head {
            min-height: 70px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 0 20px;
            border-bottom: 1px solid #dbe1e8;
          }

          .lead-preview-panel-title {
            display: flex;
            align-items: center;
            gap: 18px;
            color: #4c5562;
            font-size: 24px;
            font-weight: 400;
          }

          .lead-preview-panel-icon {
            color: #707070;
            font-size: 27px;
          }

          .lead-preview-task-actions {
            display: flex;
            align-items: center;
            gap: 28px;
          }

          .lead-preview-add-task {
            border: 0;
            background: transparent;
            color: #000000;
            font-size: 20px;
            cursor: pointer;
          }

          .lead-preview-status-btn {
            height: 30px;
            min-width: 86px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            color: #5c35d8;
            background: #ffffff;
            padding: 0 13px;
            font-size: 14px;
          }

          .lead-preview-panel-empty {
            min-height: 39px;
          }

          .lead-preview-booking-body {
            padding: 19px;
          }

          .lead-preview-booking-card {
            position: relative;
            border: 1px solid #cfd6df;
            border-radius: 5px;
            padding: 24px 50px 20px 19px;
          }

          .lead-preview-booking-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 54px;
          }

          .lead-preview-booking-column {
            display: grid;
            gap: 6px;
          }

          .lead-preview-booking-menu {
            position: absolute;
            right: 19px;
            top: 27px;
            color: #000000;
            font-size: 19px;
          }

          .lead-preview-stage-pill {
            width: fit-content;
            border-radius: 4px;
            background: #44b858;
            color: #ffffff;
            padding: 2px 6px;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.2;
          }

          .lead-preview-campaign-head {
            min-height: 70px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 0 20px;
            border-bottom: 1px solid #dbe1e8;
          }

          .lead-preview-sort {
            height: 30px;
            min-width: 174px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            color: #5c35d8;
            background: #ffffff;
            padding: 0 13px;
            font-size: 14px;
          }

          .lead-preview-campaign-body {
            padding: 25px 20px 38px;
          }

          .lead-preview-campaign-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.6fr 1.1fr;
            gap: 27px 66px;
            padding-bottom: 22px;
            border-bottom: 1px solid #e1e5ea;
          }

          .lead-preview-campaign-wide {
            grid-column: span 2;
          }

          .lead-preview-link {
            border: 0;
            background: transparent;
            color: #000000;
            padding: 0;
            font-size: 18px;
            cursor: pointer;
          }

          .lead-preview-campaign-footer {
            min-height: 38px;
            border-top: 1px solid #eef1f4;
          }

          .lead-preview-action-bar {
            height: 58px;
            background: #696969;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
          }

          .lead-preview-action-icons {
            display: flex;
            align-items: center;
            gap: 39px;
          }

          .lead-preview-action-icons button,
          .lead-preview-profile-btn {
            border: 0;
            cursor: pointer;
          }

          .lead-preview-action-icons button {
            width: 22px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            background: transparent;
            color: #ffffff;
            font-size: 19px;
          }

          .lead-preview-profile-btn {
            min-width: 112px;
            height: 30px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            background: #ffffff;
            color: #5c35d8;
            font-size: 14px;
          }

          @media (max-width: 900px) {
            .lead-preview-summary,
            .lead-preview-main,
            .lead-preview-stage,
            .lead-preview-details,
            .lead-preview-booking-grid,
            .lead-preview-campaign-grid {
              grid-template-columns: 1fr;
            }

            .lead-preview-summary {
              gap: 16px;
            }

            .lead-preview-count {
              text-align: left;
            }

            .lead-preview-main {
              gap: 24px;
            }

            .lead-preview-panel-head {
              align-items: flex-start;
              flex-direction: column;
              padding: 18px 20px;
            }

            .lead-preview-task-actions {
              width: 100%;
              justify-content: space-between;
              gap: 16px;
            }

            .lead-preview-campaign-head {
              align-items: flex-start;
              flex-direction: column;
              padding: 18px 20px;
            }

            .lead-preview-campaign-wide {
              grid-column: span 1;
            }

            .lead-preview-action-bar {
              padding: 0 12px;
            }

            .lead-preview-action-icons {
              gap: 16px;
            }

            .lead-preview-profile-btn {
              min-width: 96px;
            }
          }
        `}</style>

        <div className="preview-page">
          <div className="lead-preview-shell">
            <div className="lead-preview-topbar">
              <h1 className="lead-preview-title">{leadName}</h1>
              <button className="lead-preview-close" type="button" onClick={() => navigate(-1)} aria-label="Close preview">
                <FaTimes />
              </button>
            </div>

            <div className="lead-preview-body">
              <div className="lead-preview-tooltip">{leadName}</div>

              <div className="lead-preview-summary">
                <div className="lead-preview-person">
                  <span className="lead-preview-flag" aria-label="India" />
                  <div className="lead-preview-person-info">
                    <div className="lead-preview-id"># {leadId}</div>
                    <div className="lead-preview-name">
                      <span className="lead-preview-name-text">{leadName}</span>
                      <FaEdit className="lead-preview-edit" />
                    </div>
                  </div>
                  <span className="lead-preview-whatsapp">
                    <FaWhatsapp />
                  </span>
                </div>
                <div className="lead-preview-count">
                  <span className="lead-preview-badge">1</span>
                  <div>Units</div>
                </div>
                <div className="lead-preview-count">
                  <span className="lead-preview-badge">0</span>
                  <div>Tasks</div>
                </div>
              </div>

              <div className="lead-preview-main">
                <div>
                  <div className="lead-preview-score">
                    <span className="lead-preview-score-text">CA</span>
                    <span className="lead-preview-score-number">41</span>
                  </div>
                </div>

                <div>
                  <div className="lead-preview-stage">
                    <div>
                      <div className="lead-preview-label">Stage & Status</div>
                      <select className="lead-preview-select" key={leadStatus} defaultValue={leadStatus}>
                        {statusOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="lead-preview-label">Last Note</div>
                      <div className="lead-preview-value">-</div>
                    </div>
                  </div>

                  <div className="lead-preview-details">
                    {detailRows.map(([label, value]) => (
                      <div key={label}>
                        <div className="lead-preview-label">
                          {label}
                          {label === "TAGS" && <FaEdit className="lead-preview-edit" style={{ marginLeft: 14 }} />}
                        </div>
                        <div className="lead-preview-value">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lead-preview-section">
              <div className="lead-preview-section-title">
                <h3>Channel Partners</h3>
              </div>
              <div className="lead-preview-partner-body">
                <div className="lead-preview-field-label">CP Name (Company Name)</div>
                <div className="lead-preview-field-value">{cpName}</div>
              </div>
            </div>

            <div className="lead-preview-lower">
              <div className="lead-preview-panel">
                <div className="lead-preview-panel-head">
                  <div className="lead-preview-panel-title">
                    <FaListAlt className="lead-preview-panel-icon" />
                    <span>Tasks</span>
                  </div>
                  <div className="lead-preview-task-actions">
                    <button type="button" className="lead-preview-add-task">
                      Add A Task
                    </button>
                    <select className="lead-preview-status-btn" defaultValue="Open">
                      <option>Open</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>
                <div className="lead-preview-panel-empty" />
              </div>

              <div className="lead-preview-panel">
                <div className="lead-preview-panel-head">
                  <div className="lead-preview-panel-title">
                    <FaBriefcase className="lead-preview-panel-icon" />
                    <span>Bookings (# {leadId})</span>
                  </div>
                </div>
                <div className="lead-preview-booking-body">
                  <div className="lead-preview-booking-card">
                    <FaEllipsisV className="lead-preview-booking-menu" />
                    <div className="lead-preview-booking-grid">
                      <div className="lead-preview-booking-column">
                        <div>
                          <div className="lead-preview-field-label">Booking ID</div>
                          <div className="lead-preview-value">676</div>
                        </div>
                        <div>
                          <div className="lead-preview-field-label">Unit</div>
                          <div className="lead-preview-value">1606</div>
                        </div>
                        <div>
                          <div className="lead-preview-field-label">Saleable Area</div>
                          <div className="lead-preview-value">2,150 sq_ft</div>
                        </div>
                      </div>

                      <div className="lead-preview-booking-column">
                        <div>
                          <div className="lead-preview-field-label">Customer Name</div>
                          <div className="lead-preview-value">{leadName}</div>
                        </div>
                        <div>
                          <div className="lead-preview-field-label">Stage</div>
                          <div className="lead-preview-stage-pill">Tentative</div>
                        </div>
                        <div>
                          <div className="lead-preview-field-label">Base Price</div>
                          <div className="lead-preview-value">Rs. 2Cr (2,01,02,500)</div>
                        </div>
                      </div>

                      <div className="lead-preview-booking-column">
                        <div>
                          <div className="lead-preview-field-label">Project Details</div>
                          <div className="lead-preview-value">{projectName}</div>
                        </div>
                        <div>
                          <div className="lead-preview-field-label">Booked On</div>
                          <div className="lead-preview-value">01/05/26</div>
                        </div>
                        <div>
                          <div className="lead-preview-field-label">Base Rate</div>
                          <div className="lead-preview-value">Rs. 7.8K (7,750)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lead-preview-panel">
                <div className="lead-preview-campaign-head">
                  <div className="lead-preview-panel-title">
                    <span>Campaign Responses (1)</span>
                  </div>
                  <select className="lead-preview-sort" defaultValue="Sort by Oldest First">
                    <option>Sort by Oldest First</option>
                    <option>Sort by Newest First</option>
                  </select>
                </div>

                <div className="lead-preview-campaign-body">
                  <div className="lead-preview-campaign-grid">
                    <div className="lead-preview-campaign-wide">
                      <div className="lead-preview-field-label">Received on {campaignReceivedOn}</div>
                      <div className="lead-preview-value">{leadSource}</div>
                    </div>

                    <div>
                      <div className="lead-preview-field-label">Project Name</div>
                      <div className="lead-preview-value">{projectName}</div>
                    </div>

                    <div>
                      <div className="lead-preview-field-label">Source</div>
                      <div className="lead-preview-value">{leadSource}</div>
                    </div>

                    <div>
                      <div className="lead-preview-field-label">Sub Source</div>
                      <div className="lead-preview-value">{leadSubSource}</div>
                    </div>

                    <div>
                      <div className="lead-preview-field-label">Medium</div>
                      <div className="lead-preview-value">manual_entry</div>
                    </div>

                    <div>
                      <div className="lead-preview-field-label">Analytics</div>
                      <button type="button" className="lead-preview-link">
                        View
                      </button>
                    </div>
                  </div>
                </div>
                <div className="lead-preview-campaign-footer" />
              </div>
            </div>

            <div className="lead-preview-action-bar">
              <div className="lead-preview-action-icons" aria-label="Lead quick actions">
                <button type="button" aria-label="Quote">
                  <FaQuoteLeft />
                </button>
                <button type="button" aria-label="Call">
                  <FaPhoneAlt />
                </button>
                <button type="button" aria-label="Message">
                  <FaCommentAlt />
                </button>
                <button type="button" aria-label="Email">
                  <FaEnvelope />
                </button>
                <button type="button" aria-label="Calendar">
                  <FaCalendarAlt />
                </button>
                <button type="button" aria-label="Reminder">
                  <FaRegClock />
                </button>
                <button type="button" aria-label="WhatsApp">
                  <FaWhatsapp />
                </button>
                <button type="button" aria-label="Home">
                  <FaHome />
                </button>
              </div>
              <button type="button" className="lead-preview-profile-btn">
                View Profile
              </button>
            </div>
          </div>
        </div>
      </>
    </MasterLayout>
  );
};

export default Preview;
