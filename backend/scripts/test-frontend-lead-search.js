const assert = require("assert");

// Copy of frontend leadSearch.js logic to test directly in Node environment
const extractPhoneStrings = (item) => {
  if (!item) return [];
  const list = [];

  const add = (val) => {
    if (!val) return;
    if (typeof val === "string" || typeof val === "number") {
      list.push(String(val));
    } else if (typeof val === "object") {
      if (val.value) list.push(String(val.value));
      if (val.phone) list.push(String(val.phone));
      if (val.number) list.push(String(val.number));
    }
  };

  if (Array.isArray(item.phones)) {
    item.phones.forEach(add);
  } else if (item.phones) {
    add(item.phones);
  }

  if (Array.isArray(item.phone)) {
    item.phone.forEach(add);
  } else if (item.phone) {
    add(item.phone);
  }

  if (item.secondaryPhone) add(item.secondaryPhone);
  if (item.mobile) add(item.mobile);

  return list;
};

const getPhoneDigitVariants = (raw) => {
  if (!raw) return [];
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return [];

  const variants = new Set([digits]);

  // Strip leading India country code (+91 / 91) if followed by 10 digits
  if (digits.startsWith("91") && digits.length >= 11) {
    variants.add(digits.slice(2));
  }

  // Strip leading 0 if followed by 10 digits
  if (digits.startsWith("0") && digits.length >= 11) {
    variants.add(digits.slice(1));
  }

  return Array.from(variants);
};

const matchesPhoneQuery = (item, rawQuery) => {
  if (!rawQuery) return false;
  const rawDigits = String(rawQuery).replace(/\D/g, "");
  if (!rawDigits) return false;

  const queryVariants = getPhoneDigitVariants(rawQuery);
  const phones = extractPhoneStrings(item);

  for (const phone of phones) {
    const leadVariants = getPhoneDigitVariants(phone);
    for (const lVar of leadVariants) {
      for (const qVar of queryVariants) {
        if (lVar.includes(qVar) || qVar.includes(lVar)) {
          return true;
        }
      }
    }
  }

  return false;
};

