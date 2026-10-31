/**
 * Lead Source Normalization, Deduplication and Attribution Engine
 * Handles canonicalization, near-duplicate merging (e.g. 'Carpet Area CP' vs 'Carpet area'),
 * and Channel Partner mapping.
 */

// Standard controlled platform / direct sources
const CONTROLLED_PLATFORM_SOURCES = [
  "Direct Entry",
  "Walk-in",
  "Website",
  "Digital Campaign",
  "Inbound Call / IVR",
  "Referral",
  "99acres",
  "MagicBricks",
  "Housing.com",
];

// Pure financial modes that are NOT lead acquisition sources
const FINANCIAL_FUNDING_MODES = new Set([
  "loan",
  "self funded",
  "self funding",
  "loan + self",
  "loan + savings",
  "savings",
  "joint finance",
  "bank finance",
  "investor",
]);

// Known alias mapping (case-insensitive key -> canonical display name)
const CANONICAL_ALIAS_MAP = {
  // Carpet Area CP duplicates
  "carpet area": "Carpet Area CP",
  "carpet area cp": "Carpet Area CP",
  "carpetarea": "Carpet Area CP",
  "carpetarea cp": "Carpet Area CP",

  // Direct / Self
  "direct": "Direct Entry",
  "direct entry": "Direct Entry",
  "directentry": "Direct Entry",
  "self": "Direct Entry",

  // Walk-in
  "walk-in": "Walk-in",
  "walk in": "Walk-in",
  "walkin": "Walk-in",
  "walk_in": "Walk-in",

  // Website & Portals
  "website": "Website",
  "web site": "Website",
  "web": "Website",
  "portal": "Website",
  "online": "Website",

  // Portals
  "99acres": "99acres",
  "99 acres": "99acres",
  "magicbricks": "MagicBricks",
  "magic bricks": "MagicBricks",
  "housing": "Housing.com",
  "housing.com": "Housing.com",

  // Inbound Call / IVR
  "inbound": "Inbound Call / IVR",
  "inbound call": "Inbound Call / IVR",
  "inbound call / ivr": "Inbound Call / IVR",
  "ivr": "Inbound Call / IVR",
  "mcube": "Inbound Call / IVR",
  "mcube inbound": "Inbound Call / IVR",

  // Referral / Reference
  "reference": "Referral",
  "referral": "Referral",
  "client referral": "Referral",
  "friend referral": "Referral",

  // Digital
  "digital": "Digital Campaign",
  "digital campaign": "Digital Campaign",
  "digital marketing": "Digital Campaign",
  "facebook": "Digital Campaign",
  "facebook ads": "Digital Campaign",
  "google": "Digital Campaign",
  "google ads": "Digital Campaign",
  "meta": "Digital Campaign",
  "social media": "Digital Campaign",
};

/**
 * Clean & canonicalize a raw lead source string
 */
const normalizeSourceName = (rawSource) => {
  if (!rawSource || typeof rawSource !== "string") return "Untagged";
  const trimmed = rawSource.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown" || trimmed.toLowerCase() === "untagged" || trimmed.toLowerCase() === "null") {
    return "Untagged";
  }

  const lower = trimmed.toLowerCase();

  // Check alias map
  if (CANONICAL_ALIAS_MAP[lower]) {
    return CANONICAL_ALIAS_MAP[lower];
  }

  // Check if it starts with "carpet area"
  if (lower.startsWith("carpet area") || lower.startsWith("carpetarea")) {
    return "Carpet Area CP";
  }

  // Preserve Title Case for custom CPs / sources
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.toUpperCase() === "CP" || word.toUpperCase() === "IVR") return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

/**
 * Extract source / CP tag from lead's tags string (e.g. "source:Website,cp:Carpet Area CP,sourceLocked:true")
 */
const extractSourceFromTags = (tagsString) => {
  if (!tagsString || typeof tagsString !== "string") return {};
  const tags = tagsString.split(",").map((t) => t.trim());
  let source = null;
  let channelPartner = null;
  let reraId = null;

  tags.forEach((tag) => {
    if (tag.startsWith("source:")) source = tag.replace("source:", "").trim();
    if (tag.startsWith("cp:")) channelPartner = tag.replace("cp:", "").trim();
    if (tag.startsWith("rera:")) reraId = tag.replace("rera:", "").trim();
  });

  return { source, channelPartner, reraId };
};

