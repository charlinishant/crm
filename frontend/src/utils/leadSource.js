export const SOURCE_OPTIONS = [
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
  "Digital",
  "Meta",
];

export const normalizeBookingSource = (value) => {
  const str = String(value || "").trim();
  if (!str) return "Walk-in";

  // If value contains raw tag pattern like "source:Channel Partner | cp:..."
  const match = str.match(/source:\s*([^|]+)/i);
  const raw = (match && match[1] ? match[1] : str).trim();
  const lower = raw.toLowerCase();

  if (lower === "channel_partner" || lower === "channel partner") return "Channel Partner";
  if (lower === "walk-in" || lower === "walkin" || lower === "walk in") return "Walk-in";
  if (lower === "digital") return "Digital";
  if (lower === "meta") return "Meta";
  if (lower === "direct") return "Direct";
  if (lower === "website") return "Website";
  if (lower === "portal") return "Portal";
  if (lower === "reference") return "Reference";
  if (lower === "untagged") return "Untagged";

  return raw;
};

export const isChannelPartnerSource = (value) => {
  const normalized = normalizeBookingSource(value);
  return normalized.toLowerCase() === "channel partner";
};

/**
 * Parses source attribution details from a lead, form, or tag string.
 *
 * @param {Object|string} leadOrForm - Lead object, bookingForm, or tag string
 * @returns {{
 *   source: string,
 *   channelPartner: string,
 *   channelPartnerReraId: string,
 *   isLocked: boolean,
 *   isUntagged: boolean
 * }}
 */
export const parseLeadSourceAttribution = (leadOrForm) => {
  if (!leadOrForm) {
    return {
      source: "",
      channelPartner: "",
      channelPartnerReraId: "",
      isLocked: false,
      isUntagged: true,
    };
  }

  const tags = typeof leadOrForm === "string" ? leadOrForm : String(leadOrForm.tags || leadOrForm.source || "");
  const hasLockedTag = tags.includes("sourceLocked:true");
  const isExplicitlyUntagged =
    !hasLockedTag &&
    (tags.toLowerCase().includes("untagged") || tags.toLowerCase().includes("quarantined"));

  let cleanSource = "";
  let cleanCp = "";
  let cleanRera = "";

  // 1. Try extracting key:value pairs from tags
  const sourceMatch = tags.match(/source:\s*([^|]+)/i);
  if (sourceMatch && sourceMatch[1]) {
    cleanSource = sourceMatch[1].trim();
  }

  const cpMatch = tags.match(/cp:\s*([^|]+)/i);
  if (cpMatch && cpMatch[1]) {
    cleanCp = cpMatch[1].trim();
  }

  const reraMatch = tags.match(/rera:\s*([^|]+)/i);
  if (reraMatch && reraMatch[1]) {
    cleanRera = reraMatch[1].trim();
  }

  // 2. Fallbacks from lead or form properties
  if (!cleanSource && typeof leadOrForm === "object") {
    const rawSource = leadOrForm.fundingSource || leadOrForm.source || leadOrForm.leadSource || "";
    if (rawSource && !rawSource.includes("source:") && !rawSource.includes("|")) {
      cleanSource = rawSource.trim();
    }
  }

  if (!cleanCp && typeof leadOrForm === "object") {
    const rawCp = leadOrForm.channelPartner || leadOrForm.channelPartnerName || leadOrForm.cpName || "";
    if (rawCp && !rawCp.includes("cp:") && !rawCp.includes("|")) {
      cleanCp = rawCp.trim();
    }
  }

  if (!cleanRera && typeof leadOrForm === "object") {
    const rawRera = leadOrForm.channelPartnerReraId || leadOrForm.cpReraNumber || "";
    if (rawRera && !rawRera.includes("rera:") && !rawRera.includes("|")) {
      cleanRera = rawRera.trim();
    }
  }

  // Filter out financing values mistakenly passed into fundingSource (like "Loan", "Self")
  const isFinanceFunding = ["loan", "self", "self funding", "cash"].includes(cleanSource.toLowerCase());
  if (isFinanceFunding && !cleanCp) {
    cleanSource = "";
  }

  // Normalize cleanSource
  if (cleanSource) {
    cleanSource = normalizeBookingSource(cleanSource);
    if (cleanSource.toLowerCase() === "untagged") {
      cleanSource = "";
    }
  }

  // Determine lock state
  const isLocked = Boolean(
    leadOrForm.isSourceLocked ||
    hasLockedTag ||
    (!isExplicitlyUntagged && (
      (cleanSource && cleanSource.toLowerCase() !== "untagged") ||
      (cleanCp && cleanCp.toLowerCase() !== "untagged")
    ))
  );

  return {
    source: cleanSource,
    channelPartner: cleanCp,
    channelPartnerReraId: cleanRera,
    isLocked,
    isUntagged: !isLocked,
  };
};

export const isLeadSourceLocked = (lead) => {
  return parseLeadSourceAttribution(lead).isLocked;
};

export const cleanTagsForDisplay = (tags) => {
  if (!tags || typeof tags !== "string") return tags || "";

  return tags
    .split(" | ")
    .filter((part) => {
      const trimmed = part.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("source:")) return false;
      if (trimmed === "sourceLocked:true" || trimmed === "sourceLocked:false") return false;
      if (trimmed.startsWith("cp:")) return false;
      if (trimmed.startsWith("rera:")) return false;
      if (trimmed.startsWith("taggedAt:")) return false;
      if (trimmed.startsWith("taggedBy:")) return false;
      if (trimmed === "Untagged" || trimmed === "Quarantined") return false;
      return true;
    })
    .join(" | ");
};
