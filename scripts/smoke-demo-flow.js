const XLSX = require("../backend/node_modules/xlsx");

const API_URL = process.env.API_URL || "http://localhost:5000";
const runId = Date.now().toString().slice(-8);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(`${options.method || "GET"} ${path} fetch failed: ${error.cause?.message || error.message}`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
};

const postJson = (path, body) =>
  request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

const patchJson = (path, body) =>
  request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const main = async () => {
  const project = await postJson("/projects", {
    name: `Demo Project ${runId}`,
    description: "Smoke demo project",
    projectType: "residential",
    possession: false,
    address: "Demo Address",
    street: "Demo Street",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    zip: "400001",
    locality: "Demo Locality",
    noOfTowers: 1,
    active: true,
    inventory: true,
    integratedPortals: "",
  });
  assert(project.id, "Project was not created");

  const tower = await postJson("/tower", {
    name: `Demo Tower ${runId}`,
    projectId: project.id,
    totalFloor: 20,
    reraTowerId: `TW-${runId}`,
  });
  assert(tower.id, "Tower was not created");

  const floorPlan = await postJson("/floor", {
    name: `Demo 2BHK Plan ${runId}`,
    projectId: project.id,
    towerId: tower.id,
    configurationLabel: "2 BHK",
    status: "Draft",
    unitStream: "Sale Unit",
    type: "Residential",
    category: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    applicableFloorFrom: 1,
    applicableFloorTo: 10,
    totalUnitsOfPlan: 10,
    facing: "NE",
    cornerUnit: true,
    view: ["Garden View"],
    autoCalc: true,
    measure: "sqft",
    carpet: 700,
    builtupArea: 800,
    loading: 25,
    loadingBasis: "On Carpet",
    carParkingSlots: 1,
    parkingType: "Covered Stilt",
    rateBasis: "On Carpet",
    baseRate: 12000,
    gstPercent: 5,
    stampDutyPercent: 6,
    registrationPercent: 1,
    paymentPlan: "CLP",
    floorPlanImages: [],
  });
  assert(floorPlan.id, "Floor plan was not created");

  const unit = await postJson("/unit", {
    unitList: [
      {
        name: `A-${runId}`,
        floor: 5,
        unitIndex: 501,
        baseRate: 12000,
        basePrice: 8400000,
        propertyPurpose: "Sales",
      },
    ],
    projectId: project.id,
    towerId: tower.id,
    floorId: floorPlan.id,
    type: "Residential",
    category: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    measure: "sqft",
    carpet: 700,
    saleable: 875,
    loading: 25,
    description: "Smoke demo unit",
  });
  assert(unit.id, "Unit was not created");

  const manager = await postJson("/users", {
    email: `demo.manager.${runId}@example.com`,
    username: `demo_manager_${runId}`,
    password: "Password@123",
    firstName: "Demo",
    lastName: "Manager",
    phone: `90${runId}`,
    role: "MANAGER",
    department: "SALES",
    isActive: true,
  });
  assert(manager.id, "Manager user was not created");

  const salesUser = await postJson("/users", {
    email: `demo.sales.${runId}@example.com`,
    username: `demo_sales_${runId}`,
    password: "Password@123",
    firstName: "Demo",
    lastName: "Sales",
    phone: `91${runId}`,
    role: "SALES",
    department: "SALES",
    isActive: true,
  });
  assert(salesUser.id, "Sales user was not created");

  const manualLead = await postJson("/leads", {
    salutation: "Mr.",
    firstName: "Manual",
    lastName: `Lead${runId}`,
    emails: [{ type: "Office", value: `manual.lead.${runId}@example.com` }],
    phones: [{ type: "Mobile", value: `88${runId}` }],
    status: "New",
    timeZone: "Asia/Kolkata",
    tags: "Hot Lead",
    interestedProjects: project.name,
    teamId: salesUser.id,
    conductSiteVisit: project.name,
    leadAddress: [{ address: "Lead Address", city: "Mumbai", state: "Maharashtra", country: "India", zip: "400001" }],
    personalAddress: [{ address: "Personal Address", city: "Mumbai", state: "Maharashtra", country: "India", zip: "400001" }],
    seats: 0,
    tenure: 0,
    industry: "Real Estate",
    nri: false,
  });
  assert(manualLead.id, "Manual lead was not created");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      Salutation: "Ms",
      "First name": "Imported",
      "Last name": `Lead${runId}`,
      "Email Type": "Office",
      Email: `imported.lead.${runId}@example.com`,
      "Phone Type": "Mobile",
      Phone: `87${runId}`,
      Status: "New",
      Timezone: "Asia/Kolkata",
      "Interested projects": project.name,
      Team: String(salesUser.id),
      City: "Mumbai",
      State: "Maharashtra",
      Country: "India",
      Zip: "400001",
      Industry: "Real Estate",
      "Property type": "Apartment",
      Configration: "2 BHK",
      Budget: "1 Cr",
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const form = new FormData();
  form.append("teamId", String(salesUser.id));
  form.append("file", new Blob([buffer]), `lead-import-${runId}.xlsx`);

  const importResult = await request("/leads/import", {
    method: "POST",
    body: form,
  });
  assert(importResult.importedCount === 1, `Lead import count expected 1, got ${importResult.importedCount}`);

  const assignedLeads = await request(`/leads?userId=${salesUser.id}`);
  const importedLead = assignedLeads.find((lead) => lead.firstName === "Imported" && lead.lastName === `Lead${runId}`);
  assert(importedLead?.id, "Imported lead was not assigned to sales user");

  const task = await postJson("/tasks", {
    title: `Demo Task ${runId}`,
    description: "Call imported lead and send email",
    remark: "Smoke demo task assignment",
    status: "Open",
    priority: "High",
    dueDate: new Date().toISOString(),
    dueTime: "10:30",
    attachments: ["demo-note.txt"],
    assigneeId: salesUser.id,
    assignedById: manager.id,
  });
  assert(task.id, "Task was not created");

  const login = await postJson("/auth/login", {
    email: `demo.sales.${runId}@example.com`,
    password: "Password@123",
  });
  assert(login.token, "Login did not return token");

  const accessPanel = await request("/users/access-panel", {
    headers: {
      Authorization: `Bearer ${login.token}`,
    },
  });
  assert(accessPanel.stats.assignedLeads >= 2, "Access panel did not show assigned leads");
  assert(accessPanel.stats.tasks >= 1, "Access panel did not show assigned task");

  const booking = await postJson("/bookings", {
    leadId: manualLead.id,
    unitId: unit.id,
    unitCount: 1,
    customerName: "Manual Lead",
    stage: "Booked",
    projectDetails: project.name,
    bookedOn: new Date().toISOString(),
    saleableArea: 875,
    basePrice: 8400000,
    baseRate: 12000,
    source: "Preview smoke demo",
    bookedBy: `${login.data.firstName} ${login.data.lastName}`.trim(),
    costSheet: [
      {
        fieldName: "Base Price",
        orignalValue: 8400000,
        costType: "Discount",
        inputField: 0,
        newValue: 8400000,
      },
    ],
    paymentSchedule: [
      {
        name: "Agreement",
        towerMilestone: "Agreement",
        value: 100,
        amount: 8400000,
        taxes: 420000,
        tds: 0,
        grandTotal: 8820000,
      },
    ],
  });
  assert(booking.id, "Booking was not created");

  const bookedLead = await patchJson(`/leads/${manualLead.id}`, { status: "Booked" });
  assert(bookedLead.status === "Booked", "Lead status did not change to Booked");

  const bookings = await request(`/bookings?leadId=${manualLead.id}`);
  assert(bookings.totalItems >= 1, "Booked lead booking was not returned");

  const refreshedPanel = await request("/users/access-panel", {
    headers: {
      Authorization: `Bearer ${login.token}`,
    },
  });

  const output = {
    runId,
    created: {
      project: { id: project.id, name: project.name },
      tower: { id: tower.id },
      floorPlan: { id: floorPlan.id },
      unit: { id: unit.id },
      manager: { id: manager.id, email: `demo.manager.${runId}@example.com` },
      salesUser: { id: salesUser.id, email: `demo.sales.${runId}@example.com`, password: "Password@123" },
      manualLead: { id: manualLead.id, status: bookedLead.status },
      importedLead: { id: importedLead.id },
      task: { id: task.id },
      booking: { id: booking.id, stage: booking.stage },
    },
    verified: {
      login: login.message,
      assignedLeadsBeforeBooking: accessPanel.stats.assignedLeads,
      tasksBeforeBooking: accessPanel.stats.tasks,
      assignedLeadsAfterBooking: refreshedPanel.stats.assignedLeads,
      bookingsAfterBooking: refreshedPanel.stats.bookings,
      importedLeadCount: importResult.importedCount,
      conversationDataAvailable: refreshedPanel.leads.some((lead) => Array.isArray(lead.emails) && Array.isArray(lead.phones)),
    },
  };

  console.log(JSON.stringify(output, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
