import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
import UserBookingForm from "./UserBookingForm";

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
  projectId: "",
  unit: "",
  unitId: "",
  unitItemId: "",
  idempotencyKey: "",
  customerName: "",
  stage: "Booked",
  projectDetails: "",
  bookedOn: "",
  saleableArea: "",
  basePrice: "",
  baseRate: "",
  projectUnitStatus: "Booked",
  bookingCancellationReason: "",
  bookingCancellationNote: "",
  campaign: "walkin",
  source: "",
  channelPartner: "",
  channelPartnerId: "",
  companyName: "",
  numberOfSeats: "",
  physicalSeats: "",
  carpetArea: "",
  tenureMonths: "",
  perSeatPrice: "",
  monthlyRevenue: "",
  noticePeriodMonths: "",
  lockInPeriod: "",
  securityDeposit: "",
  leaseStartDate: "",
  leaseEndDate: "",
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

const bookingSteps = [
  "Filter Project",
  "Select A Unit",
  "Booking Confirmation",
];

const defaultBookingFilters = {
  unitType: "",
};

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  `User #${user?.id}`;

const toCleanNumber = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(number) ? 0 : number;
};

const getRateBasisArea = ({ rateBasis, carpet, builtupArea, saleable }) => {
  if (rateBasis === "On Built-up") return toCleanNumber(builtupArea);
  if (rateBasis === "On Saleable") return toCleanNumber(saleable);
  return toCleanNumber(carpet);
};

const calculateBasePriceForRateBasis = ({ baseRate, rateBasis, carpet, builtupArea, saleable }) => {
  const rate = toCleanNumber(baseRate);
  const area = getRateBasisArea({ rateBasis, carpet, builtupArea, saleable });
  if (!rate || !area) return 0;
  return rate * area;
};

const getDisplayValue = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value.name || value.title || value.label || value.value || fallback;
  return value;
};

const normalizeProjectTypeValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchesProjectTypeFilter = (unit, selectedType, project) => {
  if (!selectedType) return true;
  const selected = normalizeProjectTypeValue(selectedType);
  const projectType = normalizeProjectTypeValue(project?.projectType || unit?.project?.projectType);
  const unitType = normalizeProjectTypeValue(unit?.type || unit?.floorPlan?.type);

  if (projectType.includes("residential") && projectType.includes("commercial")) return true;
  if (projectType) return projectType === selected;
  if (unitType) return unitType === selected;
  return true;
};

const UNIT_STATUSES = [
  { value: "Available", label: "Available" },
  { value: "Held", label: "Held" },
  { value: "Blocked", label: "Blocked" },
  { value: "Booked", label: "Booked" },
  { value: "Registered", label: "Registered" },
  { value: "Possession_Given", label: "Possession Given" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Refuge", label: "Refuge" },
  { value: "Investor", label: "Investor" },
];

const unitStatusLabels = UNIT_STATUSES.reduce((labels, status) => {
  labels[status.value] = status.label;
  return labels;
}, {});

const normalizeUnitStatus = (status) => {
  const value = String(status || "Available").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    available: "Available",
    selected: "Available",
    held: "Held",
    hold: "Held",
    blocked: "Blocked",
    block: "Blocked",
    booked: "Booked",
    sold: "Booked",
    unavailable: "Booked",
    registered: "Registered",
    possession_given: "Possession_Given",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    refuge: "Refuge",
    investor: "Investor",
  };

  return aliases[value] || "Available";
};

const getUnitStatusLabel = (status) => unitStatusLabels[normalizeUnitStatus(status)] || "Available";

