const crypto = require("crypto")

const providerName = process.env.CALL_PROVIDER || "mock"

const buildMockResponse = () => ({
  provider: providerName,
  callId: `MOCK-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
  status: "initiated",
})

const startGenericProviderCall = async ({ lead, agent, phone, agentPhone }) => {
  const startUrl = process.env.CALL_PROVIDER_START_URL
  const authToken = process.env.CALL_PROVIDER_AUTH_TOKEN

  if (!startUrl) return buildMockResponse()

  const response = await fetch(startUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      leadId: lead.id,
      agentId: agent?.id || null,
      customer_number: phone,
      agent_number: agentPhone,
      caller_id: process.env.CALL_PROVIDER_CALLER_ID || undefined,
      record: true,
    }),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result?.message || result?.error || "Cloud telephony provider rejected the call")
  }

  return {
    provider: providerName,
    callId: result.callId || result.call_id || result.sid || result.id || buildMockResponse().callId,
    status: result.status || "initiated",
    raw: result,
  }
}

exports.startProviderCall = async (payload) => {
  if (providerName === "mock") return buildMockResponse()
  return startGenericProviderCall(payload)
}
