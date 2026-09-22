const prisma = require("../lib/prisma");

const formatCurrency = (val) => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "—";
  return Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DEFAULT_PAYMENT_SCHEDULE = [
  { name: "EOI", value: 10, towerMilestone: "Booking" },
  { name: "On Registration of Sales Agreement", value: 20, towerMilestone: "Registration" },
  { name: "On Completion of Plinth", value: 15, towerMilestone: "Plinth" },
  { name: "On Slab wise upto 14th Floor (due as per slab)***", value: 25, towerMilestone: "Slab" },
  { name: "On Execution of Internal Amenities of Flat", value: 10, towerMilestone: "Internal Amenities" },
  { name: "On Execution of External Amenities of Flat", value: 10, towerMilestone: "External Amenities" },
  { name: "On Execution of Lift & Paint", value: 5, towerMilestone: "Lift & Paint" },
  { name: "Before handing over or on receipt of OC", value: 5, towerMilestone: "Possession" },
];

const DEFAULT_FOOTER_NOTES = [
  "GST & Stamp Duty is as per the prevailing Govt. Norms.",
  "Society Development charges shall be applicable at the time of possessions as decided by society proportionate to all.",
  "NOTE: Committee Reserve the rights to change the price, configuration if not booked (rates are for 7 days).",
];

const parseJsonSafe = (val, fallback = null) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

/**
 * Authoritative Cost Sheet Data Builder
 * Loads all relevant entities for a booking and produces a normalized, frozen data structure.
 */
