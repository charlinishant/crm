const axios = require("axios");

const BASE_URL = "http://localhost:5000";

async function testTowerEndpoints() {
  console.log("Testing Tower endpoints on", BASE_URL);

  try {
    // 1. GET /projects/list
    console.log("1. GET /projects/list ...");
    const pList = await axios.get(`${BASE_URL}/projects/list`);
    console.log("Projects list status:", pList.status, "count:", pList.data.length);

    // 2. GET /tower
    console.log("2. GET /tower ...");
    const tGet = await axios.get(`${BASE_URL}/tower`);
    console.log("Tower get status:", tGet.status, "data:", tGet.data);

    // 3. GET /tower?limit=100
    console.log("3. GET /tower?limit=100 ...");
    const tLimit = await axios.get(`${BASE_URL}/tower?limit=100`);
    console.log("Tower limit status:", tLimit.status, "count:", tLimit.data?.data?.length || tLimit.data?.length);

    // 4. GET /tower/list
    console.log("4. GET /tower/list ...");
    const tList = await axios.get(`${BASE_URL}/tower/list`);
    console.log("Tower list status:", tList.status, "count:", tList.data.length);

    // 5. POST /tower (Create test tower)
    if (pList.data.length > 0) {
      const firstProjectId = pList.data[0].id;
      console.log(`5. POST /tower for project ID ${firstProjectId} ...`);
      const createRes = await axios.post(`${BASE_URL}/tower`, {
        name: `Test Tower ${Date.now()}`,
        projectId: firstProjectId,
        totalFloor: 10
      });
      console.log("Create tower response:", createRes.status, createRes.data);
      const newTowerId = createRes.data.id;

      // 6. GET /tower/:id
      console.log(`6. GET /tower/${newTowerId} ...`);
      const getSingle = await axios.get(`${BASE_URL}/tower/${newTowerId}`);
      console.log("Single tower:", getSingle.data);

      // 7. PATCH /tower/:id
      console.log(`7. PATCH /tower/${newTowerId} ...`);
      const updateRes = await axios.patch(`${BASE_URL}/tower/${newTowerId}`, {
        name: `Updated Tower ${Date.now()}`,
        totalFloor: 12
      });
      console.log("Update tower response:", updateRes.status, updateRes.data);

      // 8. DELETE /tower/:id
      console.log(`8. DELETE /tower/${newTowerId} ...`);
      const delRes = await axios.delete(`${BASE_URL}/tower/${newTowerId}`);
      console.log("Delete tower response:", delRes.status, delRes.data);
    }

  } catch (err) {
    console.error("Tower test failed:", err.message);
    if (err.response) {
      console.error("HTTP Status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
  }
}

testTowerEndpoints();
