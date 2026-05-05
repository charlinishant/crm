import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FaBold,
  FaCalendarAlt,
  FaCaretDown,
  FaClock,
  FaEdit,
  FaEnvelopeOpen,
  FaEraser,
  FaItalic,
  FaLink,
  FaListOl,
  FaListUl,
  FaMicrophone,
  FaPhoneAlt,
  FaQuoteLeft,
  FaRedo,
  FaSearch,
  FaSms,
  FaStar,
  FaEllipsisV,
  FaUnderline,
  FaUndo,
  FaWhatsapp,
} from "react-icons/fa";
import MasterLayout from "../masterLayout/MasterLayout";

const fallbackLead = {
  id: 10702,
  name: "chetan agrawal",
  lead_status: "Booked",
  source: "channel_partner",
  city: "India",
  owner: "Tejas Sales",
  tags: "channel_partner, channe...",
  project_name: "Binghatti Hills",
};

const getStoredLead = () => {
  try {
    return (
      JSON.parse(window.sessionStorage.getItem("selectedLeadDetails") || "null") ||
      JSON.parse(window.sessionStorage.getItem("selectedLeadPreview") || "null")
    );
  } catch (error) {
    return null;
  }
};

const getValue = (lead, keys, fallback = "-") => {
  for (const key of keys) {
    const value = lead?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const getContactValue = (value, keys = ["value", "email", "phone", "number"]) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = getContactValue(item, keys);
      if (result) return result;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of keys) {
      if (value[key]) return value[key];
    }
  }

  return "";
};

const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

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

