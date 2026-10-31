/**
 * Format-agnostic lead and phone search utilities
 * Normalized 10-digit matching (no 4-digit fragment leaks, no silent fallback).
 */

/**
 * Normalizes any phone value to a clean 10-digit string.
 * Handles strings, numbers (including doubles/floats), arrays, and objects.
 * Strips +91, 91 prefix, leading 0s, spaces, hyphens, and non-digit characters.
 */
export const normalizeTo10Digits = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    val = val.value || val.phone || val.number || "";
  }
  let str = String(val).trim();
  if (!str) return "";

  // Ignore masked placeholders like 9819XXXXXX or ***
  if (str.includes("X") || str.includes("x") || str.includes("*")) {
    return "";
  }

  // Handle float/double representation (e.g. 9819837729.0)
  if (str.includes(".")) {
    str = str.split(".")[0];
  }

  // Handle stringified JSON
  if (str.startsWith("[") || str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const norm = normalizeTo10Digits(item);
          if (norm && norm.length === 10) return norm;
        }
      } else if (parsed && typeof parsed === "object") {
        return normalizeTo10Digits(parsed.value || parsed.phone || parsed.number);
      }
    } catch (e) {}
  }

  const digits = str.replace(/\D/g, "");
  if (!digits) return "";

  // Return last 10 digits if 10 or more digits
  if (digits.length >= 10) {
    return digits.slice(-10);
  }

  return digits;
};

/**
 * Extracts all valid normalized 10-digit phone numbers for a lead.
 */
export const extractPhone10Digits = (lead) => {
  if (!lead) return [];
  const result = new Set();

  const add = (val) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(add);
      return;
    }
    const norm = normalizeTo10Digits(val);
    if (norm && norm.length === 10) {
      result.add(norm);
    }
  };

  add(lead.phones);
  add(lead.phone);
  add(lead.mobile);
  add(lead.secondaryPhone);
  add(lead.alternatePhone);
  add(lead.callerNumber);
  add(lead.customerNumber);
  add(lead.leadPhone);

  return Array.from(result);
};

// Legacy alias for compatibility
export const extractPhoneStrings = extractPhone10Digits;

/**
 * Detects whether the search query is intended as a phone number.
 * e.g. "9819837729", "+91 9819837729", "98198 37729", "919819837729"
 */
export const isPhoneNumberQuery = (rawQuery) => {
  if (!rawQuery) return false;
  const str = String(rawQuery).trim();
  // If it contains letters (except 'lead' or '#' prefix), it's not a phone query
  if (/[a-zA-Z]/.test(str.replace(/^lead\s*#?|^#/i, ""))) return false;

  const digits = str.replace(/\D/g, "");
  // 10 digits (or 11/12 with country code 91 or leading 0) is a phone query
  return digits.length >= 10;
};

/**
 * Checks if a lead matches a phone search query.
 * Strictly compares normalized 10-digit numbers — NO 4-digit fragments!
 */
export const matchesPhoneQuery = (lead, rawQuery) => {
  if (!rawQuery) return false;
  const queryDigits = String(rawQuery).replace(/\D/g, "");
  if (!queryDigits) return false;

  const leadPhones = extractPhone10Digits(lead);
  if (!leadPhones.length) return false;

  // Exact 10-digit full comparison
  if (queryDigits.length >= 10) {
    const target10 = queryDigits.slice(-10);
    return leadPhones.some((phone) => phone === target10);
  }

  // Partial phone query (7 to 9 digits)
  if (queryDigits.length >= 7) {
    return leadPhones.some((phone) => phone.endsWith(queryDigits) || phone.includes(queryDigits));
  }

  // Shorter numbers (1-6 digits) are treated as Lead ID, not phone
  return false;
};

/**
 * Format-agnostic lead search.
 * Routes numeric input properly:
 * - 10-digit numbers: strictly routed to phone matching (and exact Lead ID if matching).
 * - Shorter numeric queries (e.g. 354, #93): routed to Lead ID matching.
 * - Text queries: routed to Name, Email, Channel Partner, Team, Source, Stage, etc.
 * Never falls back to the default list on non-match!
 */
export const matchesLeadSearch = (lead, rawQuery) => {
  if (!rawQuery) return true;
  const query = String(rawQuery).trim().toLowerCase();
  if (!query) return true;

  const digits = query.replace(/\D/g, "");
  const isPhone = isPhoneNumberQuery(rawQuery);

  // 1. If it's a 10-digit phone query:
  // Route to phone matching first. Also check exact Lead ID just in case.
  if (isPhone) {
    if (matchesPhoneQuery(lead, rawQuery)) {
      return true;
    }
    // Also allow exact lead ID match if lead ID matches digits
    const leadId = String(lead?.id || lead?._id || lead?.lead_id || "");
    if (leadId === digits) {
      return true;
    }
    // DO NOT allow a 10-digit phone query to loosely match names, requirements, notes, etc.!
    return false;
  }

  // 2. Short numeric or ID query (e.g. "354", "#354", "lead 354"):
  const cleanQueryId = query.replace(/^lead\s*#?|^#/, "").trim();
  const leadId = String(lead?.id || lead?._id || lead?.lead_id || "").toLowerCase();
  if (cleanQueryId && /^\d+$/.test(cleanQueryId)) {
    // If it's pure short digits (<= 6 digits), strictly match by exact Lead ID
    if (cleanQueryId.length <= 6) {
      return leadId === cleanQueryId;
    }
    // If 7-9 digits, try phone query or exact Lead ID
    return matchesPhoneQuery(lead, rawQuery) || leadId === cleanQueryId;
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

  // 5. Team / Owner / Telecaller matching
  const ownerNames = [
    lead?.owner,
    lead?.sales,
    lead?.assignedTo,
    lead?.telecaller,
    lead?.team?.username,
    lead?.team?.firstName,
    lead?.team?.lastName,
    [lead?.team?.firstName, lead?.team?.lastName].filter(Boolean).join(" "),
  ];
  if (ownerNames.some((owner) => String(owner || "").toLowerCase().includes(query))) {
    return true;
  }

  // 6. Source / Channel Partner / Tags matching
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
    lead?.city,
    lead?.locationPreferences,
  ];
  if (attributes.some((attr) => String(attr || "").toLowerCase().includes(query))) {
    return true;
  }

  return false;
};

export const filterLeadsByQuery = (leads = [], rawQuery = "") => {
  if (!rawQuery || !String(rawQuery).trim()) return leads;
  return leads.filter((lead) => matchesLeadSearch(lead, rawQuery));
};