async function buildBookingCostSheetData(bookingId, options = {}) {
  const numericId = Number(bookingId);
  if (!numericId || Number.isNaN(numericId)) {
    throw new Error("Invalid booking ID provided for Cost Sheet generation");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: numericId },
    include: {
      lead: {
        include: {
          leadAddress: true,
          personalAddress: true,
        },
      },
      unit: {
        include: {
          project: true,
          tower: true,
          floor: true,
        },
      },
      unitItem: true,
      costSheet: { orderBy: { sortOrder: "asc" } },
      bookingCharges: true,
      bookingExpenses: { orderBy: { sortOrder: "asc" } },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!booking) {
    throw new Error(`Booking #${bookingId} not found`);
  }

  // Determine Project & Tower
  let project = booking.unit?.project;
  if (!project && booking.projectId) {
    project = await prisma.project.findUnique({ where: { id: booking.projectId } });
  }

  let tower = booking.unit?.tower;
  if (!tower && booking.towerId) {
    tower = await prisma.tower.findUnique({ where: { id: booking.towerId } });
  }

  const floorPlan = booking.unit?.floor;
  const unitItem = booking.unitItem;

  // Project address composition
  let projectAddress = project?.address || "";
  if (!projectAddress && project) {
    projectAddress = [project.street, project.locality, project.city, project.state, project.zip]
      .filter(Boolean)
      .join(", ");
  }
  if (!projectAddress) {
    projectAddress = "Plot No 35/37, Sector No 2, RDP 1, Charkop Kandivali West Mumbai 400067";
  }

  const projectName = project?.name || booking.projectDetails || "PROJECT NAME";
  const eoiTitle = project?.integratedPortals || "Expression of Interest in Proposed Self-Redevelopment";

  // Unit Number & Configuration
  const unitNo =
    unitItem?.name ||
    booking.unit?.unitNo ||
    booking.unit?.name ||
    (booking.unitId ? `Unit #${booking.unitId}` : "A-1401");

  const isCommercial =
    String(unitNo).startsWith("SH-") ||
    String(booking.unit?.type || "").toLowerCase().includes("commercial") ||
    String(project?.projectType || "").toLowerCase().includes("commercial");

  const configuration =
    floorPlan?.configurationLabel ||
    (isCommercial ? "Shop" : booking.unit?.type || floorPlan?.type || "2 BHK");

  // Carpet Area & Rates
  const carpetArea = Number(
    booking.carpetArea ||
    floorPlan?.carpet ||
    booking.unit?.carpet ||
    641.86
  );

  const flatRate = Number(
    booking.closingBaseRate ||
    booking.closingRate ||
    booking.baseRate ||
    unitItem?.baseRate ||
    floorPlan?.baseRate ||
    18750
  );

  const flatCost = Number((carpetArea * flatRate).toFixed(2));

  // Parking
  const parkingAmount = Number(
    booking.parkingAmount ??
    booking.parkingCharges ??
    booking.priceSnapshot?.parkingAmount ??
    booking.priceSnapshot?.parkingCharges ??
    booking.priceSnapshot?.bookingPricing?.parkingAmount ??
    booking.priceSnapshot?.bookingPricing?.parkingCharges ??
    0
  );
  const carParkingSlots = Number(
    booking.carParkingSlots ??
    booking.priceSnapshot?.carParkingSlots ??
    (parkingAmount > 0 ? 1 : 0)
  );
  const totalFlatCost = Number((flatCost + parkingAmount).toFixed(2));

  // Taxes & Other Charges
  const gstPercent = Number(
    booking.gstPercent !== null && booking.gstPercent !== undefined
      ? booking.gstPercent
      : floorPlan?.gstPercent !== null && floorPlan?.gstPercent !== undefined
      ? floorPlan.gstPercent
      : 5
  );

  const stampDutyPercent = Number(
    booking.stampDutyPercent !== null && booking.stampDutyPercent !== undefined
      ? booking.stampDutyPercent
      : floorPlan?.stampDutyPercent !== null && floorPlan?.stampDutyPercent !== undefined
      ? floorPlan.stampDutyPercent
      : 6
  );

  const tdsPercent = 1.0; // Standard 1% TDS on principal

  // If frozen tax amounts exist on booking, use them, otherwise compute from base
  const gstAmount = Number(
    booking.gstAmount !== null && booking.gstAmount !== undefined
      ? booking.gstAmount
      : ((totalFlatCost * gstPercent) / 100).toFixed(2)
  );

  const stampDutyAmount = Number(
    booking.stampDutyAmount !== null && booking.stampDutyAmount !== undefined
      ? booking.stampDutyAmount
      : ((totalFlatCost * stampDutyPercent) / 100).toFixed(2)
  );

  const legalCharges = Number(
    booking.legalDocumentationCharges !== null && booking.legalDocumentationCharges !== undefined
      ? booking.legalDocumentationCharges
      : booking.legalCharges !== null && booking.legalCharges !== undefined
      ? booking.legalCharges
      : booking.priceSnapshot?.legalCharges ??
        booking.priceSnapshot?.bookingPricing?.legalCharges ??
        0
  );

  const registrationCharges = Number(
    booking.registrationAmount !== null && booking.registrationAmount !== undefined
      ? booking.registrationAmount
      : booking.registrationCharges !== null && booking.registrationCharges !== undefined
      ? booking.registrationCharges
      : booking.priceSnapshot?.registrationCharges ??
        booking.priceSnapshot?.bookingPricing?.registrationCharges ??
        floorPlan?.registrationAmount ??
        0
  );

  // Other expenses from customOtherCharges / bookingExpenses / bookingCharges
  let otherExpensesList = [];
  const rawCustom = parseJsonSafe(booking.customOtherCharges, booking.customOtherCharges);
  if (Array.isArray(rawCustom) && rawCustom.length > 0) {
    otherExpensesList = rawCustom.map((ch) => ({
      name: ch.name || ch.expenseName || "Other Expense",
      amount: Number(ch.amount ?? ch.rate ?? 0),
      type: ch.chargeType || "Fixed",
    })).filter((ch) => ch.amount > 0 || (ch.name && String(ch.name).trim()));
  } else if (Array.isArray(booking.bookingExpenses) && booking.bookingExpenses.length > 0) {
    otherExpensesList = booking.bookingExpenses.map((ch) => ({
      name: ch.name || "Other Expense",
      amount: Number(ch.amount || 0),
      type: ch.chargeType || "Fixed",
    })).filter((ch) => ch.amount > 0 || (ch.name && String(ch.name).trim()));
  } else if (Array.isArray(booking.bookingCharges) && booking.bookingCharges.length > 0) {
    otherExpensesList = booking.bookingCharges
      .filter((ch) => !["GST", "STAMP_DUTY", "REGISTRATION", "LEGAL", "PARKING"].includes(ch.code))
      .map((ch) => ({
        name: ch.name || "Other Expense",
        amount: Number(ch.amount || 0),
        type: ch.chargeType || "Fixed",
      })).filter((ch) => ch.amount > 0 || (ch.name && String(ch.name).trim()));
  }

  // Check specific named charges if not in list
  if (Number(booking.infrastructureDevelopmentCharges) > 0 && !otherExpensesList.some(e => String(e.name).toLowerCase().includes("infrastructure"))) {
    otherExpensesList.push({ name: "Infrastructure/Development Charges", amount: Number(booking.infrastructureDevelopmentCharges) });
  }
  if (Number(booking.societyFormationCharges) > 0 && !otherExpensesList.some(e => String(e.name).toLowerCase().includes("society"))) {
    otherExpensesList.push({ name: "Society Formation Charges", amount: Number(booking.societyFormationCharges) });
  }
  if (Number(booking.clubMembershipCharges) > 0 && !otherExpensesList.some(e => String(e.name).toLowerCase().includes("club"))) {
    otherExpensesList.push({ name: "Club Membership Charges", amount: Number(booking.clubMembershipCharges) });
  }
  if (Number(booking.sinkingFundCorpus) > 0 && !otherExpensesList.some(e => String(e.name).toLowerCase().includes("sinking"))) {
    otherExpensesList.push({ name: "Sinking Fund/Corpus", amount: Number(booking.sinkingFundCorpus) });
  }

  const otherExpenseTotal = Number(
    booking.otherExpenseTotal !== null && booking.otherExpenseTotal !== undefined
      ? booking.otherExpenseTotal
      : otherExpensesList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  );

  const subTotal = Number((gstAmount + stampDutyAmount + legalCharges + registrationCharges + otherExpenseTotal).toFixed(2));
  const grandTotal = Number((totalFlatCost + subTotal).toFixed(2));

  // Agreement Value vs Final Sold Price
  const agreementValue = Number(
    booking.agreementValue !== null && booking.agreementValue !== undefined
      ? booking.agreementValue
      : totalFlatCost
  );

  const finalSoldPrice = Number(
    booking.soldPrice !== null && booking.soldPrice !== undefined
      ? booking.soldPrice
      : booking.totalPrice !== null && booking.totalPrice !== undefined
      ? booking.totalPrice
      : grandTotal
  );

  // Payment Schedule Basis
  const paymentScheduleBasis = options.paymentScheduleBasis || "AGREEMENT_VALUE";
  const paymentBasisAmount =
    paymentScheduleBasis === "FINAL_SOLD_PRICE" ? finalSoldPrice : agreementValue;

  // Build Payment Schedule Rows
  let scheduleRows = [];
  if (booking.paymentSchedule && booking.paymentSchedule.length > 0) {
    let runningCumulative = 0;
    scheduleRows = booking.paymentSchedule.map((item, idx) => {
      const pVal = Number(item.value || 0);
      runningCumulative += pVal;
      const principal = item.amount !== null && item.amount !== undefined
        ? Number(item.amount)
        : Number(((paymentBasisAmount * pVal) / 100).toFixed(2));
      const tds = item.tds !== null && item.tds !== undefined
        ? Number(item.tds)
        : Number(((principal * tdsPercent) / 100).toFixed(2));
      const gst = item.taxes !== null && item.taxes !== undefined
        ? Number(item.taxes)
        : Number(((principal * gstPercent) / 100).toFixed(2));
      const rowGrandTotal = Number((principal + gst).toFixed(2));

      return {
        id: item.id,
        name: item.name,
        towerMilestone: item.towerMilestone || "",
        value: pVal,
        percentage: pVal,
        cumlPercent: Number(runningCumulative.toFixed(2)),
        tentative: idx === 0 ? "Due" : "",
        amount: principal,
        tds,
        gst,
        grandTotal: rowGrandTotal,
      };
    });
  } else {
    // Default or project configured schedule
    let runningCumulative = 0;
    scheduleRows = DEFAULT_PAYMENT_SCHEDULE.map((item, idx) => {
      runningCumulative += item.value;
      const principal = Number(((paymentBasisAmount * item.value) / 100).toFixed(2));
      const tds = Number(((principal * tdsPercent) / 100).toFixed(2));
      const gst = Number(((principal * gstPercent) / 100).toFixed(2));
      const rowGrandTotal = Number((principal + gst).toFixed(2));

      return {
        name: item.name,
        towerMilestone: item.towerMilestone,
        value: item.value,
        percentage: item.value,
        cumlPercent: Number(runningCumulative.toFixed(2)),
        tentative: idx === 0 ? "Due" : "",
        amount: principal,
        tds,
        gst,
        grandTotal: rowGrandTotal,
      };
    });
  }

  // Reconcile schedule totals
  const totalPercentage = Number(scheduleRows.reduce((acc, r) => acc + (r.value || 0), 0).toFixed(2));
  const totalPrincipal = Number(scheduleRows.reduce((acc, r) => acc + (r.amount || 0), 0).toFixed(2));
  const totalTds = Number(scheduleRows.reduce((acc, r) => acc + (r.tds || 0), 0).toFixed(2));
  const totalGst = Number(scheduleRows.reduce((acc, r) => acc + (r.gst || 0), 0).toFixed(2));
  const scheduleGrandTotal = Number(scheduleRows.reduce((acc, r) => acc + (r.grandTotal || 0), 0).toFixed(2));

  // Customer / Lead details
  const lead = booking.lead;
  const customerName =
    booking.customerName ||
    [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
    lead?.name ||
    "Customer";

  const customerPhone =
    (Array.isArray(lead?.phones) ? lead.phones[0]?.value || lead.phones[0] : null) ||
    lead?.phone ||
    "";

  const customerEmail =
    (Array.isArray(lead?.emails) ? lead.emails[0]?.value || lead.emails[0] : null) ||
    lead?.email ||
    "";

  const bookingDate = booking.bookedOn
    ? new Date(booking.bookedOn).toLocaleDateString("en-IN")
    : new Date(booking.createdAt).toLocaleDateString("en-IN");

  const footerNotes = DEFAULT_FOOTER_NOTES;

  return {
    bookingId: booking.id,
    bookingReference: `BKG-${booking.id}`,
    bookingDate,
    stage: booking.stage || "Booked",
    project: {
      id: project?.id,
      name: projectName,
      address: projectAddress,
      eoiTitle,
    },
    tower: {
      id: tower?.id,
      name: tower?.name || "Tower A",
    },
    floorPlan: {
      id: floorPlan?.id,
      name: floorPlan?.name || "",
      configuration,
    },
    unit: {
      id: booking.unitId,
      unitItemId: unitItem?.id,
      unitNo,
      isCommercial,
      carpetArea,
      configuration,
    },
    customer: {
      id: lead?.id,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    },
    pricing: {
      carpetArea,
      flatRate,
      flatCost,
      carParkingSlots,
      parkingAmount,
      totalFlatCost,
      gstPercent,
      gstAmount,
      stampDutyPercent,
      stampDutyAmount,
      legalCharges,
      registrationCharges,
      otherExpenses: otherExpensesList,
      otherExpenseTotal,
      subTotal,
      grandTotal,
      agreementValue,
      finalSoldPrice,
      paymentScheduleBasis,
      paymentBasisAmount,
      customCharges: otherExpensesList,
    },
    paymentSchedule: {
      rows: scheduleRows,
      totalPercentage,
      totalPrincipal,
      totalTds,
      totalGst,
      scheduleGrandTotal,
      reconciled: Math.abs(totalPercentage - 100) < 0.01,
    },
    footerNotes,
    signatory: {
      customerName,
      bookingDate,
      projectName,
    },
  };
}

module.exports = {
  buildBookingCostSheetData,
  DEFAULT_PAYMENT_SCHEDULE,
  DEFAULT_FOOTER_NOTES,
  formatCurrency,
};
