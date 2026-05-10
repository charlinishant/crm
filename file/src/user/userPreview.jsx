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
  projectId: "",
  unit: "",
  unitId: "",
  customerName: "",
  stage: "Tentative",
  projectDetails: "",
  bookedOn: "",
  saleableArea: "",
  basePrice: "",
  baseRate: "",
  bookingCancellationReason: "",
  bookingCancellationNote: "",
  campaign: "walkin",
  source: "",
  channelPartner: "",
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
  { value: "Booked", label: "Booked" },
  { value: "Fresh_Lead", label: "Fresh Lead" },
  { value: "Lost", label: "Lost" },
  { value: "NP", label: "NP" },
  { value: "Prospect", label: "Prospect" },
  { value: "Registered", label: "Registered" },
  { value: "Unqualified", label: "Unqualified" },
];

const bookingSteps = [
  "Filter Project",
  "Select A Unit",
  "Quotation",
  "Booking Confirmation",
];

const defaultBookingFilters = {
  propertyPurpose: "",
  unitType: "",
  propertyType: "",
};

const toCleanNumber = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(number) ? 0 : number;
};

const calculateCostNewValue = (row) => {
  const original = toCleanNumber(row.originalValue);
  const input = toCleanNumber(row.inputField);

  return row.costType === "AdHoc Cost" ? original + input : Math.max(original - input, 0);
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;

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

const UserPreview = () => {
  const navigate = useNavigate();
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
        "Booked"
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
    setSelectedStatus(normalizeStatus(getLeadValue(lead, ["status", "lead_status", "stage"], "Booked")));
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
        (group.unitList || []).map((unit) => ({
          ...unit,
          groupId: group.id,
          project: group.project,
          tower: group.tower,
          floorPlan: group.floor,
          category: group.category,
          type: group.type,
          bedrooms: group.bedrooms,
          bathrooms: group.bathrooms,
          carpet: group.carpet,
          saleable: group.saleable,
        }))
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
  const selectedBookingUnit = flattenedBookingUnits.find(
    (unit) =>
      unit.name === bookingForm.unit ||
      String(unit.id) === String(bookingForm.unit) ||
      String(unit.groupId) === String(bookingForm.unitId)
  );
  const visibleBookingUnits = useMemo(() => {
    return flattenedBookingUnits.filter((unit) => {
      const towerMatches =
        !selectedBookingTowerId ||
        String(unit.tower?.id || unit.tower?.name || "") === String(selectedBookingTowerId);
      const purposeMatches =
        !bookingFilters.propertyPurpose ||
        !unit.propertyPurpose ||
        unit.propertyPurpose.toLowerCase() === bookingFilters.propertyPurpose.toLowerCase();
      const unitTypeMatches =
        !bookingFilters.unitType ||
        !unit.type ||
        unit.type.toLowerCase() === bookingFilters.unitType.toLowerCase();
      const propertyTypeMatches =
        !bookingFilters.propertyType ||
        !unit.category ||
        unit.category.toLowerCase() === bookingFilters.propertyType.toLowerCase();

      return towerMatches && purposeMatches && unitTypeMatches && propertyTypeMatches;
    });
  }, [bookingFilters, flattenedBookingUnits, selectedBookingTowerId]);
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
    setBookingForm((prev) => ({ ...prev, [name]: value }));
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
    }));
  };

  const handleBookingFilterChange = (filterKey, value) => {
    setBookingFilters((prev) => ({ ...prev, [filterKey]: value }));
    setBookingForm((prev) => ({ ...prev, unit: "", unitId: "" }));
  };

  const handleClearBookingFilters = () => {
    setBookingFilters(defaultBookingFilters);
    setSelectedBookingTowerId("");
    setBookingForm((prev) => ({ ...prev, unit: "", unitId: "" }));
  };

  const handleBookingTowerChange = (event) => {
    setSelectedBookingTowerId(event.target.value);
    setBookingForm((prev) => ({ ...prev, unit: "", unitId: "" }));
  };

  const handleBookingUnitSelect = (unit) => {
    const unitName = unit.name || `Unit ${unit.unitIndex || unit.id}`;

    setBookingProjectMessage("");
    setEditableCostRows([]);
    setEditablePaymentRows([]);
    setBookingForm((prev) => ({
      ...prev,
      unit: unitName,
      unitId: unit.groupId || "",
      basePrice: unit.basePrice || "",
      baseRate: unit.baseRate || "",
      saleableArea: unit.saleable || prev.saleableArea,
      carpetArea: unit.carpet || prev.carpetArea,
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

      const unitsResponse = await fetch(`${API_URL}/unit?limit=100`);
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

  const handleOpenBookingForm = (message = "") => {
    setBookingForm({
      ...emptyBookingForm,
      customerName: leadName,
      projectDetails: projectName,
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
    setBookingStepIndex(0);
    setIsBookingFormOpen(true);
  };

  const handleCloseBookingForm = () => {
    setIsBookingFormOpen(false);
    setBookingStepIndex(0);
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
    setBookingStepIndex(0);
    setBookingFilters(defaultBookingFilters);
    setSelectedBookingTowerId("");
    setQuotationTab("unit");
    setQuotationScheme("default");
    setQuotationPaymentPlan("80-20");
    setEditableCostRows([]);
    setEditablePaymentRows([]);
    setBookingUnitView("listing");
    setShouldCheckAvailability(true);
    setIsBookingFormOpen(true);
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

  const formatBookingDetail = (value, fallback = "-") => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "object") {
      return value.name || value.title || value.label || value.value || fallback;
    }
    return value;
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
    formatBookingDetail(selectedBookingUnit?.saleable, "") || bookingForm.saleableArea || "1,500 sq_ft";
  const quotationBaseRate =
    bookingForm.baseRate || selectedBookingUnit?.baseRate || "7.8K (7,750)";
  const quotationName = `${quotationProjectName} - ${quotationTowerName} - ${quotationUnitName}`;
  const baseAgreementValue =
    toCleanNumber(bookingForm.basePrice || selectedBookingUnit?.basePrice) ||
    toCleanNumber(selectedBookingUnit?.saleable) * toCleanNumber(selectedBookingUnit?.baseRate);
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
    ["Status", formatBookingDetail(selectedBookingUnit?.status, "Available")],
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
      setEditableCostRows(defaultQuotationCostRows);
      setEditablePaymentRows([
        { name: "Agreement", towerMilestone: "Agreement", value: 80, taxes: 0, tds: 0 },
        { name: "Possession", towerMilestone: "Possession", value: 20, taxes: 0, tds: 0 },
      ]);
      setBookingStepIndex(2);
      return;
    }

    if (bookingStepIndex === 2) {
      setBookingMessage("");
      setBookingForm((prev) => ({
        ...prev,
        bookedOn: prev.bookedOn || bookingConfirmationDate,
        basePrice: prev.basePrice || quotationAgreementValue || "",
        saleableArea: prev.saleableArea || selectedBookingUnit?.saleable || "",
        baseRate: prev.baseRate || selectedBookingUnit?.baseRate || "",
      }));
      setBookingStepIndex(3);
      return;
    }

    setIsSavingBooking(true);
    setBookingMessage("");

    try {
      const costSheet = quotationLineRows.map((row) => ({
        fieldName: row.name,
        orignalValue: toCleanNumber(row.originalValue),
        costType: row.costType || "Discount",
        inputField: toCleanNumber(row.inputField),
        newValue: toCleanNumber(row.newValue),
      }));
      const paymentSchedule = calculatedPaymentRows.map((row) => ({
        name: row.name || quotationPaymentPlan,
        towerMilestone: row.towerMilestone || quotationTowerName,
        value: toCleanNumber(row.value),
        amount: toCleanNumber(row.amount),
        taxes: toCleanNumber(row.taxes),
        tds: toCleanNumber(row.tds),
        grandTotal: toCleanNumber(row.grandTotal),
      }));
      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...bookingForm,
          leadId: Number(leadId),
          unitId: bookingForm.unitId ? Number(bookingForm.unitId) : undefined,
          source: bookingForm.source || leadSource,
          bookedBy: owner,
          bookedOn: bookingForm.bookedOn || bookingConfirmationDate,
          costSheet,
          paymentSchedule,
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
      setBookings((current) => [savedBooking, ...current]);
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
    <>
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
}

.lead-preview-booking-form label {
  display: contents;
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
  font-weight: 400;
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
  padding: 28px 64px 20px;
  border-bottom: 1px solid #cbd5e1;
}

.booking-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #4c2eca;
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
  background: #673ab7;
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
  background: #673ab7;
  border-color: #673ab7;
  color: #ffffff;
}

.booking-modal-main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(320px, 1fr) 72px minmax(320px, 1fr);
  align-items: stretch;
  gap: 24px;
  padding: 28px 64px 18px;
  overflow-y: auto;
}

.booking-choice {
  min-height: 430px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: flex-start;
}

.booking-illustration {
  width: min(100%, 380px);
  height: 230px;
  margin: 0 auto 16px;
  position: relative;
  overflow: visible;
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
  margin: 0 0 8px;
  color: #17202a;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
}

.booking-choice-copy {
  margin: 0;
  max-width: 560px;
  color: #17202a;
  font-size: 17px;
  line-height: 1.45;
}

.booking-divider {
  align-self: center;
  color: #17202a;
  font-size: 18px;
  font-weight: 500;
  padding-top: 236px;
}

.booking-choice-field {
  width: min(100%, 560px);
  margin-top: 22px;
  text-align: left;
}

.booking-choice-field label {
  display: block;
  margin-bottom: 8px;
  color: #59616b;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.booking-choice-field > span {
  display: block;
  margin-bottom: 10px;
  color: #59616b;
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
}

.booking-choice-field input,
.booking-choice-field select {
  width: 100%;
  min-height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1e293b;
  font-size: 15px;
  padding: 0 12px;
  background: #ffffff;
}

.booking-choice-note {
  color: #334155;
  font-size: 14px;
  margin-top: 8px;
}

.booking-choice-note span {
  color: #5d32c8;
}

.booking-modal-footer {
  min-height: 58px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
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
  gap: 14px;
}

.booking-modal-footer.is-project-step {
  justify-content: flex-end;
}

.lead-preview-booking-save,
.lead-preview-booking-cancel {
  min-width: 74px;
  min-height: 38px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  padding: 0 18px;
  transition: all 0.2s ease;
}

.lead-preview-booking-save {
  background: #673ab7;
  border: 1px solid #673ab7;
  color: #ffffff;
}

.lead-preview-booking-save:hover:not(:disabled) {
  background: #562aa7;
}

.lead-preview-booking-save:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lead-preview-booking-cancel {
  background: #ffffff;
  border: 1px solid #673ab7;
  color: #111827;
}

.lead-preview-booking-cancel:hover {
  background: #f8f5ff;
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
  grid-template-columns: 340px minmax(0, 1fr) 320px;
  gap: 0;
  padding: 14px 14px 10px;
  overflow-y: auto;
}

.booking-unit-filters,
.booking-unit-selection,
.booking-unit-gallery {
  min-height: 360px;
  padding: 10px 16px;
}

.booking-unit-filters,
.booking-unit-selection {
  border-right: 1px solid #d7d7d7;
}

.booking-unit-filter-head,
.booking-unit-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.booking-unit-filter-head h3,
.booking-unit-selection h3,
.booking-unit-gallery h3 {
  margin: 0;
  color: #343434;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.25;
}

.booking-clear-filter,
.booking-change-tower {
  border: 0;
  background: transparent;
  color: #673ab7;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
}

.booking-tower-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #673ab7;
  font-size: 13px;
  font-weight: 500;
}

.booking-tower-select span {
  text-decoration: underline;
}

.booking-tower-select select {
  min-height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #4b5563;
  font-size: 13px;
  padding: 0 10px;
}

.booking-filter-block {
  border-top: 1px solid #dddddd;
  padding: 14px 0 12px;
}

.booking-filter-block:first-of-type {
  margin-top: 18px;
}

.booking-filter-label {
  margin-bottom: 10px;
  color: #3f3f46;
  font-size: 15px;
  font-weight: 700;
}

.booking-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.booking-filter-pill {
  min-height: 38px;
  border: 1px solid #d1d1d1;
  border-radius: 999px;
  background: #ffffff;
  color: #666666;
  cursor: pointer;
  font-size: 14px;
  padding: 0 16px;
}

.booking-filter-pill.is-selected {
  border-color: #673ab7;
  background: #673ab7;
  color: #ffffff;
}

.booking-unit-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.booking-radio,
.booking-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #666666;
  font-size: 15px;
}

.booking-radio input,
.booking-checkbox input {
  width: 17px;
  height: 17px;
  accent-color: #673ab7;
}

.booking-tower-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.booking-tower-name {
  color: #43a047;
  font-size: 15px;
  font-weight: 500;
  text-transform: uppercase;
}

.booking-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 48px;
}

