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
  const isBookedStatusLocked = leadStatus === "Booked";
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
    if (isBookedStatusLocked && selectedStatus !== "Booked") {
      setStatusMessage("Booked lead status cannot be changed.");
      return;
    }
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
          soldPrice: Number(bookingForm.totalPrice || bookingForm.agreementValue || bookingForm.basePrice || 0),
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
                          disabled={isBookedStatusLocked}
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
                          disabled={isSavingStatus || isBookedStatusLocked || (selectedStatus === leadStatus && selectedStatus !== "Booked")}
                        >
                          {isSavingStatus ? "Saving..." : "Save"}
                        </button>
                      </div>
                      {isBookedStatusLocked && (
                        <div className="lead-preview-status-message">Booked lead status cannot be changed.</div>
                      )}
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
                          <option disabled value="Cancelled">Cancelled (Use Cancellation Gate)</option>
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
