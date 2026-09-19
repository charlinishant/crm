require("dotenv").config()
const axios = require("axios")

const BASE_URL = process.env.API_URL || "http://localhost:5000"
const value = (name) => String(process.env[name] || "").trim()

async function testConfiguredUsers() {
  console.log("\n=======================================================")
  console.log("TESTING 3 CONFIGURED SALES USERS (LOGIN & SOFTPHONE)")
  console.log("=======================================================\n")

  const users = [
    {
      name: "Sales User 1",
      email: "trushant.swamigroup@gmail.com",
      password: value("TRUSHANT_SALES_PASSWORD"),
      expectedExt: value("TRUSHANT_MCUBE_EXTENSION"),
    },
    {
      name: "Sales User 2",
      email: "shivaniswamideveloper@gmail.com",
      password: value("SHIVANI_SALES_PASSWORD"),
      expectedExt: value("SHIVANI_MCUBE_EXTENSION"),
    },
    {
      name: "Sales User 3",
      email: "prasadpatilswamipmc@gmail.com",
      password: value("PRASAD_SALES_PASSWORD"),
      expectedExt: value("PRASAD_MCUBE_EXTENSION"),
    },
  ]

  for (const user of users) {
    console.log(`\n--- Testing ${user.name}: ${user.email} ---`)
    if (!user.password) throw new Error(`Missing password env var for ${user.email}`)

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password,
    })
    console.log(`Login successful (HTTP ${loginRes.status})`)
    const token = loginRes.data.token || loginRes.data.jwt

    const widgetRes = await axios.get(`${BASE_URL}/api/calls/browser-phone/widget`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log(`Widget loaded: Extension = ${widgetRes.data.agentExtension}, Email = ${widgetRes.data.mcubeEmail}`)

    if (user.expectedExt && widgetRes.data.agentExtension !== user.expectedExt) {
      throw new Error(`Expected extension ${user.expectedExt} for ${user.email}, but got ${widgetRes.data.agentExtension}`)
    }

    const meRes = await axios.get(`${BASE_URL}/api/calls/mcube/agent/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log(`MCube agent/me: Mapped = ${meRes.data.mapped}, Extension = ${meRes.data.mcubeAgent?.extension || ""}`)

    const leadsRes = await axios.get(`${BASE_URL}/leads/assigned`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)

    let leadToCall = leadsRes?.data?.leads?.[0] || leadsRes?.data?.[0]
    if (!leadToCall) {
      const allLeadsRes = await axios.get(`${BASE_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
      leadToCall = allLeadsRes?.data?.leads?.[0] || allLeadsRes?.data?.[0]
    }

    if (leadToCall) {
      console.log(`Testing Click-to-Call on Lead ID ${leadToCall.id}...`)
      try {
        const c2cRes = await axios.post(
          `${BASE_URL}/api/calls/mcube/click-to-call`,
          {
            leadId: leadToCall.id,
            requestId: `req-test-${Date.now()}`,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        console.log(`Click-to-call accepted (Status: ${c2cRes.status})`)
      } catch (c2cErr) {
        console.log(`Click-to-call provider response: ${c2cErr.response?.data?.message || c2cErr.message}`)
      }
    }
  }

  console.log("\n=======================================================")
  console.log("ALL 3 CONFIGURED SALES USERS VERIFIED")
  console.log("=======================================================\n")
}

if (require.main === module) {
  testConfiguredUsers()
    .catch((err) => {
      console.error("\nTest failed:", err.response?.data || err.message)
      process.exitCode = 1
    })
}

module.exports = { testConfiguredUsers }
