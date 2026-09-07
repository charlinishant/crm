const axios = require("axios");

const BASE_URL = process.env.API_URL || process.env.BASE_URL || "http://localhost:5000";
const TEST_TOWER_NAME = `CODEX TEST TOWER ${Date.now()}`;

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

async function testTowerEndpoints() {
  let createdTowerId = null;

  console.log("Testing Tower endpoints on", BASE_URL);

  try {
    console.log("1. GET /projects/list");
    const projectResponse = await axios.get(`${BASE_URL}/projects/list`);
    const projects = normalizeList(projectResponse.data);
    console.log("Projects status:", projectResponse.status, "count:", projects.length);
    assert(projectResponse.status === 200, "GET /projects/list did not return 200");
    assert(projects.length > 0, "No projects found. Create a project before running this smoke test.");

    const project = projects[0];
    assert(project.id, "First project does not include an id");

    console.log("2. GET /tower/list");
    const towerListResponse = await axios.get(`${BASE_URL}/tower/list`);
    const towers = normalizeList(towerListResponse.data);
    console.log("Tower list status:", towerListResponse.status, "count:", towers.length);
    assert(towerListResponse.status === 200, "GET /tower/list did not return 200");

    console.log("3. POST /tower");
    const createResponse = await axios.post(`${BASE_URL}/tower`, {
      name: TEST_TOWER_NAME,
      projectId: project.id,
      totalFloor: 10,
    });
    createdTowerId = createResponse.data?.data?.id || createResponse.data?.id;
    console.log("Create status:", createResponse.status, "id:", createdTowerId);
    assert(createResponse.status === 201, "POST /tower did not return 201");
    assert(createdTowerId, "Create response did not include a tower id");

    console.log(`4. GET /tower/${createdTowerId}`);
    const detailResponse = await axios.get(`${BASE_URL}/tower/${createdTowerId}`);
    console.log("Detail status:", detailResponse.status, "name:", detailResponse.data?.name);
    assert(detailResponse.status === 200, "GET /tower/:id did not return 200");
    assert(detailResponse.data?.id === createdTowerId, "GET /tower/:id returned the wrong tower");

    console.log(`5. GET /tower/list?projectId=${project.id}`);
    const filteredResponse = await axios.get(`${BASE_URL}/tower/list`, {
      params: { projectId: project.id },
    });
    const filteredTowers = normalizeList(filteredResponse.data);
    console.log("Filtered status:", filteredResponse.status, "count:", filteredTowers.length);
    assert(filteredResponse.status === 200, "Filtered tower list did not return 200");
    assert(
      filteredTowers.some((tower) => Number(tower.id) === Number(createdTowerId)),
      "Filtered tower list did not include the created tower"
    );
    assert(
      filteredTowers.every((tower) => Number(tower.projectId) === Number(project.id)),
      "Filtered tower list included a tower from another project"
    );

    console.log(`6. PATCH /tower/${createdTowerId}`);
    const updateResponse = await axios.patch(`${BASE_URL}/tower/${createdTowerId}`, {
      name: `${TEST_TOWER_NAME} UPDATED`,
      totalFloor: 12,
    });
    const updatedTower = updateResponse.data?.data || updateResponse.data;
    console.log("Update status:", updateResponse.status, "name:", updatedTower?.name);
    assert(updateResponse.status === 200, "PATCH /tower/:id did not return 200");
    assert(updatedTower?.name === `${TEST_TOWER_NAME} UPDATED`, "Tower name was not updated");

    console.log(`7. PUT /tower/${createdTowerId}`);
    const putResponse = await axios.put(`${BASE_URL}/tower/${createdTowerId}`, {
      name: `${TEST_TOWER_NAME} PUT`,
      totalFloor: 12,
    });
    const putTower = putResponse.data?.data || putResponse.data;
    console.log("PUT status:", putResponse.status, "name:", putTower?.name);
    assert(putResponse.status === 200, "PUT /tower/:id did not return 200");

    console.log(`8. DELETE /tower/${createdTowerId}`);
    const deleteResponse = await axios.delete(`${BASE_URL}/tower/${createdTowerId}`);
    console.log("Delete status:", deleteResponse.status, "message:", deleteResponse.data?.message || deleteResponse.data);
    assert(deleteResponse.status === 200, "DELETE /tower/:id did not return 200");
    createdTowerId = null;

    console.log("9. Verify deleted tower");
    try {
      await axios.get(`${BASE_URL}/tower/${putTower.id}`);
      throw new Error("Deleted tower was still readable");
    } catch (error) {
      assert(error.response?.status === 404, "Deleted tower verification did not return 404");
      console.log("Deleted tower verification status:", error.response.status);
    }

    console.log("Tower smoke test passed.");
  } catch (err) {
    console.error("Tower smoke test failed:", err.message);
    if (err.response) {
      console.error("HTTP Status:", err.response.status);
      console.error("Response data:", err.response.data);
    }

    if (createdTowerId) {
      try {
        await axios.delete(`${BASE_URL}/tower/${createdTowerId}`);
        console.log("Cleaned up test tower:", createdTowerId);
      } catch (cleanupError) {
        console.error("Cleanup failed for test tower:", createdTowerId, cleanupError.message);
      }
    }

    process.exitCode = 1;
  }
}

testTowerEndpoints();
