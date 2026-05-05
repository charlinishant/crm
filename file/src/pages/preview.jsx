import React, { useEffect, useMemo, useRef, useState } from "react";
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

const emptyBookingForm = {
  unit: "",
  customerName: "",
  stage: "Tentative",
  projectDetails: "",
  bookedOn: "",
  saleableArea: "",
  basePrice: "",
  baseRate: "",
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

const leadStatusOptions = [
  { value: "Booked", label: "Booked" },
  { value: "Fresh_Lead", label: "Fresh Lead" },
  { value: "Lost", label: "Lost" },
  { value: "NP", label: "NP" },
  { value: "Prospect", label: "Prospect" },
  { value: "Registered", label: "Registered" },
  { value: "Unqualified", label: "Unqualified" },
];

const normalizeStatus = (value) => {
  if (!value) return "Booked";
  const match = leadStatusOptions.find(
    (option) =>
      option.value === value ||
      option.label.toLowerCase() === String(value).toLowerCase()
  );
  return match?.value || "Booked";
};

const getStatusLabel = (value) => {
  return leadStatusOptions.find((option) => option.value === value)?.label || value;
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
  const [selectedStatus, setSelectedStatus] = useState(
    normalizeStatus(
      getLeadValue(
        location.state?.lead || readStoredLead() || fallbackLead,
        ["status", "lead_status", "stage"],
        "Booked"
      )
    )
  );
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [bookings, setBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const bookingSectionRef = useRef(null);
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

  useEffect(() => {
    setSelectedStatus(normalizeStatus(getLeadValue(lead, ["status", "lead_status", "stage"], "Booked")));
  }, [lead]);

  const leadName = getLeadValue(
    lead,
    ["name", "full_name", "customer_name"],
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "chetan agrawal"
  );
  const leadId = getLeadValue(lead, ["id", "_id", "lead_id"], "10702");
  const leadStatus = normalizeStatus(getLeadValue(lead, ["status", "lead_status", "stage"], "Booked"));
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
  const latestBooking = bookings[0];

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

  useEffect(() => {
    if (!leadId) return;

    const fetchBookings = async () => {
      try {
        const response = await fetch(`${API_URL}/bookings?leadId=${leadId}&limit=20`);
        if (!response.ok) return;
        const result = await response.json();
        setBookings(Array.isArray(result) ? result : result?.data || []);
      } catch (error) {
        console.error("Unable to load bookings:", error);
      }
    };

    fetchBookings();
  }, [API_URL, leadId]);

  useEffect(() => {
    setBookingForm((prev) => ({
      ...prev,
      customerName: prev.customerName || leadName,
      projectDetails: prev.projectDetails || projectName,
    }));
  }, [leadName, projectName]);

  const updateStoredLead = (storageKey, updatedLead) => {
    try {
      const storedLead = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
      const storedLeadId = storedLead?.id || storedLead?._id || storedLead?.lead_id;

      if (!storedLead || String(storedLeadId) === String(leadId)) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(updatedLead));
      }
    } catch (error) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(updatedLead));
    }
  };

  const handleSaveStatus = async () => {
    setIsSavingStatus(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(result?.message || "Unable to update status");
      }

      const savedStatus = result.status || selectedStatus;
      const updatedLead = {
        ...lead,
        ...result,
        status: savedStatus,
        lead_status: savedStatus,
        stage: savedStatus,
      };

      setLead(updatedLead);
      updateStoredLead("selectedLeadPreview", updatedLead);
      updateStoredLead("selectedLeadDetails", updatedLead);
      setStatusMessage(`Saved: ${getStatusLabel(savedStatus)}`);

      if (savedStatus === "Booked") {
        handleOpenBookingForm("Lead booked. Complete the booking form.");
      }
    } catch (error) {
      console.error("Unable to update lead status:", error);
      setStatusMessage("Status could not be saved. Please check backend and database.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleBookingChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenBookingForm = (message = "") => {
    setBookingForm({
      ...emptyBookingForm,
      customerName: leadName,
      projectDetails: projectName,
    });
    setBookingMessage(message);
    setIsBookingFormOpen(true);

    setTimeout(() => {
      bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const formatBookingDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const formatMoney = (value) => {
    if (value === undefined || value === null || value === "") return "-";
    return `Rs. ${Number(value).toLocaleString("en-IN")}`;
  };

  const handleSaveBooking = async (event) => {
    event.preventDefault();
    setIsSavingBooking(true);
    setBookingMessage("");

    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...bookingForm,
          leadId: Number(leadId),
          source: leadSource,
          bookedBy: owner,
        }),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(result?.message || "Unable to create booking");
      }

      setBookings((current) => [result, ...current]);
      setIsBookingFormOpen(false);
      setBookingMessage("Booking saved successfully");
    } catch (error) {
      console.error("Unable to save booking:", error);
      setBookingMessage("Booking could not be saved. Please check backend and database.");
    } finally {
      setIsSavingBooking(false);
    }
  };

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
            width: 132px;
            height: 29px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            color: #5c35d8;
            background: #ffffff;
            padding: 0 10px;
            font-size: 14px;
          }

          .lead-preview-status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .lead-preview-save-status {
            min-height: 29px;
            border: 0;
            border-radius: 4px;
            background: #0d6efd;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            padding: 0 12px;
          }

          .lead-preview-save-status:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .lead-preview-status-message {
            color: #596271;
            font-size: 12px;
            margin-top: 6px;
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

          .lead-preview-booking-head-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .lead-preview-create-booking {
            border: 0;
            border-radius: 4px;
            background: #0d6efd;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            min-height: 32px;
            padding: 0 12px;
          }

          .lead-preview-booking-form {
            border: 1px solid #cfd6df;
            border-radius: 5px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 16px;
            padding: 16px;
          }

          .lead-preview-booking-form label {
            color: #6b7280;
            display: grid;
            font-size: 12px;
            font-weight: 600;
            gap: 5px;
            text-transform: uppercase;
          }

          .lead-preview-booking-form input,
          .lead-preview-booking-form select {
            border: 1px solid #cfd6df;
            border-radius: 4px;
            color: #404a57;
            font-size: 14px;
            min-height: 34px;
            padding: 0 10px;
            width: 100%;
          }

          .lead-preview-booking-form-actions {
            align-items: end;
            display: flex;
            gap: 8px;
          }

          .lead-preview-booking-save,
          .lead-preview-booking-cancel {
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            min-height: 34px;
            padding: 0 13px;
          }

          .lead-preview-booking-save {
            background: #0d6efd;
            border: 0;
            color: #ffffff;
          }

          .lead-preview-booking-save:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .lead-preview-booking-cancel {
            background: #ffffff;
            border: 1px solid #cfd6df;
            color: #404a57;
          }

          .lead-preview-booking-message {
            color: #596271;
            font-size: 13px;
            margin-bottom: 12px;
          }

          .lead-preview-booking-empty {
            border: 1px dashed #cfd6df;
            border-radius: 5px;
            color: #6b7280;
            padding: 18px;
            text-align: center;
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
            .lead-preview-booking-form,
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
                      <div className="lead-preview-status-row">
                        <select
                          className="lead-preview-select"
                          value={selectedStatus}
                          onChange={(event) => {
                            setSelectedStatus(event.target.value);
                            setStatusMessage("");
                          }}
                        >
                          {leadStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="lead-preview-save-status"
                          onClick={handleSaveStatus}
                          disabled={isSavingStatus || (selectedStatus === leadStatus && selectedStatus !== "Booked")}
                        >
                          {isSavingStatus ? "Saving..." : "Save"}
                        </button>
                      </div>
                      {statusMessage && (
                        <div className="lead-preview-status-message">{statusMessage}</div>
                      )}
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

              <div className="lead-preview-panel" ref={bookingSectionRef}>
                <div className="lead-preview-panel-head">
                  <div className="lead-preview-panel-title">
                    <FaBriefcase className="lead-preview-panel-icon" />
                    <span>Bookings ({bookings.length})</span>
                  </div>
                  <div className="lead-preview-booking-head-actions">
                    <button
                      type="button"
                      className="lead-preview-create-booking"
                      onClick={handleOpenBookingForm}
                    >
                      Create Booking
                    </button>
                  </div>
                </div>
                <div className="lead-preview-booking-body">
                  {bookingMessage && (
                    <div className="lead-preview-booking-message">{bookingMessage}</div>
                  )}
                  {isBookingFormOpen && (
                    <form className="lead-preview-booking-form" onSubmit={handleSaveBooking}>
                      <label>
                        Unit
                        <input name="unit" value={bookingForm.unit} onChange={handleBookingChange} required />
                      </label>
                      <label>
                        Customer Name
                        <input name="customerName" value={bookingForm.customerName} onChange={handleBookingChange} required />
                      </label>
                      <label>
                        Stage
                        <select name="stage" value={bookingForm.stage} onChange={handleBookingChange}>
                          <option>Tentative</option>
                          <option>Booked</option>
                          <option>Cancelled</option>
                        </select>
                      </label>
                      <label>
                        Project Details
                        <input name="projectDetails" value={bookingForm.projectDetails} onChange={handleBookingChange} />
                      </label>
                      <label>
                        Booked On
                        <input name="bookedOn" type="date" value={bookingForm.bookedOn} onChange={handleBookingChange} />
                      </label>
                      <label>
                        Saleable Area
                        <input name="saleableArea" type="number" value={bookingForm.saleableArea} onChange={handleBookingChange} />
                      </label>
                      <label>
                        Base Price
                        <input name="basePrice" type="number" value={bookingForm.basePrice} onChange={handleBookingChange} />
                      </label>
                      <label>
                        Base Rate
                        <input name="baseRate" type="number" value={bookingForm.baseRate} onChange={handleBookingChange} />
                      </label>
                      <div className="lead-preview-booking-form-actions">
                        <button type="submit" className="lead-preview-booking-save" disabled={isSavingBooking}>
                          {isSavingBooking ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="lead-preview-booking-cancel"
                          onClick={() => setIsBookingFormOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  {latestBooking ? (
                    <div className="lead-preview-booking-card">
                      <FaEllipsisV className="lead-preview-booking-menu" />
                      <div className="lead-preview-booking-grid">
                        <div className="lead-preview-booking-column">
                          <div>
                            <div className="lead-preview-field-label">Booking ID</div>
                            <div className="lead-preview-value">{latestBooking.id}</div>
                          </div>
                          <div>
                            <div className="lead-preview-field-label">Unit</div>
                            <div className="lead-preview-value">{latestBooking.unit || "-"}</div>
                          </div>
                          <div>
                            <div className="lead-preview-field-label">Saleable Area</div>
                            <div className="lead-preview-value">{latestBooking.saleableArea || "-"} sq_ft</div>
                          </div>
                        </div>

                        <div className="lead-preview-booking-column">
                          <div>
                            <div className="lead-preview-field-label">Customer Name</div>
                            <div className="lead-preview-value">{latestBooking.customerName || leadName}</div>
                          </div>
                          <div>
                            <div className="lead-preview-field-label">Stage</div>
                            <div className="lead-preview-stage-pill">{latestBooking.stage || "Tentative"}</div>
                          </div>
                          <div>
                            <div className="lead-preview-field-label">Base Price</div>
                            <div className="lead-preview-value">{formatMoney(latestBooking.basePrice)}</div>
                          </div>
                        </div>

                        <div className="lead-preview-booking-column">
                          <div>
                            <div className="lead-preview-field-label">Project Details</div>
                            <div className="lead-preview-value">{latestBooking.projectDetails || projectName}</div>
                          </div>
                          <div>
                            <div className="lead-preview-field-label">Booked On</div>
                            <div className="lead-preview-value">{formatBookingDate(latestBooking.bookedOn)}</div>
                          </div>
                          <div>
                            <div className="lead-preview-field-label">Base Rate</div>
                            <div className="lead-preview-value">{formatMoney(latestBooking.baseRate)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="lead-preview-booking-empty">No booking created for this lead yet.</div>
                  )}
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
