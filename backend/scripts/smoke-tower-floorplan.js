const axios = require("axios");

const BASE_URL = process.env.API_URL || process.env.BASE_URL || "http://localhost:5000";
const suffix = Date.now();
const testTowerName = `CODEX FLOORPLAN TEST TOWER ${suffix}`;
const testFloorPlanName = `CODEX FLOORPLAN TEST ${suffix}`;

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.projects)) return payload.projects;
  if (Array.isArray(payload?.towers)) return payload.towers;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function main() {
  let towerId = null;
  let floorPlanId = null;

  try {
    console.log("Testing tower to floor-plan smoke on", BASE_URL);

    const projectResponse = await axios.get(`${BASE_URL}/projects/list`);
    const projects = normalizeList(projectResponse.data);
    assert(projectResponse.status === 200, "GET /projects/list did not return 200");
    assert(projects.length > 0, "No projects found. Create a project before running this smoke test.");

    const project = projects[0];
    assert(project.id, "First project does not include an id");
    console.log("Using project:", project.id, project.name || project.projectName || "");

    const towerResponse = await axios.post(`${BASE_URL}/tower`, {
      name: testTowerName,
      projectId: project.id,
      totalFloor: 15,
    });
    towerId = towerResponse.data?.data?.id || towerResponse.data?.id;
    assert(towerResponse.status === 201, "POST /tower did not return 201");
    assert(towerId, "Tower create response did not include an id");
    console.log("Created tower without wing code:", towerId);

    const floorResponse = await axios.post(`${BASE_URL}/floor`, {
      name: testFloorPlanName,
      projectId: project.id,
      towerId,
      status: "Draft",
      unitStream: "Sale Unit",
      type: "Residential",
      category: "Flat",
      bedrooms: 2,
      bathrooms: 2,
      applicableFloorFrom: 1,
      applicableFloorTo: 3,
      unitPosition: "01, 02",
      measure: "sqft",
      carpet: 720,
      builtupArea: 820,
      saleable: 950,
      rateBasis: "On Carpet",
      baseRate: 5500,
      floorRisePerSqft: 25,
      baseFloorForFloorRise: 1,
      floorPlanImages: [],
    });
    floorPlanId = floorResponse.data?.id || floorResponse.data?.data?.id;
    const unitGroupId = floorResponse.data?.unitGroupId || floorResponse.data?.data?.unitGroupId;
    const unitCount = floorResponse.data?.unitCount || floorResponse.data?.data?.unitCount;
    assert(floorResponse.status === 201, "POST /floor did not return 201");
    assert(floorPlanId, "Floor-plan create response did not include an id");
    assert(unitGroupId, "Floor-plan create response did not include generated unit group id");
    assert(unitCount === 6, `Expected 6 generated units, received ${unitCount}`);
    console.log("Created floor plan:", floorPlanId);
    console.log("Created unit group:", unitGroupId);

    const floorDetailResponse = await axios.get(`${BASE_URL}/floor/${floorPlanId}`);
    assert(floorDetailResponse.status === 200, "GET /floor/:id did not return 200");
    assert(Number(floorDetailResponse.data?.towerId) === Number(towerId), "Floor plan is not linked to created tower");
    console.log("Verified floor plan tower link.");

    const unitsResponse = await axios.get(`${BASE_URL}/unit`, {
      params: { limit: 1000, projectId: project.id },
    });
    const units = normalizeList(unitsResponse.data);
    const generatedUnits = units.filter((unit) =>
      Number(unit.unit?.floorId || unit.floorId) === Number(floorPlanId) ||
      Number(unit.floor?.id) === Number(floorPlanId)
    );
    assert(generatedUnits.length > 0, "No generated units found for the floor plan");
    console.log("Verified generated units:", generatedUnits.length);

    console.log("Tower and floor-plan smoke test passed.");
  } catch (error) {
    console.error("Tower and floor-plan smoke test failed:", error.message);
    if (error.response) {
      console.error("HTTP Status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    process.exitCode = 1;
  } finally {
    if (towerId) {
      try {
        await axios.delete(`${BASE_URL}/tower/${towerId}`);
        console.log("Cleaned up tower:", towerId);
        towerId = null;
        floorPlanId = null;
      } catch (cleanupError) {
        console.error("Tower cleanup failed:", cleanupError.message);
      }
    }

    if (floorPlanId) {
      try {
        await axios.delete(`${BASE_URL}/floor/${floorPlanId}`);
        console.log("Cleaned up floor plan:", floorPlanId);
      } catch (cleanupError) {
        console.error("Floor-plan cleanup failed:", cleanupError.message);
      }
    }
  }
}

main();
