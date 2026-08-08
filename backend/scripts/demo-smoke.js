const XLSX = require("xlsx");

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

const postJson = (path, body, headers) =>
  request(path, { method: "POST", body: JSON.stringify(body), headers });

const patchJson = (path, body, headers) =>
  request(path, { method: "PATCH", body: JSON.stringify(body), headers });

const createImportWorkbook = (projectName, userEmail) => {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      Salutation: "Ms",
      "First name": `ExcelLead${runId}`,
      "Last name": "Demo",
      "Email Type": "Office",
      Email: `excel.lead.${runId}@demo.test`,
      "Phone Type": "Mobile",
      Phone: `8${runId.slice(0, 9)}`.padEnd(10, "1").slice(0, 10),
      Status: "New",
      Timezone: "Asia/Kolkata",
      Tags: "Hot Lead",
      "Interested projects": projectName,
      Team: userEmail,
      "Channel partner": "Demo Realty",
      "Conduct site visit": "Yes",
      "Conduct site date": "2026-05-29",
      Aaddress: "Demo Office Address",
      Street: "Demo Street",
      City: "Mumbai",
      State: "Maharashtra",
      Country: "India",
      Zip: "400001",
      "Company name": "Demo Company",
      Type: "Residential",
      "Carpet area": "720",
      Seats: "0",
      Tenure: "0",
      Gender: "Female",
      Occupations: "Manager",
      Age: "31",
      Birthday: "1995-01-01",
      "Marital status": "Single",
      Anniversary: "",
      Industry: "Real Estate",
      "Personal address": "Demo Home",
      "Personal street": "Demo Home Street",
      "Personal city": "Mumbai",
      "Personal state": "Maharashtra",
      "Personal country": "India",
      "Personal zip": "400002",
      Url: "https://example.com",
      Education: "Graduate",
      "Company title": "Manager",
      Income: "1200000",
      Purpose: "Investment",
      NRI: "No",
      "Budget min": "5000000",
      "Budget max": "8000000",
      "Possession min": "2026",
      "Possession Max": "2027",
      Area: "Mumbai",
      "Funding source": "Loan",
      "Property type": "Flat",
      Configration: "2 BHK",
      Budget: "6500000",
      "Bathroom preferences": "2",
      Furnishing: "Semi",
      Facing: "East",
      "Location preferences": "Andheri",
    },
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const main = async () => {
  const projectName = `Demo E2E Project ${runId}`;
  const userEmail = `demo.sales.${runId}@example.com`;
  const userPassword = "Demo@12345";

  const project = await postJson("/projects", {
    name: projectName,
    description: "Created by demo smoke test",
    projectType: "residential",
    possession: false,
    address: "Demo Project Address",
    street: "Demo Street",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    zip: "400001",
    locality: "Andheri",
    noOfTowers: 1,
    active: true,
    inventory: true,
    integratedPortals: "",
  });

  const tower = await postJson("/tower", {
    name: `Demo Tower ${runId}`,
    projectId: project.id,
    totalFloor: 20,
    reraTowerId: `RERA-T-${runId}`,
  });

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
    applicableFloorTo: 20,
    totalUnitsOfPlan: 20,
    facing: "E",
    cornerUnit: false,
    measure: "sqft",
    carpet: 720,
    builtupArea: 820,
    loading: 30,
    loadingBasis: "On Carpet",
    saleable: 936,
    carParkingSlots: 1,
    parkingType: "Covered Stilt",
    rateBasis: "On Carpet",
    baseRate: 10000,
    gstPercent: 5,
    stampDutyPercent: 6,
    registrationPercent: 1,
    paymentPlan: "CLP",
    floorPlanImages: [],
    autoCalc: true,
  });

  const unit = await postJson("/unit", {
    unitList: [
      {
        name: `Demo Unit ${runId}`,
        floor: 5,
        unitIndex: 501,
        baseRate: 10000,
        basePrice: 7200000,
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
    carpet: 720,
    saleable: 936,
    loading: 30,
    description: "Demo unit created by smoke test",
  });

  const user = await postJson("/users", {
    firstName: "Demo",
    lastName: `Sales ${runId}`,
    username: `demo_sales_${runId}`,
    email: userEmail,
    password: userPassword,
    phone: `7${runId.slice(0, 9)}`.padEnd(10, "2").slice(0, 10),
    role: "SALES",
    department: "SALES",
    isActive: true,
  });

  const lead = await postJson("/leads", {
    salutation: "Mr.",
    firstName: `DemoLead${runId}`,
    lastName: "Customer",
    emails: [{ type: "Office", value: `demo.lead.${runId}@example.com` }],
    phones: [{ type: "Work", value: `9${runId.slice(0, 9)}`.padEnd(10, "3").slice(0, 10) }],
    status: "New",
    timeZone: "Asia/Kolkata",
    interestedProjects: project.name,
    teamId: user.id,
    conductSiteVisit: project.name,
    leadAddress: [{ address: "Demo Address", city: "Mumbai", state: "Maharashtra", country: "India", zip: "400001" }],
    personalAddress: [],
    type: "Residential",
    carpetArea: "720",
    seats: 0,
    tenure: 0,
    industry: "Real Estate",
    propertyType: "Flat",
    configration: "2 BHK",
    budget: "7500000",
    facing: "East",
    locationPreferences: "Andheri",
  });

  const workbookBuffer = createImportWorkbook(project.name, userEmail);
  const formData = new FormData();
  formData.append("teamId", String(user.id));
  formData.append(
    "file",
    new Blob([workbookBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `demo-import-${runId}.xlsx`,
  );
  const importResult = await request("/leads/import", { method: "POST", body: formData });

  const login = await postJson("/auth/login", {
    email: userEmail,
    password: userPassword,
  });
  const authHeaders = { Authorization: `Bearer ${login.token}` };

  const task = await postJson("/tasks", {
    title: `Demo Follow Up Task ${runId}`,
    description: "Call and email the assigned demo lead",
    remark: "Smoke test task assignment",
    priority: "High",
    dueDate: "2026-05-30",
    dueTime: "10:30",
    attachments: [`demo-${runId}.pdf`],
    assigneeId: user.id,
    assignedById: user.id,
  });

  const booking = await postJson("/bookings", {
    leadId: lead.id,
    unitId: unit.id,
    unitCount: 1,
    customerName: `${lead.firstName} ${lead.lastName}`,
    stage: "Booked",
    projectDetails: `${project.name} - Demo Tower - Demo Unit`,
    bookedOn: "2026-05-29",
    saleableArea: 936,
    basePrice: 7200000,
    baseRate: 10000,
    source: "Demo Smoke Test",
    bookedBy: `${user.firstName} ${user.lastName}`,
    costSheet: [{ fieldName: "Base Rate", orignalValue: 10000, costType: "Discount", inputField: 0, newValue: 10000 }],
    paymentSchedule: [{ name: "Agreement", towerMilestone: "Agreement", value: 100, amount: 7200000, taxes: 864000, tds: 0, grandTotal: 8064000 }],
  });
  const bookedLead = await patchJson(`/leads/${lead.id}`, { status: "Booked" });

  const assignedLeads = await request(`/leads?userId=${user.id}`);
  const userPanel = await request("/users/access-panel", { headers: authHeaders });
  const assignedTasks = await request(`/tasks?assigneeId=${user.id}`);
  const leadBookings = await request(`/bookings?leadId=${lead.id}&limit=10`);

  console.log(JSON.stringify({
    runId,
    created: {
      project: { id: project.id, name: project.name },
      tower: { id: tower.id },
      floorPlan: { id: floorPlan.id },
      unit: { id: unit.id },
      user: { id: user.id, email: userEmail, password: userPassword },
      lead: { id: lead.id, status: bookedLead.status },
      importedLead: importResult,
      task: { id: task.id, assigneeId: task.assigneeId },
      booking: { id: booking.id, stage: booking.stage },
    },
    verification: {
      login: login.message,
      assignedLeadCount: assignedLeads.length,
      userPanelLeadCount: userPanel.leads.length,
      userPanelTaskCount: userPanel.tasks.length,
      userPanelBookingCount: userPanel.bookings.length,
      assignedTaskCount: assignedTasks.data.length,
      leadBookingCount: leadBookings.data.length,
      conversationSource: "Conversation screen is populated from assigned leads returned by /users/access-panel.",
      callsAndEmailsAvailable: userPanel.leads.some(item => item.phones?.length || item.emails?.length),
    },
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
