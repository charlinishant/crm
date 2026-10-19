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

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

const bookingSourceOptions = [
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
  "Bulk Marketing",
  "Referral",
];

const normalizeBookingSource = (value) => {
  const source = String(value || "").trim();
  if (!source) return "Direct";
  if (source.toLowerCase() === "channel_partner") return "Channel Partner";
  return source;
};

const isChannelPartnerSource = (value) => normalizeBookingSource(value) === "Channel Partner";

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

const parseBhkNumber = (text) => {
  if (!text) return "";
  const str = String(text).trim();
  const match = str.match(/(\d+(\.\d+)?)\s*(bhk|bed|bedroom|rk)/i);
  if (match) return match[1];
  const numberMatch = str.match(/^(\d+)\s*bhk$/i);
  if (numberMatch) return numberMatch[1];
  const wordMatch = str.match(/\b(one|two|three|four|five|six)\s*(bhk|bed|bedroom)/i);
  if (wordMatch) {
    const map = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6" };
    return map[wordMatch[1].toLowerCase()] || "";
  }
  const standaloneMatch = str.match(/\b(\d+)\s*b\b/i);
  if (standaloneMatch) return standaloneMatch[1];
  return "";
};

const parseBathroomNumber = (text) => {
  if (!text) return "";
  const str = String(text).trim();
  const match = str.match(/(\d+(\.\d+)?)\s*(t|bath|bathroom|washroom|toilet)s?\b/i);
  if (match) return match[1];
  const wordMatch = str.match(/\b(one|two|three|four|five|six)\s*(t|bath|bathroom|washroom|toilet)s?\b/i);
  if (wordMatch) {
    const map = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6" };
    return map[wordMatch[1].toLowerCase()] || "";
  }
  return "";
};

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
        const response = await fetch(`${API_URL}/users?limit=1000`, {
          headers: { ...getAuthHeaders() },
        });
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
        const response = await fetch(`${API_URL}/leads/`, {
          headers: { ...getAuthHeaders() },
        });
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
          const rawBedrooms = unit.bedrooms ?? floorPlan.bedrooms ?? group.bedrooms;
          const parsedBedrooms = parseBhkNumber(
            unit.configurationLabel ||
            floorPlan.configurationLabel ||
            group.configurationLabel ||
            floorPlan.name ||
            group.name ||
            unit.name ||
            unit.type ||
            floorPlan.type ||
            group.type ||
            unit.description ||
            group.description
          );
          const resolvedBedrooms = (rawBedrooms !== null && rawBedrooms !== undefined && rawBedrooms !== "" && rawBedrooms !== "-")
            ? String(rawBedrooms)
            : (parsedBedrooms ? String(parsedBedrooms) : "-");

          const rawBathrooms = unit.bathrooms ?? floorPlan.bathrooms ?? group.bathrooms;
          const parsedBathrooms = parseBathroomNumber(
            unit.configurationLabel ||
            floorPlan.configurationLabel ||
            group.configurationLabel ||
            floorPlan.name ||
            group.name ||
            unit.description ||
            group.description
          );
          const resolvedBathrooms = (rawBathrooms !== null && rawBathrooms !== undefined && rawBathrooms !== "" && rawBathrooms !== "-")
            ? String(rawBathrooms)
            : (parsedBathrooms ? String(parsedBathrooms) : (resolvedBedrooms !== "-" ? String(resolvedBedrooms) : "-"));

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
            bedrooms: resolvedBedrooms,
            bathrooms: resolvedBathrooms,
            carpet: floorPlan.carpet ?? unit.carpet ?? "-",
            builtupArea: floorPlan.builtupArea ?? unit.builtupArea ?? "",
            saleable: floorPlan.saleable ?? unit.saleable ?? "-",
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
        const response = await fetch(`${API_URL}/bookings?leadId=${leadId}&limit=20`, {
          headers: { ...getAuthHeaders() },
        });
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
        const response = await fetch(`${API_URL}/projects/list`, {
          headers: { ...getAuthHeaders() },
        });
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
          ...getAuthHeaders(),
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
          ...getAuthHeaders(),
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
    const nextValue = name === "source" ? normalizeBookingSource(value) : value;
    setBookingForm((prev) => ({
      ...prev,
      [name]: nextValue,
      ...(name === "source" && !isChannelPartnerSource(nextValue)
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
        try {
          const projectResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            headers: { ...getAuthHeaders() },
          });
          if (projectResponse.ok) {
            selectedProjectDetails = await projectResponse.json();
            setBookingProjectDetails(selectedProjectDetails);
          }
        } catch (projErr) {
          console.warn("Unable to load project by ID:", projErr);
        }
      }

      try {
        const unitsResponse = await fetch(`${API_URL}/unit?limit=1000`, {
          headers: { ...getAuthHeaders() },
        });
        if (unitsResponse.ok) {
          const unitsResult = await unitsResponse.json();
          const unitGroups = Array.isArray(unitsResult) ? unitsResult : unitsResult?.data || [];
          const filteredUnits = unitGroups.filter((group) => {
            if (projectId) return String(group.project?.id) === String(projectId);
            return group.project?.name?.toLowerCase() === (bookingForm.projectDetails || "").toLowerCase();
          });

          setBookingProjectUnits(filteredUnits);
          const firstTower = filteredUnits.find((group) => group.tower?.id || group.tower?.name)?.tower;
          setSelectedBookingTowerId(firstTower ? String(firstTower.id || firstTower.name) : "");
        }
      } catch (unitErr) {
        console.warn("Unable to load units from backend, using catalog fallback:", unitErr);
      }

      if (selectedProjectDetails?.name) {
        setBookingForm((prev) => ({
          ...prev,
          projectId: projectId || prev.projectId,
          projectDetails: selectedProjectDetails.name,
        }));
      }

      return true;
    } catch (error) {
      console.error("Unable to load selected project details:", error);
      return true;
    } finally {
      setIsLoadingBookingProject(false);
    }
  };

  useEffect(() => {
    if (!isBookingFormOpen || bookingStepIndex !== 0 || (!bookingForm.projectId && !bookingForm.projectDetails)) return undefined;

    let isMounted = true;

    const fetchAdminCreatedUnits = async () => {
      try {
        const unitsResponse = await fetch(`${API_URL}/unit?limit=1000`, {
          headers: { ...getAuthHeaders() },
        });
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
      const selectedChannelPartnerId =
        bookingForm.channelPartnerId ||
        registeredChannelPartners.find((user) => getUserName(user) === bookingForm.channelPartner)?.id ||
        "";
      const rawParking = Number(bookingForm.parkingCharges || bookingForm.parkingAmount || 0);
      const isParkingRequired = rawParking > 0 || bookingForm.parkingRequired === "Yes";
      const normalizedSource = normalizeBookingSource(bookingForm.source || leadSource);
      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...bookingForm,
          parkingRequired: isParkingRequired ? "Yes" : "No",
          carParkingSlots: isParkingRequired ? (bookingForm.carParkingSlots || "1") : "",
          parkingType: isParkingRequired ? (bookingForm.parkingType || "Covered") : "",
          parkingCharges: String(rawParking),
          parkingAmount: String(rawParking),
          soldPrice: Number(bookingForm.totalPrice || quotationAgreementValue || 0),
          stage: "Booked",
          leadId: Number(leadId),
          unitId: bookingForm.unitId ? Number(bookingForm.unitId) : undefined,
          unitItemId: bookingForm.unitItemId ? Number(bookingForm.unitItemId) : undefined,
          idempotencyKey: bookingForm.idempotencyKey || `booking-${leadId}-${bookingForm.unitItemId || Date.now()}`,
          source: normalizedSource,
          channelPartnerId: isChannelPartnerSource(normalizedSource) ? selectedChannelPartnerId : "",
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
            soldPrice: bookingForm.totalPrice || quotationAgreementValue,
            totalPrice: bookingForm.totalPrice || quotationAgreementValue,
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
              onFieldChange={handleBookingChange}
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
                        <select name="source" value={normalizeBookingSource(bookingForm.source)} onChange={handleBookingChange}>
                          {bookingSourceOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
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
                          disabled={!isChannelPartnerSource(bookingForm.source)}
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
