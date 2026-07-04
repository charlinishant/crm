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
  lead_status: "New",
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
  { value: "New", label: "New" },
  { value: "Qualified", label: "Qualified" },
  { value: "In_sourcing", label: "In_sourcing" },
  { value: "In_closing", label: "In_closing" },
  { value: "Booked", label: "Booked" },
  { value: "Nurture", label: "Nurture" },
];

const normalizeStatus = (value) => {
  if (!value) return "New";
  const match = leadStatusOptions.find(
    (option) =>
      option.value === value ||
      option.label.toLowerCase() === String(value).toLowerCase()
  );
  return match?.value || "New";
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
        "New"
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
  const bookingOpenRequestedRef = useRef(false);
  const leadIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("leadId"),
    [location.search]
  );
  const shouldOpenBookingForm = useMemo(
    () =>
      location.state?.openBooking ||
      new URLSearchParams(location.search).get("openBooking") === "1",
    [location.search, location.state]
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
    setSelectedStatus(normalizeStatus(getLeadValue(lead, ["status", "lead_status", "stage"], "New")));
  }, [lead]);

  const leadName = getLeadValue(
    lead,
    ["name", "full_name", "customer_name"],
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "chetan agrawal"
  );
  const leadId = getLeadValue(lead, ["id", "_id", "lead_id"], "10702");
  const leadStatus = normalizeStatus(getLeadValue(lead, ["status", "lead_status", "stage"], "New"));
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

  useEffect(() => {
    if (!shouldOpenBookingForm || bookingOpenRequestedRef.current) return;

    bookingOpenRequestedRef.current = true;
    setBookingForm({
      ...emptyBookingForm,
      customerName: leadName,
      projectDetails: projectName,
    });
    setBookingMessage("Fill the booking form for this lead.");
    setIsBookingFormOpen(true);

    setTimeout(() => {
      bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [shouldOpenBookingForm, leadName, projectName]);

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
      navigate("/post-sales", {
        state: {
          booking: result,
          lead,
        },
      });
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
  background: #f8fafc;
  padding: 0 16px 32px;
}

.lead-preview-shell {
  width: min(100%, 960px);
  margin: 32px auto 0;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.lead-preview-topbar {
  height: 64px;
  background-color: #487fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.lead-preview-title {
  font-size: 20px !important;
  font-weight: 500;
  margin: 0;
  line-height: 1.2;
  max-width: calc(100% - 56px);
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
  color: #ffffff;
}

.lead-preview-close {
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease;
}

.lead-preview-close:hover {
  color: #ffffff;
}

.lead-preview-body {
  position: relative;
  padding: 28px 24px 0;
}

.lead-preview-tooltip {
  position: absolute;
  top: -36px;
  left: 50%;
  transform: translateX(-50%);
  background: #475569;
  color: #ffffff;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.lead-preview-tooltip::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #475569;
}

.lead-preview-summary {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) auto auto;
  align-items: center;
  gap: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.lead-preview-person {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
}

.lead-preview-person-info {
  min-width: 0;
}

.lead-preview-flag {
  width: 28px;
  height: 18px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  background: linear-gradient(to bottom, #ff9933 0 33%, #ffffff 33% 66%, #138808 66% 100%);
  position: relative;
  margin-top: 4px;
  border-radius: 2px;
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
  color: #64748b;
  font-size: 13px;
  line-height: 1.2;
  margin-bottom: 4px;
}

.lead-preview-name {
  color: #0f172a;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.2;
  min-width: 0;
  text-transform: capitalize;
}

.lead-preview-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lead-preview-edit {
  color: #3b82f6;
  font-size: 14px;
  cursor: pointer;
}

.lead-preview-whatsapp {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 50%;
  background: #25d366;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.lead-preview-count {
  text-align: center;
  color: #475569;
  font-size: 14px;
}

.lead-preview-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #22c55e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.lead-preview-main {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
  padding: 28px 0 36px;
}

.lead-preview-score {
  position: relative;
  width: 112px;
  height: 112px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: conic-gradient(#22c55e 0 42%, #f1f5f9 42% 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.lead-preview-score::before {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: #ffffff;
}

.lead-preview-score-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 18px;
  font-weight: 600;
}

.lead-preview-score-number {
  position: absolute;
  right: -8px;
  top: 4px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #475569;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid #ffffff;
}

.lead-preview-stage {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 28px 48px;
  margin-bottom: 36px;
}

.lead-preview-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
}

.lead-preview-value {
  color: #1e293b;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}

.lead-preview-select {
  width: 140px;
  height: 36px;
  border: 1px solid #6366f1;
  border-radius: 6px;
  color: #4f46e5;
  background: #ffffff;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
}

.lead-preview-status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.lead-preview-save-status {
  min-height: 36px;
  border: 0;
  border-radius: 6px;
  background: #3b82f6;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0 16px;
  transition: background-color 0.2s ease;
}

.lead-preview-save-status:hover:not(:disabled) {
  background: #2563eb;
}

.lead-preview-save-status:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lead-preview-status-message {
  color: #64748b;
  font-size: 12px;
  margin-top: 6px;
}

.lead-preview-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 28px 32px;
}

.lead-preview-section {
  border-top: 1px solid #e2e8f0;
  padding: 0;
}

.lead-preview-section h3 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.lead-preview-section-title {
  min-height: 72px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.lead-preview-partner-body {
  padding: 28px 24px 36px;
}

.lead-preview-field-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
}

.lead-preview-field-value {
  color: #0f172a;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}

.lead-preview-lower {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 32px 0 16px;
}

.lead-preview-panel {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.lead-preview-panel-head {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.lead-preview-panel-title {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.lead-preview-panel-icon {
  color: #64748b;
  font-size: 22px;
}

.lead-preview-task-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.lead-preview-add-task {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.lead-preview-add-task:hover {
  color: #1d4ed8;
}

.lead-preview-status-btn {
  height: 34px;
  min-width: 96px;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  color: #4f46e5;
  background: #ffffff;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lead-preview-status-btn:hover {
  background: #e0e7ff;
}

.lead-preview-panel-empty {
  min-height: 48px;
}

.lead-preview-booking-body {
  padding: 24px;
}

.lead-preview-booking-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lead-preview-create-booking {
  border: 0;
  border-radius: 6px;
  background: #3b82f6;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  min-height: 34px;
  padding: 0 16px;
  transition: background-color 0.2s ease;
}

.lead-preview-create-booking:hover {
  background: #2563eb;
}

.lead-preview-booking-form {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8fafc;
}

.lead-preview-booking-form label {
  color: #475569;
  display: grid;
  font-size: 11px;
  font-weight: 600;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

.lead-preview-booking-form input,
.lead-preview-booking-form select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1e293b;
  font-size: 14px;
  min-height: 36px;
  padding: 0 12px;
  width: 100%;
  background: #ffffff;
}

.lead-preview-booking-form input:focus,
.lead-preview-booking-form select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.lead-preview-booking-form-actions {
  align-items: end;
  display: flex;
  gap: 10px;
}

.lead-preview-booking-save,
.lead-preview-booking-cancel {
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  min-height: 36px;
  padding: 0 16px;
  transition: all 0.2s ease;
}

.lead-preview-booking-save {
  background: #3b82f6;
  border: 0;
  color: #ffffff;
}

.lead-preview-booking-save:hover:not(:disabled) {
  background: #2563eb;
}

.lead-preview-booking-save:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lead-preview-booking-cancel {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.lead-preview-booking-cancel:hover {
  background: #f1f5f9;
}

.lead-preview-booking-message {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 14px;
}

.lead-preview-booking-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  color: #64748b;
  padding: 24px;
  text-align: center;
  background: #f8fafc;
}

.lead-preview-booking-card {
  position: relative;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 24px 60px 20px 20px;
  background: #ffffff;
}

.lead-preview-booking-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 36px;
}

.lead-preview-booking-column {
  display: grid;
  gap: 8px;
}

.lead-preview-booking-menu {
  position: absolute;
  right: 20px;
  top: 24px;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
}

.lead-preview-stage-pill {
  width: fit-content;
  border-radius: 4px;
  background: #22c55e;
  color: #ffffff;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}

.lead-preview-campaign-head {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.lead-preview-sort {
  height: 36px;
  min-width: 174px;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  color: #4f46e5;
  background: #ffffff;
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
}

.lead-preview-campaign-body {
  padding: 28px 24px 36px;
}

.lead-preview-campaign-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.6fr 1.1fr;
  gap: 28px 48px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.lead-preview-campaign-wide {
  grid-column: span 1;
}

.lead-preview-link {
  border: 0;
  background: transparent;
  color: #3b82f6;
  padding: 0;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.lead-preview-link:hover {
  color: #1d4ed8;
}

.lead-preview-campaign-footer {
  min-height: 44px;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}

.lead-preview-action-bar {
  height: 64px;
  background: #475569;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-radius: 0 0 8px 8px;
}

.lead-preview-action-icons {
  display: flex;
  align-items: center;
  gap: 32px;
}

.lead-preview-action-icons button,
.lead-preview-profile-btn {
  border: 0;
  cursor: pointer;
}

.lead-preview-action-icons button {
  width: 24px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 18px;
  transition: color 0.2s ease;
}

.lead-preview-action-icons button:hover {
  color: #ffffff;
}

.lead-preview-profile-btn {
  min-width: 104px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-align: center;
}

.lead-preview-profile-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
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
    gap: 20px;
  }
  
  .lead-preview-summary {
    gap: 20px;
  }

  .lead-preview-main {
    gap: 32px;
  }

  .lead-preview-panel-head,
  .lead-preview-campaign-head {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px 20px;
    gap: 16px;
  }

  .lead-preview-task-actions {
    width: 100%;
    justify-content: space-between;
  }

  .lead-preview-action-bar {
    padding: 0 16px;
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
              {/* <div className="lead-preview-panel">
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
              </div> */}

              <div className="lead-preview-panel" ref={bookingSectionRef}>
                <div className="lead-preview-panel-head">
                  <div className="lead-preview-panel-title">
                    <FaBriefcase className="lead-preview-panel-icon" />
                    <span>Bookings ({bookings.length})</span>
                  </div>
                  <div className="lead-preview-booking-head-actions">
                    {/* <button
                      type="button"
                      className="lead-preview-create-booking"
                      onClick={handleOpenBookingForm}
                    >
                      Create Booking
                    </button> */}
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
