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
            background-color: #f8fafc;
            min-height: 100vh;
            padding: 24px 20px 40px;
            color: #1e293b;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.5;
          }

          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 24px;
            align-items: start;
            max-width: 1440px;
            margin: 0 auto;
          }

          .details-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }

          .details-left-head {
            min-height: 160px;
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 24px;
            align-items: start;
            padding: 24px;
            border-bottom: 1px solid #f1f5f9;
          }

          .details-person {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            min-width: 0;
          }

          .details-flag {
            width: 32px;
            height: 20px;
            margin-top: 6px;
            border-radius: 2px;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
            background: linear-gradient(to bottom, #ff9933 0 33%, #ffffff 33% 66%, #138808 66% 100%);
            position: relative;
            flex-shrink: 0;
          }

          .details-flag::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 6px;
            height: 6px;
            border: 1px solid #1a4fb5;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          }

          .details-lead-id {
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
          }

          .details-lead-name {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #0f172a;
            font-size: 20px;
            font-weight: 700;
            line-height: 1.2;
            min-width: 0;
          }

          .details-lead-name span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .details-edit {
            color: #64748b;
            font-size: 14px;
            cursor: pointer;
            transition: color 0.2s;
          }
          
          .details-edit:hover {
            color: #0d6efd;
          }

          .details-whatsapp {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: #25d366;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-top: 12px;
            box-shadow: 0 2px 4px rgba(37, 211, 102, 0.25);
            transition: transform 0.2s;
          }
          
          .details-whatsapp:hover {
            transform: scale(1.05);
          }

          .details-count {
            text-align: center;
            color: #475569;
            font-size: 13px;
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 8px;
            min-width: 76px;
          }

          .details-badge {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #3b82f6;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
          }

          .details-left-main {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 32px;
            padding: 24px;
          }

          .details-score {
            position: relative;
            width: 104px;
            height: 104px;
            margin: 0 auto;
            border-radius: 50%;
            background: conic-gradient(#3b82f6 0 42%, #f1f5f9 42% 100%);
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
            color: #94a3b8;
            font-size: 16px;
            font-weight: 700;
          }

          .details-score-number {
            position: absolute;
            right: -8px;
            top: 0;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #64748b;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            border: 2px solid #ffffff;
          }

          .details-stage {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .details-label {
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
          }

          .details-value {
            color: #1e293b;
            font-size: 14px;
            font-weight: 500;
            word-break: break-word;
          }

          .details-select {
            width: 100%;
            max-width: 160px;
            height: 36px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            color: #334155;
            background: #ffffff;
            padding: 0 12px;
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s;
            cursor: pointer;
          }
          
          .details-select:focus {
            border-color: #3b82f6;
          }

          .details-status-row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .details-status-save {
            min-height: 36px;
            border: 0;
            border-radius: 6px;
            background: #0d6efd;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            padding: 0 16px;
            transition: background-color 0.2s;
          }
          
          .details-status-save:hover {
            background: #0b5ed7;
          }

          .details-status-save:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }

          .details-status-message {
            color: #64748b;
            font-size: 12px;
            margin-top: 6px;
          }

          .details-info-grid {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px 24px;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #f1f5f9;
          }

          .details-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 64px;
            padding: 12px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            overflow-x: auto;
            white-space: nowrap;
          }

          .details-action {
            border: 1px solid #cbd5e1;
            background: #ffffff;
            border-radius: 6px;
            color: #475569;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 500;
            min-height: 36px;
            padding: 0 12px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .details-action:hover,
          .details-action.active {
            background: #eff6ff;
            border-color: #3b82f6;
            color: #2563eb;
          }

          .details-action-panel {
            padding: 24px;
          }

          .details-action-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #ffffff;
            padding: 20px;
          }

          .details-action-title {
            color: #0f172a;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 14px;
          }

          .details-action-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 18px;
          }

          .details-action-muted {
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
          }

          .details-action-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 40px;
            border: 0;
            border-radius: 6px;
            background: #3b82f6;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            padding: 0 18px;
            text-decoration: none;
            transition: background-color 0.2s;
          }
          
          .details-action-primary:hover {
            background: #2563eb;
          }

          .details-action-primary.disabled {
            background: #94a3b8;
            cursor: not-allowed;
            pointer-events: none;
          }

          .details-note {
            padding: 24px;
          }

          .details-editor {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
          }

          .details-toolbar {
            min-height: 52px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            flex-wrap: wrap;
          }

          .details-tool,
          .details-tool-wide {
            height: 34px;
            min-width: 40px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #475569;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 14px;
            transition: all 0.2s;
            cursor: pointer;
          }
          
          .details-tool:hover, .details-tool-wide:hover {
            background: #f1f5f9;
          }

          .details-tool-wide {
            min-width: 60px;
            font-size: 13px;
            font-weight: 500;
          }

          .details-highlight {
            color: #1e3a8a;
            background: #fef08a;
            padding: 0 4px;
            font-weight: 600;
            border-radius: 2px;
          }

          .details-note-area {
            min-height: 160px;
            padding: 16px;
            color: #334155;
            font-size: 14px;
            line-height: 1.6;
            outline: none;
          }

          .details-note-resize {
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            font-size: 14px;
            border-top: 1px solid #f1f5f9;
            background: #f8fafc;
          }

          .details-note-foot {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
            color: #64748b;
            font-size: 12px;
          }

          .details-save-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
          }

          .details-save,
          .details-mic {
            height: 40px;
            border: 0;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .details-save {
            min-width: 130px;
            background: #7c3aed;
            color: #ffffff;
            font-weight: 600;
            text-align: revert-layer;
          }
          
          .details-save:hover {
            background: #6d28d9;
          }

          .details-note-error {
            color: #ef4444;
            font-size: 12px;
            margin-top: 8px;
            text-align: right;
          }

          .details-mic {
            width: 44px;
            background: #e2e8f0;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .details-mic:hover {
            background: #cbd5e1;
          }

          .details-overview {
            margin-top: 32px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }

          .details-overview-title {
            padding: 20px 24px;
            color: #0f172a;
            font-size: 18px;
            font-weight: 700;
            border-bottom: 1px solid #f1f5f9;
          }

          .details-overview-table {
            width: 100%;
            border-collapse: collapse;
          }

          .details-overview-table th,
          .details-overview-table td {
            border-right: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
            text-align: center;
            color: #334155;
            font-size: 14px;
            padding: 12px 16px;
          }

          .details-overview-table th {
            font-weight: 600;
            background: #f8fafc;
          }

          .details-overview-table th:last-child,
          .details-overview-table td:last-child {
            border-right: 0;
          }

          .details-section-block {
            border-top: 1px solid #e2e8f0;
            margin-top: 32px;
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }

          .details-section-head {
            min-height: 72px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 0 24px;
            border-bottom: 1px solid #f1f5f9;
          }

          .details-section-title {
            color: #0f172a;
            font-size: 18px;
            font-weight: 700;
          }

          .details-match-btn {
            height: 36px;
            min-width: 240px;
            border: 1px solid #7c3aed;
            border-radius: 6px;
            background: #ffffff;
            color: #7c3aed;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .details-match-btn:hover {
            background: #f5f3ff;
          }

          .details-requirement-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 28px 32px;
            padding: 28px 24px;
          }

          .details-inline-input {
            width: 100%;
            border: 0;
            background: transparent;
            color: #1e293b;
            font-size: 14px;
            font-weight: 500;
            padding: 0;
            outline: 0;
            text-overflow: ellipsis;
          }

          .details-partner-area {
            padding: 24px;
          }

          .details-feed-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            margin-top: 24px;
          }

          .details-feed-tabs {
            display: flex;
            align-items: center;
            gap: 24px;
            padding: 0 20px;
            border-bottom: 1px solid #e2e8f0;
            overflow-x: auto;
            white-space: nowrap;
          }

          .details-feed-tabs button {
            border: 0;
            background: transparent;
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            padding: 16px 8px;
            position: relative;
            cursor: pointer;
            transition: color 0.2s;
          }
          
          .details-feed-tabs button:hover,
          .details-feed-tabs button.active {
            color: #0f172a;
          }

          .details-feed-tabs button.active::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 2.5px;
            background: #3b82f6;
            border-radius: 2px 2px 0 0;
          }

          .details-feed-subtabs {
            display: flex;
            align-items: center;
            gap: 24px;
            min-height: 48px;
            padding: 0 24px;
            border-bottom: 1px solid #f1f5f9;
            background: #f8fafc;
          }

          .details-feed-filter {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #334155;
            font-size: 13px;
            margin: 16px 0 0 24px;
            padding: 8px 12px;
            outline: none;
          }

          .details-timeline {
            position: relative;
            padding: 12px 20px 24px 36px;
          }

          .details-timeline::before {
            content: "";
            position: absolute;
            left: 16px;
            top: 16px;
            bottom: 16px;
            width: 2px;
            background: #e2e8f0;
          }

          .details-feed-item {
            position: relative;
            margin-top: 24px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
            padding: 18px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
          }

          .details-empty-notes {
            color: #64748b;
            font-size: 14px;
            padding: 32px 20px;
            text-align: center;
          }

          .details-feed-item::before {
            content: "";
            position: absolute;
            left: -33px;
            top: 22px;
            width: 12px;
            height: 12px;
            border: 2px solid #3b82f6;
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
            color: #334155;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
          }

          .details-feed-actions {
            display: flex;
            align-items: center;
            gap: 14px;
            color: #94a3b8;
            font-size: 18px;
          }

          .details-feed-link {
            border: 0;
            background: transparent;
            color: #3b82f6;
            font-size: 13px;
            font-weight: 500;
            padding: 12px 0;
            cursor: pointer;
            transition: color 0.2s;
          }
          
          .details-feed-link:hover {
            color: #1d4ed8;
          }

          .details-feed-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-top: 1px solid #f1f5f9;
            padding-top: 14px;
            margin-top: 14px;
            color: #64748b;
            font-size: 12px;
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
              padding: 16px 20px;
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
                    <div className="details-score-text">42%</div>
                    <div className="details-score-number">1</div>
                  </div>
                </div>

                <div className="details-stage">
                  <div>
                    <div className="details-label">Lead Stage</div>
                    <div className="details-value">{getStatusLabel(leadStatus)}</div>
                  </div>
                  <div>
                    <div className="details-label">Change Stage</div>
                    <div className="details-status-row">
                      <select
                        className="details-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        {leadStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="details-status-save"
                        disabled={isSavingStatus}
                        onClick={handleSaveStatus}
                      >
                        {isSavingStatus ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {statusMessage && (
                      <div className="details-status-message">{statusMessage}</div>
                    )}
                  </div>

                  <div className="details-info-grid">
                    {detailItems.map(([label, value, isHighlight], index) => (
                      <div key={index}>
                        <div className="details-label">{label}</div>
                        <div className={`details-value ${isHighlight ? "details-highlight" : ""}`}>
                          <input className="details-inline-input" readOnly value={value} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="details-actions">
                {actionItems.map((item) => (
                  <button
                    key={item.key}
                    className={`details-action ${activeAction === item.key ? "active" : ""}`}
                    title={item.title}
                    onClick={() => setActiveAction(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              {activeAction === "note" && (
                <div className="details-action-panel">
                  <div className="details-action-card">
                    <div className="details-action-title">Add a note for {leadName}</div>
                    <div className="details-action-grid">
                      <div className="details-action-muted">
                        Enter details about the lead's discussion, requirements, or any further action required.
                      </div>
                    </div>
                    
                    <div className="details-editor">
                      <div className="details-toolbar">
                        <button className="details-tool" title="Bold">
                          <FaBold />
                        </button>
                        <button className="details-tool" title="Italic">
                          <FaItalic />
                        </button>
                        <button className="details-tool" title="Underline">
                          <FaUnderline />
                        </button>
                        <button className="details-tool" title="Bullet List">
                          <FaListUl />
                        </button>
                        <button className="details-tool" title="Numbered List">
                          <FaListOl />
                        </button>
                        <button className="details-tool" title="Quote">
                          <FaQuoteLeft />
                        </button>
                        <button className="details-tool" title="Link">
                          <FaLink />
                        </button>
                        <div style={{ width: "1px", height: "24px", background: "#cbd5e1" }} />
                        <button className="details-tool" title="Undo">
                          <FaUndo />
                        </button>
                        <button className="details-tool" title="Redo">
                          <FaRedo />
                        </button>
                        <button className="details-tool" title="Clear Formatting">
                          <FaEraser />
                        </button>
                      </div>

                      <div
                        className="details-note-area"
                        contentEditable
                        ref={noteRef}
                        onFocus={(e) => {
                          if (e.target.innerText.trim() === "Add note for lead") {
                            e.target.innerText = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.innerText.trim() === "") {
                            e.target.innerText = "Add note for lead";
                          }
                        }}
                      >
                        Add note for lead
                      </div>

                      <div className="details-note-resize">...</div>
                    </div>

                    {noteError && <div className="details-note-error">{noteError}</div>}

                    <div className="details-save-row">
                      <button className="details-mic" title="Voice Input">
                        <FaMicrophone />
                      </button>
                      <button
                        className="details-save"
                        disabled={isSavingNote}
                        onClick={handleSaveNote}
                      >
                        {isSavingNote ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </div>

                  <div className="details-feed-card">
                    <div className="details-feed-tabs">
                      <button className="active">All Notes ({savedNotes.length})</button>
                      <button>Saved Filters</button>
                    </div>
                    
                    <div className="details-timeline">
                      {savedNotes.length === 0 ? (
                        <div className="details-empty-notes">No notes created yet.</div>
                      ) : (
                        savedNotes.map((note) => (
                          <div key={note.id || note._id} className="details-feed-item">
                            <div className="details-feed-row">
                              <div className="details-feed-text">
                                {note.note}
                              </div>
                              <div className="details-feed-actions">
                                <FaEllipsisV />
                              </div>
                            </div>
                            <div className="details-feed-meta">
                              <div>Created by: {note.owner}</div>
                              <div>{formatNoteDate(note.createdAt || new Date())}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="details-card">
                <div className="details-overview-title">Lead & Property Requirements</div>
                <div className="details-section-head">
                  <div className="details-section-title">Requirements</div>
                  <button className="details-match-btn">
                    <FaStar style={{ color: "#7c3aed" }} /> Match with Inventory
                  </button>
                </div>
                
                <div className="details-requirement-grid">
                  {requirementItems.map(([label, value], index) => (
                    <div key={index}>
                      <div className="details-label">{label}</div>
                      <div className="details-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="details-card" style={{ marginTop: "24px" }}>
                <div className="details-overview-title">Partner Information</div>
                <div className="details-partner-area">
                  <div className="details-label">CHANNEL PARTNER NAME</div>
                  <div className="details-value" style={{ fontWeight: 600, color: "#3b82f6" }}>
                    {cpName}
                  </div>
                </div>
              </div>

              <div className="details-overview">
                <div className="details-overview-title">Overview Dashboard</div>
                <table className="details-overview-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Booked</td>
                      <td>1</td>
                    </tr>
                    <tr>
                      <td>Pending Tasks</td>
                      <td>0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </>
    </MasterLayout>
  );
};

export default Details;