const formatDate = (value, fallback) => {
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

const Details = () => {
  const location = useLocation();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [lead, setLead] = useState(location.state?.lead || getStoredLead() || fallbackLead);
  const [selectedStatus, setSelectedStatus] = useState(
    normalizeStatus(
      getValue(
        location.state?.lead || getStoredLead() || fallbackLead,
        ["status", "lead_status", "stage"],
        "Booked"
      )
    )
  );
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeAction, setActiveAction] = useState("note");
  const [savedNotes, setSavedNotes] = useState([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const noteRef = useRef(null);
  const leadIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("leadId"),
    [location.search]
  );

  useEffect(() => {
    if (location.state?.lead) {
      setLead(location.state.lead);
      window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(location.state.lead));
      return;
    }

    const storedLead = getStoredLead();
    const storedId = storedLead?.id || storedLead?._id || storedLead?.lead_id;

    if (storedLead && (!leadIdFromUrl || String(storedId) === String(leadIdFromUrl))) {
      setLead(storedLead);
      return;
    }

    if (!leadIdFromUrl) return;

    const fetchLead = async () => {
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
          window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(foundLead));
        }
      } catch (error) {
        console.error("Unable to load lead details:", error);
      }
    };

    fetchLead();
  }, [API_URL, leadIdFromUrl, location.state]);

  useEffect(() => {
    setSelectedStatus(normalizeStatus(getValue(lead, ["status", "lead_status", "stage"], "Booked")));
  }, [lead]);

  const leadName = getValue(
    lead,
    ["name", "full_name", "customer_name"],
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "chetan agrawal"
  );
  const leadId = getValue(lead, ["id", "_id", "lead_id"], "10702");
  const leadStatus = normalizeStatus(getValue(lead, ["status", "lead_status", "stage"], "Booked"));
  const projectName = getValue(lead, ["project_name", "projectName", "interestedProjects"], "Binghatti Hills");
  const owner = getValue(lead, ["owner", "assigned_to", "sales"], "Tejas Sales");
  const country = getValue(lead, ["country", "lead_country", "city"], "India");
  const tags = getValue(lead, ["tags", "source"], "channel_partner, channe...");
  const primaryPhone = getContactValue(lead.phones, ["phone", "number", "value"]) || getValue(lead, ["phone", "mobile", "primaryPhone"], "");
  const primaryEmail = getContactValue(lead.emails, ["email", "value"]) || getValue(lead, ["email", "primaryEmail"], "");
  const whatsappPhone = cleanPhone(primaryPhone);
  const receivedOn = formatDate(
    getValue(lead, ["createdAt", "created_at", "received_on"], ""),
    "Thu, Apr 30, 2026 4:44 P..."
  );

  const detailItems = [
    ["RECEIVED ON", receivedOn],
    ["LEAD AGE", getValue(lead, ["lead_age", "age"], "01 day")],
    ["TAGS", tags, true],
    ["LAST CONTACT", getValue(lead, ["last_contact"], receivedOn)],
    ["OWNER", owner],
    ["LAST CALL", getValue(lead, ["last_call"], "No recording available")],
    ["PHONE VERIFIED", getValue(lead, ["phone_verified"], "No")],
    ["LEAD COUNTRY", country],
    ["LEAD'S CURRENT TIME", getValue(lead, ["current_time"], "02/05/2026 11:52 AM")],
    ["INTERESTED PROJECTS", projectName],
    ["LAST CONTACT ATTEMPTED BY LEAD", getValue(lead, ["last_contact_attempted_by_lead"], "-")],
    ["LAST CONTACT BY LEAD", getValue(lead, ["last_contact_by_lead"], "-")],
    ["LAST CONTACT ATTEMPTED BY SALES", getValue(lead, ["last_contact_attempted_by_sales"], "-")],
    ["LAST CONTACT BY SALES", getValue(lead, ["last_contact_by_sales"], "-")],
  ];

  const requirementItems = [
    ["CONFIGURATION", getValue(lead, ["configuration"], "-")],
    ["PROPERTY TYPE", getValue(lead, ["propertyTypes", "property_type", "type"], "-")],
    ["BUDGET", getValue(lead, ["budget", "maxBudget"], "-")],
    ["LOCATIONS", getValue(lead, ["locationPreferences", "city"], "-")],
    ["POSSESSION", getValue(lead, ["possession", "maxPossession"], "-")],
    ["PURPOSE", getValue(lead, ["purpose", "enduse"], "-")],
    ["TRANSACTION TYPE", getValue(lead, ["transactionType"], "-")],
    ["FUNDING SOURCE", getValue(lead, ["fundingSource"], "-")],
    ["BATHROOMS", getValue(lead, ["bathroomPreferences"], "-")],
    ["FURNISHING", getValue(lead, ["furnishing"], "-")],
    ["FACING", getValue(lead, ["facing"], "-")],
  ];

  const cpName = getValue(lead, ["cp_name", "channel_partner_name", "broker_name"], "Our Nest Realty(Zeeshan Khan)");
  const actionItems = [
    { key: "note", label: "Note", icon: <FaQuoteLeft />, title: `Add a note for ${leadName}` },
    { key: "call", label: "Call", icon: <FaPhoneAlt />, title: primaryPhone ? `Call ${primaryPhone}` : "No phone number available" },
    { key: "email", label: "Email", icon: <FaEnvelopeOpen />, title: primaryEmail ? `Email ${primaryEmail}` : "No email available" },
    { key: "sms", label: "SMS", icon: <FaSms />, title: primaryPhone ? `Send SMS to ${primaryPhone}` : "No phone number available" },
    { key: "whatsapp", label: "WhatsApp", icon: <FaWhatsapp />, title: whatsappPhone ? `Open WhatsApp for ${primaryPhone}` : "No WhatsApp number available" },
    { key: "siteVisit", label: "Site visit", icon: <FaCalendarAlt />, title: `Plan site visit for ${projectName}` },
    { key: "followup", label: "Followup", icon: <FaClock />, title: `Create followup with ${owner}` },
    { key: "more", label: "More", icon: <FaCaretDown />, title: "More actions" },
  ];

  useEffect(() => {
    if (!leadId) return;

    const fetchNotes = async () => {
      try {
        const response = await fetch(`${API_URL}/lead-notes/${leadId}`);
        if (!response.ok) return;
        const result = await response.json();
        setSavedNotes(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Unable to load notes:", error);
      }
    };

    fetchNotes();
  }, [API_URL, leadId]);

  const formatNoteDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "";

    return date.toLocaleString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  };

  const updateStoredLead = (storageKey, updatedLead) => {
    try {
      const storedLead = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
      const storedId = storedLead?.id || storedLead?._id || storedLead?.lead_id;

      if (!storedLead || String(storedId) === String(leadId)) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(updatedLead));
      }
    } catch (error) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(updatedLead));
    }
  };

  const handleSaveStatus = async () => {
    try {
      setIsSavingStatus(true);
      setStatusMessage("");

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
      updateStoredLead("selectedLeadDetails", updatedLead);
      updateStoredLead("selectedLeadPreview", updatedLead);
      setStatusMessage(`Saved: ${getStatusLabel(savedStatus)}`);
    } catch (error) {
      console.error("Unable to update lead status:", error);
      setStatusMessage("Status could not be saved. Please check backend and database.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    const text = noteRef.current?.innerText?.trim();
    if (!text || text === "Add note for lead") return;

    try {
      setIsSavingNote(true);
      setNoteError("");

      const response = await fetch(`${API_URL}/lead-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: Number(leadId),
          note: text,
          owner,
        }),
      });

      if (!response.ok) {
        throw new Error(`Unable to save note: ${response.status}`);
      }

      const savedNote = await response.json();
      setSavedNotes((current) => [savedNote, ...current]);

      if (noteRef.current) {
        noteRef.current.innerText = "Add note for lead";
      }
    } catch (error) {
      console.error("Unable to save note:", error);
      setNoteError("Note could not be saved. Please check backend and database.");
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <MasterLayout>
      <>
        <style>{`
          .details-page {
            background: #f6f8fa;
            min-height: 100vh;
            padding: 0 10px 28px;
            color: #404a57;
            font-size: 14px;
          }

          .details-grid {
            display: grid;
            grid-template-columns: minmax(420px, 0.88fr) minmax(520px, 1.12fr);
            gap: 24px;
            align-items: start;
          }

          .details-card {
            background: #ffffff;
            border: 1px solid #cfd6df;
            border-radius: 4px;
            overflow: hidden;
          }

          .details-left-head {
            min-height: 158px;
            display: grid;
            grid-template-columns: 1fr 90px 90px;
            gap: 18px;
            align-items: start;
            padding: 10px 18px 18px;
            border-bottom: 1px solid #d9dee6;
          }

          .details-person {
            display: grid;
            grid-template-columns: 28px 1fr;
            gap: 17px;
            align-items: start;
            min-width: 0;
          }

          .details-flag {
            width: 27px;
            height: 18px;
            margin-top: 15px;
            box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
            background: linear-gradient(to bottom, #ff9933 0 33%, #ffffff 33% 66%, #138808 66% 100%);
            position: relative;
          }

          .details-flag::after {
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

          .details-lead-id {
            color: #8f96a3;
            font-size: 14px;
            line-height: 1.2;
            margin-bottom: 6px;
          }

          .details-lead-name {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #43505d;
            font-size: 18px;
            line-height: 1.25;
            min-width: 0;
            text-transform: lowercase;
          }

          .details-lead-name span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .details-edit {
            color: #000000;
            font-size: 13px;
            flex: 0 0 auto;
          }

          .details-whatsapp {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #42b755;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 21px;
            margin-top: 32px;
          }

          .details-count {
            text-align: center;
            color: #3f4650;
            font-size: 14px;
            padding-top: 0;
          }

          .details-badge {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #41ad50;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
          }

          .details-left-main {
            display: grid;
            grid-template-columns: minmax(150px, 210px) minmax(190px, 1fr);
            gap: 30px 34px;
            padding: 20px 18px 28px;
          }

          .details-score {
            position: relative;
            width: 104px;
            height: 104px;
            margin: 0 auto;
            border-radius: 50%;
            background: conic-gradient(#42ad50 0 42%, #f8f8f8 42% 100%);
          }

          .details-score::before {
            content: "";
            position: absolute;
            inset: 8px;
            border-radius: 50%;
            background: #ffffff;
          }

          .details-score-text {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #c2c5ca;
            font-size: 18px;
            font-weight: 700;
          }

          .details-score-number {
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

          .details-stage {
            display: grid;
            grid-template-columns: repeat(2, minmax(160px, 1fr));
            gap: 20px;
            margin-bottom: 0;
          }

          .details-label {
            color: #89919d;
            font-size: 13px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }

          .details-value {
            color: #404a57;
            font-size: 16px;
            line-height: 1.35;
            overflow-wrap: anywhere;
            word-break: normal;
          }

          .details-select {
            width: 132px;
            height: 30px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            color: #5c35d8;
            background: #ffffff;
            padding: 0 10px;
            font-size: 14px;
          }

          .details-status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .details-status-save {
            min-height: 30px;
            border: 0;
            border-radius: 4px;
            background: #0d6efd;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            padding: 0 12px;
          }

          .details-status-save:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .details-status-message {
            color: #596271;
            font-size: 12px;
            margin-top: 6px;
          }

          .details-info-grid {
            display: grid;
            grid-column: 1 / -1;
            grid-template-columns: repeat(3, minmax(150px, 1fr));
            gap: 24px 28px;
          }

          .details-info-grid > div,
          .details-requirement-grid > div {
            min-width: 0;
          }

          .details-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 58px;
            padding: 10px 14px;
            border-bottom: 1px solid #d9dee6;
            overflow: visible;
            white-space: normal;
            flex-wrap: wrap;
          }

          .details-action {
            border: 1px solid #d9dee6;
            background: #ffffff;
            border-radius: 6px;
            color: #404a57;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 14px;
            min-height: 34px;
            padding: 0 11px;
            flex: 0 0 auto;
            cursor: pointer;
            transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
          }

          .details-action:hover,
          .details-action.active {
            background: #eef5ff;
            border-color: #0d6efd;
            color: #0d6efd;
          }

          .details-action-panel {
            padding: 18px 22px 22px;
          }

          .details-action-card {
            border: 1px solid #cfd6df;
            border-radius: 6px;
            background: #fbfdff;
            padding: 18px;
          }

          .details-action-title {
            color: #404a57;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .details-action-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 16px;
          }

          .details-action-muted {
            color: #89919d;
            font-size: 13px;
            line-height: 1.45;
          }

          .details-action-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 36px;
            border: 0;
            border-radius: 5px;
            background: #0d6efd;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            padding: 0 15px;
            text-decoration: none;
          }

          .details-action-primary.disabled {
            background: #cbd5e1;
            cursor: not-allowed;
            pointer-events: none;
          }

          .details-note {
            padding: 20px 22px 23px;
          }

          .details-editor {
            border: 1px solid #cfd6df;
            border-radius: 4px;
            overflow: hidden;
          }

          .details-toolbar {
            min-height: 59px;
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 9px 11px;
            border-bottom: 1px solid #d9dee6;
            flex-wrap: wrap;
          }

          .details-tool,
          .details-tool-wide {
            height: 36px;
            min-width: 50px;
            border: 1px solid #cfd6df;
            border-radius: 4px;
            background: #f8fafc;
            color: #58616d;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            font-size: 16px;
          }

          .details-tool-wide {
            min-width: 62px;
            font-size: 14px;
          }

          .details-highlight {
            color: #182d87;
            background: #f1f222;
            padding: 0 2px;
            font-weight: 700;
          }

          .details-note-area {
            min-height: 214px;
            padding: 14px 12px;
            color: #737b86;
            font-size: 14px;
            line-height: 1.55;
            outline: none;
            overflow-wrap: anywhere;
          }

          .details-note-resize {
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9aa1aa;
            font-size: 18px;
          }

          .details-note-foot {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            margin-top: 6px;
            color: #404a57;
            font-size: 13px;
          }

          .details-save-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            margin-top: 28px;
          }

          .details-save,
          .details-mic {
            height: 44px;
            border: 0;
            border-radius: 5px;
            background: #673ab7;
            color: #ffffff;
            font-size: 16px;
          }

          .details-save {
            min-width: 148px;
            padding: 0 18px;
          }

          .details-note-error {
            color: #dc2626;
            font-size: 13px;
            margin-top: 10px;
            text-align: right;
          }

          .details-mic {
            width: 52px;
          }

          .details-overview {
            margin-top: 38px;
          }

          .details-overview-title {
            padding: 20px;
            color: #45515f;
            font-size: 22px;
            border-bottom: 1px solid #d9dee6;
          }

          .details-overview-table {
            width: 100%;
            border-collapse: collapse;
          }

          .details-overview-table th,
          .details-overview-table td {
            border-right: 1px solid #d9dee6;
            border-bottom: 1px solid #d9dee6;
            text-align: center;
            color: #404a57;
            font-size: 16px;
            padding: 10px 14px;
          }

          .details-overview-table th {
            font-weight: 400;
          }

          .details-overview-table th:last-child,
          .details-overview-table td:last-child {
            border-right: 0;
          }

          .details-section-block {
            border-top: 1px solid #e2e7ee;
          }

          .details-section-head {
            min-height: 73px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 0 19px;
            border-bottom: 1px solid #e2e7ee;
          }

          .details-section-title {
            color: #45515f;
            font-size: 22px;
            font-weight: 400;
          }

          .details-match-btn {
            height: 30px;
            min-width: 312px;
            border: 1px solid #6f42ff;
            border-radius: 4px;
            background: #ffffff;
            color: #5c35d8;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            font-size: 14px;
          }

          .details-requirement-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 38px 64px;
            padding: 25px 19px 27px;
          }

          .details-inline-input {
            width: 100%;
            border: 0;
            background: transparent;
            color: #404a57;
            font-size: 16px;
            padding: 0;
            outline: 0;
            text-overflow: ellipsis;
          }

          .details-partner-area {
            padding: 24px 19px 33px;
          }

          .details-feed-card {
            grid-column: 2;
            margin-top: 22px;
          }

          .details-feed-tabs {
            display: flex;
            align-items: center;
            gap: 32px;
            border-bottom: 1px solid #d9dee6;
            overflow-x: auto;
            white-space: nowrap;
          }

          .details-feed-tabs button {
            border: 0;
            background: transparent;
            color: #000000;
            font-size: 16px;
            padding: 0 10px 13px;
            position: relative;
          }

          .details-feed-tabs button.active::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 2px;
            background: #6f42ff;
          }

          .details-feed-subtabs {
            display: flex;
            align-items: center;
            gap: 38px;
            min-height: 43px;
            padding: 0 20px;
            border-bottom: 1px solid #d9dee6;
          }

          .details-feed-filter {
            border: 1px solid #d9dee6;
            border-radius: 5px;
            background: #ffffff;
            color: #404a57;
            font-size: 14px;
            margin: 16px 0 0 24px;
            padding: 10px 16px;
          }

          .details-timeline {
            position: relative;
            padding: 0 16px 22px 39px;
          }

          .details-timeline::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #cfd6df;
          }

          .details-feed-item {
            position: relative;
            margin-top: 38px;
            border: 1px solid #cfd6df;
            border-radius: 4px;
            background: #ffffff;
            padding: 22px 18px;
          }

          .details-empty-notes {
            color: #89919d;
            font-size: 15px;
            padding: 28px 16px 10px;
          }

          .details-feed-item::before {
            content: "";
            position: absolute;
            left: -47px;
            top: 36px;
            width: 14px;
            height: 14px;
            border: 2px solid #cfd6df;
            border-radius: 50%;
            background: #ffffff;
          }

          .details-feed-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .details-feed-text {
            color: #45515f;
            font-size: 14px;
            line-height: 1.55;
            overflow-wrap: anywhere;
          }

          .details-feed-actions {
            display: flex;
            align-items: center;
            gap: 18px;
            color: #c4c7cc;
            font-size: 20px;
          }

          .details-feed-link {
            border: 0;
            background: transparent;
            color: #000000;
            font-size: 14px;
            padding: 18px 0 19px;
          }

          .details-feed-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-top: 1px solid #e1e5ea;
            padding-top: 22px;
            color: #89919d;
            font-size: 14px;
          }

          @media (max-width: 1200px) {
            .details-grid,
            .details-left-main,
            .details-info-grid,
            .details-requirement-grid {
              grid-template-columns: 1fr;
            }

            .details-stage,
            .details-action-grid {
              grid-template-columns: 1fr;
            }

            .details-left-head {
              grid-template-columns: 1fr;
            }

            .details-count {
              text-align: left;
            }

            .details-section-head {
              align-items: flex-start;
              flex-direction: column;
              padding: 18px 19px;
            }

            .details-match-btn {
              min-width: 100%;
            }
          }
        `}</style>

        <div className="details-page">
          <div className="details-grid">
            <section className="details-card">
              <div className="details-left-head">
                <div>
                  <div className="details-person">
                    <span className="details-flag" aria-label="India" />
                    <div>
                      <div className="details-lead-id"># {leadId}</div>
                      <div className="details-lead-name">
                        <span>{leadName}</span>
                        <FaEdit className="details-edit" />
                      </div>
                    </div>
                  </div>
                  <span className="details-whatsapp">
                    <FaWhatsapp />
                  </span>
                </div>

                <div className="details-count">
                  <span className="details-badge">1</span>
                  <div>Units</div>
                </div>
                <div className="details-count">
                  <span className="details-badge">0</span>
                  <div>Tasks</div>
                </div>
              </div>

              <div className="details-left-main">
                <div>
                  <div className="details-score">
                    <span className="details-score-text">CA</span>
                    <span className="details-score-number">41</span>
                  </div>
                </div>

                <div className="details-stage">
                  <div>
                    <div className="details-label">Stage & Status</div>
                    <div className="details-status-row">
                      <select
                        className="details-select"
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
                        className="details-status-save"
                        onClick={handleSaveStatus}
                        disabled={isSavingStatus || selectedStatus === leadStatus}
                      >
                        {isSavingStatus ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {statusMessage && (
                      <div className="details-status-message">{statusMessage}</div>
                    )}
                  </div>
                  <div>
                    <div className="details-label">Last Note</div>
                    <div className="details-value">-</div>
                  </div>
                </div>

                <div />

                <div className="details-info-grid">
                  {detailItems.map(([label, value, editable]) => (
                    <div key={label}>
                      <div className="details-label">
                        {label}
                        {editable && <FaEdit className="details-edit" style={{ marginLeft: 12 }} />}
                      </div>
                      <div className="details-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="details-card">
                <div className="details-actions">
                  {actionItems.map((action) => (
                    <button
                      key={action.key}
                      className={`details-action ${activeAction === action.key ? "active" : ""}`}
                      type="button"
                      title={action.title}
                      onClick={() => setActiveAction(action.key)}
                    >
                      {action.icon} {action.label}
                    </button>
                  ))}
                </div>

                {activeAction === "note" ? (
                <div className="details-note">
                  <div className="details-editor">
                    <div className="details-toolbar">
                      <button className="details-tool-wide" type="button"><FaEraser /><FaCaretDown /></button>
                      <button className="details-tool" type="button"><FaBold /></button>
                      <button className="details-tool" type="button"><FaItalic /></button>
                      <button className="details-tool" type="button"><FaUnderline /></button>
                      <button className="details-tool" type="button"><FaEraser /></button>
                      <button className="details-tool-wide" type="button">14 <FaCaretDown /></button>
                      <button className="details-tool" type="button"><span className="details-highlight">A</span></button>
                      <button className="details-tool" type="button"><FaCaretDown /></button>
                      <button className="details-tool" type="button"><FaListUl /></button>
                      <button className="details-tool" type="button"><FaListOl /></button>
                      <button className="details-tool-wide" type="button"><span>≡</span><FaCaretDown /></button>
                      <button className="details-tool" type="button"><FaLink /></button>
                      <button className="details-tool" type="button"><FaUndo /></button>
                      <button className="details-tool" type="button"><FaRedo /></button>
                    </div>
                    <div
                      ref={noteRef}
                      className="details-note-area"
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => {
                        if (noteRef.current?.innerText === "Add note for lead") {
                          noteRef.current.innerText = "";
                        }
                      }}
                    >
                      Add note for lead
                    </div>
                    <div className="details-note-resize">≡</div>
                  </div>
                  <div className="details-note-foot">Maximum 2000 characters are allowed.</div>
                  {noteError && <div className="details-note-error">{noteError}</div>}
                  <div className="details-save-row">
                    <button className="details-save" type="button" onClick={handleSaveNote} disabled={isSavingNote}>
                      {isSavingNote ? "Saving..." : "Save Note"}
                    </button>
                    <button className="details-mic" type="button" aria-label="Record note"><FaMicrophone /></button>
                  </div>
                </div>
                ) : (
                  <div className="details-action-panel">
                    <div className="details-action-card">
                      <div className="details-action-title">
                        {actionItems.find((action) => action.key === activeAction)?.label}
                      </div>
                      <div className="details-action-grid">
                        <div>
                          <div className="details-label">Lead</div>
                          <div className="details-value">{leadName}</div>
                        </div>
                        <div>
                          <div className="details-label">Owner</div>
                          <div className="details-value">{owner}</div>
                        </div>
                        <div>
                          <div className="details-label">Phone</div>
                          <div className="details-value">{primaryPhone || "-"}</div>
                        </div>
                        <div>
                          <div className="details-label">Email</div>
                          <div className="details-value">{primaryEmail || "-"}</div>
                        </div>
                        <div>
                          <div className="details-label">Project</div>
                          <div className="details-value">{projectName}</div>
                        </div>
                        <div>
                          <div className="details-label">Status</div>
                          <div className="details-value">{getStatusLabel(leadStatus)}</div>
                        </div>
                      </div>

                      {activeAction === "call" && (
                        <a className={`details-action-primary ${primaryPhone ? "" : "disabled"}`} href={primaryPhone ? `tel:${primaryPhone}` : undefined}>
                          Start Call
                        </a>
                      )}
                      {activeAction === "email" && (
                        <a className={`details-action-primary ${primaryEmail ? "" : "disabled"}`} href={primaryEmail ? `mailto:${primaryEmail}?subject=Regarding ${encodeURIComponent(projectName)}` : undefined}>
                          Compose Email
                        </a>
                      )}
                      {activeAction === "sms" && (
                        <a className={`details-action-primary ${primaryPhone ? "" : "disabled"}`} href={primaryPhone ? `sms:${primaryPhone}` : undefined}>
                          Send SMS
                        </a>
                      )}
                      {activeAction === "whatsapp" && (
                        <a className={`details-action-primary ${whatsappPhone ? "" : "disabled"}`} href={whatsappPhone ? `https://wa.me/${whatsappPhone}` : undefined} target="_blank" rel="noreferrer">
                          Open WhatsApp
                        </a>
                      )}
                      {["siteVisit", "followup", "more"].includes(activeAction) && (
                        <div className="details-action-muted">
                          {activeAction === "siteVisit" && "Use these lead details to schedule a site visit with the assigned owner."}
                          {activeAction === "followup" && "Use these lead details to plan the next followup activity."}
                          {activeAction === "more" && "More lead actions can be connected here."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="details-card details-overview">
                <div className="details-overview-title">Lead Activities Overview</div>
                <table className="details-overview-table">
                  <thead>
                    <tr>
                      <th>Conducted Site<br />Visits</th>
                      <th>Outgoing Not Answered<br />Calls</th>
                      <th>Outgoing Answered<br />Calls</th>
                      <th>Incoming Not Answered<br />Calls</th>
                      <th>Incoming Answered<br />Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>0</td>
                      <td>0</td>
                      <td>0</td>
                      <td>0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="details-card">
              <div className="details-section-block">
                <div className="details-section-head">
                  <h3 className="details-section-title">Requirement</h3>
                  <button type="button" className="details-match-btn">
                    <FaSearch />
                    Show Matching Properties <strong>(315 found)</strong>
                  </button>
                </div>

                <div className="details-requirement-grid">
                  {requirementItems.map(([label, value]) => (
                    <div key={label}>
                      <div className="details-label">{label}</div>
                      <input className="details-inline-input" defaultValue={value} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="details-section-block">
                <div className="details-section-head">
                  <h3 className="details-section-title">Channel Partners</h3>
                </div>
                <div className="details-partner-area">
                  <div className="details-label">CP Name (Company Name)</div>
                  <input className="details-inline-input" defaultValue={cpName} />
                </div>
              </div>
            </section>

            <section className="details-feed-card">
              <div className="details-feed-tabs">
                {["Activity", "Starred", "Notes", "Calls", "Site visit", "Feed", "Followups", "Emails", "SMS", "Whatsapp"].map((tab, index) => (
                  <button key={tab} type="button" className={index === 0 ? "active" : ""}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="details-feed-subtabs">
                <button className="details-action" type="button">Merge Leads</button>
                <button className="details-action" type="button">History</button>
              </div>
              <button type="button" className="details-feed-filter">Filter <FaCaretDown /></button>

              <div className="details-timeline">
                {savedNotes.length === 0 && (
                  <div className="details-empty-notes">No notes saved yet.</div>
                )}

                {savedNotes.map((note) => (
                  <div className="details-feed-item" key={note.id}>
                    <div className="details-feed-row">
                      <div className="details-feed-text">
                        <FaQuoteLeft style={{ marginRight: 12 }} />
                        {note.note}
                      </div>
                      <div className="details-feed-actions">
                        <FaStar />
                        <FaEllipsisV />
                      </div>
                    </div>
                    <button type="button" className="details-feed-link">view note</button>
                    <div className="details-feed-meta">
                      <span>{formatNoteDate(note.createdAt)} &nbsp; | &nbsp; {note.owner || owner}</span>
                      <span>Note</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </>
    </MasterLayout>
  );
};

export default Details;