/**
 * Resolves a lead record to its canonical source name and CP metadata
 * @param {Object} lead - Prisma Lead record
 * @param {Map<string, Object>} registeredCPMap - Map of normalized CP name -> CP User
 */
const resolveLeadSource = (lead, registeredCPMap = new Map()) => {
  if (!lead) {
    return {
      canonicalSource: "Untagged",
      sourceType: "Untagged",
      isChannelPartner: false,
      cpUser: null,
    };
  }

  const { source: tagSource, channelPartner: tagCP, reraId: tagRera } = extractSourceFromTags(lead.tags);

  let rawCP = (lead.channelPartner || tagCP || "").trim();
  let rawFunding = (lead.fundingSource || tagSource || "").trim();

  // If channelPartner is set, that is the primary source / CP
  if (rawCP && rawCP.toLowerCase() !== "null" && rawCP.toLowerCase() !== "untagged") {
    const canonical = normalizeSourceName(rawCP);
    const cpUser = registeredCPMap.get(canonical.toLowerCase()) || registeredCPMap.get(rawCP.toLowerCase()) || null;

    return {
      canonicalSource: canonical,
      sourceType: "Channel Partner",
      isChannelPartner: true,
      cpUser: cpUser
        ? {
            id: cpUser.id,
            name: [cpUser.firstName, cpUser.lastName].filter(Boolean).join(" ") || cpUser.username,
            phone: cpUser.phone || "-",
            email: cpUser.email || "-",
            reraNumber: cpUser.reraNumber || tagRera || "-",
          }
        : null,
    };
  }

  // If no channelPartner, check fundingSource
  if (rawFunding && rawFunding.toLowerCase() !== "null" && rawFunding.toLowerCase() !== "untagged") {
    const fundingLower = rawFunding.toLowerCase();

    // If fundingSource is a pure financing mode ("Loan", "Self Funded"), don't treat it as lead source
    if (FINANCIAL_FUNDING_MODES.has(fundingLower)) {
      return {
        canonicalSource: "Direct Entry",
        sourceType: "Direct / Platform",
        isChannelPartner: false,
        cpUser: null,
      };
    }

    const canonical = normalizeSourceName(rawFunding);
    const cpUser = registeredCPMap.get(canonical.toLowerCase()) || registeredCPMap.get(rawFunding.toLowerCase()) || null;
    const isCP = Boolean(cpUser) || canonical.toLowerCase().includes("cp") || canonical.toLowerCase().includes("realt");

    return {
      canonicalSource: canonical,
      sourceType: isCP ? "Channel Partner" : "Direct / Platform",
      isChannelPartner: isCP,
      cpUser: cpUser
        ? {
            id: cpUser.id,
            name: [cpUser.firstName, cpUser.lastName].filter(Boolean).join(" ") || cpUser.username,
            phone: cpUser.phone || "-",
            email: cpUser.email || "-",
            reraNumber: cpUser.reraNumber || tagRera || "-",
          }
        : null,
    };
  }

  return {
    canonicalSource: "Untagged",
    sourceType: "Untagged",
    isChannelPartner: false,
    cpUser: null,
  };
};

/**
 * Detects near-duplicate source strings (e.g. "Carpet Area CP" and "Carpet area")
 */
const findDuplicateSources = (sourcesList = []) => {
  const duplicates = [];
  const normalizedMap = new Map();

  sourcesList.forEach((raw) => {
    if (!raw || typeof raw !== "string") return;
    const clean = raw.trim();
    if (!clean) return;

    const canonical = normalizeSourceName(clean);
    if (!normalizedMap.has(canonical)) {
      normalizedMap.set(canonical, new Set());
    }
    normalizedMap.get(canonical).add(clean);
  });

  normalizedMap.forEach((variantsSet, canonical) => {
    const variants = Array.from(variantsSet);
    if (variants.length > 1 || (variants.length === 1 && variants[0] !== canonical)) {
      duplicates.push({
        canonical,
        variants,
        reason: variants.length > 1 ? "Multiple spelling / casing variations" : "Non-canonical casing or formatting",
      });
    }
  });

  return duplicates;
};

module.exports = {
  CONTROLLED_PLATFORM_SOURCES,
  CANONICAL_ALIAS_MAP,
  FINANCIAL_FUNDING_MODES,
  normalizeSourceName,
  extractSourceFromTags,
  resolveLeadSource,
  findDuplicateSources,
};
