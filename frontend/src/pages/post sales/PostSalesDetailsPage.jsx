import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5000");
const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("authToken")}`, "Content-Type": "application/json" });

const fmt = (v) => v !== undefined && v !== null && v !== "" ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
const fmtDate = (v) => { if (!v) return "—"; return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const fmtDateTime = (v) => { if (!v) return "—"; return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const fmtTime = (v) => { if (!v) return "—"; return new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); };

const getCustomerName = (b) =>
  b?.customerName ||
  (b?.lead?.firstName && b?.lead?.lastName ? `${b.lead.firstName} ${b.lead.lastName}` : null) ||
  b?.lead?.firstName || "Customer";

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!["[", "{"].includes(trimmed.charAt(0))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const numberToWords = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return "Rupees Zero Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatSmall = (val) => {
    let str = "";
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + (val % 10 ? " " + a[val % 10] : "");
    } else if (val > 0) {
      str += a[val];
    }
    return str.trim();
  };

  let crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem %= 100000;
  let thousand = Math.floor(rem / 1000);
  rem %= 1000;
  let hundred = rem;

  let res = [];
  if (crore) res.push(formatSmall(crore) + " Crore");
  if (lakh) res.push(formatSmall(lakh) + " Lakh");
  if (thousand) res.push(formatSmall(thousand) + " Thousand");
  if (hundred) res.push(formatSmall(hundred));

  return `Rupees ${res.join(" ")} Only`;
};

const getContactValue = (value, keys) => {
  const parsed = parseMaybeJson(value);
  if (parsed === undefined || parsed === null || parsed === "") return "";
  if (typeof parsed === "string" || typeof parsed === "number") return String(parsed);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => getContactValue(item, keys)).filter(Boolean).join(", ");
  }
  if (typeof parsed === "object") {
    for (const key of keys) {
      const nested = getContactValue(parsed[key], keys);
      if (nested) return nested;
    }
    return Object.values(parsed).map((item) => getContactValue(item, keys)).filter(Boolean).join(", ");
  }
  return "";
};

const getPhone = (lead) => {
  return getContactValue(lead?.phones || lead?.phone || lead?.mobile || lead?.mobileNumber, [
    "number",
    "phone",
    "mobile",
    "mobileNumber",
    "value",
    "label",
  ]) || "-";
};
const getEmail = (lead) => {
  return getContactValue(lead?.emails || lead?.email || lead?.emailAddress, [
    "email",
    "emailAddress",
    "value",
    "label",
  ]) || "-";
};

const getBrandedDocumentHtml = (html = "") => {
  const logoUrl = `${window.location.origin}/assets/images/logo.png`;
  return String(html)
    .replace(
      /<div class="brand-name">Insite<span>Arc<\/span><\/div>/g,
      `<img class="brand-logo" src="${logoUrl}" alt="SWAMI" />`
    )
    .replace(
      /<\/style>/,
      `.brand-logo{display:block;height:auto;max-height:92px;object-fit:contain;width:92px;}</style>`
    )
    .replace(/src="\/assets\/images\/logo\.png"/g, `src="${logoUrl}"`)
    .replace(/Insite Arc Developers Pvt\. Ltd\./g, "SWAMI Developers Pvt. Ltd.")
    .replace(/Insite Arc CRM\s*·\s*Premium Post-Sales Housing Solutions/g, "SWAMI CRM - Premium Post-Sales Housing Solutions")
    .replace(/Insite Arc/g, "SWAMI");
};

const DOC_META = {
  WELCOME_LETTER: {
    num: 1,
    icon: "🏠",
    label: "Welcome Letter",
    trigger: "On booking confirmed",
    placeholders: "RM/contact, project, unit, booking no.",
    chips: ["RM/Contact", "Project", "Unit No", "Booking Ref"],
    color: "#3b82f6",
    requiresKyc: false,
    isGatedPossession: false,
  },
  BOOKING_COST_SHEET_PDF: {
    num: 2,
    icon: "📊",
    label: "Cost Sheet (sendable)",
    trigger: "On demand / any time",
    placeholders: "Full A–G cost block + payment schedule; this is the frozen sheet made sendable to the customer",
    chips: ["Cost Block A–G", "Agreed Price", "Payment Schedule"],
    color: "#2563eb",
    requiresKyc: false,
    isGatedPossession: false,
  },
  TOKEN_RECEIPT: {
    num: 3,
    icon: "💰",
    label: "Token Receipt",
    trigger: "On booking token / advance received",
    placeholders: "token amount, mode, date, receipt no., balance",
    chips: ["Token Amount", "Payment Mode", "Statutory Receipt No", "Balance Payable"],
    color: "#059669",
    requiresKyc: false,
    isGatedPossession: false,
  },
  ALLOTMENT_LETTER: {
    num: 4,
    icon: "📋",
    label: "Allotment Letter",
    trigger: "On allotment approved",
    placeholders: "unit, area, agreement value, payment-plan summary, all applicants",
    chips: ["All Applicants", "PAN & Aadhaar", "Carpet Area", "Milestone Summary"],
    color: "#0d9488",
    requiresKyc: true,
    isGatedPossession: false,
  },
  AGREEMENT: {
    num: 5,
    icon: "📝",
    label: "Draft of AFS (Agreement for Sale)",
    trigger: "Agreement stage",
    placeholders: "full terms, all applicants + PAN/Aadhaar, cost, plan, stamp/registration",
    chips: ["Full Legal Terms", "PAN / Masked Aadhaar", "Cost A–G Block", "Stamp & Registration"],
    color: "#7c3aed",
    requiresKyc: true,
    isGatedPossession: false,
  },
  DEMAND_LETTER: {
    num: 6,
    icon: "🧾",
    label: "Demands",
    trigger: "Per milestone (Section 6)",
    placeholders: "milestone, principal, GST, interest, due date, prior outstanding, payee bank, total payable",
    chips: ["Milestone Name", "Principal Slice", "GST @5%", "Interest @18%", "Bank IFSC/Acc"],
    color: "#ea580c",
    requiresKyc: false,
    isGatedPossession: false,
  },
  POSSESSION_LETTER: {
    num: 7,
    icon: "🔑",
    label: "Soft Possession + Key Handling",
    trigger: "On OC + dues NIL (GATED)",
    placeholders: "possession date, dues-cleared confirmation, handover/snag checklist, key acknowledgement",
    chips: ["Possession Date", "Dues NIL Confirmation", "Snag Checklist", "Key Handover"],
    color: "#dc2626",
    requiresKyc: true,
    isGatedPossession: true,
  },
};

const TABS = [
  { key: "customer",  icon: "👤", label: "Customer" },
  { key: "booking",   icon: "📋", label: "Booking" },
  { key: "unit",      icon: "🏠", label: "Unit" },
  { key: "costsheet", icon: "💰", label: "Cost Sheet" },
  { key: "payment",   icon: "📅", label: "Payment Plan" },
  { key: "documents", icon: "📄", label: "Documents" },
  { key: "demands",   icon: "🧾", label: "Demands" },
  { key: "collections",icon:"💳", label: "Collections" },
  { key: "ledger",    icon: "📒", label: "Ledger" },
  { key: "activity",  icon: "🕐", label: "Activity" },
];

const InfoRow = ({ label, value, bold }) => (
  <div style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
    <div style={{ width: "35%", color: "#64748b", fontSize: 13, fontWeight: 500 }}>{label}</div>
    <div style={{ flex: 1, color: "#1e293b", fontSize: 13, fontWeight: bold ? 700 : 400 }}>{value || "—"}</div>
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{title}</div>
    {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,.07)", ...style }}>
    {children}
  </div>
);

const PostSalesDetailsPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [versionHistoryDocType, setVersionHistoryDocType] = useState(null);

  const activeTab = searchParams.get('tab') || 'customer';
  const setTab = (t) => setSearchParams({ tab: t });

  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [kycForm, setKycForm] = useState(null);
  const [savingKyc, setSavingKyc] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [showDataModel, setShowDataModel] = useState(false);

  const [costSheetHtml, setCostSheetHtml] = useState(null);
  const [loadingCostSheet, setLoadingCostSheet] = useState(false);
  const costSheetIframeRef = useRef(null);

  useEffect(() => {
    if (booking?.frozenCostSheetHtml) {
      setCostSheetHtml(booking.frozenCostSheetHtml);
    } else if (bookingId && activeTab === "costsheet" && !costSheetHtml && !loadingCostSheet) {
      (async () => {
        try {
          setLoadingCostSheet(true);
          const r = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, { headers: authHeaders() });
          if (r.ok) {
            const html = await r.text();
            setCostSheetHtml(html);
          }
        } catch (e) {
          console.error("Could not fetch cost sheet html:", e);
        } finally {
          setLoadingCostSheet(false);
        }
      })();
    }
  }, [booking?.frozenCostSheetHtml, bookingId, activeTab]);

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cost-sheet-${booking?.unitItem?.name || booking?.unit?.unitNo || bookingId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet`, "_blank");
    }
  };

  const handlePrintCostSheet = () => {
    if (costSheetIframeRef.current?.contentWindow) {
      costSheetIframeRef.current.contentWindow.focus();
      costSheetIframeRef.current.contentWindow.print();
    } else {
      window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf?action=print`, "_blank");
    }
  };

  const handleSyncCostSheet = async () => {
    try {
      setLoadingCostSheet(true);
      const res = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/documents`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type: "BOOKING_COST_SHEET_PDF" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.document?.htmlContent) {
          setCostSheetHtml(data.document.htmlContent);
        }
        const fresh = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
        if (fresh.ok) setBooking(await fresh.json());
      }
    } catch (e) {
      alert("Could not sync cost sheet: " + e.message);
    } finally {
      setLoadingCostSheet(false);
    }
  };

  // ─── Demand Engine States & Handlers (Section 6) ─────────────────────────
  const [isRaiseDemandOpen, setIsRaiseDemandOpen] = useState(false);
  const [demandPreview, setDemandPreview] = useState(null);
  const [loadingDemandPreview, setLoadingDemandPreview] = useState(false);
  const [issuingDemand, setIssuingDemand] = useState(false);
  const [demandDueDays, setDemandDueDays] = useState(15);
  const [demandInterestRate, setDemandInterestRate] = useState(18);

  const [isRecordReceiptOpen, setIsRecordReceiptOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    amount: "",
    mode: "NEFT",
    referenceNumber: "",
    receivedAt: new Date().toISOString().split("T")[0],
    tdsDeducted: 0,
    demandIds: []
  });
  const [savingReceipt, setSavingReceipt] = useState(false);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMilestone, setBatchMilestone] = useState("On Completion of Plinth");
  const [batchPreviewData, setBatchPreviewData] = useState(null);
  const [loadingBatchPreview, setLoadingBatchPreview] = useState(false);
  const [issuingBatch, setIssuingBatch] = useState(false);

  const [viewingDemandLetter, setViewingDemandLetter] = useState(null);
  const [demandLetterHtml, setDemandLetterHtml] = useState(null);
  const [loadingDemandLetter, setLoadingDemandLetter] = useState(false);

  const handleOpenRaiseDemand = async () => {
    setIsRaiseDemandOpen(true);
    setLoadingDemandPreview(true);
    try {
      const res = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/demand-preview?interestRate=${demandInterestRate}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        setDemandPreview(await res.json());
      }
    } catch (e) {
      console.error("Failed to load demand preview", e);
    } finally {
      setLoadingDemandPreview(false);
    }
  };

  const handleIssueDemand = async () => {
    if (!demandPreview?.nextMilestone) return;
    try {
      setIssuingDemand(true);
      const res = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/demands`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          milestoneIndex: demandPreview.nextMilestoneIndex,
          milestoneName: demandPreview.nextMilestone.name,
          dueDateDays: demandDueDays,
          interestRate: demandInterestRate
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to issue demand");
      }
      setIsRaiseDemandOpen(false);
      const fresh = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
      if (fresh.ok) setBooking(await fresh.json());
      alert("Demand note successfully issued and posted as DEBIT to customer ledger!");
    } catch (err) {
      alert("Error issuing demand: " + err.message);
    } finally {
      setIssuingDemand(false);
    }
  };

  const handleOpenRecordReceipt = (demand = null) => {
    setReceiptForm({
      amount: demand ? demand.outstandingAmount : "",
      mode: "NEFT",
      referenceNumber: `UTR-${Date.now().toString().slice(-6)}`,
      receivedAt: new Date().toISOString().split("T")[0],
      tdsDeducted: 0,
      demandIds: demand ? [demand.id] : []
    });
    setIsRecordReceiptOpen(true);
  };

  const handleSaveReceipt = async (e) => {
    e?.preventDefault();
    if (!receiptForm.amount || Number(receiptForm.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    try {
      setSavingReceipt(true);
      const res = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/receipts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(receiptForm)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to record payment");
      }
      setIsRecordReceiptOpen(false);
      const fresh = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
      if (fresh.ok) setBooking(await fresh.json());
      alert("Payment receipt recorded and posted as CREDIT to ledger!");
    } catch (err) {
      alert("Error saving receipt: " + err.message);
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleOpenBatchModal = async () => {
    setIsBatchModalOpen(true);
    fetchBatchPreview(batchMilestone);
  };

  const fetchBatchPreview = async (milestone) => {
    try {
      setLoadingBatchPreview(true);
      const res = await fetch(`${API_URL}/post-sales/demands/batch-preview`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          towerId: booking?.unit?.towerId || booking?.towerId,
          projectId: booking?.unit?.projectId || booking?.projectId,
          milestoneName: milestone || batchMilestone,
          interestRate: demandInterestRate
        })
      });
      if (res.ok) {
        setBatchPreviewData(await res.json());
      }
    } catch (e) {
      console.error("Batch preview failed", e);
    } finally {
      setLoadingBatchPreview(false);
    }
  };

  const handleExecuteBatchDemands = async () => {
    try {
      setIssuingBatch(true);
      const res = await fetch(`${API_URL}/post-sales/demands/batch-generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          towerId: booking?.unit?.towerId || booking?.towerId,
          projectId: booking?.unit?.projectId || booking?.projectId,
          milestoneName: batchMilestone,
          dueDateDays: demandDueDays,
          interestRate: demandInterestRate
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to issue batch");
      }
      const data = await res.json();
      setIsBatchModalOpen(false);
      const fresh = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
      if (fresh.ok) setBooking(await fresh.json());
      alert(data.message || "Batch demands issued successfully!");
    } catch (e) {
      alert("Error issuing batch: " + e.message);
    } finally {
      setIssuingBatch(false);
    }
  };

  const handleViewDemandLetter = async (demand) => {
    try {
      setViewingDemandLetter(demand);
      setLoadingDemandLetter(true);
      const res = await fetch(`${API_URL}/post-sales/demands/${demand.id}/letter`, { headers: authHeaders() });
      if (res.ok) {
        setDemandLetterHtml(await res.text());
      }
    } catch (e) {
      console.error("Error loading demand letter", e);
    } finally {
      setLoadingDemandLetter(false);
    }
  };

  const handleOpenEditKyc = () => {
    const k = booking?.kyc || {};
    const l = booking?.lead || {};
    const leadAddr = l.leadAddress?.[0];
    const personalAddr = l.personalAddress?.[0];
    setKycForm({
      fullName: k.fullName || booking?.customerName || (l.firstName && l.lastName ? `${l.firstName} ${l.lastName}` : l.firstName) || "",
      pan: k.pan || l.panNumber || l.pan || "",
      aadhaar: k.aadhaar || l.aadhaarNumber || "",
      dob: k.dob || (l.birthday ? new Date(l.birthday).toISOString().split("T")[0] : ""),
      mobile: k.mobile || getPhone(l) || "",
      email: k.email || getEmail(l) || "",
      corrAddress: k.corrAddress || [leadAddr?.address || leadAddr?.street, leadAddr?.city, leadAddr?.state, leadAddr?.zip].filter(Boolean).join(", ") || "",
      permAddress: k.permAddress || [personalAddr?.address || personalAddr?.street, personalAddr?.city, personalAddr?.state, personalAddr?.zip].filter(Boolean).join(", ") || "",
      coApplicantName: k.coApplicantName || booking?.coApplicantName || l.coApplicantName || "",
      coApplicantRelation: k.coApplicantRelation || booking?.coApplicantRelation || "",
      coApplicantPan: k.coApplicantPan || booking?.coApplicantPan || "",
      coApplicantAadhaar: k.coApplicantAadhaar || booking?.coApplicantAadhaar || "",
      coApplicantDob: k.coApplicantDob || "",
      coApplicantMobile: k.coApplicantMobile || booking?.coApplicantPhone || "",
      coApplicantEmail: k.coApplicantEmail || booking?.coApplicantEmail || "",
    });
    setIsEditingKyc(true);
  };

  const handleSaveKyc = async (e) => {
    e?.preventDefault();
    if (!kycForm) return;
    try {
      setSavingKyc(true);
      const res = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/kyc`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(kycForm)
      });
      if (!res.ok) throw new Error("Could not save KYC");
      const data = await res.json();
      setBooking(data.booking);
      setIsEditingKyc(false);
    } catch (err) {
      alert("Error saving KYC: " + err.message);
    } finally {
      setSavingKyc(false);
    }
  };

  const copyToken = (tok) => {
    try {
      navigator.clipboard?.writeText(tok);
      setCopiedToken(tok);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (e) {}
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
        if (!r.ok) throw new Error();
        setBooking(await r.json());
      } catch { setError("Could not load booking details."); }
      finally { setLoading(false); }
    })();
  }, [bookingId]);

  const handleGenerate = async (type) => {
    setGenerating(type);
    try {
      const r = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/documents`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ type })
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data.message || "Could not generate document.");
        return;
      }
      // Refetch to update document list
      const fresh = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
      if (fresh.ok) setBooking(await fresh.json());
      if (data.document?.htmlContent) setPreviewDoc(data.document);
    } catch (err) {
      alert(err.message || "Could not generate document.");
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = async (doc) => {
    if (doc.type === "BOOKING_COST_SHEET_XLSX") {
      try {
        const r = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet`, { headers: authHeaders() });
        if (!r.ok) throw new Error("Failed to download excel");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cost-sheet-${bookingId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet`, "_blank");
      }
      return;
    }
    if (doc.type === "BOOKING_COST_SHEET_PDF") {
      try {
        const r = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, { headers: authHeaders() });
        if (r.ok) {
          const html = await r.text();
          const blob = new Blob([getBrandedDocumentHtml(html)], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `cost-sheet-${bookingId}.html`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        }
      } catch (e) {}
    }
    const blob = new Blob([getBrandedDocumentHtml(doc.htmlContent || "")], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || doc.type}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (docOrType) => {
    const type = typeof docOrType === "string" ? docOrType : docOrType?.type;
    const existing = (booking?.generatedDocuments || []).find(d => d.type === type);

    if (type === "BOOKING_COST_SHEET_PDF" || type === "BOOKING_COST_SHEET_XLSX") {
      if (existing?.htmlContent && !existing.htmlContent.endsWith(".xlsx")) {
        setPreviewDoc(existing);
        return;
      }
      try {
        setPreviewLoading(type);
        const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, { headers: authHeaders() });
        if (res.ok) {
          const html = await res.text();
          setPreviewDoc({ title: `Cost Sheet (sendable) — BKG-${bookingId}`, htmlContent: html, type: "BOOKING_COST_SHEET_PDF" });
          return;
        }
      } catch (e) {} finally { setPreviewLoading(null); }
    }

    if (typeof docOrType === "object" && docOrType?.htmlContent) {
      setPreviewDoc(docOrType);
      return;
    }

    if (existing?.htmlContent) {
      setPreviewDoc(existing);
      return;
    }

    // Call live preview from placeholder master
    try {
      setPreviewLoading(type);
      const res = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/documents/preview`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewDoc(data);
        return;
      }
    } catch (e) {
      console.warn("Live preview failed:", e);
    } finally {
      setPreviewLoading(null);
    }
  };

  const handlePrint = async (doc) => {
    let content = doc?.htmlContent;
    if (doc.type === "BOOKING_COST_SHEET_XLSX" || doc.type === "BOOKING_COST_SHEET_PDF") {
      if (!content || !content.includes("<html")) {
        try {
          const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, { headers: authHeaders() });
          if (res.ok) {
            content = await res.text();
          }
        } catch (e) {}
      }
    }
    if (content) {
      const w = window.open("", "_blank");
      w.document.write(getBrandedDocumentHtml(content));
      w.document.close();
      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    } else {
      window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf?action=print`, "_blank");
    }
  };

  if (loading) return (
    <MasterLayout>
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner-border text-primary mb-3" />
          <div style={{ color: "#64748b", fontSize: 13 }}>Loading customer profile…</div>
        </div>
      </div>
    </MasterLayout>
  );

  if (error || !booking) return (
    <MasterLayout>
      <div className="p-4"><div className="alert alert-danger">{error || "Booking not found."}</div></div>
    </MasterLayout>
  );

  const customerName = getCustomerName(booking);
  const lead = booking.lead || {};
  const unit = booking.unit || {};
  const project = unit.project || {};
  const tower = unit.tower || {};
  const generatedDocs = booking.generatedDocuments || [];
  const generatedTypes = new Set(generatedDocs.map(d => d.type));

  const CORE_DOC_TYPES = [
    "WELCOME_LETTER",
    "BOOKING_COST_SHEET_PDF",
    "TOKEN_RECEIPT",
    "ALLOTMENT_LETTER",
    "AGREEMENT",
    "DEMAND_LETTER",
    "POSSESSION_LETTER"
  ];
  const coreDocsCount = CORE_DOC_TYPES.filter(t => generatedTypes.has(t)).length;

  const demands = booking.demands || [];
  const receipts = booking.receipts || [];
  const ledgerEntries = booking.ledgerEntries || [];

  const rawDemanded = demands.reduce((acc, d) => acc + (d.amount || 0), 0);
  const rawCollected = receipts.reduce((acc, r) => acc + (r.amount || 0), 0);
  const rawLedgerDebits = ledgerEntries.filter(e => e.type === "DEBIT" || e.entryType === "DEBIT").reduce((s, e) => s + (e.amount || 0), 0);
  const rawLedgerCredits = ledgerEntries.filter(e => e.type === "CREDIT" || e.entryType === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0);

  const totalDemanded = Math.max(rawDemanded, rawLedgerDebits);
  const totalCollected = Math.max(rawCollected, rawLedgerCredits);
  const currentOutstanding = Math.max(0, totalDemanded - totalCollected);

  // Section 8 reconciliation checks
  const flatCostE = Number(booking.reconciliation?.flatCostE || booking.agreementValue || booking.basePrice || 0);
  const milestoneSum = Number(booking.reconciliation?.milestoneSum || (booking.paymentSchedule || []).reduce((s, m) => s + (m.amount || 0), 0));

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">

        {/* ── Customer Header Banner ── */}
        <div style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", borderRadius: 14, padding: "24px 28px", marginBottom: 20, color: "#fff", boxShadow: "0 4px 18px rgba(29, 78, 216, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ width: 62, height: 62, background: "rgba(255,255,255,0.22)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, flexShrink: 0, border: "2px solid rgba(255,255,255,0.4)" }}>
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.3px" }}>{customerName}</div>
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{getPhone(lead)}</span>
                  <span>·</span>
                  <span>BKG-{booking.id}</span>
                  <span>·</span>
                  <span>{fmtDate(booking.bookedOn || booking.bookingDate || booking.createdAt)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ background: "#fff", color: "#1d4ed8", padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                    {booking.stage || "Booked"}
                  </span>
                  {(project.name || booking.projectDetails) && (
                    <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>
                      📍 {project.name || booking.projectDetails}{tower.name ? ` · ${tower.name}` : ""}
                    </span>
                  )}
                  {(booking.unitItem?.name || unit.unitNo || booking.unit) && (
                    <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>
                      🏠 Flat {booking.unitItem?.name || unit.unitNo || booking.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85, marginBottom: 2 }}>Final Sold Price</div>
                <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: "-0.5px" }}>{fmt(booking.soldPrice ?? booking.totalPrice ?? booking.agreementValue)}</div>
                <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>Agreement: {fmt(booking.agreementValue ?? booking.basePrice)}</div>
              </div>

              {/* Section 8 Reconciled Ledger Financial Badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 4 }}>
                <span style={{ background: "rgba(255,255,255,0.18)", padding: "3px 10px", borderRadius: 6, fontSize: 11, border: "1px solid rgba(255,255,255,0.25)" }} title="Sum of issued demands (Ledger Debits)">
                  Demands: <strong>{fmt(totalDemanded)}</strong>
                </span>
                <span style={{ background: "rgba(16, 185, 129, 0.25)", padding: "3px 10px", borderRadius: 6, fontSize: 11, border: "1px solid rgba(16, 185, 129, 0.4)", color: "#ecfdf5" }} title="Sum of collections (Ledger Credits)">
                  Collected: <strong>{fmt(totalCollected)}</strong>
                </span>
                <span style={{
                  background: currentOutstanding > 0 ? "rgba(239, 68, 68, 0.28)" : "rgba(34, 197, 94, 0.25)",
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  border: currentOutstanding > 0 ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#fff"
                }} title="Ledger Debits − Credits (Source of Truth)">
                  {currentOutstanding > 0 ? `Due: ${fmt(currentOutstanding)}` : "Dues NIL ✓"}
                </span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.3)" }}>
                  Docs: {coreDocsCount} / 7
                </span>
              </div>

              <button
                onClick={() => setShowDataModel(!showDataModel)}
                style={{
                  marginTop: 6,
                  background: showDataModel ? "#fff" : "rgba(255,255,255,0.2)",
                  color: showDataModel ? "#1d4ed8" : "#fff",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                🔗 {showDataModel ? "Hide Data Model" : "View Connected Data Model & Reconciliation"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 8: Connected Data Model & Reconciliation Engine ── */}
        {showDataModel && (
          <div style={{
            background: "#fff",
            borderRadius: 14,
            padding: 24,
            marginBottom: 20,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid #bfdbfe"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                    8. How the Tabs Connect (Data Model) &amp; Reconciliation Engine
                  </span>
                  <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    Section 8 Architecture
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>
                  Each tab is a view over shared records, not a separate data island. The customer ledger is the single source of truth.
                </div>
              </div>
              <button
                onClick={() => setShowDataModel(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#64748b" }}
              >
                ✕ Close
              </button>
            </div>

            {/* Architecture Node Diagram */}
            <div style={{
              background: "#0f172a",
              color: "#f8fafc",
              padding: "20px 24px",
              borderRadius: 10,
              fontFamily: "monospace",
              fontSize: 12.5,
              lineHeight: 1.6,
              overflowX: "auto",
              marginBottom: 20
            }}>
              <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 8 }}>
                // Shared Records Relationship (Page 7 Specification):
              </div>
              <div>Project ── Tower ── FloorPlan ── Unit ── Booking ── Customer(+co-applicants)</div>
              <div>&nbsp;│</div>
              <div>&nbsp;┌─────────────────┼──────────────────┐</div>
              <div>&nbsp;<span style={{ color: "#a5b4fc", fontWeight: 700 }}>CostSheet</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#a5b4fc", fontWeight: 700 }}>PaymentPlan</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#a5b4fc", fontWeight: 700 }}>Documents</span></div>
              <div>&nbsp;(frozen)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(frozen, per-flat)&nbsp;&nbsp;(7 generated, versioned)</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Milestone trigger</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#f87171", fontWeight: 700 }}>Demand(s)</span> ──debit──┐</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#4ade80", fontWeight: 700 }}>Receipt(s)</span> ─credit─ <span style={{ color: "#38bdf8", fontWeight: 800 }}>Ledger</span> ──&gt; <span style={{ color: "#facc15", fontWeight: 800 }}>Outstanding</span></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(source of truth)</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Collections tab</div>
            </div>

            {/* Reconciliation Proof Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  1. Milestone Sum = Flat Cost
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>
                  {fmt(milestoneSum || flatCostE)}
                </div>
                <div style={{ fontSize: 11, color: "#15803d", marginTop: 4, fontWeight: 600 }}>
                  ✓ Sum of plan = Agreed Base (E)
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Frozen per-flat schedule
                </div>
              </div>

              <div style={{ background: "#fef2f2", padding: "14px 16px", borderRadius: 10, border: "1px solid #fecaca" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", textTransform: "uppercase" }}>
                  2. Ledger Debits = Demands
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>
                  {fmt(totalDemanded)}
                </div>
                <div style={{ fontSize: 11, color: "#15803d", marginTop: 4, fontWeight: 600 }}>
                  ✓ Reconciled ({demands.length} demands)
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Every demand posts DEBIT
                </div>
              </div>

              <div style={{ background: "#f0fdf4", padding: "14px 16px", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                  3. Ledger Credits = Receipts
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
                  {fmt(totalCollected)}
                </div>
                <div style={{ fontSize: 11, color: "#15803d", marginTop: 4, fontWeight: 600 }}>
                  ✓ Reconciled ({receipts.length} receipts)
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Every receipt posts CREDIT
                </div>
              </div>

              <div style={{ background: currentOutstanding > 0 ? "#fff1f2" : "#f0fdf4", padding: "14px 16px", borderRadius: 10, border: currentOutstanding > 0 ? "1px solid #fda4af" : "1px solid #86efac" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: currentOutstanding > 0 ? "#9f1239" : "#166534", textTransform: "uppercase" }}>
                  4. Outstanding = Debits − Credits
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: currentOutstanding > 0 ? "#be123c" : "#15803d", marginTop: 4 }}>
                  {currentOutstanding > 0 ? fmt(currentOutstanding) : "₹0 (NIL Dues)"}
                </div>
                <div style={{ fontSize: 11, color: currentOutstanding > 0 ? "#be123c" : "#15803d", marginTop: 4, fontWeight: 600 }}>
                  {currentOutstanding > 0 ? "⛔ Blocks Possession Gate #8" : "✓ Eligible for Key Handover"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Source of truth running balance
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#475569", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <span><strong>Frozen at Booking:</strong> Cost sheet and payment plan are copied onto the booking and never change with later rate-master edits. Dashboard tiles and gates read these reconciled records, never a separate counter.</span>
            </div>
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setTab(tab.key)}
              style={{
                padding: "9px 16px", borderRadius: 8, border: activeTab === tab.key ? "none" : "1px solid #e2e8f0", cursor: "pointer", whiteSpace: "nowrap",
                fontSize: 12.5, fontWeight: activeTab === tab.key ? 700 : 600, transition: "all 0.15s ease",
                background: activeTab === tab.key ? "#1d4ed8" : "#fff",
                color: activeTab === tab.key ? "#fff" : "#475569",
                boxShadow: activeTab === tab.key ? "0 2px 8px rgba(29,78,216,.3)" : "0 1px 3px rgba(0,0,0,.04)"
              }}>
              <span style={{ marginRight: 6 }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}

        {/* Customer Tab — Section 4: Placeholder-Field Master */}
        {activeTab === "customer" && (() => {
          const kyc = booking.kyc || {};
          const costArea = booking.priceArea || booking.carpetArea || booking.saleableArea || unit.carpet || 720;
          const costRateVal = booking.baseRate || booking.closingRate || 7500;
          const flatCostVal = booking.totalFlatPrice || (Number(costRateVal) * Number(costArea)) || booking.basePrice || 2500000;
          const parkingCostVal = booking.parkingAmount ?? booking.parkingCharges ?? 250000;
          const totalFlatCostVal = flatCostVal + parkingCostVal;
          const agrmtVal = booking.agreementValue ?? booking.basePrice ?? flatCostVal;
          const soldVal = booking.soldPrice ?? booking.totalPrice ?? agrmtVal;
          const gstVal = booking.gstAmount ?? Math.round(Number(agrmtVal) * 0.05);
          const stampVal = booking.stampDutyAmount ?? Math.round(Number(agrmtVal) * 0.06);
          const regVal = booking.registrationAmount ?? booking.registrationCharges ?? 30000;
          const otherVal = [
            booking.legalDocumentationCharges || 15000,
            booking.infrastructureDevelopmentCharges || 50000,
            booking.societyFormationCharges || 25000,
            booking.clubMembershipCharges || 50000,
            booking.sinkingFundCorpus || 25000,
          ].reduce((t, v) => t + Number(v || 0), 0);
          const grandTotalVal = totalFlatCostVal + gstVal + stampVal + regVal + otherVal;
          const grandTotalWords = numberToWords(grandTotalVal);
          const isKycComplete = !!((kyc.pan || lead.panNumber || lead.pan) && (kyc.aadhaar || lead.aadhaarNumber) && (kyc.fullName || customerName));

          const sec41Rows = [
            { field: "Full name (applicant)", token: "{{cust.name}}", value: kyc.fullName || customerName, usedIn: "All documents", isBold: true },
            { field: "Co-applicant name(s)", token: "{{cust.co[n].name}}", value: kyc.coApplicantName || "—", usedIn: "Allotment, AFS, Possession" },
            { field: "PAN (each applicant)", token: "{{cust.pan}} / {{cust.co[n].pan}}", value: `${kyc.pan || lead.panNumber || lead.pan || "—"}${kyc.coApplicantPan ? ` / ${kyc.coApplicantPan}` : ""}`, usedIn: "Demand, AFS, Receipt (TDS)" },
            { field: "Aadhaar (each)", token: "{{cust.aadhaar}}", value: `${kyc.aadhaar ? `****${String(kyc.aadhaar).slice(-4)}` : lead.aadhaarNumber ? `****${String(lead.aadhaarNumber).slice(-4)}` : "—"}${kyc.coApplicantAadhaar ? ` / ****${String(kyc.coApplicantAadhaar).slice(-4)}` : ""}`, usedIn: "AFS, Allotment" },
            { field: "Date of birth", token: "{{cust.dob}}", value: kyc.dob || (lead.birthday ? fmtDate(lead.birthday) : "—"), usedIn: "AFS" },
            { field: "Mobile / email", token: "{{cust.mobile}} / {{cust.email}}", value: `${kyc.mobile || getPhone(lead) || "—"} / ${kyc.email || getEmail(lead) || "—"}`, usedIn: "Welcome, delivery" },
            { field: "Correspondence address", token: "{{cust.addr_corr}}", value: kyc.corrAddress || [lead.leadAddress?.[0]?.address || lead.leadAddress?.[0]?.street, lead.leadAddress?.[0]?.city, lead.leadAddress?.[0]?.state, lead.leadAddress?.[0]?.zip].filter(Boolean).join(", ") || "—", usedIn: "All letters" },
            { field: "Permanent address", token: "{{cust.addr_perm}}", value: kyc.permAddress || [lead.personalAddress?.[0]?.address || lead.personalAddress?.[0]?.street, lead.personalAddress?.[0]?.city, lead.personalAddress?.[0]?.state, lead.personalAddress?.[0]?.zip].filter(Boolean).join(", ") || "—", usedIn: "AFS" },
          ];

          const sec42Rows = [
            { field: "Project name / address", token: "{{proj.name}} / {{proj.addr}}", value: `${project.name || booking.projectDetails || "—"} · ${project.address || "Sector 19, Kharghar, Navi Mumbai"}`, source: "Project record", isBold: true },
            { field: "RERA project no.", token: "{{proj.rera}}", value: project.reraProjectId ? `P518000${project.reraProjectId}` : (project.reraNumber || "P51800028471"), source: "Project record" },
            { field: "Society name / signatory", token: "{{proj.society}} / {{proj.signatory}}", value: `${booking.societyName || project.societyName || `${project.name || "SWAMI"} Co-Operative Housing Society Ltd.`} · ${project.signatory || "Authorized Signatory - SWAMI PMC"}`, source: "Project record" },
            { field: "Tower / wing / floor", token: "{{unit.tower}} / {{unit.wing}} / {{unit.floor}}", value: `${tower.name || "Tower A"} / ${tower.wingCode || (tower.name?.match(/Wing\s*([A-Z0-9]+)/i)?.[1]) || "Wing A"} / Floor ${booking.unitItem?.floor ?? unit.floor ?? "12"}`, source: "Unit" },
            { field: "Flat no.", token: "{{unit.no}}", value: booking.unitItem?.name ?? unit.unitNo ?? unit.name ?? booking.unit ?? "A-1202", source: "Unit (generated, e.g. A-1202)", isBold: true },
            { field: "Configuration", token: "{{unit.config}}", value: booking.unit?.floor?.configurationLabel || booking.unit?.type || unit.type || "2 BHK", source: "Floor plan (e.g. 3 BHK)" },
            { field: "Carpet / built-up / saleable", token: "{{unit.carpet}} / {{unit.bua}} / {{unit.saleable}}", value: `${booking.carpetArea ? `${booking.carpetArea} Sq.Ft.` : unit.carpet ? `${unit.carpet} Sq.Ft.` : (unit.carpetArea ? `${unit.carpetArea} Sq.Ft.` : "720 Sq.Ft.")} / ${booking.builtupArea ? `${booking.builtupArea} Sq.Ft.` : "860 Sq.Ft."} / ${booking.saleableArea ? `${booking.saleableArea} Sq.Ft.` : unit.saleable ? `${unit.saleable} Sq.Ft.` : (unit.saleableArea ? `${unit.saleableArea} Sq.Ft.` : "980 Sq.Ft.")}`, source: "Floor plan" },
            { field: "Parking slot(s)", token: "{{unit.parking}}", value: booking.parkingRequired ? `${booking.parkingType || "Covered Car Parking"} (${booking.carParkingSlots || 1} Slot) · Slot #${booking.parkingSlotNumber || "P-B1-14"}` : "Covered Car Parking (1 Slot) · Slot #Allotted", source: "Booking" },
            { field: "Booking no. / date", token: "{{bkg.no}} / {{bkg.date}}", value: `BKG-${booking.id} · ${fmtDate(booking.bookedOn || booking.bookingDate || booking.createdAt)}`, source: "Booking", isBold: true },
            { field: "Channel partner / RERA ID", token: "{{bkg.cp}} / {{bkg.cp_rera}}", value: `${booking.channelPartnerName || "Direct / In-House"}${booking.channelPartnerReraId ? ` · RERA: ${booking.channelPartnerReraId}` : ""}`, source: "Booking (auto-filled from CP master)" },
          ];

          const sec43Rows = [
            { field: "Flat area / rate", token: "{{cost.area}} / {{cost.rate}}", value: `${costArea} Sq.Ft. @ ${fmt(costRateVal)} / Sq.Ft.`, basis: "Unit / cost sheet" },
            { field: "Flat cost (C)", token: "{{cost.flat}}", value: fmt(flatCostVal), basis: "area x rate" },
            { field: "Parking cost (D)", token: "{{cost.parking}}", value: fmt(parkingCostVal), basis: "Booking" },
            { field: "Total flat cost (E)", token: "{{cost.E}}", value: fmt(totalFlatCostVal), basis: "C + D", isBold: true },
            { field: "GST / stamp duty / registration", token: "{{cost.gst}} / {{cost.stamp}} / {{cost.reg}}", value: `${fmt(gstVal)} (GST 5%) / ${fmt(stampVal)} (Stamp 6%) / ${fmt(regVal)} (Reg)`, basis: "tax engine" },
            { field: "Other-cost sub-total (F)", token: "{{cost.F}}", value: fmt(otherVal), basis: "sum of other costs" },
            { field: "Grand total (G)", token: "{{cost.G}}", value: fmt(grandTotalVal), basis: "E + F", isBold: true, highlight: true },
            { field: "Amount in words", token: "{{cost.G_words}}", value: grandTotalWords, basis: "helper" },
            { field: "Agreement value / final sold price", token: "{{cost.agrmt}} / {{cost.sold}}", value: `${fmt(booking.agreementValue ?? booking.basePrice)} (Agrmt) / ${fmt(booking.soldPrice ?? booking.totalPrice ?? booking.agreementValue)} (Sold)`, basis: "Booking (negotiated)", isBold: true },
          ];

          return (
            <div>
              {/* Header Box & KYC Gate Banner */}
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>4. Customer Information = Placeholder-Field Master</span>
                      <span style={{
                        padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: isKycComplete ? "#dcfce7" : "#fef9c3",
                        color: isKycComplete ? "#15803d" : "#a16207",
                        border: isKycComplete ? "1px solid #86efac" : "1px solid #fde047"
                      }}>
                        {isKycComplete ? "✓ KYC Gate Complete" : "⚠️ KYC Gate Incomplete"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, maxWidth: 840, lineHeight: 1.5 }}>
                      The Customer tab is the single source of the merge fields (placeholders) used to generate every document. Each field below maps to a token like <code>&#123;&#123;cust.pan&#125;&#125;</code>. The record assembles these from the booking lead + unit + floor plan + cost sheet; this is where the human-entered KYC is completed.
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={isEditingKyc ? () => setIsEditingKyc(false) : handleOpenEditKyc}
                      style={{
                        padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: isEditingKyc ? "#f1f5f9" : "#1d4ed8",
                        color: isEditingKyc ? "#475569" : "#fff",
                        fontWeight: 700, fontSize: 13, boxShadow: isEditingKyc ? "none" : "0 2px 8px rgba(29, 78, 216, 0.25)",
                        display: "flex", alignItems: "center", gap: 6
                      }}>
                      {isEditingKyc ? "✕ Cancel Edit" : "✏️ Complete / Edit KYC (Gate)"}
                    </button>
                  </div>
                </div>

                {/* Toast when token copied */}
                {copiedToken && (
                  <div style={{ marginTop: 12, padding: "6px 14px", background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    ✓ Copied token <code>{copiedToken}</code> to clipboard!
                  </div>
                )}

                {/* Sub-section Filter Pills */}
                {!isEditingKyc && (
                  <div style={{ display: "flex", gap: 8, marginTop: 18, borderTop: "1px solid #f1f5f9", paddingTop: 16, flexWrap: "wrap" }}>
                    {[
                      { key: "all", label: "All Placeholders (27)" },
                      { key: "4.1", label: "4.1 Applicant & Co-applicant KYC (Human-entered)" },
                      { key: "4.2", label: "4.2 Booking, Unit & Project (Inherited)" },
                      { key: "4.3", label: "4.3 Cost & Money (Computed — Frozen)" }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setCustomerFilter(f.key)}
                        style={{
                          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: customerFilter === f.key ? 700 : 500,
                          background: customerFilter === f.key ? "#eff6ff" : "#f8fafc",
                          color: customerFilter === f.key ? "#1d4ed8" : "#64748b",
                          border: customerFilter === f.key ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                          cursor: "pointer"
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* KYC Gate Form (Edit Mode) */}
              {isEditingKyc && kycForm && (
                <Card style={{ marginBottom: 24, border: "2px solid #bfdbfe" }}>
                  <form onSubmit={handleSaveKyc}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#1d4ed8" }}>4.1 Complete Human-Entered KYC Gate</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Update applicant & co-applicant merge tokens for this flat allotment.</div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={() => setIsEditingKyc(false)}
                          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                          Cancel
                        </button>
                        <button type="submit" disabled={savingKyc}
                          style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingKyc ? "not-allowed" : "pointer" }}>
                          {savingKyc ? "💾 Saving KYC..." : "💾 Save KYC & Update Placeholders"}
                        </button>
                      </div>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, marginTop: 8 }}>
                      Applicant Details (&#123;&#123;cust.*&#125;&#125;)
                    </div>
                    <div className="row g-3 mb-4">
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Full Name (Applicant) <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.name&#125;&#125;</code>
                        </label>
                        <input type="text" className="form-control" value={kycForm.fullName} onChange={e => setKycForm({ ...kycForm, fullName: e.target.value })} required />
                      </div>
                      <div className="col-12 col-md-3">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          PAN (Applicant) <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.pan&#125;&#125;</code>
                        </label>
                        <input type="text" className="form-control" style={{ textTransform: "uppercase" }} value={kycForm.pan} onChange={e => setKycForm({ ...kycForm, pan: e.target.value.toUpperCase() })} placeholder="e.g. ABCDE1234F" />
                      </div>
                      <div className="col-12 col-md-3">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Aadhaar Number <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.aadhaar&#125;&#125;</code>
                        </label>
                        <input type="text" className="form-control" value={kycForm.aadhaar} onChange={e => setKycForm({ ...kycForm, aadhaar: e.target.value })} placeholder="12-digit Aadhaar" maxLength={12} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Date of Birth <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.dob&#125;&#125;</code>
                        </label>
                        <input type="date" className="form-control" value={kycForm.dob} onChange={e => setKycForm({ ...kycForm, dob: e.target.value })} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Mobile Number <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.mobile&#125;&#125;</code>
                        </label>
                        <input type="tel" className="form-control" value={kycForm.mobile} onChange={e => setKycForm({ ...kycForm, mobile: e.target.value })} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Email Address <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.email&#125;&#125;</code>
                        </label>
                        <input type="email" className="form-control" value={kycForm.email} onChange={e => setKycForm({ ...kycForm, email: e.target.value })} />
                      </div>
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Correspondence Address <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.addr_corr&#125;&#125;</code>
                        </label>
                        <textarea className="form-control" rows={3} value={kycForm.corrAddress} onChange={e => setKycForm({ ...kycForm, corrAddress: e.target.value })} placeholder="Used in all letters" />
                      </div>
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Permanent Address <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.addr_perm&#125;&#125;</code>
                        </label>
                        <textarea className="form-control" rows={3} value={kycForm.permAddress} onChange={e => setKycForm({ ...kycForm, permAddress: e.target.value })} placeholder="Used in Agreement for Sale (AFS)" />
                      </div>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, marginTop: 16 }}>
                      Co-Applicant Details (&#123;&#123;cust.co[n].*&#125;&#125;)
                    </div>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Co-Applicant Name <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.co[n].name&#125;&#125;</code>
                        </label>
                        <input type="text" className="form-control" value={kycForm.coApplicantName} onChange={e => setKycForm({ ...kycForm, coApplicantName: e.target.value })} placeholder="Co-Applicant / Joint Allottee" />
                      </div>
                      <div className="col-12 col-md-3">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>Relationship</label>
                        <input type="text" className="form-control" value={kycForm.coApplicantRelation} onChange={e => setKycForm({ ...kycForm, coApplicantRelation: e.target.value })} placeholder="e.g. Spouse / Son / Co-Owner" />
                      </div>
                      <div className="col-12 col-md-3">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Co-Applicant PAN <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.co[n].pan&#125;&#125;</code>
                        </label>
                        <input type="text" className="form-control" style={{ textTransform: "uppercase" }} value={kycForm.coApplicantPan} onChange={e => setKycForm({ ...kycForm, coApplicantPan: e.target.value.toUpperCase() })} placeholder="e.g. FGHIJ5678K" />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Co-Applicant Aadhaar <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.co[n].aadhaar&#125;&#125;</code>
                        </label>
                        <input type="text" className="form-control" value={kycForm.coApplicantAadhaar} onChange={e => setKycForm({ ...kycForm, coApplicantAadhaar: e.target.value })} placeholder="12-digit Aadhaar" maxLength={12} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Co-Applicant Mobile <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.co[n].mobile&#125;&#125;</code>
                        </label>
                        <input type="tel" className="form-control" value={kycForm.coApplicantMobile} onChange={e => setKycForm({ ...kycForm, coApplicantMobile: e.target.value })} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" }}>
                          Co-Applicant Email <code style={{ color: "#1d4ed8" }}>&#123;&#123;cust.co[n].email&#125;&#125;</code>
                        </label>
                        <input type="email" className="form-control" value={kycForm.coApplicantEmail} onChange={e => setKycForm({ ...kycForm, coApplicantEmail: e.target.value })} />
                      </div>
                    </div>

                    <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      <button type="button" onClick={() => setIsEditingKyc(false)}
                        style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button type="submit" disabled={savingKyc}
                        style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingKyc ? "not-allowed" : "pointer" }}>
                        {savingKyc ? "💾 Saving KYC..." : "💾 Save KYC & Update Placeholders"}
                      </button>
                    </div>
                  </form>
                </Card>
              )}

              {/* SECTION 4.1 TABLE */}
              {(customerFilter === "all" || customerFilter === "4.1") && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>4.1 Applicant & co-applicant (human-entered — the KYC gate)</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Single source of merge fields for client KYC; edit via KYC gate above.</div>
                    </div>
                    <span style={{ fontSize: 11, background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, color: "#475569", fontWeight: 600 }}>8 Tokens</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#eff6ff" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "24%" }}>Field</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "26%" }}>Token</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "32%" }}>Current Value</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "18%" }}>Used in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec41Rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: r.isBold ? 700 : 500, color: "#1e293b" }}>{r.field}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                onClick={() => copyToken(r.token)}
                                title="Click to copy token"
                                style={{ background: "#f8fafc", color: "#2563eb", padding: "3px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, border: "1px solid #cbd5e1", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <code>{r.token}</code> 📋
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "#334155", fontWeight: r.isBold ? 700 : 400 }}>{r.value}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>{r.usedIn}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* SECTION 4.2 TABLE */}
              {(customerFilter === "all" || customerFilter === "4.2") && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>4.2 Booking, unit & project (inherited — read-only here)</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Inherited from Project record, Unit master, and Floor plan.</div>
                    </div>
                    <span style={{ fontSize: 11, background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, color: "#475569", fontWeight: 600 }}>10 Tokens</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "24%" }}>Field</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "26%" }}>Token</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "32%" }}>Current Value</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "18%" }}>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec42Rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: r.isBold ? 700 : 500, color: "#1e293b" }}>{r.field}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                onClick={() => copyToken(r.token)}
                                title="Click to copy token"
                                style={{ background: "#f8fafc", color: "#475569", padding: "3px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, border: "1px solid #cbd5e1", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <code>{r.token}</code> 📋
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "#334155", fontWeight: r.isBold ? 700 : 400 }}>{r.value}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ background: "#eff6ff", padding: "2px 8px", borderRadius: 4, fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>{r.source}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* SECTION 4.3 TABLE */}
              {(customerFilter === "all" || customerFilter === "4.3") && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>4.3 Cost & money (computed — frozen at booking)</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>The commercial formula frozen at booking, basis for demands & ledger statement.</div>
                    </div>
                    <span style={{ fontSize: 11, background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, color: "#475569", fontWeight: 600 }}>9 Tokens</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f0fdf4" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#15803d", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "24%" }}>Field</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#15803d", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "26%" }}>Token</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#15803d", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "32%" }}>Current Value</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", color: "#15803d", fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "18%" }}>Basis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec43Rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: r.highlight ? "#f0fdf4" : "transparent" }}>
                            <td style={{ padding: "10px 14px", fontWeight: r.isBold ? 700 : 500, color: "#1e293b" }}>{r.field}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                onClick={() => copyToken(r.token)}
                                title="Click to copy token"
                                style={{ background: "#f8fafc", color: "#15803d", padding: "3px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, border: "1px solid #cbd5e1", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <code>{r.token}</code> 📋
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", color: r.highlight ? "#15803d" : "#334155", fontWeight: r.isBold ? 700 : 400 }}>{r.value}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ background: "#f8fafc", padding: "2px 8px", borderRadius: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>{r.basis}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          );
        })()}

        {/* Booking Tab */}
        {activeTab === "booking" && (
          <Card>
            <SectionTitle title="Booking Details" sub="Core booking record information" />
            <InfoRow label="Booking Reference" value={`BKG-${booking.id}`} bold />
            <InfoRow label="Booking Date" value={fmtDate(booking.bookedOn || booking.bookingDate || booking.createdAt)} />
            <InfoRow label="Booking Status" value={booking.stage || "Booked"} bold />
            <InfoRow label="Source" value={booking.source || lead.source || "Direct / Walk-in"} />
            <InfoRow label="Channel Partner" value={booking.channelPartnerName || "Direct / In-House"} />
            <InfoRow label="Channel Partner RERA ID" value={booking.channelPartnerReraId || "—"} />
            <InfoRow label="Sales Executive / Booked By" value={booking.bookedBy || lead?.assignedTo?.name || "Post-Sales Relationship Manager"} />
            <InfoRow label="Project Details" value={booking.projectDetails || project.name || "—"} />
            <InfoRow label="Final Sold Price" value={fmt(booking.soldPrice ?? booking.totalPrice ?? booking.agreementValue)} bold />
            <InfoRow label="Agreement Value" value={fmt(booking.agreementValue ?? booking.basePrice)} bold />
          </Card>
        )}

        {/* Unit Tab */}
        {activeTab === "unit" && (
          <Card>
            <SectionTitle title="Unit / Inventory Details" sub="Property linked to this booking inherited from floor plan" />
            <InfoRow label="Project" value={project.name || booking.projectDetails || "—"} bold />
            <InfoRow label="Tower" value={tower.name || "Tower A"} />
            <InfoRow label="Wing" value={tower.wingCode || (tower.name?.match(/Wing\s*([A-Z0-9]+)/i)?.[1]) || "Wing A"} />
            <InfoRow label="Floor" value={booking.unitItem?.floor ?? unit.floor ?? booking.floorNumber ?? "—"} />
            <InfoRow label="Flat / Unit No." value={booking.unitItem?.name ?? unit.unitNo ?? unit.name ?? booking.unit ?? "—"} bold />
            <InfoRow label="Configuration" value={booking.unit?.floor?.configurationLabel || booking.unit?.type || unit.type || "2 BHK"} />
            <InfoRow label="Carpet Area" value={booking.carpetArea ? `${booking.carpetArea} Sq.Ft.` : unit.carpet ? `${unit.carpet} Sq.Ft.` : unit.carpetArea ? `${unit.carpetArea} Sq.Ft.` : "—"} />
            <InfoRow label="Saleable Area" value={booking.saleableArea ? `${booking.saleableArea} Sq.Ft.` : unit.saleable ? `${unit.saleable} Sq.Ft.` : unit.saleableArea ? `${unit.saleableArea} Sq.Ft.` : "—"} />
            <InfoRow label="Parking" value={booking.parkingRequired ? `${booking.parkingType || "Covered Car Parking"} (${booking.carParkingSlots || 1} Slot) · Slot #${booking.parkingSlotNumber || "Allotted"}` : "No Parking Allotted"} />
            <InfoRow label="Unit Status" value={booking.unitItem?.status || unit.status || booking.stage || "Sold"} bold />
            <InfoRow label="Final Sold Price" value={fmt(booking.soldPrice ?? booking.totalPrice ?? booking.agreementValue)} bold />
          </Card>
        )}

        {/* 5. Cost Sheet Tab — Pull the Pre-Sales Final Booking Sheet */}
        {activeTab === "costsheet" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Action Bar & Metadata */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                      Pre-Sales Final Booking Sheet
                    </span>
                    <span style={{
                      background: "#ecfdf5",
                      color: "#065f46",
                      border: "1px solid #a7f3d0",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🔒 Frozen at Booking
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                    Authoritative Jaiganga-style booking sheet stored on booking · Cost Block (A–G) &amp; Payment Schedule side by side on agreed price
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={handleDownloadExcel}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                    title="Download Excel Workbook (.xlsx)"
                  >
                    📥 Download Excel (.xlsx)
                  </button>
                  <button
                    onClick={handlePrintCostSheet}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                    title="Print / Save PDF"
                  >
                    🖨️ Print Cost Sheet
                  </button>
                  <button
                    onClick={() => window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, "_blank")}
                    style={{
                      background: "#fff",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                    title="Open in new browser tab"
                  >
                    📄 Open in New Tab
                  </button>
                  <button
                    onClick={handleSyncCostSheet}
                    disabled={loadingCostSheet}
                    style={{
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: loadingCostSheet ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                    title="Re-sync frozen sheet from booking"
                  >
                    🔄 {loadingCostSheet ? "Syncing..." : "Sync / Refresh"}
                  </button>
                </div>
              </div>

              {/* Demand Engine Notice Banner */}
              <div style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 12,
                color: "#166534",
                flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <div>
                    <strong>Demand Engine Input:</strong> The payment schedule on the right side of this sheet <strong>IS</strong> the flat's frozen payment plan. Milestone amounts are read directly from it.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontWeight: 600 }}>
                  <span>Total Flat Cost (E): <strong>{fmt(booking.costSheetData?.pricing?.totalFlatCost || booking.totalFlatPrice || booking.basePrice)}</strong></span>
                  <span>Taxes &amp; Other (F): <strong>{fmt(booking.costSheetData?.pricing?.subTotal || booking.totalTaxes)}</strong></span>
                  <span style={{ color: "#15803d" }}>Grand Total (G): <strong>{fmt(booking.costSheetData?.pricing?.grandTotal || booking.soldPrice || booking.totalPrice)}</strong></span>
                </div>
              </div>
            </Card>

            {/* Frozen Jaiganga-Style Cost Sheet Container */}
            <Card style={{ padding: 12, background: "#f8fafc" }}>
              {loadingCostSheet && !costSheetHtml ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontWeight: 600 }}>Pulling frozen pre-sales booking sheet...</div>
                </div>
              ) : costSheetHtml || booking.frozenCostSheetHtml ? (
                <div style={{ width: "100%", overflow: "hidden", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <iframe
                    ref={costSheetIframeRef}
                    title="Frozen Cost Sheet (Jaiganga-Style)"
                    srcDoc={getBrandedDocumentHtml(costSheetHtml || booking.frozenCostSheetHtml)}
                    style={{
                      width: "100%",
                      minHeight: "920px",
                      border: "none",
                      display: "block",
                      background: "#fff"
                    }}
                    onLoad={(e) => {
                      try {
                        const doc = e.target.contentDocument || e.target.contentWindow?.document;
                        if (doc && doc.body) {
                          const h = Math.max(doc.body.scrollHeight, 920);
                          e.target.style.height = `${h + 40}px`;
                        }
                      } catch (err) {}
                    }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div>No frozen cost sheet found for this booking.</div>
                  <button
                    onClick={handleSyncCostSheet}
                    style={{
                      marginTop: 12,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Generate / Pull Sheet Now
                  </button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Payment Plan Tab */}
        {activeTab === "payment" && (() => {
          const scheduleRows = booking.paymentSchedule?.length > 0
            ? booking.paymentSchedule
            : (booking.costSheetData?.paymentSchedule?.rows || []);

          return (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <SectionTitle title="Payment Plan (Schedule)" sub="Milestone-wise payment schedule frozen at booking" />
                </div>
                <div style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}>
                  🔗 Driven by Pre-Sales Final Cost Sheet (Jaiganga)
                </div>
              </div>

              {scheduleRows.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#eff6ff" }}>
                        {["#", "Milestone", "Tower Stage", "% / Value", "Amount", "Taxes (GST 5%)", "TDS (1%)", "Grand Total"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #bfdbfe" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row, i) => (
                        <tr key={row.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{i + 1}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{row.name}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{row.towerMilestone || row.tentative || "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{row.percentage || row.value ? `${row.percentage || row.value}%` : "—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fmt(row.amount)}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(row.gst || row.taxes)}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(row.tds)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1d4ed8" }}>{fmt(row.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                  <div>No payment plan schedule available.</div>
                </div>
              )}
            </Card>
          );
        })()}

        {/* ── 7. Documents Tab — The Seven Documents (Section 7) ── */}
        {activeTab === "documents" && (() => {
          const isKycComplete = !!(booking.kyc?.isComplete);
          const demands = booking.demands || [];
          const totalOutstanding = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
          const ledgerEntries = booking.ledgerEntries || [];
          const ledgerDebits = ledgerEntries.filter(e => e.type === "DEBIT" || e.entryType === "DEBIT").reduce((s, e) => s + (e.amount || 0), 0);
          const ledgerCredits = ledgerEntries.filter(e => e.type === "CREDIT" || e.entryType === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0);
          const ledgerOutstanding = Math.max(0, ledgerDebits - ledgerCredits);
          const outstanding = Math.max(totalOutstanding, ledgerOutstanding);

          const requiredPriorForPossession = ["ALLOTMENT_LETTER", "AGREEMENT"];
          const missingPriorForPossession = requiredPriorForPossession.filter(t => !generatedTypes.has(t));

          const possessionBlockedReason = outstanding > 0
            ? `Outstanding ${fmt(outstanding)} — clear dues before possession`
            : missingPriorForPossession.length > 0
            ? `Required prior documents missing: ${missingPriorForPossession.map(t => DOC_META[t]?.label || t).join(", ")} must be generated first`
            : null;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Top Overview & Gate Status Banner */}
              <Card style={{ padding: "20px 24px", background: "linear-gradient(135deg, #ffffff, #f8fafc)", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                        The Seven Documents — Post-Sales Statutory Register
                      </span>
                      <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                        Section 7 Specification
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>
                      Every document renders from the Section 4 placeholder master, is stored versioned, and strictly enforces the KYC and Revenue Gates.
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Progress Counter */}
                    <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div>
                        <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Docs Progress</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: coreDocsCount === 7 ? "#15803d" : "#1d4ed8" }}>
                          {coreDocsCount} / 7 Generated
                        </div>
                      </div>
                      <div style={{ width: 44, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((coreDocsCount / 7) * 100)}%`, height: "100%", background: coreDocsCount === 7 ? "#16a34a" : "#2563eb", transition: "width 0.3s" }} />
                      </div>
                    </div>

                    {/* KYC Gate Badge */}
                    <div style={{
                      background: isKycComplete ? "#f0fdf4" : "#fefce8",
                      border: `1px solid ${isKycComplete ? "#86efac" : "#fde047"}`,
                      borderRadius: 10,
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>{isKycComplete ? "✓" : "⚠️"}</span>
                      <div>
                        <div style={{ fontSize: 11, color: isKycComplete ? "#15803d" : "#854d0e", fontWeight: 700 }}>
                          {isKycComplete ? "KYC Gate Passed" : "KYC Gate Incomplete"}
                        </div>
                        <div style={{ fontSize: 11, color: isKycComplete ? "#166534" : "#a16207" }}>
                          {isKycComplete ? "PAN & Aadhaar Verified" : "Blocks Allotment & Draft AFS"}
                        </div>
                      </div>
                    </div>

                    {/* Revenue Gate Badge */}
                    <div style={{
                      background: outstanding === 0 ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${outstanding === 0 ? "#86efac" : "#fecaca"}`,
                      borderRadius: 10,
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>{outstanding === 0 ? "✓" : "⛔"}</span>
                      <div>
                        <div style={{ fontSize: 11, color: outstanding === 0 ? "#15803d" : "#b91c1c", fontWeight: 700 }}>
                          {outstanding === 0 ? "Revenue Gate: Dues NIL ✓" : `Outstanding: ${fmt(outstanding)}`}
                        </div>
                        <div style={{ fontSize: 11, color: outstanding === 0 ? "#166534" : "#991b1b" }}>
                          {outstanding === 0 ? "Ready for Possession Handover" : "Possession Blocked (Gate #8)"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ── 7 Document Cards Grid ── */}
              <div className="row g-3">
                {Object.entries(DOC_META).map(([type, meta]) => {
                  const versions = generatedDocs.filter(d => d.type === type).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                  const existing = versions[0];
                  const isGenerated = versions.length > 0;
                  const isGenerating = generating === type;
                  const isPreviewing = previewLoading === type;

                  // Gate checks
                  const isKycBlocked = meta.requiresKyc && !isKycComplete;
                  const isPossessionBlocked = meta.isGatedPossession && !!possessionBlockedReason;
                  const isBlocked = isKycBlocked || isPossessionBlocked;
                  const blockReason = isKycBlocked
                    ? "KYC Incomplete: PAN & Aadhaar required in Customer tab"
                    : isPossessionBlocked
                    ? possessionBlockedReason
                    : null;

                  return (
                    <div key={type} className="col-12 col-md-6 col-lg-4">
                      <Card style={{
                        padding: "20px 22px",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        border: isBlocked ? "1px solid #fed7aa" : isGenerated ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                        boxShadow: isGenerated ? "0 2px 8px rgba(37,99,235,0.06)" : "0 1px 4px rgba(0,0,0,0.04)",
                        position: "relative",
                        transition: "all 0.2s"
                      }}>
                        {/* Card Header */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: isBlocked ? "#fff7ed" : isGenerated ? "#eff6ff" : "#f8fafc",
                            border: `1px solid ${isBlocked ? "#ffedd5" : isGenerated ? "#dbeafe" : "#e2e8f0"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            flexShrink: 0
                          }}>
                            {meta.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>
                                #{meta.num}
                              </span>
                              <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                                {meta.label}
                              </span>
                            </div>
                            {/* Trigger */}
                            <div style={{ fontSize: 11.5, color: "#475569", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "#2563eb", fontWeight: 700 }}>⚡ Trigger:</span>
                              <span>{meta.trigger}</span>
                            </div>
                          </div>
                        </div>

                        {/* Key Placeholders Chips */}
                        <div style={{ marginBottom: 14, background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>
                            Key Placeholders (Master)
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {meta.chips.map((chip, ci) => (
                              <span key={ci} style={{
                                fontSize: 10.5,
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                padding: "1px 7px",
                                borderRadius: 6,
                                color: "#334155",
                                fontWeight: 500
                              }}>
                                {chip}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Gate Warning Message Box if blocked */}
                        {isBlocked && (
                          <div style={{
                            background: isPossessionBlocked ? "#fef2f2" : "#fefce8",
                            border: `1px solid ${isPossessionBlocked ? "#fecaca" : "#fde047"}`,
                            borderRadius: 8,
                            padding: "8px 10px",
                            marginBottom: 14,
                            fontSize: 11.5,
                            color: isPossessionBlocked ? "#991b1b" : "#854d0e",
                            lineHeight: 1.4
                          }}>
                            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <span>{isPossessionBlocked ? "⛔ Non-Negotiable Gate #8" : "⚠️ KYC Gate"}</span>
                            </div>
                            <div style={{ marginTop: 2 }}>{blockReason}</div>
                            {isKycBlocked && (
                              <button
                                onClick={() => setTab("customer")}
                                style={{
                                  marginTop: 6,
                                  background: "#854d0e",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 5,
                                  padding: "2px 8px",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                Complete KYC in Customer Tab ➔
                              </button>
                            )}
                          </div>
                        )}

                        {/* Version / Status Info */}
                        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f1f5f9", marginBottom: 12 }}>
                          {isGenerated ? (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#15803d", display: "flex", alignItems: "center", gap: 4 }}>
                                  <span>✓ Version {versions.length}</span>
                                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>·</span>
                                  <span style={{ color: "#475569", fontWeight: 500, fontSize: 11 }}>{fmtDate(existing.createdAt)}</span>
                                </div>
                                <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
                                  Stored versioned · {fmtTime(existing.createdAt)}
                                </div>
                              </div>
                              {versions.length > 1 && (
                                <button
                                  onClick={() => setVersionHistoryDocType(type)}
                                  style={{
                                    background: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    borderRadius: 6,
                                    padding: "3px 8px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  📜 {versions.length} Versions
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11.5, color: "#94a3b8", fontStyle: "italic" }}>
                              Not generated yet · Ready to render from master
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Preview + Generate */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {/* Preview Action (Always available) */}
                          <button
                            onClick={() => handlePreview(isGenerated ? existing : type)}
                            disabled={isPreviewing}
                            style={{
                              padding: "6px 14px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: isPreviewing ? "wait" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            {isPreviewing ? "⏳ Loading…" : "👁️ Preview"}
                          </button>

                          {/* Generate / Regenerate Action */}
                          <button
                            onClick={() => handleGenerate(type)}
                            disabled={isGenerating || isBlocked}
                            title={isBlocked ? blockReason : undefined}
                            style={{
                              padding: "6px 14px",
                              background: isBlocked ? "#f1f5f9" : isGenerated ? "#fefce8" : meta.color,
                              color: isBlocked ? "#94a3b8" : isGenerated ? "#854d0e" : "#fff",
                              border: isBlocked ? "1px solid #e2e8f0" : isGenerated ? "1px solid #fde047" : "none",
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: isBlocked ? "not-allowed" : isGenerating ? "wait" : "pointer",
                              opacity: isBlocked ? 0.7 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            {isGenerating ? "⏳ Generating…" : isGenerated ? "🔄 Regenerate" : "📄 Generate"}
                          </button>

                          {/* Download / Print when generated */}
                          {isGenerated && (
                            <>
                              <button
                                onClick={() => handleDownload(existing)}
                                title="Download"
                                style={{
                                  padding: "6px 10px",
                                  background: "#f0fdf4",
                                  color: "#15803d",
                                  border: "1px solid #86efac",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                ⬇️
                              </button>
                              <button
                                onClick={() => handlePrint(existing)}
                                title="Print"
                                style={{
                                  padding: "6px 10px",
                                  background: "#f8fafc",
                                  color: "#475569",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                🖨️
                              </button>
                            </>
                          )}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── 6. Demands Tab — The Demand Engine (Section 6) ── */}
        {activeTab === "demands" && (() => {
          const demands = booking.demands || [];
          const receipts = booking.receipts || [];
          const totalDemanded = demands.reduce((acc, d) => acc + (d.amount || 0), 0);
          const totalPaid = demands.reduce((acc, d) => acc + (d.paidAmount || 0), 0);
          const totalOutstanding = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header & Action Bar */}
              <Card style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                        Demand Register &amp; Milestone Engine
                      </span>
                      <span style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12
                      }}>
                        ⚡ Per-Flat Engine
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      Demands are computed from this flat's frozen plan (Total Flat Cost E: {fmt(booking.costSheetData?.pricing?.totalFlatCost || booking.totalFlatPrice || booking.basePrice)}) · Section 6.1–6.3
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={handleOpenRaiseDemand}
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        padding: "9px 16px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 1px 3px rgba(37,99,235,0.3)"
                      }}
                    >
                      ⚡ Raise Next Demand
                    </button>
                    <button
                      onClick={handleOpenBatchModal}
                      style={{
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        padding: "9px 16px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 1px 3px rgba(5,150,105,0.3)"
                      }}
                    >
                      🏢 Tower Batch Issue
                    </button>
                  </div>
                </div>

                {/* Metrics Summary Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Demanded</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{fmt(totalDemanded)}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{demands.length} Demands Raised</div>
                  </div>
                  <div style={{ background: "#f0fdf4", padding: "12px 14px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 11, color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Total Paid</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d", marginTop: 4 }}>{fmt(totalPaid)}</div>
                    <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>{receipts.length} Receipts Posted</div>
                  </div>
                  <div style={{ background: "#fef2f2", padding: "12px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600, textTransform: "uppercase" }}>Current Outstanding</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>{fmt(totalOutstanding)}</div>
                    <div style={{ fontSize: 11, color: "#991b1b", marginTop: 2 }}>Debits − Credits on Ledger</div>
                  </div>
                  <div style={{ background: "#eff6ff", padding: "12px 14px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 600, textTransform: "uppercase" }}>Frozen Principal Base (E)</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
                      {fmt(booking.costSheetData?.pricing?.totalFlatCost || booking.totalFlatPrice || booking.basePrice)}
                    </div>
                    <div style={{ fontSize: 11, color: "#1e40af", marginTop: 2 }}>Flat Cost (C) + Parking (D)</div>
                  </div>
                </div>
              </Card>

              {/* Demands Table */}
              <Card>
                <SectionTitle title="Demand History Register" sub="Every demand issued posts a DEBIT to the customer ledger and increases outstanding" />
                {demands.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#fef2f2" }}>
                          {["Demand No", "Milestone", "Principal", "GST (5%)", "Total Demanded", "Paid", "Outstanding", "Issued Date", "Due Date", "Status", "Actions"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", color: "#b91c1c", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #fecaca", textAlign: h === "Status" || h === "Actions" ? "center" : "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {demands.map((dem) => (
                          <tr key={dem.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>
                              {dem.demandNo}
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                              {dem.description || "Milestone"}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(dem.principal)}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(dem.gst)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{fmt(dem.amount)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "#15803d" }}>{fmt(dem.paidAmount)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: (dem.outstandingAmount || 0) > 0 ? "#b91c1c" : "#15803d" }}>
                              {fmt(dem.outstandingAmount)}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(dem.issuedAt || dem.createdAt)}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(dem.dueDate)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <span style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 700,
                                background: dem.status === "PAID" ? "#d1fae5" : dem.status === "PARTIALLY_PAID" ? "#fef3c7" : dem.status === "OVERDUE" ? "#fee2e2" : "#dbeafe",
                                color: dem.status === "PAID" ? "#065f46" : dem.status === "PARTIALLY_PAID" ? "#92400e" : dem.status === "OVERDUE" ? "#991b1b" : "#1d4ed8"
                              }}>
                                {dem.status}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                <button
                                  onClick={() => handleViewDemandLetter(dem)}
                                  style={{ padding: "4px 8px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                  title="View Demand Letter"
                                >
                                  📄 Letter
                                </button>
                                {(dem.outstandingAmount || 0) > 0 && (
                                  <button
                                    onClick={() => handleOpenRecordReceipt(dem)}
                                    style={{ padding: "4px 8px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                    title="Collect payment on this demand"
                                  >
                                    💳 Pay
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
                    <div style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>No Demands Raised Yet for this Flat</div>
                    <div style={{ fontSize: 12, marginBottom: 16 }}>Click "Raise Next Demand" to generate the first installment notice from this flat's frozen plan.</div>
                    <button
                      onClick={handleOpenRaiseDemand}
                      style={{ padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      ⚡ Raise Next Demand
                    </button>
                  </div>
                )}
              </Card>
            </div>
          );
        })()}

        {/* ── 6.4 Collections Tab — Money Side & Receipts ── */}
        {activeTab === "collections" && (() => {
          const receipts = booking.receipts || [];
          const demands = booking.demands || [];
          const totalDemanded = demands.reduce((acc, d) => acc + (d.amount || 0), 0);
          const totalPaid = receipts.reduce((acc, r) => acc + (r.amount || 0), 0);
          const totalOutstanding = Math.max(0, totalDemanded - totalPaid);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header & Action Bar */}
              <Card style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                        Collections &amp; Payment Receipts
                      </span>
                      <span style={{
                        background: "#d1fae5",
                        color: "#065f46",
                        border: "1px solid #86efac",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12
                      }}>
                        💵 The Money Side
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      Receipts credit the customer ledger, reduce outstanding, and update demand status to Paid / Partially Paid · Section 6.4
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRecordReceipt()}
                    style={{
                      background: "#15803d",
                      color: "#fff",
                      border: "none",
                      padding: "9px 18px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 3px rgba(21,128,61,0.3)"
                    }}
                  >
                    💳 Record Payment / Receipt
                  </button>
                </div>

                {/* Metrics Summary Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Demanded</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{fmt(totalDemanded)}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{demands.length} Demands</div>
                  </div>
                  <div style={{ background: "#f0fdf4", padding: "12px 14px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 11, color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Total Collected</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d", marginTop: 4 }}>{fmt(totalPaid)}</div>
                    <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>Credits Posted to Ledger</div>
                  </div>
                  <div style={{ background: "#fef2f2", padding: "12px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600, textTransform: "uppercase" }}>Current Outstanding</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>{fmt(totalOutstanding)}</div>
                    <div style={{ fontSize: 11, color: "#991b1b", marginTop: 2 }}>Drives Outstanding Dashboard Tile</div>
                  </div>
                </div>
              </Card>

              {/* Collections Receipts Table */}
              <Card>
                <SectionTitle title="Receipts Register" sub="Every receipt posts a CREDIT to the customer ledger and decreases outstanding" />
                {receipts.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f0fdf4" }}>
                          {["Receipt No", "Amount", "Mode", "Reference Number", "Received On", "Status"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", color: "#065f46", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #86efac" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map((rec) => (
                          <tr key={rec.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>{rec.receiptNo}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#15803d" }}>{fmt(rec.amount)}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#e0f2fe", color: "#0369a1" }}>
                                {rec.mode || "NEFT"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{rec.referenceNumber || "—"}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(rec.receivedAt || rec.createdAt)}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>
                                {rec.status || "POSTED"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
                    <div style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>No Collections Recorded Yet</div>
                    <div style={{ fontSize: 12, marginBottom: 16 }}>Record customer payments against issued demands to credit the ledger.</div>
                    <button
                      onClick={() => handleOpenRecordReceipt()}
                      style={{ padding: "8px 18px", background: "#15803d", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      💳 Record Payment / Receipt
                    </button>
                  </div>
                )}
              </Card>
            </div>
          );
        })()}

        {/* ── 6.4 Customer Ledger Tab — The Reconciled Running Account ── */}
        {activeTab === "ledger" && (() => {
          const ledgerEntries = booking.ledgerEntries || [];
          let runningBal = 0;
          let totalDebits = 0;
          let totalCredits = 0;

          const calculatedEntries = ledgerEntries.map(e => {
            if (e.type === "DEBIT") {
              runningBal += e.amount;
              totalDebits += e.amount;
            } else {
              runningBal -= e.amount;
              totalCredits += e.amount;
            }
            return { ...e, balance: runningBal };
          });

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header Card */}
              <Card style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                        Customer Ledger (Reconciled Account)
                      </span>
                      <span style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12
                      }}>
                        ⚖️ Single Source of Truth
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      Demands post DEBITs (+), receipts post CREDITs (−). Outstanding = sum(debits) − sum(credits) · Section 6.4
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ background: "#fef2f2", padding: "6px 12px", borderRadius: 8, border: "1px solid #fecaca", fontSize: 12 }}>
                      <span style={{ color: "#991b1b", fontWeight: 600 }}>Total Debits: </span>
                      <strong style={{ color: "#b91c1c" }}>+{fmt(totalDebits)}</strong>
                    </div>
                    <div style={{ background: "#f0fdf4", padding: "6px 12px", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 12 }}>
                      <span style={{ color: "#166534", fontWeight: 600 }}>Total Credits: </span>
                      <strong style={{ color: "#15803d" }}>−{fmt(totalCredits)}</strong>
                    </div>
                    <div style={{ background: "#eff6ff", padding: "6px 14px", borderRadius: 8, border: "1px solid #bfdbfe", fontSize: 12 }}>
                      <span style={{ color: "#1e40af", fontWeight: 600 }}>Net Balance: </span>
                      <strong style={{ color: runningBal > 0 ? "#b91c1c" : "#15803d", fontSize: 14 }}>{fmt(runningBal)}</strong>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Ledger Statement Table */}
              <Card>
                <SectionTitle title="Running Statement of Account" sub="Chronological statement of all billing and collection events" />
                {calculatedEntries.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#eff6ff" }}>
                          {["Date", "Transaction Description", "Type", "Debit (+)", "Credit (−)", "Running Balance"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #bfdbfe", textAlign: h.includes("Balance") || h.includes("Debit") || h.includes("Credit") ? "right" : "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedEntries.map((entry) => (
                          <tr key={entry.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(entry.date)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{entry.description || "—"}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 700,
                                background: entry.type === "CREDIT" ? "#d1fae5" : "#fee2e2",
                                color: entry.type === "CREDIT" ? "#065f46" : "#991b1b"
                              }}>
                                {entry.type}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#b91c1c", textAlign: "right" }}>
                              {entry.type === "DEBIT" ? `+${fmt(entry.amount)}` : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#15803d", textAlign: "right" }}>
                              {entry.type === "CREDIT" ? `−${fmt(entry.amount)}` : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 800, color: entry.balance > 0 ? "#b91c1c" : "#15803d", textAlign: "right" }}>
                              {fmt(entry.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📒</div>
                    <div style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>Customer Ledger is Empty</div>
                    <div style={{ fontSize: 12 }}>Issue a demand in the Demands tab to generate the first debit entry.</div>
                  </div>
                )}
              </Card>
            </div>
          );
        })()}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <Card>
            <SectionTitle title="Document Activity Log" sub="All actions performed on documents for this booking" />
            {booking.documentAuditLogs?.length > 0 ? (
              <div>
                {booking.documentAuditLogs.map((log) => {
                  const iconMap = { GENERATE: "📄", PREVIEW: "👁️", DOWNLOAD: "⬇️", PRINT: "🖨️" };
                  return (
                    <div key={log.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 22, minWidth: 32, textAlign: "center" }}>{iconMap[log.action] || "📌"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                          {log.action} — {String(log.type).replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{log.details}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          By: {log.performedBy || "Admin"} &nbsp;·&nbsp; {fmtDateTime(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
                <div>No activity logged yet. Generate a document to see the first entry.</div>
              </div>
            )}
          </Card>
        )}

      </div>

      {/* ── Document Preview Modal ── */}
      {previewDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setPreviewDoc(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(900px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{previewDoc.title}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handlePrint(previewDoc)} style={{ padding: "7px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Print</button>
                <button onClick={() => setPreviewDoc(null)} style={{ padding: "7px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Close</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <iframe srcDoc={getBrandedDocumentHtml(previewDoc.htmlContent)} style={{ width: "100%", height: "100%", minHeight: "70vh", border: "none" }} title="Document Preview" />
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Version History Modal (Section 7: Versioning) ── */}
      {versionHistoryDocType && (() => {
        const docMeta = DOC_META[versionHistoryDocType] || {};
        const versions = (booking?.generatedDocuments || [])
          .filter(d => d.type === versionHistoryDocType)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={() => setVersionHistoryDocType(null)}>
            <div style={{ background: "#fff", borderRadius: 14, width: "min(680px, 100%)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>📜 Version History — {docMeta.label}</span>
                    <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                      {versions.length} Versions Stored
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Every generation creates an immutable statutory snapshot retrievable at any time.
                  </div>
                </div>
                <button onClick={() => setVersionHistoryDocType(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>
                  ✕
                </button>
              </div>

              <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {versions.map((ver, idx) => {
                  const versionNum = versions.length - idx;
                  const isLatest = idx === 0;
                  return (
                    <div key={ver.id || idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 18px",
                      borderRadius: 10,
                      border: isLatest ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: isLatest ? "#eff6ff" : "#fff"
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: isLatest ? "#1d4ed8" : "#0f172a" }}>
                            Version {versionNum} {isLatest && "(Latest)"}
                          </span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            · {fmtDateTime(ver.createdAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          {ver.title || `${docMeta.label} v${versionNum}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { setPreviewDoc(ver); setVersionHistoryDocType(null); }}
                          style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => handleDownload(ver)}
                          style={{ padding: "6px 10px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => handlePrint(ver)}
                          style={{ padding: "6px 10px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          🖨️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 6.3 Interactive Raise Demand Modal (Per-Flat Frozen Engine) ── */}
      {isRaiseDemandOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !issuingDemand && setIsRaiseDemandOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(680px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚡ Issue Milestone Demand Notice</span>
                  <span style={{ fontSize: 11, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                    Section 6 Engine
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Flat {booking.unitItem?.name || booking.unit?.unitNo} · Agreed Base E: {fmt(demandPreview?.calculation?.totalFlatCostE)}
                </div>
              </div>
              <button onClick={() => setIsRaiseDemandOpen(false)} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {loadingDemandPreview ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <div>Calculating demand from flat's frozen plan...</div>
                </div>
              ) : demandPreview?.calculation ? (() => {
                const c = demandPreview.calculation;
                return (
                  <div>
                    {/* Milestone Banner */}
                    <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase" }}>Target Milestone (From Frozen Plan)</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginTop: 2 }}>
                        {c.milestoneName} ({c.percentage}%)
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                        Basis: {c.percentage}% of Total Flat Cost (E) ₹{c.totalFlatCostE?.toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Principal Installment ({c.percentage}%)</td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>₹{c.principal?.toLocaleString("en-IN")}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>
                            GST @ 5%
                            {c.isDeferredGst && <span style={{ marginLeft: 6, fontSize: 10, color: "#a16207", background: "#fef9c3", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>Deferred to Registration</span>}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: c.isDeferredGst ? "#94a3b8" : "#0f172a" }}>
                            {c.isDeferredGst ? "—" : `₹${c.gst?.toLocaleString("en-IN")}`}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>
                            TDS @ 1% (Buyer's Deduction)
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>Informational only — NOT added to demand total</div>
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", color: "#64748b" }}>
                            {c.isDeferredGst ? "—" : `₹${c.tds?.toLocaleString("en-IN")}`}
                          </td>
                        </tr>
                        {c.accruedInterest > 0 && (
                          <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#fef2f2" }}>
                            <td style={{ padding: "8px 6px", color: "#991b1b", fontWeight: 600 }}>
                              Overdue Interest @ {demandInterestRate}% p.a.
                              <div style={{ fontSize: 11, color: "#b91c1c" }}>Accrued on overdue principal from prior demands</div>
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "#b91c1c" }}>
                              +₹{c.accruedInterest?.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        )}
                        <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                          <td style={{ padding: "10px 8px", fontWeight: 800, color: "#1e293b", fontSize: 14 }}>
                            New Installment Demanded
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#1d4ed8", fontSize: 16 }}>
                            ₹{c.demandAmount?.toLocaleString("en-IN")}
                          </td>
                        </tr>
                        {c.priorOutstanding > 0 && (
                          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 0", color: "#64748b" }}>Prior Unpaid Outstanding</td>
                            <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: "#b91c1c" }}>
                              +₹{c.priorOutstanding?.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        )}
                        <tr style={{ background: "#f0fdf4" }}>
                          <td style={{ padding: "10px 8px", fontWeight: 800, color: "#166534", fontSize: 14 }}>
                            Total Amount Now Payable
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#15803d", fontSize: 16 }}>
                            ₹{c.totalPayableNow?.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Inputs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                          Payment Window (Days from Issue)
                        </label>
                        <input
                          type="number"
                          value={demandDueDays}
                          onChange={e => setDemandDueDays(Math.max(1, Number(e.target.value)))}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                          Overdue Interest Rate (% p.a.)
                        </label>
                        <input
                          type="number"
                          value={demandInterestRate}
                          onChange={e => setDemandInterestRate(Math.max(0, Number(e.target.value)))}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12, fontSize: 11, color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: 6 }}>
                      ℹ️ <strong>Ledger Impact:</strong> Issuing this demand will automatically post a <strong>DEBIT of ₹{c.demandAmount?.toLocaleString("en-IN")}</strong> to the flat's customer ledger and increase its outstanding.
                    </div>
                  </div>
                );
              })() : (
                <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                  Unable to calculate demand for this flat.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <button
                type="button"
                onClick={() => setIsRaiseDemandOpen(false)}
                disabled={issuingDemand}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueDemand}
                disabled={issuingDemand || !demandPreview?.calculation}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: issuingDemand ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {issuingDemand ? "Issuing Demand..." : "🚀 Issue Demand & Post Debit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6.4 Interactive Record Receipt Modal (Collections) ── */}
      {isRecordReceiptOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !savingReceipt && setIsRecordReceiptOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(560px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#f0fdf4" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#166534" }}>
                  💳 Record Payment Receipt
                </div>
                <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                  Posts a CREDIT to customer ledger &amp; reduces outstanding
                </div>
              </div>
              <button onClick={() => setIsRecordReceiptOpen(false)} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <form onSubmit={handleSaveReceipt} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500000"
                    value={receiptForm.amount}
                    onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Payment Mode *
                    </label>
                    <select
                      value={receiptForm.mode}
                      onChange={e => setReceiptForm({ ...receiptForm, mode: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    >
                      <option value="NEFT">NEFT / Bank Transfer</option>
                      <option value="RTGS">RTGS</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CHEQUE">Cheque / DD</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Reference / UTR / Cheque # *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UTR-987654321"
                      value={receiptForm.referenceNumber}
                      onChange={e => setReceiptForm({ ...receiptForm, referenceNumber: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Received Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={receiptForm.receivedAt}
                      onChange={e => setReceiptForm({ ...receiptForm, receivedAt: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      TDS Deducted (₹) [Informational]
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={receiptForm.tdsDeducted}
                      onChange={e => setReceiptForm({ ...receiptForm, tdsDeducted: Number(e.target.value) })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#166534", background: "#f0fdf4", padding: "10px 14px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                  ℹ️ <strong>Auto-Allocation:</strong> This payment will be credited to the customer ledger and automatically allocated against pending demands in chronological order, updating their status to Paid or Partially Paid.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setIsRecordReceiptOpen(false)}
                  disabled={savingReceipt}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReceipt}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: "none",
                    background: "#15803d",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: savingReceipt ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {savingReceipt ? "Posting Receipt..." : "✅ Post Receipt & Credit Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6.3 Interactive Tower Batch Milestone Issue Modal ── */}
      {isBatchModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !issuingBatch && setIsBatchModalOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(840px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
                  🏢 Tower Construction Milestone Batch Generator
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Admin marks milestone reached → Engine computes per-flat demand from each flat's frozen plan · Section 6.3
                </div>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {/* Milestone Selector */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 18 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    Select Achieved Construction Milestone
                  </label>
                  <select
                    value={batchMilestone}
                    onChange={e => {
                      setBatchMilestone(e.target.value);
                      fetchBatchPreview(e.target.value);
                    }}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  >
                    <option value="Advance on Booking">Advance on Booking (10%)</option>
                    <option value="On Registration of Sales Agreement">On Registration of Sales Agreement (20%)</option>
                    <option value="On Completion of Plinth">On Completion of Plinth (15%)</option>
                    <option value="On Slab wise upto 14th Floor (due as per slab)***">On Slab wise upto 14th Floor (25%)</option>
                    <option value="On Execution of Internal Amenities of Flat">On Execution of Internal Amenities (10%)</option>
                    <option value="On Execution of External Amenities of Flat">On Execution of External Amenities (10%)</option>
                    <option value="On Execution of Lift & Paint">On Execution of Lift &amp; Paint (5%)</option>
                    <option value="Before handing over or on receipt of OC">Before handing over / On OC (5%)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => fetchBatchPreview(batchMilestone)}
                  disabled={loadingBatchPreview}
                  style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  🔄 Refresh Preview
                </button>
              </div>

              {loadingBatchPreview ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <div>Scanning sold flats &amp; evaluating frozen payment plans...</div>
                </div>
              ) : batchPreviewData ? (
                <div>
                  {/* Batch Summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
                    <div style={{ background: "#eff6ff", padding: "10px 12px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700 }}>Eligible Flats</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8", marginTop: 2 }}>{batchPreviewData.eligibleFlatsCount} of {batchPreviewData.totalFlats}</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Total Principal</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>₹{batchPreviewData.totalPrincipal?.toLocaleString("en-IN")}</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Total GST (5%)</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>₹{batchPreviewData.totalGst?.toLocaleString("en-IN")}</div>
                    </div>
                    <div style={{ background: "#f0fdf4", padding: "10px 12px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>Total Demanded</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d", marginTop: 2 }}>₹{batchPreviewData.totalDemanded?.toLocaleString("en-IN")}</div>
                    </div>
                  </div>

                  {/* Flats Table */}
                  <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          {["Unit No", "Customer", "Base E", "Principal", "GST (5%)", "Total Demanded", "Status"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {batchPreviewData.flats?.map(f => (
                          <tr key={f.bookingId} style={{ borderBottom: "1px solid #f1f5f9", background: f.status === "ELIGIBLE" ? "#fff" : "#f8fafc" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 700 }}>{f.unitNo}</td>
                            <td style={{ padding: "8px 12px", color: "#334155" }}>{f.customerName}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b" }}>₹{f.calculation?.totalFlatCostE?.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600 }}>₹{f.calculation?.principal?.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b" }}>₹{f.calculation?.gst?.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1d4ed8" }}>₹{f.calculation?.demandAmount?.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 700,
                                background: f.status === "ELIGIBLE" ? "#d1fae5" : "#f1f5f9",
                                color: f.status === "ELIGIBLE" ? "#065f46" : "#64748b"
                              }}>
                                {f.status === "ELIGIBLE" ? "Eligible" : "Already Demanded"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                disabled={issuingBatch}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDemands}
                disabled={issuingBatch || !batchPreviewData || batchPreviewData.eligibleFlatsCount === 0}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#059669",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: (issuingBatch || !batchPreviewData || batchPreviewData.eligibleFlatsCount === 0) ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {issuingBatch ? "Generating Batch..." : `🚀 Issue Batch for ${batchPreviewData?.eligibleFlatsCount || 0} Flats`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Viewing Demand Letter Modal ── */}
      {viewingDemandLetter && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setViewingDemandLetter(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(900px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>
                Demand Note: {viewingDemandLetter.demandNo} — {viewingDemandLetter.description}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    printWindow.document.write(getBrandedDocumentHtml(demandLetterHtml));
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                  }}
                  style={{ padding: "7px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  🖨️ Print Notice
                </button>
                <button onClick={() => setViewingDemandLetter(null)} style={{ padding: "7px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Close</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {loadingDemandLetter ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <div>Loading demand notice...</div>
                </div>
              ) : (
                <iframe srcDoc={getBrandedDocumentHtml(demandLetterHtml)} style={{ width: "100%", height: "100%", minHeight: "70vh", border: "none" }} title="Demand Letter Preview" />
              )}
            </div>
          </div>
        </div>
      )}

    </MasterLayout>
  );
};

export default PostSalesDetailsPage;