.booking-unit-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: -28px auto 14px;
  width: min(100%, 520px);
}

.booking-unit-results.is-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.booking-unit-option {
  border: 1px solid #d7d7d7;
  border-radius: 6px;
  background: #ffffff;
  color: #344054;
  cursor: pointer;
  min-height: 40px;
  padding: 6px 10px;
  text-align: left;
}

.booking-unit-option.is-selected {
  border-color: #673ab7;
  box-shadow: 0 0 0 1px #673ab7;
  background: #fbf9ff;
}

.booking-unit-option strong,
.booking-unit-option span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-unit-option span {
  color: #667085;
  font-size: 12px;
  margin-top: 2px;
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
  width: 238px;
  height: 270px;
  margin: 10px auto 0;
  border: 1px solid #d4d4d4;
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
  width: 238px;
  margin: 10px auto 0;
}

.booking-project-summary {
  width: 238px;
  margin: 8px auto 0;
  color: #475467;
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.booking-project-summary strong {
  color: #343434;
}

.booking-unit-empty-state {
  width: min(100%, 520px);
  margin: -28px auto 14px;
  border: 1px dashed #d0d5dd;
  border-radius: 6px;
  color: #667085;
  padding: 12px;
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
  gap: 28px 32px;
  padding: 20px 22px 16px;
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
  min-height: 41px;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  background: #ffffff;
  color: #666666;
  font-size: 14px;
  padding: 0 12px;
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
  gap: 32px;
  padding: 16px 22px 24px;
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
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  color: #666666;
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
  border-radius: 4px;
  color: #555555;
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
  font-size: 14px;
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
  gap: 16px 28px;
  padding: 10px 14px 28px;
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
  min-height: 41px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  color: #4b5563;
  font-size: 14px;
  padding: 0 12px;
}

.booking-applicant-grid,
.booking-cost-summary,
.booking-custom-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px 34px;
  padding: 14px 14px 20px;
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
  gap: 14px;
  padding: 26px 14px 30px;
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
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 24px 18px;
  }

  .booking-unit-main {
    grid-template-columns: 1fr;
    overflow-y: visible;
    padding: 18px;
  }

  .booking-unit-filters,
  .booking-unit-selection {
    border-right: 0;
    border-bottom: 1px solid #d7d7d7;
  }

  .booking-unit-filters,
  .booking-unit-selection,
  .booking-unit-gallery {
    min-height: auto;
    padding: 18px 0;
  }

  .booking-unit-toolbar,
  .booking-unit-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .booking-legend {
    margin-bottom: 28px;
  }

  .booking-unit-results {
    grid-template-columns: 1fr;
    margin: 0 auto 24px;
  }

  .booking-unit-results.is-grid {
    grid-template-columns: 1fr;
  }

  .booking-unit-empty-state {
    margin: 0 auto 24px;
  }

  .booking-choice {
    min-height: auto;
  }

  .booking-illustration {
    height: 220px;
    transform: scale(0.86);
    transform-origin: center top;
    margin-bottom: -24px;
  }

  .booking-divider {
    padding-top: 0;
  }

  .booking-choice-title {
    font-size: 22px;
  }

  .booking-choice-copy {
    font-size: 17px;
  }

  .booking-choice-field {
    margin-top: 22px;
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

            {isBookingFormOpen && (
              <div className="booking-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
                <form className="booking-modal lead-preview-booking-form" onSubmit={handleSaveBooking}>
                  <div className="booking-modal-header">
                    <h2 className="booking-modal-title" id="booking-modal-title">Booking Details</h2>
                    <button
                      type="button"
                      className="booking-modal-close"
                      onClick={handleCloseBookingForm}
                      aria-label="Close booking details"
                    >
                      <FaTimes />
                    </button>
                  </div>

                  <div className="booking-modal-stepper" aria-label="Booking progress">
                    {bookingSteps.map((step, index) => (
                      <div
                        className={`booking-step${index < bookingStepIndex ? " is-complete" : ""}${index === bookingStepIndex ? " is-active" : ""}`}
                        key={step}
                      >
                        <span className="booking-step-number">{String(index + 1).padStart(2, "0")}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  {bookingMessage && (
                    <div className="booking-modal-alert">{bookingMessage}</div>
                  )}
                  {bookingStepIndex === 1 && bookingProjectMessage && (
                    <div className="booking-modal-alert">{bookingProjectMessage}</div>
                  )}

                  {bookingStepIndex === 0 ? (
                    <div className="booking-modal-main">
                      <section className="booking-choice">
                        <div className="booking-illustration booking-illustration-city" aria-hidden="true">
                          <span className="booking-building" />
                          <span className="booking-house" />
                          <span className="booking-person-search" />
                          <span className="booking-magnifier" />
                        </div>
                        <h3 className="booking-choice-title">Select Project For Booking</h3>
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
                          <div className="booking-choice-note">
                            You are taking a booking for <span>{leadName}</span>
                          </div>
                        </div>
                      </section>

                      <div className="booking-divider">OR</div>

                      <section className="booking-choice">
                        <div className="booking-illustration booking-illustration-phone" aria-hidden="true">
                          <span className="booking-phone">
                            <span className="booking-phone-house" />
                            <span className="booking-phone-button" />
                          </span>
                          <span className="booking-person-unit" />
                        </div>
                        <h3 className="booking-choice-title">Quick Unit Selection</h3>
                        <p className="booking-choice-copy">Know your unit? Select it here and proceed to book directly.</p>
                        <div className="booking-choice-field">
                          <label htmlFor="booking-unit-quick">Select Unit</label>
                          <input
                            id="booking-unit-quick"
                            name="unit"
                            value={bookingForm.unit}
                            onChange={handleBookingChange}
                            placeholder="Enter unit"
                          />
                        </div>
                      </section>
                    </div>
                  ) : bookingStepIndex === 1 ? (
                    <div className="booking-unit-main">
                      <aside className="booking-unit-filters">
                        <div className="booking-unit-filter-head">
                          <h3>Filters By</h3>
                          <button type="button" className="booking-clear-filter" onClick={handleClearBookingFilters}>
                            Clear Filters
                          </button>
                        </div>

                        {[
                          ["propertyPurpose", "Property purpose", ["Sale", "Resale", "Rental"]],
                          ["unitType", "Unit type", ["Residential", "Commercial", "Plot"]],
                          ["propertyType", "Property type", ["Villa", "Bungalow", "Apartment"]],
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
                        <div className="booking-unit-toolbar">
                          <label className="booking-radio">
                            <input
                              type="radio"
                              name="unitView"
                              checked={bookingUnitView === "grid"}
                              onChange={() => setBookingUnitView("grid")}
                            />
                            <span>Grid Layout</span>
                          </label>
                          <label className="booking-radio">
                            <input
                              type="radio"
                              name="unitView"
                              checked={bookingUnitView === "listing"}
                              onChange={() => setBookingUnitView("listing")}
                            />
                            <span>Listing View</span>
                          </label>
                        </div>

                        <div className="booking-unit-topbar">
                          <h3>Select Unit</h3>
                          <label className="booking-tower-select">
                            <span>Change Tower/Cluster</span>
                            <select value={selectedBookingTowerId} onChange={handleBookingTowerChange}>
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

                        <div className="booking-legend">
                          <span className="booking-legend-item"><span className="booking-swatch filtered" />Filtered and Available</span>
                          <span className="booking-legend-item"><span className="booking-swatch interested" />Interested</span>
                          <span className="booking-legend-item"><span className="booking-swatch" />Selected</span>
                          <span className="booking-legend-item"><strong>N/A</strong> Unavailable</span>
                        </div>

                        {visibleBookingUnits.length > 0 ? (
                          <div className={`booking-unit-results${bookingUnitView === "grid" ? " is-grid" : ""}`}>
                            {visibleBookingUnits.map((unit) => (
                              <button
                                type="button"
                                className={`booking-unit-option${bookingForm.unit === unit.name ? " is-selected" : ""}`}
                                key={`${unit.groupId}-${unit.id}`}
                                onClick={() => handleBookingUnitSelect(unit)}
                              >
                                <strong>{unit.name || `Unit ${unit.unitIndex || unit.id}`}</strong>
                                <span>Floor: {unit.floor || unit.floorPlan?.name || "-"} | Carpet Area: {unit.carpet || "-"} Sq. Ft.</span>
                                <span>Saleable Area: {unit.saleable || "-"} Sq. Ft. | Rs. {Number(unit.basePrice || 0).toLocaleString("en-IN")}</span>
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
                        <h3>Gallery and Unit Details</h3>
                        <div className="booking-gallery-map" aria-hidden="true" />
                        <label className="booking-choice-field" htmlFor="booking-unit-final">
                          <span>Select Unit</span>
                          {visibleBookingUnits.length > 0 ? (
                            <select
                              id="booking-unit-final"
                              name="unit"
                              value={bookingForm.unit}
                              onChange={(event) => {
                                const unit = visibleBookingUnits.find((item) => item.name === event.target.value);
                                if (unit) handleBookingUnitSelect(unit);
                                else setBookingForm((prev) => ({ ...prev, unit: "", unitId: "" }));
                              }}
                              required
                            >
                              <option value="">Select Unit</option>
                              {visibleBookingUnits.map((unit) => (
                                <option key={`${unit.groupId}-select-${unit.id}`} value={unit.name}>
                                  {unit.name || `Unit ${unit.unitIndex || unit.id}`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                            id="booking-unit-final"
                            name="unit"
                            value={bookingForm.unit}
                            onChange={handleBookingChange}
                            placeholder="Enter unit"
                            required
                            />
                          )}
                        </label>
                        <div className="booking-project-summary">
                          <strong>{bookingProjectDetails?.name || bookingForm.projectDetails || "Project details"}</strong>
                          <span>{bookingProjectDetails?.projectType || "Residential"} · {visibleBookingUnits.length} of {flattenedBookingUnits.length} units shown</span>
                          {selectedBookingUnit && (
                            <>
                              <span>{selectedBookingUnit.tower?.name || activeTowerName} | Floor {selectedBookingUnit.floor || quotationFloor}</span>
                              <span>Carpet {selectedBookingUnit.carpet || "-"} Sq. Ft. | Saleable {selectedBookingUnit.saleable || "-"} Sq. Ft.</span>
                              <span>Base price Rs. {Number(selectedBookingUnit.basePrice || 0).toLocaleString("en-IN")}</span>
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
                          <strong>{formatBookingDetail(selectedBookingUnit?.bedrooms, "3")}</strong>
                          <span>Base Rate</span>
                          <strong>Rs. {quotationBaseRate}</strong>
                          <span>Agreement Value</span>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong>{formatBookingDetail(selectedBookingUnit?.status, "Available")}</strong>
                          <span>Bathrooms</span>
                          <strong>{formatBookingDetail(selectedBookingUnit?.bathrooms, "2")}</strong>
                          <span>Floor Rise</span>
                        </div>
                        <div>
                          <span>Floor</span>
                          <strong>{quotationFloor}</strong>
                          <span>Carpet</span>
                          <strong>{formatBookingDetail(selectedBookingUnit?.carpet, "967")}</strong>
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
                        <h3>Cost Sheet</h3>
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
                          <h3>Payment Schedule</h3>
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
                      <h3 className="booking-confirmation-title">Booking Confirmation</h3>

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
                        <button type="button" className="booking-add-coapplicant">+ Add New Co-Applicant</button>
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
                              <option value="Hold">Hold</option>
                            </select>
                          </label>
                          <label className="booking-confirmation-input">
                            <span>Select Project Unit Status *</span>
                            <select defaultValue="Booked">
                              <option>Booked</option>
                              <option>Hold</option>
                              <option>Available</option>
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
                              <option value="walkin">walkin</option>
                              <option value="channel_partner">channel_partner</option>
                              <option value="digital">digital</option>
                            </select>
                          </label>
                          <label className="booking-confirmation-input booking-confirmation-wide">
                            <span>Channel Partner</span>
                            <select name="channelPartner" value={bookingForm.channelPartner} onChange={handleBookingChange}>
                              <option value="">Select Channel Partner</option>
                              <option value={cpName}>{cpName}</option>
                            </select>
                          </label>
                        </div>
                      </section>

                      <section className="booking-confirmation-card">
                        <div className="booking-confirmation-card-head">Custom Fields</div>
                        <div className="booking-custom-grid">
                          {[
                            ["companyName", "Company Name", "select"],
                            ["numberOfSeats", "Number Of Seats"],
                            ["physicalSeats", "Physical Seats"],
                            ["carpetArea", "Carpet Area"],
                            ["tenureMonths", "Tenure In Months"],
                            ["perSeatPrice", "Per Seat Price"],
                            ["monthlyRevenue", "Monthly Revenue"],
                            ["noticePeriodMonths", "Notice Period In Months"],
                            ["lockInPeriod", "Lock In Period"],
                            ["securityDeposit", "Security Deposit"],
                            ["leaseStartDate", "Lease Start Date", "date"],
                            ["leaseEndDate", "Lease End Date", "date"],
                          ].map(([name, label, type]) => (
                            <label className="booking-confirmation-input" key={name}>
                              <span>{label}</span>
                              {type === "select" ? (
                                <select name={name} value={bookingForm[name]} onChange={handleBookingChange}>
                                  <option value="">select</option>
                                  <option value={lead.companyName || "Company"}>{lead.companyName || "Company"}</option>
                                </select>
                              ) : (
                                <input name={name} type={type || "text"} value={bookingForm[name]} onChange={handleBookingChange} />
                              )}
                            </label>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}

                  <input name="customerName" type="hidden" value={bookingForm.customerName} readOnly />
                  <input name="stage" type="hidden" value={bookingForm.stage} readOnly />
                  <input name="bookedOn" type="hidden" value={bookingForm.bookedOn} readOnly />
                  <input name="saleableArea" type="hidden" value={bookingForm.saleableArea} readOnly />
                  <input name="basePrice" type="hidden" value={bookingForm.basePrice} readOnly />
                  <input name="baseRate" type="hidden" value={bookingForm.baseRate} readOnly />

                  <div className={`booking-modal-footer${bookingStepIndex === 0 ? " is-project-step" : ""}`}>
                    {bookingStepIndex > 0 && (
                      <div className="booking-modal-footer-note">
                        You are taking a booking for <span>{leadName}</span>
                      </div>
                    )}
                    <div className="booking-modal-footer-actions">
                      <button
                        type="button"
                        className="lead-preview-booking-cancel"
                        onClick={bookingStepIndex === 0 ? handleCloseBookingForm : () => setBookingStepIndex((current) => Math.max(0, current - 1))}
                      >
                        {bookingStepIndex === 0 ? "Cancel" : "Previous"}
                      </button>
                      {bookingStepIndex === 1 && (
                        <button
                          type="button"
                          className="lead-preview-booking-cancel"
                          onClick={() =>
                            setBookingProjectMessage(
                              bookingForm.unit
                                ? `${bookingForm.unit} marked as interested.`
                                : "Select a unit before marking interest."
                            )
                          }
                        >
                          Mark as Interested
                        </button>
                      )}
                      <button
                        type="submit"
                        className="lead-preview-booking-save"
                        disabled={
                          isSavingBooking ||
                          isLoadingBookingProject ||
                          (bookingStepIndex === 0 && !bookingProjectSelectValue) ||
                          (bookingStepIndex > 0 && !bookingForm.unit)
                        }
                      >
                        {isSavingBooking
                          ? "Saving..."
                          : isLoadingBookingProject
                            ? "Loading..."
                            : bookingStepIndex === 0
                              ? "Next"
                              : bookingStepIndex === 1
                                ? "Select Unit"
                                : bookingStepIndex === 2
                                  ? "Next"
                                  : "Confirm Booking"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </>
    </>
  );
};

export default UserPreview;
