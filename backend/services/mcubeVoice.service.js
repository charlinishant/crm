const axios = require("axios")

const MCUBE_OUTBOUND_URL = "https://api.mcube.com/Restmcube-api/outbound-calls"

const requiredEnvironment = [
  "MCUBE_TOKEN",
]

const cleanPhone = (value) => String(value || "").replace(/\D/g, "")

const getMissingConfiguration = () =>
  requiredEnvironment.filter((name) => !String(process.env[name] || "").trim())

const normalizeIndianPhone = (value) => {
  const digits = cleanPhone(value)
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10)
  return digits
}

const isConfiguredVirtualNumber = (value) => {
  const phone = normalizeIndianPhone(value)
  return [
    process.env.MCUBE_INBOUND_NUMBER,
    process.env.MCUBE_OUTBOUND_NUMBER,
  ].some((number) => phone && normalizeIndianPhone(number) === phone)
}

const firstValue = (data, keys) => {
  for (const key of keys) {
    if (data?.[key] !== undefined && data[key] !== null && data[key] !== "") return data[key]
  }
  return ""
}

const isSuccessResponse = (data) => {
  const status = String(firstValue(data, ["status", "Status", "msg", "message"]) || "").toLowerCase()
  return ["succ", "success", "queued", "initiated", "true", "1"].some((item) => status.includes(item))
}

const getProviderCallId = (data, callLogId) =>
  firstValue(data, ["called", "callid", "callId", "call_id", "calluuid", "uuid", "id"]) || `mcube-${callLogId}`

const connectTwoNumbers = async ({ agentPhone, leadPhone, callLogId, leadId }) => {
  const missing = getMissingConfiguration()
  if (missing.length) {
    const error = new Error(`MCube is not configured. Missing: ${missing.join(", ")}`)
    error.statusCode = 503
    throw error
  }

  const normalizedAgentPhone = normalizeIndianPhone(agentPhone)
  const normalizedLeadPhone = normalizeIndianPhone(leadPhone)

  if (isConfiguredVirtualNumber(normalizedAgentPhone)) {
    const error = new Error("Enter the sales user's mobile number as Agent phone. Do not enter the MCube inbound or outbound virtual number.")
    error.statusCode = 400
    throw error
  }

  const payload = {
    HTTP_AUTHORIZATION:String(process.env.MCUBE_TOKEN || "").trim(),
    exenumber:normalizedAgentPhone,
    custnumber:normalizedLeadPhone,
    refurl:"1",
  }

  try {
    const response = await axios.post(
      String(process.env.MCUBE_OUTBOUND_API_URL || MCUBE_OUTBOUND_URL).trim(),
      payload,
      {
        headers:{ "Content-Type":"application/json" },
        timeout:20000,
      }
    )

    if (!isSuccessResponse(response.data)) {
      const message = firstValue(response.data, ["msg", "message", "error", "detail"]) || "MCube did not accept the call request"
      const error = new Error(message)
      error.statusCode = 502
      throw error
    }

    return {
      provider:"mcube",
      providerCallId:String(getProviderCallId(response.data, callLogId)),
      status:"initiated",
      message:"MCube will call the agent first.",
      raw:response.data,
    }
  } catch (error) {
    if (error.statusCode) throw error
    const wrapped = new Error(
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.message ||
      "MCube call failed"
    )
    wrapped.statusCode = error.response?.status || 502
    throw wrapped
  }
}

const getRecordingStream = (recordingUrl) =>
  axios.get(recordingUrl, {
    responseType:"stream",
    timeout:30000,
  })

module.exports = {
  cleanPhone,
  connectTwoNumbers,
  firstValue,
  getRecordingStream,
  isConfiguredVirtualNumber,
  normalizeIndianPhone,
}
