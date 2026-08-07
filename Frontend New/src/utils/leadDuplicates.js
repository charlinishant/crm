export const getLeadIdValue = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

export const getLeadNameValue = (lead) => {
  const fullName = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ");
  return lead?.name || lead?.full_name || lead?.customer_name || fullName || "-";
};

export const getUserDisplayName = (user) => {
  if (!user) return "";
  if (typeof user === "string" || typeof user === "number") return String(user);
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.name ||
    user.email ||
    (user.id ? `User #${user.id}` : "")
  );
};

export const getLeadSourceValue = (lead) =>
  lead?.source || lead?.channelPartner || lead?.fundingSource || lead?.tags || "-";

export const getLeadTeamValue = (lead) =>
  lead?.telecaller ||
  lead?.assignedTo ||
  lead?.owner ||
  lead?.sales ||
  getUserDisplayName(lead?.team) ||
  "Unassigned";

export const getLeadReceivedValue = (lead) =>
  lead?.createdAt || lead?.created_at || lead?.received_on || lead?.receivedOn || lead?.updatedAt || "";

export const formatLeadDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const extractContactValues = (value) => {
  if (!Array.isArray(value)) {
    return value ? [value] : [];
  }

  return value
    .map((item) => (item && typeof item === "object" ? item.value : item))
    .filter(Boolean);
};

const getLeadSortTime = (lead) => {
  const value = getLeadReceivedValue(lead);
  const date = value ? new Date(value) : null;
  if (date && !Number.isNaN(date.getTime())) return date.getTime();
  const id = Number(getLeadIdValue(lead));
  return Number.isNaN(id) ? Number.MAX_SAFE_INTEGER : id;
};

const getLeadMatchKeys = (lead) => {
  const phones = extractContactValues(lead?.phones || lead?.phone)
    .map(normalizePhone)
    .filter(Boolean);
  const emails = extractContactValues(lead?.emails || lead?.email)
    .map(normalizeEmail)
    .filter(Boolean);
  const name = normalizeName(getLeadNameValue(lead));

  return [
    ...phones.map((value) => ({
      key: `phone:${value}`,
      matchedOn: "Phone number",
      matchValue: value,
      priority: 1,
    })),
    ...emails.map((value) => ({
      key: name && name !== "-" ? `email-name:${value}:${name}` : `email:${value}`,
      matchedOn: name && name !== "-" ? "Email + name" : "Email",
      matchValue: value,
      priority: 2,
    })),
  ];
};

export const buildDuplicateLeadGroups = (leads = []) => {
  const groupsByKey = new Map();

  leads.forEach((lead) => {
    getLeadMatchKeys(lead).forEach((match) => {
      if (!groupsByKey.has(match.key)) {
        groupsByKey.set(match.key, {
          id: match.key,
          matchedOn: match.matchedOn,
          matchValue: match.matchValue,
          priority: match.priority,
          records: [],
        });
      }
      groupsByKey.get(match.key).records.push(lead);
    });
  });

  return Array.from(groupsByKey.values())
    .filter((group) => group.records.length > 1)
    .sort((a, b) => a.priority - b.priority || a.matchValue.localeCompare(b.matchValue))
    .map((group) => {
      const records = group.records
        .slice()
        .sort((a, b) => getLeadSortTime(a) - getLeadSortTime(b))
        .map((lead, index) => ({ ...lead, duplicateRank: index + 1, isOriginalLead: index === 0 }));

      return { ...group, records, original: records[0] };
    });
};
