const API_URL = process.env.API_URL || "http://localhost:5000";
const runId = Date.now().toString().slice(-8);

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || data || response.statusText;
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${message}`);
  }

  return data;
};

const postJson = (path, body, headers) =>
  request(path, { method: "POST", body: JSON.stringify(body), headers });

const patchJson = (path, body, headers) =>
  request(path, { method: "PATCH", body: JSON.stringify(body), headers });

const getList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const firstGeneratedUnitItem = (unitsResponse, floorPlanId) =>
  getList(unitsResponse.items || unitsResponse).find((unit) => Number(unit.unit?.floorId) === Number(floorPlanId));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  const salesEmail = `sales.smoke.${runId}@example.com`;
  const password = "Smoke@12345";
  const phoneSuffix = runId.padStart(9, "0").slice(-9);
  const leadPhone = `9${phoneSuffix}`.slice(0, 10);
  const userPhone = `8${phoneSuffix}`.slice(0, 10);

  const project = await postJson("/projects", {
    name: `Sales Smoke Project ${runId}`,
    description: "Created by user sales smoke test",
    projectType: "residential",
    possession: false,
    postSales: true,
    address: "Smoke Address",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    zip: "400001",
    locality: "Smoke",
    integratedPortals: "",
  });

  const tower = await postJson("/tower", {
    name: `Sales Smoke Tower ${runId}`,
    projectId: project.id,
    totalFloor: 3,
    reraTowerId: `SMOKE-T-${runId}`,
  });

  const floorPlan = await postJson("/floor", {
    name: `Sales Smoke 2BHK ${runId}`,
    projectId: project.id,
    towerId: tower.id,
    configurationLabel: "2 BHK",
    status: "Published",
    unitStream: "Sale Unit",
    type: "Residential",
    category: "Flat",
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    applicableFloorFrom: 1,
    applicableFloorTo: 2,
    unitPosition: "01",
    skippedFloors: [],
    facing: "East",
    cornerUnit: false,
    measure: "sqft",
    carpet: 700,
    builtupArea: 800,
    saleable: 900,
    loading: 20,
    loadingBasis: "On Carpet",
    rateBasis: "On Carpet",
    baseRate: 10000,
    floorRisePerSqft: 50,
    baseFloorForFloorRise: 1,
    gstPercent: 5,
    stampDutyPercent: 6,
    registrationPercent: 1,
    floorPlanImages: [{ name: "smoke.png", path: "/uploads/floor-plans/smoke.png" }],
    autoCalc: false,
  });

  const unitsBeforeBooking = await request("/unit?limit=1000&includeOrphans=true");
  const unitItem = firstGeneratedUnitItem(unitsBeforeBooking, floorPlan.id);
  assert(unitItem?.id, "Published floor plan did not generate a bookable unit item");

  const user = await postJson("/users", {
    firstName: "Sales",
    lastName: `Smoke ${runId}`,
    username: `sales_smoke_${runId}`,
    email: salesEmail,
    password,
    phone: userPhone,
    role: "SALES",
    department: "SALES",
    isActive: true,
  });

  const lead = await postJson("/leads", {
    salutation: "Mr.",
    firstName: `Lead${runId}`,
    lastName: "Smoke",
    emails: [{ type: "Office", value: `lead.smoke.${runId}@example.com` }],
    phones: [{ type: "Mobile", value: leadPhone }],
    status: "New",
    timeZone: "Asia/Kolkata",
    interestedProjects: project.name,
    teamId: user.id,
    conductSiteVisit: "",
    leadAddress: [{ address: "Smoke Lead Address", city: "Mumbai", state: "Maharashtra", country: "India", zip: "400001" }],
    personalAddress: [],
    type: "Residential",
    carpetArea: "700",
    seats: 0,
    tenure: 0,
    industry: "Real Estate",
    propertyType: "Flat",
    configration: "2 BHK",
    budget: "7500000",
    facing: "East",
    locationPreferences: "Mumbai",
  });

  const login = await postJson("/auth/login", { email: salesEmail, password });
  const authHeaders = { Authorization: `Bearer ${login.token}` };

  const attendance = await postJson("/attendance/login", {}, authHeaders);
  const accessPanelInitial = await request("/users/access-panel", { headers: authHeaders });

  const call = await postJson("/api/calls/browser-phone/start", {
    leadId: lead.id,
    leadPhone,
    agentPhone: userPhone,
  }, authHeaders);

  const disposedCall = await postJson("/api/calls/dispose", {
    callId: call.callLog.id,
    disposition: "Qualified",
    notes: "Smoke test disposition",
  }, authHeaders);

  const myCalls = await request("/api/calls/my?limit=20", { headers: authHeaders });

  let emailResult = null;
  try {
    emailResult = await postJson("/api/email/send", {
      leadId: lead.id,
      to: `lead.smoke.${runId}@example.com`,
      subject: `Sales smoke ${runId}`,
      body: "This is a smoke test email from SWAMI CRM.",
    }, authHeaders);
  } catch (error) {
    emailResult = { warning: error.message };
  }
  const emailLogs = await request(`/api/email/logs?leadId=${lead.id}`);

  const scheduledOn = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const scheduleVisit = await postJson("/schedule-visits", {
    leadId: lead.id,
    project: project.name,
    status: "Scheduled",
    meetingPoint: "Project gate",
    salesExecutive: `${user.firstName} ${user.lastName}`,
    note: "Smoke test site visit",
    initiatedBy: `${user.firstName} ${user.lastName}`,
    scheduledOn,
  });

  const task = await postJson("/tasks", {
    title: `Sales Smoke Task ${runId}`,
    description: "Smoke test task",
    priority: "High",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    dueTime: "10:30",
    assigneeId: user.id,
    assignedById: user.id,
  });

  const notification = await postJson("/notification/activity", {
    userId: user.id,
    title: `Sales Smoke Notification ${runId}`,
    description: "Smoke test notification",
  });

  const booking = await postJson("/bookings", {
    leadId: lead.id,
    unitItemId: unitItem.id,
    idempotencyKey: `sales-smoke-${runId}`,
    unitCount: 1,
    customerName: `${lead.firstName} ${lead.lastName}`,
    stage: "Booked",
    projectDetails: `${project.name} - ${tower.name} - Unit ${unitItem.name}`,
    bookedOn: new Date().toISOString(),
    saleableArea: 900,
    basePrice: unitItem.basePrice || 7000000,
    baseRate: unitItem.baseRate || 10000,
    source: "Sales Smoke",
    bookedBy: `${user.firstName} ${user.lastName}`,
    costSheet: [{ fieldName: "Base Rate", orignalValue: 10000, costType: "Discount", inputField: 0, newValue: 10000 }],
    paymentSchedule: [{ name: "Agreement", towerMilestone: "Agreement", value: 100, amount: 7000000, taxes: 840000, tds: 0, grandTotal: 7840000 }],
  });
  await patchJson(`/leads/${lead.id}`, { status: "Booked" });

  const accessPanelFinal = await request("/users/access-panel", { headers: authHeaders });
  const notifications = await request("/notification/me?limit=20", { headers: authHeaders });
  const tasks = await request(`/tasks?assigneeId=${user.id}`);
  const bookings = await request(`/bookings?leadId=${lead.id}&limit=10`);
  const visits = await request(`/schedule-visits?leadId=${lead.id}`);

  const checks = {
    login: Boolean(login.token),
    attendance: attendance?.data?.status === "Available",
    accessPanelLoads: Number(accessPanelInitial?.user?.id) === Number(user.id),
    assignedLeadVisible: (accessPanelFinal.leads || []).some((item) => Number(item.id) === Number(lead.id)),
    browserCallCreated: Boolean(call.callLog?.id),
    callDispositionSaved: Boolean(disposedCall.callLog?.disposition || disposedCall.disposition),
    myCallLogsVisible: getList(myCalls).some((item) => Number(item.id) === Number(call.callLog.id)),
    emailEndpointReached: Boolean(emailResult?.message || emailResult?.warning),
    emailLogCreated: getList(emailLogs).some((item) => Number(item.leadId) === Number(lead.id)),
    scheduleVisitSaved: Number(scheduleVisit.leadId) === Number(lead.id),
    scheduleVisitVisible: getList(visits).some((item) => Number(item.leadId) === Number(lead.id)),
    taskSaved: Number(task.assigneeId) === Number(user.id),
    taskVisible: getList(tasks).some((item) => Number(item.id) === Number(task.id)),
    notificationSaved: Number(notification.userId) === Number(user.id),
    notificationVisible: getList(notifications).some((item) => Number(item.id) === Number(notification.id)),
    bookingSaved: Number(booking.leadId) === Number(lead.id),
    bookingVisible: getList(bookings).some((item) => Number(item.id) === Number(booking.id)),
    bookedLeadInPanel: (accessPanelFinal.bookings || []).some((item) => Number(item.leadId) === Number(lead.id)),
  };

  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);

  console.log(JSON.stringify({
    runId,
    created: {
      user: { id: user.id, email: salesEmail, password },
      lead: { id: lead.id, phone: leadPhone },
      project: { id: project.id, name: project.name },
      tower: { id: tower.id },
      floorPlan: { id: floorPlan.id },
      unitItem: { id: unitItem.id, name: unitItem.name },
      callLog: { id: call.callLog?.id },
      scheduleVisit: { id: scheduleVisit.id },
      task: { id: task.id },
      notification: { id: notification.id },
      booking: { id: booking.id },
    },
    checks,
    warnings: {
      email: emailResult?.warning || null,
      callProvider: call.providerWarning || null,
    },
    result: failed.length ? "failed" : "passed",
    failed,
  }, null, 2));

  if (failed.length) process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