const matchesLeadSearch = (lead, rawQuery) => {
  if (!rawQuery) return true;
  const query = String(rawQuery).trim().toLowerCase();
  if (!query) return true;

  // 1. Format-agnostic phone search (handles spaces, +91, dashes, leading zeroes, partial digits)
  if (matchesPhoneQuery(lead, rawQuery)) {
    return true;
  }

  // 2. Lead ID matching (supports '93', 'lead 93', '#93')
  const leadId = String(lead?.id || lead?._id || lead?.lead_id || "").toLowerCase();
  const cleanQueryId = query.replace(/^lead\s*#?|^#/, "").trim();
  if (leadId) {
    if (leadId === query || leadId === cleanQueryId || leadId.includes(query) || leadId.includes(cleanQueryId)) {
      return true;
    }
    if (`lead #${leadId}`.includes(query) || `lead ${leadId}`.includes(query)) {
      return true;
    }
  }

  // 3. Customer name matching (first name, last name, full name, company)
  const fullName = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ").toLowerCase();
  const directName = String(lead?.name || lead?.customer_name || lead?.title || "").toLowerCase();
  if (fullName.includes(query) || directName.includes(query)) {
    return true;
  }

  // 4. Email matching
  const emails = [];
  if (Array.isArray(lead?.emails)) {
    lead.emails.forEach((e) => emails.push(typeof e === "object" ? e?.value : e));
  } else if (lead?.emails) {
    emails.push(lead.emails);
  }
  if (lead?.email) emails.push(lead.email);
  if (emails.some((e) => String(e || "").toLowerCase().includes(query))) {
    return true;
  }

  // 5. Team / Owner / Sales user matching
  const ownerNames = [
    lead?.owner,
    lead?.sales,
    lead?.assignedTo,
    lead?.telecaller,
    lead?.assigneeName,
    lead?.team?.username,
    lead?.team?.firstName,
    lead?.team?.lastName,
    [lead?.team?.firstName, lead?.team?.lastName].filter(Boolean).join(" "),
  ];
  if (ownerNames.some((owner) => String(owner || "").toLowerCase().includes(query))) {
    return true;
  }

  // 6. Source / CP / Tags matching
  const sources = [
    lead?.source,
    lead?.channelPartner,
    lead?.channelPartnerReraId,
    lead?.fundingSource,
    lead?.tags,
  ];
  if (sources.some((s) => String(s || "").toLowerCase().includes(query))) {
    return true;
  }

  // 7. Stage / Status / Requirement / Property / Project matching
  const attributes = [
    lead?.stage,
    lead?.status,
    lead?.lead_status,
    lead?.requirementComment,
    lead?.configration,
    lead?.configuration,
    lead?.propertyType,
    lead?.interestedProjects,
    lead?.project,
    lead?.projectName,
    lead?.companyName,
    lead?.budget,
    lead?.budgetMin,
    lead?.budgetMax,
    lead?.city,
    lead?.locationPreferences,
    lead?.remarks,
    lead?.note,
    lead?.comment,
  ];

  return attributes.some((attr) => String(attr || "").toLowerCase().includes(query));
};

function runFrontendLeadSearchUnitTests() {
  console.log("=== Running Frontend Lead Search Unit Tests ===");

  const lead1 = {
    id: 93,
    firstName: "Myra",
    lastName: "Rao",
    phones: [{ type: "Work", value: "9876543210" }],
    emails: [{ type: "Work", value: "myra.rao@example.com" }],
    source: "Walk-in",
    stage: "Nurture",
    requirementComment: "1BHK",
    team: { firstName: "Prasad", lastName: "P" },
  };

  const lead2 = {
    id: 94,
    firstName: "Rajesh",
    lastName: "Kumar",
    phones: [{ type: "Mobile", value: "+91 91234 56789" }],
    email: "rajesh@example.com",
    channelPartner: "Ace Realty",
    status: "Booked",
    configuration: "2BHK",
  };

  // Test 1: Search by Lead ID "93"
  assert(matchesLeadSearch(lead1, "93"), "Should match lead1 by ID 93");
  assert(!matchesLeadSearch(lead2, "93"), "Should NOT match lead2 with ID 93");

  // Test 2: Search by Lead ID "#93" and "Lead 93"
  assert(matchesLeadSearch(lead1, "#93"), "Should match lead1 by #93");
  assert(matchesLeadSearch(lead1, "Lead 93"), "Should match lead1 by Lead 93");

  // Test 3: Search by Customer Name
  assert(matchesLeadSearch(lead1, "Myra"), "Should match lead1 by first name");
  assert(matchesLeadSearch(lead1, "Rao"), "Should match lead1 by last name");
  assert(matchesLeadSearch(lead1, "myra rao"), "Should match lead1 by full name lowercase");

  // Test 4: Format-agnostic Phone Matching for Lead 1 (stored as "9876543210")
  assert(matchesLeadSearch(lead1, "9876543210"), "Exact 10 digits");
  assert(matchesLeadSearch(lead1, "+91 98765 43210"), "With +91 and spaces");
  assert(matchesLeadSearch(lead1, "+91-98765-43210"), "With +91 and dashes");
  assert(matchesLeadSearch(lead1, "98765 43210"), "With space in middle");
  assert(matchesLeadSearch(lead1, "09876543210"), "With leading zero");
  assert(matchesLeadSearch(lead1, "43210"), "Partial suffix last 5 digits");
  assert(matchesLeadSearch(lead1, "9876"), "Partial prefix 4 digits");

  // Test 5: Format-agnostic Phone Matching for Lead 2 (stored as "+91 91234 56789")
  assert(matchesLeadSearch(lead2, "9123456789"), "Exact 10 digits against +91 formatted lead");
  assert(matchesLeadSearch(lead2, "91234 56789"), "Spaced 10 digits against +91 formatted lead");
  assert(matchesLeadSearch(lead2, "09123456789"), "Leading 0 against +91 formatted lead");
  assert(matchesLeadSearch(lead2, "56789"), "Last 5 digits against +91 formatted lead");

  // Test 6: Search by Requirement & Source & Owner
  assert(matchesLeadSearch(lead1, "1BHK"), "Should match lead1 requirement 1BHK");
  assert(matchesLeadSearch(lead1, "Walk-in"), "Should match lead1 source Walk-in");
  assert(matchesLeadSearch(lead1, "Prasad"), "Should match lead1 owner Prasad");
  assert(matchesLeadSearch(lead2, "Ace Realty"), "Should match lead2 channel partner");

  console.log("✅ All Frontend Lead Search unit tests passed!");
}

runFrontendLeadSearchUnitTests();