const calculateCostNewValue = (row) => {
  const original = toCleanNumber(row.originalValue);
  const input = toCleanNumber(row.inputField);

  return row.costType === "AdHoc Cost" ? original + input : Math.max(original - input, 0);
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;

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

const UserPreview = () => {
  const location = useLocation();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [lead, setLead] = useState(location.state?.lead || readStoredLead() || fallbackLead);
  const [isLeadEditOpen, setIsLeadEditOpen] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState({});
  const [isSavingLeadEdit, setIsSavingLeadEdit] = useState(false);
  const [leadEditMessage, setLeadEditMessage] = useState("");
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
  const [bookingStepIndex, setBookingStepIndex] = useState(0);
  const [bookingProjects, setBookingProjects] = useState([]);
  const [bookingProjectDetails, setBookingProjectDetails] = useState(null);
  const [bookingProjectUnits, setBookingProjectUnits] = useState([]);
  const [registeredChannelPartners, setRegisteredChannelPartners] = useState([]);
  const [isLoadingBookingProject, setIsLoadingBookingProject] = useState(false);
  const [bookingProjectMessage, setBookingProjectMessage] = useState("");
  const [bookingFilters, setBookingFilters] = useState(defaultBookingFilters);
  const [bookingUnitView, setBookingUnitView] = useState("listing");
  const [selectedBookingTowerId, setSelectedBookingTowerId] = useState("");
  const [quotationTab, setQuotationTab] = useState("unit");
  const [quotationScheme, setQuotationScheme] = useState("default");
  const [quotationPaymentPlan, setQuotationPaymentPlan] = useState("80-20");
  const [editableCostRows, setEditableCostRows] = useState([]);
  const [editablePaymentRows, setEditablePaymentRows] = useState([]);
  const [shouldCheckAvailability, setShouldCheckAvailability] = useState(true);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
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
  const requestedBookingStep = useMemo(() => {
    const step = location.state?.bookingStep || new URLSearchParams(location.search).get("bookingStep");
    return step === "confirm" ? 2 : 0;
  }, [location.search, location.state]);

  useEffect(() => {
    let isMounted = true;

    const fetchRegisteredChannelPartners = async () => {
      try {
        const response = await fetch(`${API_URL}/users?limit=1000`);
        if (!response.ok) throw new Error("Unable to load users");

        const result = await response.json();
        const users = Array.isArray(result) ? result : result?.data || [];
        if (!isMounted) return;

        setRegisteredChannelPartners(users.filter(
          (user) => String(user?.role || "").toUpperCase() === "CHANNEL_PARTNER"
        ));
      } catch (error) {
        console.error("Unable to load registered channel partners:", error);
        if (isMounted) setRegisteredChannelPartners([]);
      }
    };

    fetchRegisteredChannelPartners();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  useEffect(() => {
    if (!isBookingFormOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isBookingFormOpen]);

  useEffect(() => {
    if (!isBookingFormOpen || isBookingSuccess) return undefined;

    window.history.pushState({ bookingWizard: true, bookingStepIndex }, "");

    const handleBookingPopState = () => {
      if (bookingStepIndex > 0) {
        setBookingStepIndex((current) => Math.max(0, current - 1));
        window.history.pushState({ bookingWizard: true, bookingStepIndex: bookingStepIndex - 1 }, "");
        return;
      }

      setIsBookingFormOpen(false);
      setBookingStepIndex(0);
      setIsBookingSuccess(false);
      window.history.pushState({ bookingWizardClosed: true }, "");
    };

    window.addEventListener("popstate", handleBookingPopState);
    return () => window.removeEventListener("popstate", handleBookingPopState);
  }, [bookingStepIndex, isBookingFormOpen, isBookingSuccess]);

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
    const primaryEmail = Array.isArray(lead.emails)
      ? lead.emails.find((email) => email?.value)?.value || ""
      : lead.email || "";
    const primaryPhone = Array.isArray(lead.phones)
      ? lead.phones.find((phone) => phone?.value)?.value || ""
      : lead.phone || "";

    setLeadEditForm({
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      email: primaryEmail,
      phone: primaryPhone,
      tags: lead.tags || "",
      interestedProjects: lead.interestedProjects || lead.project_name || lead.projectName || "",
      channelPartner: lead.channelPartner || lead.channel_partner || "",
      companyName: lead.companyName || "",
    });
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
  const selectedBookingProject = useMemo(() => {
    if (bookingForm.projectId) {
      return bookingProjects.find((project) => String(project.id) === String(bookingForm.projectId));
    }

    return bookingProjects.find(
      (project) => project.name?.toLowerCase() === bookingForm.projectDetails?.toLowerCase()
    );
  }, [bookingForm.projectDetails, bookingForm.projectId, bookingProjects]);
  const flattenedBookingUnits = useMemo(
    () =>
      bookingProjectUnits.flatMap((group) =>
        (group.unitList || []).map((unit) => {
          const floorPlan = group.floor || {};

          return {
            ...unit,
            groupId: group.id,
            unitItemId: unit.id,
            project: group.project,
            tower: group.tower,
            floorPlan,
            floor: getDisplayValue(unit.floor, getDisplayValue(floorPlan, "-")),
            status: normalizeUnitStatus(unit.status || group.status || unit.unitStatus || group.unitStatus),
            category: floorPlan.category || group.category,
            type: floorPlan.type || group.type,
            bedrooms: floorPlan.bedrooms ?? "-",
            bathrooms: floorPlan.bathrooms ?? "-",
            carpet: floorPlan.carpet ?? "-",
            builtupArea: floorPlan.builtupArea ?? "",
            saleable: floorPlan.saleable ?? "-",
            rateBasis: floorPlan.rateBasis || "On Carpet",
          };
        })
      ),
    [bookingProjectUnits]
  );
  const bookingTowerOptions = useMemo(() => {
    const towerMap = new Map();
    bookingProjectUnits.forEach((group) => {
      if (group.tower?.id || group.tower?.name) {
        const key = String(group.tower.id || group.tower.name);
        towerMap.set(key, {
          id: group.tower.id || group.tower.name,
          name: group.tower.name || `Tower ${group.tower.id}`,
        });
      }
    });

    return Array.from(towerMap.values());
  }, [bookingProjectUnits]);
  const getBookingUnitOptionValue = (unit) =>
    String(unit?.id || `${unit?.groupId || "unit"}-${unit?.unitIndex || unit?.name || ""}`);
  const getBookingUnitOptionLabel = (unit) =>
    unit?.name || `Unit ${unit?.unitIndex || unit?.id || unit?.groupId || ""}`.trim();
  const selectedBookingUnit = flattenedBookingUnits.find(
    (unit) =>
      unit.name === bookingForm.unit ||
      String(unit.id) === String(bookingForm.unit) ||
      String(unit.id) === String(bookingForm.unitId) ||
      String(unit.groupId) === String(bookingForm.unitId)
  );
  const visibleBookingUnits = useMemo(() => {
    return flattenedBookingUnits.filter((unit) => {
      const towerMatches =
        !selectedBookingTowerId ||
        String(unit.tower?.id || unit.tower?.name || "") === String(selectedBookingTowerId);
      const unitTypeMatches =
        matchesProjectTypeFilter(unit, bookingFilters.unitType, bookingProjectDetails || selectedBookingProject);

      return towerMatches && unitTypeMatches;
    });
  }, [bookingFilters, bookingProjectDetails, flattenedBookingUnits, selectedBookingProject, selectedBookingTowerId]);
  const bookingProjectSelectValue =
    bookingForm.projectId || (bookingForm.projectDetails ? "__lead_project__" : "");
  const activeTowerName =
    selectedBookingUnit?.tower?.name ||
    bookingTowerOptions.find((tower) => String(tower.id) === String(selectedBookingTowerId))?.name ||
    bookingProjectUnits.find((group) => group.tower?.name)?.tower?.name ||
    "Tower D";

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

  useEffect(() => {
    if (!isBookingFormOpen) return;

    const fetchBookingProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/projects/list`);
        if (!response.ok) throw new Error("Unable to load projects");
        const result = await response.json();
        const projects = Array.isArray(result) ? result : [];
        setBookingProjects(projects);

        if (!bookingForm.projectId && bookingForm.projectDetails) {
          const matchingProject = projects.find(
            (project) => project.name?.toLowerCase() === bookingForm.projectDetails.toLowerCase()
          );

          if (matchingProject) {
            setBookingForm((prev) => ({ ...prev, projectId: matchingProject.id }));
          }
        }
      } catch (error) {
        console.error("Unable to load booking projects:", error);
        setBookingProjectMessage("Projects could not be loaded. You can still type project details manually.");
      }
    };

    fetchBookingProjects();
  }, [API_URL, bookingForm.projectDetails, bookingForm.projectId, isBookingFormOpen]);

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

  const handleLeadEditChange = (event) => {
    const { name, value } = event.target;
    setLeadEditForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
    setLeadEditMessage("");
  };

  const handleSaveLeadEdit = async (event) => {
    event.preventDefault();
    setLeadEditMessage("");

    if (!leadEditForm.firstName?.trim() || !leadEditForm.lastName?.trim()) {
      setLeadEditMessage("First name and last name are required.");
      return;
    }

    if (!emailPattern.test(String(leadEditForm.email || "").trim())) {
      setLeadEditMessage("Enter a valid email address.");
      return;
    }

    if (!phonePattern.test(String(leadEditForm.phone || "").trim())) {
      setLeadEditMessage("Phone number must be exactly 10 digits.");
      return;
    }

    setIsSavingLeadEdit(true);

    try {
      const payload = {
        firstName: leadEditForm.firstName.trim(),
        lastName: leadEditForm.lastName.trim(),
        emails: [{ type: "Office", value: leadEditForm.email.trim() }],
        phones: [{ type: "Work", value: leadEditForm.phone.trim() }],
        tags: leadEditForm.tags || "",
        interestedProjects: leadEditForm.interestedProjects || "",
        channelPartner: leadEditForm.channelPartner || "",
        companyName: leadEditForm.companyName || "",
      };

      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to update lead");
      }

      const updatedLead = {
        ...lead,
        ...payload,
        ...result,
        name: `${payload.firstName} ${payload.lastName}`.trim(),
      };

      setLead(updatedLead);
      updateStoredLead("selectedLeadPreview", updatedLead);
      updateStoredLead("selectedLeadDetails", updatedLead);
      setLeadEditMessage("Lead details saved.");
      setIsLeadEditOpen(false);
    } catch (error) {
      console.error("Unable to save lead details:", error);
      setLeadEditMessage("Lead details could not be saved.");
    } finally {
      setIsSavingLeadEdit(false);
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
    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "source" && !["channel_partner", "Channel Partner"].includes(value)
        ? { channelPartner: "", channelPartnerId: "" }
        : {}),
    }));
  };

  const handleBookingProjectChange = (event) => {
    const projectId = event.target.value;

    if (projectId === "__lead_project__") {
      setBookingProjectDetails(null);
      setBookingProjectUnits([]);
      setBookingProjectMessage("");
      setSelectedBookingTowerId("");
      setBookingForm((prev) => ({
        ...prev,
        projectId: "",
        projectDetails: prev.projectDetails || projectName,
        unit: "",
        unitId: "",
        unitItemId: "",
      }));
      return;
    }

    const project = bookingProjects.find((item) => String(item.id) === String(projectId));

    setBookingProjectDetails(null);
    setBookingProjectUnits([]);
    setBookingProjectMessage("");
    setSelectedBookingTowerId("");
    setBookingForm((prev) => ({
      ...prev,
      projectId,
      projectDetails: project?.name || "",
      unit: "",
      unitId: "",
      unitItemId: "",
    }));
  };

  const handleBookingFilterChange = (filterKey, value) => {
    setBookingFilters((prev) => ({ ...prev, [filterKey]: value }));
    setBookingForm((prev) => ({ ...prev, unit: "", unitId: "", unitItemId: "" }));
  };

  const handleClearBookingFilters = () => {
    setBookingFilters(defaultBookingFilters);
    setSelectedBookingTowerId("");
    setBookingForm((prev) => ({ ...prev, unit: "", unitId: "", unitItemId: "" }));
  };

  const handleBookingTowerChange = (event) => {
    setSelectedBookingTowerId(event.target.value);
    setBookingForm((prev) => ({ ...prev, unit: "", unitId: "", unitItemId: "" }));
  };

  const handleBookingUnitSelect = (unit) => {
    if (normalizeUnitStatus(unit.status) !== "Available") return;

    const unitName = getBookingUnitOptionLabel(unit);
    const unitId = unit.groupId || unit.id || "";
    const unitItemId = unit.unitItemId || unit.id || "";
    const unitBasePrice = calculateBasePriceForRateBasis({
      baseRate: unit.baseRate,
      rateBasis: unit.rateBasis,
      carpet: unit.carpet,
      builtupArea: unit.builtupArea,
      saleable: unit.saleable,
    });

    setBookingProjectMessage("");
    setEditableCostRows([]);
    setEditablePaymentRows([]);
    setBookingForm((prev) => ({
      ...prev,
      unit: unitName,
      unitId,
      unitItemId,
      projectId: unit.project?.id || prev.projectId,
      projectDetails: unit.project?.name || prev.projectDetails,
      basePrice: unitBasePrice || "",
      baseRate: unit.baseRate || "",
      saleableArea: unit.saleable || prev.saleableArea,
      carpetArea: unit.carpet || prev.carpetArea,
      builtupArea: unit.builtupArea || prev.builtupArea,
      rateBasis: unit.rateBasis || prev.rateBasis || "On Carpet",
    }));
  };

  const loadSelectedProjectDetails = async () => {
    const projectId = bookingForm.projectId || selectedBookingProject?.id;

    if (!projectId && !bookingForm.projectDetails) {
      setBookingProjectMessage("Please select a project before continuing.");
      return false;
    }

    setIsLoadingBookingProject(true);
    setBookingProjectMessage("");

    try {
      let selectedProjectDetails = selectedBookingProject || null;

      if (projectId) {
        const projectResponse = await fetch(`${API_URL}/projects/${projectId}`);
        if (projectResponse.ok) {
          selectedProjectDetails = await projectResponse.json();
          setBookingProjectDetails(selectedProjectDetails);
        }
      }

      const unitsResponse = await fetch(`${API_URL}/unit?limit=1000`);
      if (!unitsResponse.ok) throw new Error("Unable to load units");
      const unitsResult = await unitsResponse.json();
      const unitGroups = Array.isArray(unitsResult) ? unitsResult : unitsResult?.data || [];
      const filteredUnits = unitGroups.filter((group) => {
        if (projectId) return String(group.project?.id) === String(projectId);
        return group.project?.name?.toLowerCase() === bookingForm.projectDetails.toLowerCase();
      });

      setBookingProjectUnits(filteredUnits);
      const firstTower = filteredUnits.find((group) => group.tower?.id || group.tower?.name)?.tower;
      setSelectedBookingTowerId(firstTower ? String(firstTower.id || firstTower.name) : "");

      if (selectedProjectDetails?.name) {
        setBookingForm((prev) => ({
          ...prev,
          projectId: projectId || prev.projectId,
          projectDetails: selectedProjectDetails.name,
        }));
      }

      if (filteredUnits.length === 0) {
        setBookingProjectMessage("No units found for this project yet.");
      }

      return true;
    } catch (error) {
      console.error("Unable to load selected project details:", error);
      setBookingProjectMessage("Project details could not be loaded. Please check backend and database.");
      return false;
    } finally {
      setIsLoadingBookingProject(false);
    }
  };

  useEffect(() => {
    if (!isBookingFormOpen || bookingStepIndex !== 0 || (!bookingForm.projectId && !bookingForm.projectDetails)) return undefined;

    let isMounted = true;

    const fetchAdminCreatedUnits = async () => {
      try {
        const unitsResponse = await fetch(`${API_URL}/unit?limit=1000`);
        if (!unitsResponse.ok) throw new Error("Unable to load units");

        const unitsResult = await unitsResponse.json();
        const unitGroups = Array.isArray(unitsResult) ? unitsResult : unitsResult?.data || [];
        const filteredUnits = unitGroups.filter((group) => {
          if (bookingForm.projectId) return String(group.project?.id) === String(bookingForm.projectId);
          return group.project?.name?.toLowerCase() === bookingForm.projectDetails.toLowerCase();
        });

        if (!isMounted) return;

        setBookingProjectUnits(filteredUnits);
        const firstTower = filteredUnits.find((group) => group.tower?.id || group.tower?.name)?.tower;
        setSelectedBookingTowerId(firstTower ? String(firstTower.id || firstTower.name) : "");
      } catch (error) {
        console.error("Unable to load admin-created units:", error);
        if (isMounted) {
          setBookingProjectUnits([]);
        }
      }
    };

    fetchAdminCreatedUnits();

    return () => {
      isMounted = false;
    };
  }, [API_URL, bookingForm.projectDetails, bookingForm.projectId, bookingStepIndex, isBookingFormOpen]);

  const handleOpenBookingForm = (message = "") => {
    setBookingForm({
      ...emptyBookingForm,
      customerName: leadName,
      projectDetails: projectName,
      idempotencyKey: `booking-${leadId}-${Date.now()}`,
    });
    setBookingMessage(message);
    setBookingProjectMessage("");
    setBookingProjectDetails(null);
    setBookingProjectUnits([]);
    setBookingFilters(defaultBookingFilters);
    setSelectedBookingTowerId("");
    setQuotationTab("unit");
    setQuotationScheme("default");
    setQuotationPaymentPlan("80-20");
    setEditableCostRows([]);
    setEditablePaymentRows([]);
    setBookingUnitView("listing");
    setShouldCheckAvailability(true);
    setIsBookingSuccess(false);
    setBookingStepIndex(0);
    setIsBookingFormOpen(true);
  };

  const handleCloseBookingForm = () => {
    setIsBookingFormOpen(false);
    setBookingStepIndex(0);
    setIsBookingSuccess(false);
  };

  const showUserDetails = () => {
    setIsBookingFormOpen(false);
    setBookingStepIndex(0);
    setIsBookingSuccess(false);
    setIsLeadEditOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!shouldOpenBookingForm || bookingOpenRequestedRef.current) return;

    bookingOpenRequestedRef.current = true;
    setBookingForm({
      ...emptyBookingForm,
      customerName: leadName,
      projectDetails: projectName,
      idempotencyKey: `booking-${leadId}-${Date.now()}`,
    });
    setBookingMessage(requestedBookingStep === 2 ? "Complete the booking confirmation details." : "");
    setBookingStepIndex(requestedBookingStep);
    setBookingFilters(defaultBookingFilters);
    setSelectedBookingTowerId("");
    setQuotationTab("unit");
    setQuotationScheme("default");
    setQuotationPaymentPlan("80-20");
    setEditableCostRows([]);
    setEditablePaymentRows([]);
    setBookingUnitView("listing");
    setShouldCheckAvailability(true);
    setIsBookingSuccess(false);
    setIsBookingFormOpen(true);
  }, [requestedBookingStep, shouldOpenBookingForm, leadName, projectName]);

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

  const formatBookingDetail = (value, fallback = "-") => {
    return getDisplayValue(value, fallback);
  };

  const quotationProjectName =
    bookingProjectDetails?.name || bookingForm.projectDetails || projectName || "Binghatti Hills";
  const quotationUnitName =
    selectedBookingUnit?.name || bookingForm.unit || "2304";
  const quotationTowerName =
    formatBookingDetail(selectedBookingUnit?.tower, activeTowerName || "Tower D");
  const quotationFloor =
    formatBookingDetail(selectedBookingUnit?.floorPlan, "") ||
    formatBookingDetail(selectedBookingUnit?.floor, "23");
  const quotationSaleable =
    formatBookingDetail(selectedBookingUnit?.saleable, "") || bookingForm.saleableArea || "-";
  const quotationBaseRate =
    bookingForm.baseRate || selectedBookingUnit?.baseRate || "7.8K (7,750)";
  const quotationName = `${quotationProjectName} - ${quotationTowerName} - ${quotationUnitName}`;
  const baseAgreementValue = calculateBasePriceForRateBasis({
    baseRate: bookingForm.baseRate || selectedBookingUnit?.baseRate,
    rateBasis: bookingForm.rateBasis || selectedBookingUnit?.rateBasis,
    carpet: bookingForm.carpetArea || selectedBookingUnit?.carpet,
    builtupArea: bookingForm.builtupArea || selectedBookingUnit?.builtupArea,
    saleable: bookingForm.saleableArea || selectedBookingUnit?.saleable,
  });
  const defaultQuotationCostRows = useMemo(() => [
    { type: "section", serial: "1.", name: "Basic Details" },
    { serial: "1.a", name: "Base Rate", originalValue: toCleanNumber(selectedBookingUnit?.baseRate || bookingForm.baseRate || 7750), costType: "Discount", inputField: 0, highlight: true },
    { serial: "1.b", name: "Floor Rise", originalValue: 2000, costType: "Discount", inputField: 0 },
    { type: "section", serial: "2.", name: "Agreement Value Details" },
    { serial: "2.a", name: "Base Price", originalValue: baseAgreementValue || 14625000, costType: "Discount", inputField: 0 },
    { serial: "2.b", name: "Guideline Value", originalValue: 450000, costType: "Discount", inputField: 0 },
    { serial: "2.c", name: "Development Invoice", originalValue: 600000, costType: "Discount", inputField: 0 },
    { serial: "2.d", name: "Advance Maintainence", originalValue: 290100000, costType: "Discount", inputField: 0 },
    { serial: "2.e", name: "Agreement Value", originalValue: baseAgreementValue || 305775000, costType: "Discount", inputField: 0, highlight: true },
    { type: "section", serial: "3.", name: "Additional Details" },
    { serial: "3.a", name: "Legal Documentation Fee", originalValue: 50000, costType: "Discount", inputField: 0 },
    { serial: "3.b", name: "Clubhouse Charges", originalValue: 75000, costType: "Discount", inputField: 0 },
    { serial: "3.c", name: "Maintenance Deposit", originalValue: 125000, costType: "Discount", inputField: 0 },
  ], [baseAgreementValue, bookingForm.baseRate, selectedBookingUnit?.baseRate]);
  const quotationCostRows = editableCostRows.length ? editableCostRows : defaultQuotationCostRows;
  const quotationLineRows = quotationCostRows
    .filter((row) => row.type !== "section")
    .map((row) => ({ ...row, newValue: calculateCostNewValue(row) }));
  const quotationAgreementValue =
    toCleanNumber(quotationLineRows.find((row) => row.name === "Agreement Value")?.newValue) ||
    toCleanNumber(bookingForm.basePrice || selectedBookingUnit?.basePrice || 0);
  const quotationAllInclusiveValue =
    quotationLineRows
      .filter((row) => !["Base Rate", "Floor Rise"].includes(row.name))
      .reduce((total, row) => total + toCleanNumber(row.newValue), 0) ||
    quotationAgreementValue;
  const paymentScheduleRows = editablePaymentRows.length
    ? editablePaymentRows
    : [
      { name: "Agreement", towerMilestone: "Agreement", value: 80, taxes: 0, tds: 0 },
      { name: "Possession", towerMilestone: "Possession", value: 20, taxes: 0, tds: 0 },
    ];
  const calculatedPaymentRows = paymentScheduleRows.map((row) => {
    const value = toCleanNumber(row.value);
    const amount = (quotationAgreementValue * value) / 100;
    const taxes = toCleanNumber(row.taxes);
    const tds = toCleanNumber(row.tds);

    return {
      ...row,
      amount,
      grandTotal: amount + taxes - tds,
    };
  });
  const paymentTotals = calculatedPaymentRows.reduce(
    (totals, row) => ({
      value: totals.value + toCleanNumber(row.value),
      amount: totals.amount + toCleanNumber(row.amount),
      taxes: totals.taxes + toCleanNumber(row.taxes),
      tds: totals.tds + toCleanNumber(row.tds),
      grandTotal: totals.grandTotal + toCleanNumber(row.grandTotal),
    }),
    { value: 0, amount: 0, taxes: 0, tds: 0, grandTotal: 0 }
  );
  const quotationSchemeLabel =
    {
      default: "Default Scheme",
      "construction-linked": "Construction Linked Scheme",
      "possession-linked": "Possession Linked Scheme",
      custom: "Custom Scheme",
    }[quotationScheme] || "Default Scheme";
  const quotationPaymentPlanLabel =
    {
      "80-20": "80:20 Payment Schedule",
      "60-40": "60:40 Payment Schedule",
      100: "100% Agreement Payment",
    }[quotationPaymentPlan] || "80:20 Payment Schedule";
  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  const bookingConfirmationDate =
    bookingForm.bookedOn || new Date().toISOString().slice(0, 10);
  const applicantEmail = Array.isArray(lead.emails)
    ? lead.emails.find((email) => email?.value)?.value
    : lead.email || lead.primaryEmail || "-";
  const applicantPhone = Array.isArray(lead.phones)
    ? lead.phones.find((phone) => phone?.value)?.value
    : lead.phone || lead.mobile || "-";
  const bookingUnitDetails = [
    ["Name", quotationUnitName],
    ["Status", getUnitStatusLabel(selectedBookingUnit?.status)],
    ["Floor", quotationFloor],
    ["Project Tower Name", quotationTowerName],
    ["Bedrooms", formatBookingDetail(selectedBookingUnit?.bedrooms, "-")],
    ["Bathrooms", formatBookingDetail(selectedBookingUnit?.bathrooms, "-")],
    ["Carpet", formatBookingDetail(selectedBookingUnit?.carpet, bookingForm.carpetArea || "-")],
    ["Saleable", quotationSaleable],
    ["Base Rate", quotationBaseRate],
    ["Floor Rise", "-"],
    ["Effective Rate", "-"],
    ["Total Price", quotationAgreementValue ? `Rs. ${formatCurrency(quotationAgreementValue)}` : "-"],
    ["Agreement Value", quotationAgreementValue ? `Rs. ${formatCurrency(quotationAgreementValue)}` : "-"],
  ];

  const handleCostRowChange = (serial, field, value) => {
    setEditableCostRows((current) =>
      (current.length ? current : defaultQuotationCostRows).map((row) =>
        row.serial === serial ? { ...row, [field]: value } : row
      )
    );
  };

  const handlePaymentPlanChange = (event) => {
    const value = event.target.value;
    setQuotationPaymentPlan(value);

    if (value === "100") {
      setEditablePaymentRows([{ name: "Agreement", towerMilestone: "Agreement", value: 100, taxes: 0, tds: 0 }]);
      return;
    }

    if (value === "60-40") {
      setEditablePaymentRows([
        { name: "Agreement", towerMilestone: "Agreement", value: 60, taxes: 0, tds: 0 },
        { name: "Possession", towerMilestone: "Possession", value: 40, taxes: 0, tds: 0 },
      ]);
      return;
    }

    setEditablePaymentRows([
      { name: "Agreement", towerMilestone: "Agreement", value: 80, taxes: 0, tds: 0 },
      { name: "Possession", towerMilestone: "Possession", value: 20, taxes: 0, tds: 0 },
    ]);
  };

  const handlePaymentRowChange = (index, field, value) => {
    setEditablePaymentRows((current) =>
      (current.length ? current : paymentScheduleRows).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSaveBooking = async (event) => {
    event.preventDefault();

    if (bookingStepIndex === 0) {
      const canContinue = await loadSelectedProjectDetails();
      if (!canContinue) return;

      setBookingMessage("");
      setBookingStepIndex(1);
      return;
    }

    if (!bookingForm.unit) {
      setBookingProjectMessage("Please select a unit before continuing.");
      return;
    }

    if (bookingStepIndex === 1) {
      setBookingProjectMessage("");
      setBookingMessage("");
      setBookingStepIndex(2);
      return;
    }

    if (bookingStepIndex === 2) {
      setBookingMessage("");
      setBookingForm((prev) => ({
        ...prev,
        stage: "Booked",
        bookedOn: prev.bookedOn || bookingConfirmationDate,
        basePrice: baseAgreementValue || quotationAgreementValue || "",
        saleableArea: prev.saleableArea || selectedBookingUnit?.saleable || "",
        baseRate: prev.baseRate || selectedBookingUnit?.baseRate || "",
        builtupArea: prev.builtupArea || selectedBookingUnit?.builtupArea || "",
        rateBasis: prev.rateBasis || selectedBookingUnit?.rateBasis || "On Carpet",
      }));
    }

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
          stage: "Booked",
          leadId: Number(leadId),
          unitId: bookingForm.unitId ? Number(bookingForm.unitId) : undefined,
          unitItemId: bookingForm.unitItemId ? Number(bookingForm.unitItemId) : undefined,
          idempotencyKey: bookingForm.idempotencyKey || `booking-${leadId}-${bookingForm.unitItemId || Date.now()}`,
          source: bookingForm.source || leadSource,
          bookedBy: owner,
          bookedOn: bookingForm.bookedOn || bookingConfirmationDate,
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

      const savedBooking =
        typeof result === "object" && result
          ? result
          : {
            ...bookingForm,
            id: Date.now(),
            leadId,
            unit: bookingForm.unit,
            projectDetails: bookingForm.projectDetails,
            customerName: bookingForm.customerName,
            bookedOn: bookingForm.bookedOn || bookingConfirmationDate,
            basePrice: bookingForm.basePrice || quotationAgreementValue,
            baseRate: bookingForm.baseRate || selectedBookingUnit?.baseRate,
            saleableArea: bookingForm.saleableArea || selectedBookingUnit?.saleable,
          };
      const updatedLead = {
        ...lead,
        status: "Booked",
        lead_status: "Booked",
        stage: "Booked",
        score: 100,
      };
      setLead(updatedLead);
      setSelectedStatus("Booked");
      updateStoredLead("selectedLeadPreview", updatedLead);
      updateStoredLead("selectedLeadDetails", updatedLead);
      window.localStorage.setItem(
        "leadStatusUpdates",
        JSON.stringify({
          ...JSON.parse(window.localStorage.getItem("leadStatusUpdates") || "{}"),
          [leadId]: {
            status: "Booked",
            crmStatus: "Booked",
            score: 100,
            backendStatus: "Booked",
            updatedAt: new Date().toISOString(),
          },
        })
      );
      setBookings((current) => [savedBooking, ...current]);
      setBookingMessage("Booking confirmed successfully.");
      setIsBookingSuccess(true);
    } catch (error) {
      console.error("Unable to save booking:", error);
      setBookingMessage("Booking could not be saved. Please check backend and database.");
    } finally {
      setIsSavingBooking(false);
    }
  };

  return (
    <>
      <>
        <style>{`
.preview-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 0 16px 32px;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  color: #1e293b;
}

.preview-page button,
.preview-page input,
.preview-page select,
.preview-page textarea {
  font-family: inherit;
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

.booking-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
}

.booking-checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  margin: 0;
  cursor: pointer;
}

.booking-checkbox span {
  font-size: 14px;
  white-space: nowrap;
}

.booking-checkbox input[type="checkbox"] {
  width: 12px;
  height: 12px;
}

.lead-preview-edit {
  color: #3b82f6;
  font-size: 14px;
  cursor: pointer;
}

.lead-preview-edit-button {
  border: 0;
  background: transparent;
  color: #3b82f6;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0;
}

.lead-preview-edit-form {
  margin: 18px 0 28px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
  padding: 16px;
}

.lead-preview-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.lead-preview-edit-grid label {
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.lead-preview-edit-grid input {
  min-height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1e293b;
  font-size: 14px;
  padding: 0 10px;
}

.lead-preview-edit-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.lead-preview-edit-actions button {
  min-height: 34px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0 14px;
}

.lead-preview-edit-save {
  border: 0;
  background: #3b82f6;
  color: #ffffff;
}

.lead-preview-edit-cancel {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.lead-preview-edit-message {
  color: #64748b;
  font-size: 12px;
  margin-top: 10px;
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
  display: contents;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

.lead-preview-booking-form label {
  display: contents;
}

.lead-preview-booking-form input,
.lead-preview-booking-form select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1e293b;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-size: 14px;
  min-height: 36px;
  padding: 0 12px;
  width: 100%;
  background: #ffffff;
}

.lead-preview-booking-form input:focus,
.lead-preview-booking-form select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: none;
}

.booking-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.booking-modal {
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
  overflow: hidden;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

.booking-modal-header {
  min-height: 48px;
  background: #676767;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
}

.booking-modal-title {
  margin: 0;
  color: #ffffff;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.booking-modal-close {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  padding: 6px;
}

.booking-modal-close:hover {
  color: #ffffff;
}

.booking-modal-stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 26px 64px 18px;
  border-bottom: 1px solid #cbd5e1;
}

.booking-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
}

.booking-step::before {
  content: "";
  position: absolute;
  top: 17px;
  left: -50%;
  width: 100%;
  height: 1px;
  background: #d7dde5;
  z-index: 0;
}

.booking-step:first-child::before {
  display: none;
}

.booking-step.is-complete::before,
.booking-step.is-active::before {
  background: #2563eb;
}

.booking-step-number {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: #ffffff;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.booking-step.is-complete .booking-step-number {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.booking-modal-main {
  position: relative;
  flex: 1;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 60px 80px 96px;
  overflow-y: auto;
  background: #f8fafc;
}

.booking-choice {
  width: 46%;
  min-height: 330px;
  padding: 35px;
  border: 1px solid #d7dee8;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  justify-content: flex-start;
}

.booking-choice-icon {
  width: 46px;
  height: 46px;
  border: 1px solid #d7c8f4;
  border-radius: 10px;
  background: #f8f5ff;
  color: #673ab7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  margin-bottom: 18px;
}

.booking-illustration {
  display: none;
}

.booking-illustration-city::before,
.booking-illustration-city::after,
.booking-illustration-phone::before,
.booking-illustration-phone::after {
  content: "";
  position: absolute;
}

.booking-illustration-city .booking-building {
  position: absolute;
  bottom: 18px;
  left: 48%;
  width: 48px;
  height: 172px;
  background: #d1d5db;
  box-shadow:
    -76px 32px 0 -2px #334854,
    -36px 66px 0 -4px #263742,
    58px 66px 0 -6px #3c4f59;
}

.booking-illustration-city .booking-house {
  position: absolute;
  right: 54px;
  bottom: 18px;
  width: 108px;
  height: 58px;
  background: #6d42c4;
  box-shadow: -30px 20px 0 #4d2da0;
}

.booking-illustration-city .booking-house::before {
  content: "";
  position: absolute;
  left: -12px;
  top: -28px;
  border-left: 25px solid transparent;
  border-right: 25px solid transparent;
  border-bottom: 28px solid #7d5ad0;
  box-shadow: 48px 0 0 -1px #5632ae;
}

.booking-person-search {
  position: absolute;
  left: 56px;
  bottom: 18px;
  width: 82px;
  height: 136px;
  border-radius: 44px 44px 20px 20px;
  background: #405461;
}

.booking-person-search::before {
  content: "";
  position: absolute;
  left: 30px;
  top: -58px;
  width: 58px;
  height: 72px;
  border-radius: 44% 50% 46% 42%;
  background: #ffb18c;
  box-shadow: -24px -7px 0 3px #5930ad;
}

.booking-magnifier {
  position: absolute;
  left: 145px;
  top: 142px;
  width: 42px;
  height: 42px;
  border: 5px solid rgba(34, 49, 58, 0.92);
  border-radius: 50%;
  transform: rotate(25deg);
}

.booking-magnifier::after {
  content: "";
  position: absolute;
  right: -18px;
  bottom: -8px;
  width: 24px;
  height: 6px;
  border-radius: 8px;
  background: #22313a;
}

.booking-illustration-phone .booking-phone {
  position: absolute;
  left: 46%;
  bottom: 44px;
  width: 118px;
  height: 190px;
  border: 7px solid #455c67;
  border-radius: 20px;
  transform: translateX(-50%);
  background: #ffffff;
}

.booking-illustration-phone .booking-phone::before {
  content: "";
  position: absolute;
  left: 36px;
  top: 0;
  width: 40px;
  height: 12px;
  background: #455c67;
  border-radius: 0 0 6px 6px;
}

.booking-phone-house {
  position: absolute;
  left: 25px;
  top: 54px;
  width: 60px;
  height: 34px;
  background: #f4f2ff;
  border: 1px solid #d7d2ed;
}

.booking-phone-house::before {
  content: "";
  position: absolute;
  left: -10px;
  top: -22px;
  border-left: 42px solid transparent;
  border-right: 42px solid transparent;
  border-bottom: 22px solid #5d32b6;
}

.booking-phone-button {
  position: absolute;
  left: 22px;
  top: 124px;
  width: 70px;
  height: 18px;
  border-radius: 10px;
  background: #5d32b6;
}

.booking-person-unit {
  position: absolute;
  right: 30px;
  bottom: 8px;
  width: 74px;
  height: 184px;
  border-radius: 30px 30px 0 0;
  background: linear-gradient(#5630ad 0 53%, #1f2933 53% 100%);
}

.booking-person-unit::before {
  content: "";
  position: absolute;
  left: 17px;
  top: -44px;
  width: 38px;
  height: 50px;
  border-radius: 44%;
  background: #ffad86;
}

.booking-choice-title {
  margin: 0 0 12px;
  color: #1f2937;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.25;
}

.booking-choice-copy {
  margin: 0 0 35px;
  max-width: none;
  color: #475569;
  font-size: 15px;
  line-height: 1.45;
  min-height: 44px;
}

.booking-divider {
  align-self: center;
  color: #334155;
  font-size: 22px;
  font-weight: 700;
  padding-top: 0;
}

.booking-choice-field {
  width: 100%;
  margin-top: auto;
  text-align: left;
}

.booking-choice-field label {
  display: block;
  margin-bottom: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
}

.booking-choice-field > span {
  display: block;
  margin-bottom: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
}

.booking-choice-field input,
.booking-choice-field select {
  width: 100%;
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1e293b;
  font-size: 14px;
  padding: 0 10px;
  background: #ffffff;
  outline: none;
}

.booking-choice-note {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  color: #334155;
  font-size: 15px;
  text-align: center;
}

.booking-choice-note span {
  color: #6f42c1;
  font-weight: 500;
}

.booking-modal-footer {
  min-height: 58px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 0 26px;
}

.booking-modal-footer-note {
  color: #405060;
  font-size: 16px;
}

.booking-modal-footer-note span {
  color: #5d32c8;
}

.booking-modal-footer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  width: auto;
  margin-left: auto;
}

.booking-modal-footer.is-project-step {
  justify-content: flex-end;
}

.lead-preview-booking-save,
.lead-preview-booking-cancel {
  min-width: 138px;
  min-height: 52px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  padding: 0 20px;
  transition: all 0.2s ease;
}

.lead-preview-booking-save {
  background: #6f42c1;
  border: 1px solid #6f42c1;
  color: #ffffff;
}

.lead-preview-booking-save:hover:not(:disabled) {
  background: #5f35ad;
  border-color: #5f35ad;
}

.lead-preview-booking-save:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lead-preview-booking-cancel {
  background: #ffffff;
  border: 1px solid #6f42c1;
  color: #1f2937;
}

.lead-preview-booking-cancel:hover {
  background: #f8f5ff;
  color: #6f42c1;
}

.lead-preview-booking-save,
.lead-preview-booking-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-align: center;
}

.booking-modal-alert {
  margin: 10px 56px 0;
  color: #64748b;
  font-size: 13px;
}

.booking-modal-alert.is-error {
  color: #b42318;
}

.booking-unit-main {
  flex: 1;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 320px;
  gap: 20px;
  padding: 22px;
  overflow-y: auto;
  background: #ffffff;
}

.booking-unit-filters,
.booking-unit-selection,
.booking-unit-gallery {
  min-height: 420px;
  background: #ffffff;
}

.booking-unit-filters {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  padding: 22px;
}

.booking-unit-selection {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  padding: 22px;
}

.booking-unit-gallery {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  padding: 22px;
}

.booking-unit-filter-head,
.booking-unit-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.booking-unit-filter-head h3,
.booking-unit-selection h3,
.booking-unit-gallery h3 {
  margin: 0;
  color: #1f2937;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
}

.booking-clear-filter {
  border: 0;
  background: transparent;
  color: #6f42c1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 0;
}

.booking-clear-filter:hover {
  color: #562aa7;
}

.booking-tower-select {
  display: grid;
  grid-template-columns: auto minmax(210px, 1fr);
  align-items: center;
  gap: 12px;
  margin: 0;
  min-width: min(100%, 520px);
}

.booking-tower-action {
  min-height: 38px;
  border: 1px solid #6f42c1;
  border-radius: 6px;
  color: #6f42c1;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  padding: 0 14px;
  text-decoration: none;
  white-space: nowrap;
}

.booking-tower-select select {
  min-height: 40px;
  border: 1px solid #d9e2ef;
  border-radius: 6px;
  color: #1f2937;
  font-size: 14px;
  padding: 0 12px;
}

.booking-filter-block {
  border-top: 1px solid #d9e2ef;
  padding: 18px 0;
}

.booking-filter-block:first-of-type {
  margin-top: 14px;
}

.booking-filter-label {
  margin-bottom: 12px;
  color: #1f2937;
  font-size: 15px;
  font-weight: 700;
}

.booking-filter-title {
  margin: 0;
  color: #1f2937;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.booking-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.booking-filter-pill {
  min-height: 38px;
  border: 1px solid #d9e2ef;
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 0 16px;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.booking-filter-pill:hover {
  border-color: #6f42c1;
  color: #6f42c1;
  box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.08);
}

.booking-filter-pill.is-selected {
  border-color: #6f42c1;
  background: #6f42c1;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(111, 66, 193, 0.18);
}

.booking-radio,
.booking-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.booking-radio input,
.booking-checkbox input {
  width: 17px;
  height: 17px;
  accent-color: #673ab7;
}

.booking-checkbox input {
  appearance: none;
  -webkit-appearance: none;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border: 1px solid #d9e2ef;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  display: inline-grid;
  place-content: center;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.booking-checkbox input:checked {
  background: #6f42c1;
  border-color: #6f42c1;
  box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.12);
}

.booking-checkbox input:checked::after {
  content: "";
  width: 7px;
  height: 13px;
  border: solid #ffffff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.booking-tower-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 16px 0 18px;
}

.booking-tower-name {
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
}

.booking-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 22px;
}

.booking-unit-results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin: 0 0 18px;
  width: 100%;
}

.booking-unit-results.is-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.booking-unit-option {
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  cursor: pointer;
  min-height: 82px;
  padding: 12px 14px;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.booking-unit-option:hover {
  border-color: #6f42c1;
  box-shadow: 0 8px 20px rgba(111, 66, 193, 0.12);
}

.booking-unit-option.is-selected {
  border-color: #6f42c1;
  box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.22);
  background: #fbf9ff;
}

.booking-unit-option.is-locked,
.booking-unit-option:disabled {
  background: #f1f5f9;
  border-color: #d7dee8;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.78;
}

.booking-unit-option strong,
.booking-unit-option span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-unit-option span {
  color: #64748b;
  font-size: 12px;
  margin-top: 5px;
}

.booking-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #666666;
  font-size: 14px;
}

.booking-swatch {
  width: 19px;
  height: 19px;
  border-radius: 3px;
  background: #673ab7;
}

.booking-swatch.filtered {
  background: #cfc5df;
}

.booking-swatch.interested {
  background: #4caf50;
}

.booking-unit-empty-art {
  position: relative;
  width: min(100%, 520px);
  height: 160px;
  margin: 0 auto;
  overflow: hidden;
}

.booking-unit-agent {
  position: absolute;
  left: 68px;
  bottom: 0;
  width: 58px;
  height: 124px;
  border-radius: 28px 28px 4px 4px;
  background: linear-gradient(#f2f2f2 0 42%, #31215f 42% 62%, #27323b 62% 100%);
}

.booking-unit-agent::before {
  content: "";
  position: absolute;
  left: 18px;
  top: -36px;
  width: 34px;
  height: 44px;
  border-radius: 48%;
  background: #ffaf8b;
  box-shadow: -4px -12px 0 #673ab7;
}

.booking-unit-card-art {
  position: absolute;
  left: 128px;
  bottom: 0;
  width: 250px;
  height: 160px;
  border: 1px solid #f1f1f1;
  background:
    linear-gradient(135deg, transparent 0 56%, #f4f4f4 56% 100%),
    linear-gradient(#ffffff, #ffffff);
}

.booking-unit-card-art::before {
  content: "";
  position: absolute;
  left: 52px;
  top: 36px;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: rgba(103, 58, 183, 0.45);
  border: 7px solid rgba(103, 58, 183, 0.32);
  box-shadow: 72px -2px 0 -52px #a991d2, 82px 68px 0 -54px #a991d2;
}

.booking-unit-card-art::after {
  content: "";
  position: absolute;
  left: 34px;
  top: 100px;
  width: 104px;
  height: 14px;
  border-radius: 10px;
  background: rgba(103, 58, 183, 0.5);
  transform: rotate(-34deg);
}

.booking-gallery-map {
  width: 100%;
  max-width: 280px;
  height: 250px;
  margin: 18px auto 0;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  overflow: hidden;
  background:
    radial-gradient(circle at 52% 28%, #e6eef0 0 6%, transparent 7%),
    radial-gradient(circle at 48% 64%, #7ec9d2 0 9%, transparent 10%),
    linear-gradient(145deg, transparent 0 18%, #59626a 18% 22%, #d8d4c7 22% 28%, #59626a 28% 32%, transparent 32% 100%),
    linear-gradient(22deg, transparent 0 48%, #59626a 48% 53%, #d8d4c7 53% 58%, #59626a 58% 63%, transparent 63% 100%),
    repeating-radial-gradient(circle at 18% 20%, #77a765 0 4px, #98be82 5px 10px);
  position: relative;
}

.booking-gallery-map::before {
  content: "";
  position: absolute;
  inset: 70px 56px 58px 74px;
  background:
    linear-gradient(90deg, #f7f7f7 0 18%, transparent 18% 30%, #f7f7f7 30% 48%, transparent 48% 64%, #f7f7f7 64% 84%, transparent 84%),
    linear-gradient(#8861ca, #8861ca);
  border-radius: 12px;
  opacity: 0.95;
}

.booking-unit-gallery .booking-choice-field {
  width: 100%;
  margin: 18px auto 0;
}

.booking-project-summary {
  width: 100%;
  margin: 12px auto 0;
  color: #64748b;
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.booking-project-summary strong {
  color: #1f2937;
}

.booking-unit-empty-state {
  width: 100%;
  margin: 0 0 18px;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  color: #64748b;
  padding: 18px;
  text-align: center;
}

.booking-quote-main {
  flex: 1;
  overflow-y: auto;
  background: #ffffff;
  color: #555555;
}

.booking-quote-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 86px;
  padding: 0 22px;
  border-bottom: 1px solid #d9dee5;
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.12);
}

.booking-quote-tabs button {
  min-height: 40px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #111111;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  padding: 0 16px;
}

.booking-quote-tabs button.is-active {
  background: #673ab7;
  color: #ffffff;
}

.booking-quote-unit-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 44px;
  padding: 20px 22px 18px;
  border-bottom: 1px solid #e4e7ec;
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.08);
}

.booking-quote-unit-strip > div {
  display: grid;
  align-content: start;
  gap: 4px;
  min-height: 126px;
}

.booking-quote-unit-strip span,
.booking-quote-controls span,
.booking-quote-inventory span {
  color: #8a8a8a;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
}

.booking-quote-controls span,
.booking-quote-inventory span {
  text-transform: uppercase;
}

.booking-quote-unit-strip strong {
  color: #666666;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2;
  min-height: 16px;
}

.booking-quote-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  padding: 20px;
}

.booking-quote-controls label,
.booking-quote-inventory label {
  display: grid;
  gap: 6px;
  margin: 0;
}

.booking-quote-controls input,
.booking-quote-controls select,
.booking-quote-inventory select {
  width: 100%;
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #1e293b;
  font-size: 14px;
  padding: 0 10px;
}

.booking-quote-controls input:focus,
.booking-quote-controls select:focus,
.booking-quote-inventory select:focus {
  outline: none;
  border-color: #673ab7;
  box-shadow: 0 0 0 1px rgba(103, 58, 183, 0.18);
}

.booking-quote-inventory {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.9fr) auto;
  align-items: end;
  gap: 15px;
  padding: 16px 20px 24px;
  border-bottom: 1px solid #eceff3;
}

.booking-quote-apply {
  min-width: 68px;
  min-height: 35px;
  border: 1px solid #673ab7;
  border-radius: 4px;
  background: #ffffff;
  color: #673ab7;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.booking-quote-apply:hover {
  background: #f8f5ff;
}

.booking-quote-cost {
  padding: 14px 22px 0;
  overflow-x: auto;
}

.booking-quote-cost h3 {
  margin: 0 0 14px;
  color: #606060;
  font-size: 16px;
  font-weight: 700;
}

.booking-quote-table {
  min-width: 940px;
  border: 1px solid #e1e5eb;
  border-bottom: 0;
}

.booking-quote-row {
  display: grid;
  grid-template-columns: 92px minmax(180px, 1.25fr) minmax(150px, 0.75fr) minmax(250px, 1fr) minmax(210px, 1fr) minmax(170px, 0.9fr);
  min-height: 42px;
  border-bottom: 1px solid #e1e5eb;
}

.booking-quote-row > span,
.booking-quote-row > strong {
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: #444444;
  font-size: 14px;
  border-right: 1px solid #e1e5eb;
}

.booking-quote-row > :last-child {
  border-right: 0;
  justify-content: flex-end;
}

.booking-quote-row.is-head {
  background: #ffffff;
  font-weight: 700;
}

.booking-quote-row.is-head > span {
  color: #444444;
  font-weight: 700;
}

.booking-quote-row.is-section {
  display: flex;
  min-height: 40px;
}

.booking-quote-row.is-section > strong {
  width: 100%;
  border-right: 0;
  font-weight: 700;
}

.booking-quote-row.is-line {
  min-height: 54px;
}

.booking-quote-row.is-highlight {
  background: #eee9f6;
}

.booking-quote-row.is-line > span:first-child {
  justify-content: flex-end;
}

.booking-quote-row.is-line > span:nth-child(3) {
  justify-content: flex-end;
}

.booking-quote-row.is-line > span:nth-child(4),
.booking-quote-row.is-line > span:nth-child(5),
.booking-quote-row.is-line > span:nth-child(6) {
  padding: 6px 8px;
}

.booking-quote-row select {
  width: 100%;
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #1e293b;
  font-size: 14px;
  padding: 0 10px;
}

.booking-quote-money-field {
  width: 100%;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  margin: 0;
}

.booking-quote-money-field b {
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-right: 0;
  border-radius: 4px 0 0 4px;
  background: #eef1f4;
  color: #555555;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.booking-quote-money-field input {
  min-width: 0;
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 0 4px 4px 0;
  color: #666666;
  font-size: 14px;
  padding: 0 12px;
  text-align: right;
}

.booking-payment-table {
  min-width: 980px;
}

.booking-payment-row {
  display: grid;
  grid-template-columns: minmax(190px, 1.1fr) minmax(160px, 1fr) 110px repeat(4, minmax(130px, 0.85fr));
  min-height: 48px;
  border-bottom: 1px solid #e1e5eb;
}

.booking-payment-row span {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-right: 1px solid #e1e5eb;
  color: #444444;
  font-size: 14px;
}

.booking-payment-row span:last-child {
  border-right: 0;
  justify-content: flex-end;
}

.booking-payment-row.is-head {
  font-weight: 700;
}

.booking-payment-row.is-total {
  background: #eee9f6;
  font-weight: 700;
}

.booking-payment-row input,
.booking-payment-row select {
  width: 100%;
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1e293b;
  font-size: 14px;
  padding: 0 10px;
}

.booking-payment-row input[type="number"] {
  text-align: right;
}

.booking-payment-text-input {
  border-color: transparent !important;
  background: transparent;
  padding-left: 0 !important;
}

.booking-confirmation-main {
  flex: 1;
  overflow-y: auto;
  background: #ffffff;
  padding: 14px 20px 0;
}

.booking-confirmation-title {
  margin: 0 0 20px;
  color: #666666;
  font-size: 15px;
  font-weight: 700;
}

.booking-confirmation-card {
  border: 1px solid #cfd6df;
  border-radius: 3px;
  margin-bottom: 16px;
  background: #ffffff;
}

.booking-confirmation-card-head {
  min-height: 38px;
  display: flex;
  align-items: center;
  background: #673ab7;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  padding: 0 8px;
}

.booking-confirmation-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  padding: 16px 14px 24px;
}

.booking-confirmation-field,
.booking-applicant-grid > div,
.booking-cost-summary > div {
  display: grid;
  gap: 5px;
}

.booking-confirmation-field span,
.booking-confirmation-input span,
.booking-applicant-grid span,
.booking-cost-summary span {
  color: #7b8794;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.booking-confirmation-field strong,
.booking-applicant-grid strong,
.booking-cost-summary strong {
  min-height: 18px;
  color: #4b5563;
  font-size: 15px;
  font-weight: 500;
}

.booking-confirmation-input {
  display: grid;
  gap: 5px;
  margin: 0;
}

.booking-confirmation-input input,
.booking-confirmation-input select {
  width: 100%;
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #1e293b;
  font-size: 14px;
  padding: 0 10px;
}

.booking-applicant-grid,
.booking-cost-summary,
.booking-custom-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  padding: 16px 14px 20px;
}

.booking-add-coapplicant {
  width: 100%;
  min-height: 52px;
  border: 0;
  border-top: 1px solid #e1e5eb;
  background: transparent;
  color: #5f31bd;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
}

.booking-confirmation-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  padding: 20px 14px 24px;
}

.booking-confirmation-wide {
  grid-column: 1 / -1;
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

.booking-tower-select-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.booking-tower-select-inline span {
  font-weight: 600;
  white-space: nowrap;
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

.booking-modal {
  font-family: inherit;
  overflow-y: auto;
}

  .booking-modal-header {
    padding: 0 16px;
  }

  .booking-modal-title {
    font-size: 22px;
  }

  .booking-modal-stepper {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
    padding: 32px 18px 24px;
  }

  .booking-step {
    gap: 12px;
    font-size: 12px;
  }

  .booking-step::before {
    display: none;
  }

  .booking-modal-main {
    flex-direction: column;
    gap: 20px;
    padding: 30px 20px 82px;
  }

  .booking-unit-main {
    grid-template-columns: 1fr;
    overflow-y: visible;
    padding: 18px;
  }

  .booking-unit-filters,
  .booking-unit-selection,
  .booking-unit-gallery {
    min-height: auto;
    padding: 18px;
  }

  .booking-unit-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .booking-tower-select {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .booking-legend {
    margin-bottom: 28px;
  }

  .booking-unit-results {
    grid-template-columns: 1fr;
    margin: 0 0 24px;
  }

  .booking-unit-results.is-grid {
    grid-template-columns: 1fr;
  }

  .booking-unit-empty-state {
    margin: 0 auto 24px;
  }

  .booking-choice {
    width: 100%;
    min-height: auto;
  }

  .booking-illustration {
    display: none;
  }

  .booking-divider {
    margin: 10px 0;
    padding-top: 0;
  }

  .booking-choice-title {
    font-size: 26px;
  }

  .booking-choice-copy {
    font-size: 15px;
  }

  .booking-choice-field {
    margin-top: 20px;
  }

  .booking-choice-note {
    bottom: 26px;
  }

  .booking-modal-alert {
    margin: 14px 18px 0;
  }

  .booking-modal-footer {
    position: sticky;
    bottom: 0;
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 12px;
  }

  .booking-modal-footer-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .booking-modal-footer-actions button {
    flex: 1 1 auto;
  }
}
        `}</style>

        <div className="preview-page">
          <div className="lead-preview-shell">
            <div className="lead-preview-topbar">
              <h1 className="lead-preview-title">{leadName}</h1>
              <button className="lead-preview-close" type="button" onClick={showUserDetails} aria-label="Show user details">
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
                      <button
                        type="button"
                        className="lead-preview-edit-button"
                        onClick={() => setIsLeadEditOpen(true)}
                        aria-label="Edit lead details"
                      >
                        <FaEdit className="lead-preview-edit" />
                      </button>
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

              {isLeadEditOpen && (
                <form className="lead-preview-edit-form" onSubmit={handleSaveLeadEdit}>
                  <div className="lead-preview-edit-grid">
                    <label>
                      First Name
                      <input name="firstName" value={leadEditForm.firstName || ""} onChange={handleLeadEditChange} required />
                    </label>
                    <label>
                      Last Name
                      <input name="lastName" value={leadEditForm.lastName || ""} onChange={handleLeadEditChange} required />
                    </label>
                    <label>
                      Email
                      <input name="email" type="email" value={leadEditForm.email || ""} onChange={handleLeadEditChange} required />
                    </label>
                    <label>
                      Phone
                      <input name="phone" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" value={leadEditForm.phone || ""} onChange={handleLeadEditChange} required />
                    </label>
                    <label>
                      Tags
                      <input name="tags" value={leadEditForm.tags || ""} onChange={handleLeadEditChange} />
                    </label>
                    <label>
                      Interested Project
                      <input name="interestedProjects" value={leadEditForm.interestedProjects || ""} onChange={handleLeadEditChange} />
                    </label>
                    <label>
                      Channel Partner
                      <input name="channelPartner" value={leadEditForm.channelPartner || ""} onChange={handleLeadEditChange} />
                    </label>
                    <label>
                      Company Name
                      <input name="companyName" value={leadEditForm.companyName || ""} onChange={handleLeadEditChange} />
                    </label>
                  </div>
                  <div className="lead-preview-edit-actions">
                    <button type="submit" className="lead-preview-edit-save" disabled={isSavingLeadEdit}>
                      {isSavingLeadEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" className="lead-preview-edit-cancel" onClick={() => setIsLeadEditOpen(false)}>
                      Cancel
                    </button>
                  </div>
                  {leadEditMessage && <div className="lead-preview-edit-message">{leadEditMessage}</div>}
                </form>
              )}
              {!isLeadEditOpen && leadEditMessage && <div className="lead-preview-edit-message">{leadEditMessage}</div>}

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
                          {label === "TAGS" && (
                            <button
                              type="button"
                              className="lead-preview-edit-button"
                              onClick={() => setIsLeadEditOpen(true)}
                              aria-label="Edit tags"
                              style={{ marginLeft: 14 }}
                            >
                              <FaEdit className="lead-preview-edit" />
                            </button>
                          )}
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

            <UserBookingForm
              isOpen={isBookingFormOpen}
              bookingSteps={bookingSteps}
              bookingStepIndex={bookingStepIndex}
              bookingMessage={bookingMessage}
              bookingProjectMessage={bookingProjectMessage}
              bookingProjectSelectValue={bookingProjectSelectValue}
              bookingForm={bookingForm}
              leadName={leadName}
              isSavingBooking={isSavingBooking}
              isLoadingBookingProject={isLoadingBookingProject}
              bookingSuccess={isBookingSuccess}
              bookingHoldOwner={owner}
              onClose={handleCloseBookingForm}
              onSubmit={handleSaveBooking}
              onPrevious={() => setBookingStepIndex((current) => Math.max(0, current - 1))}
              onMarkInterested={() =>
                setBookingProjectMessage(
                  bookingForm.unit
                    ? `${bookingForm.unit} marked as interested.`
                    : "Select a unit before marking interest."
                )
              }
            >
              {bookingStepIndex === 0 ? (
                <div className="booking-modal-main">
                  <section className="booking-choice">
                    <div className="booking-choice-icon" aria-hidden="true">
                      <FaBriefcase />
                    </div>
                    <h6 className="booking-choice-title">Select Project For Booking</h6>
                    <p className="booking-choice-copy">Start by selecting a project that you like and we will guide you further</p>
                    <div className="booking-choice-field">
                      <label htmlFor="booking-project">Select Project</label>
                      <select
                        id="booking-project"
                        name="projectDetails"
                        value={bookingProjectSelectValue}
                        onChange={handleBookingProjectChange}
                      >
                        <option value="">
                          {bookingProjects.length ? "Select a Project" : bookingForm.projectDetails || "Loading projects..."}
                        </option>
                        {bookingForm.projectDetails && !selectedBookingProject && (
                          <option value="__lead_project__">
                            {bookingForm.projectDetails}
                          </option>
                        )}
                        {bookingProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      {bookingProjectMessage && (
                        <div className="booking-modal-alert is-error" style={{ margin: "10px 0 0" }}>
                          {bookingProjectMessage}
                        </div>
                      )}

                    </div>
                  </section>

                  {/* <div className="booking-divider">OR</div>

                      <section className="booking-choice">
                        <div className="booking-choice-icon" aria-hidden="true">
                          <FaHome />
                        </div>
                        <h6 className="booking-choice-title">Quick Unit Selection</h6>
                        <p className="booking-choice-copy">Know your unit? Select it here and proceed to book directly.</p>
                        <div className="booking-choice-field">
                          <label htmlFor="booking-unit-quick">Select Unit</label>
                          <select
                            id="booking-unit-quick"
                            name="unit"
                            value={selectedBookingUnit ? getBookingUnitOptionValue(selectedBookingUnit) : ""}
                            onChange={(event) => {
                              const unit = visibleBookingUnits.find(
                                (item) => getBookingUnitOptionValue(item) === event.target.value
                              );
                              if (unit) handleBookingUnitSelect(unit);
                              else setBookingForm((prev) => ({ ...prev, unit: "", unitId: "", unitItemId: "" }));
                            }}
                            disabled={!visibleBookingUnits.length}
                          >
                            <option value="">
                              {bookingForm.projectId || bookingForm.projectDetails
                                ? visibleBookingUnits.length
                                  ? "Select Unit"
                                  : "No units found"
                                : "Select project first"}
                            </option>
                            {visibleBookingUnits.map((unit) => (
                              <option key={`quick-${getBookingUnitOptionValue(unit)}`} value={getBookingUnitOptionValue(unit)}>
                                {getBookingUnitOptionLabel(unit)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </section>

                      */}
                  <div className="booking-choice-note">
                    You are taking a booking for <span>{leadName}</span>
                  </div>

                </div>


              ) : bookingStepIndex === 1 ? (
                <div className="booking-unit-main">
                  <aside className="booking-unit-filters">
                    <div className="booking-unit-filter-head">
                      <h6 className="booking-filter-title">Filters By</h6>
                      <button type="button" className="booking-clear-filter" onClick={handleClearBookingFilters}>
                        Clear Filters
                      </button>
                    </div>

                    {[
                      ["unitType", "Project Type", ["Residential", "Commercial"]],
                    ].map(([filterKey, label, options]) => (
                      <div className="booking-filter-block" key={label}>
                        <div className="booking-filter-label">{label}</div>
                        <div className="booking-pill-row">
                          {options.map((option) => (
                            <button
                              type="button"
                              className={`booking-filter-pill${bookingFilters[filterKey] === option ? " is-selected" : ""}`}
                              key={option}
                              onClick={() => handleBookingFilterChange(filterKey, option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </aside>

                  <section className="booking-unit-selection">
                    <div className="booking-unit-topbar">
                      {/* <p style={{ fontSize: "12px" }}>Select Unit</p> */}
                      <label className="booking-tower-select-inline">
                        <span style={{ fontWeight: "600", whiteSpace: "nowrap" }}>Select Unit</span>

                        <select
                          value={selectedBookingTowerId}
                          onChange={handleBookingTowerChange}
                        >
                          <option value="">All Towers</option>
                          {bookingTowerOptions.map((tower) => (
                            <option key={tower.id} value={tower.id}>
                              {tower.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="booking-checkbox">
                        <input
                          type="checkbox"
                          checked={shouldCheckAvailability}
                          onChange={(event) => setShouldCheckAvailability(event.target.checked)}
                        />
                        <span>Check Availability</span>
                      </label>
                    </div>
                    <div className="booking-tower-row">
                      <span className="booking-tower-name">{activeTowerName}</span>
                    </div>

                    {/* <div className="booking-legend">
                          <span className="booking-legend-item"><span className="booking-swatch filtered" />Filtered and Available</span>
                          <span className="booking-legend-item"><span className="booking-swatch interested" />Interested</span>
                          <span className="booking-legend-item"><span className="booking-swatch" />Selected</span>
                          <span className="booking-legend-item"><strong>N/A</strong> Unavailable</span>
                        </div> */}

                    {visibleBookingUnits.length > 0 ? (
                      <div className={`booking-unit-results${bookingUnitView === "grid" ? " is-grid" : ""}`}>
                        {visibleBookingUnits.map((unit) => (
                          <button
                            type="button"
                            className={`booking-unit-option${bookingForm.unit === unit.name ? " is-selected" : ""}${normalizeUnitStatus(unit.status) !== "Available" ? " is-locked" : ""}`}
                            key={`${unit.groupId}-${unit.id}`}
                            onClick={() => handleBookingUnitSelect(unit)}
                            disabled={normalizeUnitStatus(unit.status) !== "Available"}
                          >
                            <strong>{unit.name || `Unit ${unit.unitIndex || unit.id}`}</strong>
                            <span>Floor: {formatBookingDetail(unit.floor, unit.floorPlan?.name || "-")} | Carpet Area: {unit.carpet || "-"} Sq. Ft.</span>
                            <span>{getUnitStatusLabel(unit.status)} | Saleable Area: {unit.saleable || "-"} Sq. Ft. | Rs. {Number(unit.basePrice || 0).toLocaleString("en-IN")}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="booking-unit-empty-state">
                        {flattenedBookingUnits.length
                          ? "No units match the selected filters."
                          : bookingProjectMessage || "No units found for this project yet."}
                      </div>
                    )}

                    <div className="booking-unit-empty-art" aria-hidden="true">
                      <span className="booking-unit-agent" />
                      <span className="booking-unit-card-art" />
                    </div>
                  </section>

                  <aside className="booking-unit-gallery">
                    <h6>Gallery and Unit Details</h6>
                    <div className="booking-gallery-map" aria-hidden="true" />
                    <label className="booking-choice-field" htmlFor="booking-unit-final">
                      <span>Select Unit</span>
                      {visibleBookingUnits.length > 0 ? (
                        <select
                          id="booking-unit-final"
                          name="unit"
                          value={selectedBookingUnit ? getBookingUnitOptionValue(selectedBookingUnit) : ""}
                          onChange={(event) => {
                            const unit = visibleBookingUnits.find(
                              (item) => getBookingUnitOptionValue(item) === event.target.value
                            );
                            if (unit) handleBookingUnitSelect(unit);
                            else setBookingForm((prev) => ({ ...prev, unit: "", unitId: "", unitItemId: "" }));
                          }}
                          required
                        >
                          <option value="">Select Unit</option>
                          {visibleBookingUnits.map((unit) => (
                            <option
                              key={`final-${getBookingUnitOptionValue(unit)}`}
                              value={getBookingUnitOptionValue(unit)}
                              disabled={normalizeUnitStatus(unit.status) !== "Available"}
                            >
                              {getBookingUnitOptionLabel(unit)} - {getUnitStatusLabel(unit.status)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select id="booking-unit-final" name="unit" value="" disabled required>
                          <option value="">No admin-created units found</option>
                        </select>
                      )}
                    </label>
                    <div className="booking-project-summary">
                      <strong>{bookingProjectDetails?.name || bookingForm.projectDetails || "Project details"}</strong>
                      <span>{bookingProjectDetails?.projectType || "Residential"} · {visibleBookingUnits.length} of {flattenedBookingUnits.length} units shown</span>
                      {selectedBookingUnit && (
                        <>
                          <span>{formatBookingDetail(selectedBookingUnit.tower, activeTowerName)} | Floor {formatBookingDetail(selectedBookingUnit.floor, quotationFloor)}</span>
                          <span>Carpet {selectedBookingUnit.carpet || "-"} Sq. Ft. | Saleable {selectedBookingUnit.saleable || "-"} Sq. Ft.</span>
                          <span>Base price Rs. {Number(baseAgreementValue || 0).toLocaleString("en-IN")}</span>
                        </>
                      )}
                    </div>
                  </aside>
                </div>
              ) : bookingStepIndex === 2 ? (
                <div className="booking-quote-main">
                  <div className="booking-quote-tabs" aria-label="Quotation tabs">
                    <button type="button" className={quotationTab === "unit" ? "is-active" : ""} onClick={() => setQuotationTab("unit")}>Unit Details</button>
                    <button type="button" className={quotationTab === "cost" ? "is-active" : ""} onClick={() => setQuotationTab("cost")}>Cost Sheet</button>
                    <button type="button" className={quotationTab === "payment" ? "is-active" : ""} onClick={() => setQuotationTab("payment")}>Payment Schedule</button>
                  </div>

                  {quotationTab === "unit" && (
                    <section className="booking-quote-unit-strip">
                      <div>
                        <span>Name</span>
                        <strong>{quotationUnitName}</strong>
                        <span>Bedrooms</span>
                        <strong>{formatBookingDetail(selectedBookingUnit?.bedrooms, "-")}</strong>
                        <span>Base Rate</span>
                        <strong>Rs. {quotationBaseRate}</strong>
                        <span>Agreement Value</span>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{formatBookingDetail(selectedBookingUnit?.status, "Available")}</strong>
                        <span>Bathrooms</span>
                        <strong>{formatBookingDetail(selectedBookingUnit?.bathrooms, "-")}</strong>
                        <span>Floor Rise</span>
                      </div>
                      <div>
                        <span>Floor</span>
                        <strong>{quotationFloor}</strong>
                        <span>Carpet</span>
                        <strong>{formatBookingDetail(selectedBookingUnit?.carpet, "-")}</strong>
                        <span>Effective Rate</span>
                      </div>
                      <div>
                        <span>Project Tower Name</span>
                        <strong>{quotationTowerName}</strong>
                        <span>Saleable</span>
                        <strong>{quotationSaleable}</strong>
                        <span>Total Price</span>
                      </div>
                    </section>
                  )}

                  {quotationTab === "unit" && (
                    <section className="booking-quote-controls">
                      <label>
                        <span>Select Scheme</span>
                        <select value={quotationScheme} onChange={(event) => setQuotationScheme(event.target.value)}>
                          <option value="default">Default Scheme</option>
                          <option value="construction-linked">Construction Linked Scheme</option>
                          <option value="possession-linked">Possession Linked Scheme</option>
                          <option value="custom">Custom Scheme</option>
                        </select>
                      </label>
                      <label>
                        <span>Select Payment Schedule</span>
                        <select value={quotationPaymentPlan} onChange={handlePaymentPlanChange}>
                          <option value="80-20">80:20 Payment Schedule</option>
                          <option value="60-40">60:40 Payment Schedule</option>
                          <option value="100">100% Agreement Payment</option>
                        </select>
                      </label>
                      <label>
                        <span>Quotation Name</span>
                        <input value={quotationName} readOnly />
                      </label>
                      <label>
                        <span>Payment Schedule Name</span>
                        <input value={quotationName} readOnly />
                      </label>
                    </section>
                  )}

                  {quotationTab === "unit" && (
                    <section className="booking-quote-inventory">
                      <label>
                        <span>Additional Inventory Configuration</span>
                        <select defaultValue="">
                          <option value="">Choose Inventory Configuration</option>
                        </select>
                      </label>
                      <label>
                        <span>Additional Inventory</span>
                        <select defaultValue="">
                          <option value="">Choose Additional Inventory</option>
                        </select>
                      </label>
                      <button type="button" className="booking-quote-apply">Apply</button>
                    </section>
                  )}

                  {quotationTab === "cost" && (
                    <section className="booking-quote-cost">
                      <h6>Cost Sheet</h6>
                      <div className="booking-quote-table" role="table" aria-label="Cost sheet">
                        <div className="booking-quote-row is-head" role="row">
                          <span>Sr. No.</span>
                          <span>Field Name</span>
                          <span>Original Value</span>
                          <span>Discount Or AdHoc Cost</span>
                          <span>Input Field</span>
                          <span>New Value</span>
                        </div>
                        {quotationCostRows.map((row) =>
                          row.type === "section" ? (
                            <div className="booking-quote-row is-section" role="row" key={`${row.serial}-${row.name}`}>
                              <strong>{row.serial} {row.name}</strong>
                            </div>
                          ) : (
                            <div className={`booking-quote-row is-line${row.highlight ? " is-highlight" : ""}`} role="row" key={`${row.serial}-${row.name}`}>
                              <span>{row.serial}</span>
                              <span>{row.name}</span>
                              <span>Rs. {formatCurrency(row.originalValue)}</span>
                              <span>
                                <select
                                  value={row.costType || "Discount"}
                                  onChange={(event) => handleCostRowChange(row.serial, "costType", event.target.value)}
                                  aria-label={`${row.name} discount type`}
                                >
                                  <option value="Discount">Discount</option>
                                  <option value="AdHoc Cost">AdHoc Cost</option>
                                </select>
                              </span>
                              <span>
                                <label className="booking-quote-money-field">
                                  <b>Rs.</b>
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.inputField ?? 0}
                                    onChange={(event) => handleCostRowChange(row.serial, "inputField", event.target.value)}
                                    aria-label={`${row.name} input value`}
                                  />
                                </label>
                              </span>
                              <span>
                                <label className="booking-quote-money-field">
                                  <b>Rs.</b>
                                  <input value={formatCurrency(calculateCostNewValue(row))} readOnly aria-label={`${row.name} new value`} />
                                </label>
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </section>
                  )}

                  {quotationTab === "payment" && (
                    <section className="booking-quote-cost">
                      <h6>Payment Schedule</h6>
                      <div className="booking-quote-table booking-payment-table" role="table" aria-label="Payment schedule">
                        <div className="booking-payment-row is-head" role="row">
                          <span>Name</span>
                          <span>Tower Milestone</span>
                          <span>Value (In Percentage %)</span>
                          <span>Amount</span>
                          <span>Taxes</span>
                          <span>TDS</span>
                          <span>Grand Total</span>
                        </div>
                        {calculatedPaymentRows.map((row, index) => (
                          <div className="booking-payment-row" role="row" key={`${row.name}-${index}`}>
                            <span>
                              <input
                                className="booking-payment-text-input"
                                value={row.name}
                                onChange={(event) => handlePaymentRowChange(index, "name", event.target.value)}
                                aria-label="Payment name"
                              />
                            </span>
                            <span>
                              <select
                                value={row.towerMilestone}
                                onChange={(event) => handlePaymentRowChange(index, "towerMilestone", event.target.value)}
                                aria-label={`${row.name} tower milestone`}
                              >
                                <option value="Agreement">Agreement</option>
                                <option value="Possession">Possession</option>
                                <option value={quotationTowerName}>{quotationTowerName}</option>
                              </select>
                            </span>
                            <span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.value}
                                onChange={(event) => handlePaymentRowChange(index, "value", event.target.value)}
                                aria-label={`${row.name} percentage`}
                              />
                            </span>
                            <span>Rs. {formatCurrency(row.amount)}</span>
                            <span>
                              <input
                                type="number"
                                min="0"
                                value={row.taxes}
                                onChange={(event) => handlePaymentRowChange(index, "taxes", event.target.value)}
                                aria-label={`${row.name} taxes`}
                              />
                            </span>
                            <span>
                              <input
                                type="number"
                                min="0"
                                value={row.tds}
                                onChange={(event) => handlePaymentRowChange(index, "tds", event.target.value)}
                                aria-label={`${row.name} tds`}
                              />
                            </span>
                            <span>Rs. {formatCurrency(row.grandTotal)}</span>
                          </div>
                        ))}
                        <div className="booking-payment-row is-total" role="row">
                          <span>Total Agreement Value</span>
                          <span>-</span>
                          <span>{paymentTotals.value.toFixed(2)}%</span>
                          <span>Rs. {formatCurrency(paymentTotals.amount)}</span>
                          <span>Rs. {formatCurrency(paymentTotals.taxes)}</span>
                          <span>Rs. {formatCurrency(paymentTotals.tds)}</span>
                          <span>Rs. {formatCurrency(paymentTotals.grandTotal)}</span>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="booking-confirmation-main">
                  <h6 className="booking-confirmation-title">Booking Confirmation</h6>

                  <section className="booking-confirmation-card">
                    <div className="booking-confirmation-card-head">Unit Details</div>
                    <div className="booking-confirmation-grid">
                      {bookingUnitDetails.map(([label, value]) => (
                        <div className="booking-confirmation-field" key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                      <label className="booking-confirmation-input">
                        <span>Booking Name</span>
                        <input name="customerName" value={bookingForm.customerName} onChange={handleBookingChange} />
                      </label>
                      <label className="booking-confirmation-input">
                        <span>Booking Date</span>
                        <input name="bookedOn" type="date" value={bookingForm.bookedOn || bookingConfirmationDate} onChange={handleBookingChange} />
                      </label>
                      <label className="booking-confirmation-input">
                        <span>Select Booking Cancellation Reason</span>
                        <select name="bookingCancellationReason" value={bookingForm.bookingCancellationReason} onChange={handleBookingChange}>
                          <option value="">Select Booking Cancellation Reason</option>
                          <option value="Customer request">Customer request</option>
                          <option value="Payment issue">Payment issue</option>
                          <option value="Unit changed">Unit changed</option>
                        </select>
                      </label>
                      <label className="booking-confirmation-input">
                        <span>Add Booking Cancellation Note</span>
                        <input name="bookingCancellationNote" value={bookingForm.bookingCancellationNote} onChange={handleBookingChange} placeholder="Add Booking Cancellation Note" />
                      </label>
                    </div>
                  </section>

                  <section className="booking-confirmation-card">
                    <div className="booking-confirmation-card-head">Applicant Details</div>
                    <div className="booking-applicant-grid">
                      <div><span>Name</span><strong>{leadName}</strong></div>
                      <div><span>Lead Name</span><strong>{leadName}</strong></div>
                      <div><span>Phone</span><strong>{applicantPhone}</strong></div>
                      <div><span>DOB</span><strong>{formatBookingDetail(lead.birthday, "-")}</strong></div>
                      <div><span>PAN Number</span><strong>-</strong></div>
                      <div><span>Aadhaar Number</span><strong>-</strong></div>
                      <div><span>Email</span><strong>{applicantEmail}</strong></div>
                    </div>
                  </section>

                  <section className="booking-confirmation-card">
                    <div className="booking-confirmation-card-head">Cost Details</div>
                    <div className="booking-cost-summary">
                      <div><span>Scheme</span><strong>{quotationSchemeLabel}</strong></div>
                      <div><span>Payment Schedule</span><strong>{quotationPaymentPlanLabel}</strong></div>
                      <div><span>Original Agreement Value</span><strong>Rs. {formatCurrency(quotationAgreementValue)}</strong></div>
                      <div><span>Final Agreement Value</span><strong>Rs. {formatCurrency(quotationAgreementValue)}</strong></div>
                      <div><span>Original All Inclusive Value</span><strong>Rs. {formatCurrency(quotationAllInclusiveValue)}</strong></div>
                      <div><span>Final All Inclusive Value</span><strong>Rs. {formatCurrency(quotationAllInclusiveValue)}</strong></div>
                    </div>
                  </section>

                  <section className="booking-confirmation-card">
                    <div className="booking-confirmation-card-head">Hold/Book Unit</div>
                    <div className="booking-confirmation-two">
                      <label className="booking-confirmation-input">
                        <span>Select Booking Stage *</span>
                        <select name="stage" value={bookingForm.stage} onChange={handleBookingChange}>
                          <option value="Tentative">Tentative</option>
                          <option value="Booked">Booked</option>
                          <option value="Held">Held</option>
                        </select>
                      </label>
                      <label className="booking-confirmation-input">
                        <span>Select Project Unit Status *</span>
                        <select name="projectUnitStatus" value={bookingForm.projectUnitStatus || "Booked"} onChange={handleBookingChange}>
                          <option value="Booked">Booked</option>
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="booking-confirmation-card">
                    <div className="booking-confirmation-card-head">Campaign Info</div>
                    <div className="booking-confirmation-two">
                      <label className="booking-confirmation-input">
                        <span>Campaign</span>
                        <select name="campaign" value={bookingForm.campaign} onChange={handleBookingChange}>
                          <option value="walkin">walkin</option>
                          <option value="channel_partner">channel_partner</option>
                          <option value="digital">digital</option>
                        </select>
                      </label>
                      <label className="booking-confirmation-input">
                        <span>Source</span>
                        <select name="source" value={bookingForm.source} onChange={handleBookingChange}>
                          <option value="">Select Source</option>
                          <option value="Direct">Direct</option>
                          <option value="walkin">walkin</option>
                          <option value="channel_partner">channel_partner</option>
                          <option value="Channel Partner">Channel Partner</option>
                          <option value="digital">digital</option>
                        </select>
                      </label>
                      <label className="booking-confirmation-input booking-confirmation-wide">
                        <span>Channel Partner</span>
                        <select
                          name="channelPartnerId"
                          value={bookingForm.channelPartnerId || ""}
                          onChange={(event) => {
                            const selected = registeredChannelPartners.find((user) => String(user.id) === event.target.value);
                            setBookingForm((current) => ({
                              ...current,
                              channelPartnerId: event.target.value,
                              channelPartner: selected ? getUserName(selected) : "",
                            }));
                          }}
                          disabled={!["channel_partner", "Channel Partner"].includes(bookingForm.source)}
                        >
                          <option value="">Select Channel Partner</option>
                          {registeredChannelPartners.map((user) => (
                            <option key={user.id} value={user.id}>{getUserName(user)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>
                </div>
              )}

            </UserBookingForm>
          </div>
        </div>
      </>
    </>
  );
};

export default UserPreview;
