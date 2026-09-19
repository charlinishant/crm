/**
 * Format-agnostic lead and phone search utilities
 */

export const extractPhoneStrings = (item) => {
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

export const getPhoneDigitVariants = (raw) => {
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

export const matchesPhoneQuery = (item, rawQuery) => {
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

export const matchesLeadSearch = (lead, rawQuery) => {
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

export const filterLeadsByQuery = (leads = [], rawQuery = "") => {
  if (!rawQuery || !String(rawQuery).trim()) return leads;
  return leads.filter((lead) => matchesLeadSearch(lead, rawQuery));
};
