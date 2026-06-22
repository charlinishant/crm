const axios = require("axios")

const requiredEnvironment = [
  "EXOTEL_API_KEY",
  "EXOTEL_API_TOKEN",
  "EXOTEL_ACCOUNT_SID",
  "EXOTEL_SUBDOMAIN",
  "EXOTEL_CALLER_ID",
  "BACKEND_URL",
]

const getMissingConfiguration = () =>
  requiredEnvironment.filter((name) => !String(process.env[name] || "").trim())

const getExotelEndpoint = () => {
  const host = String(process.env.EXOTEL_SUBDOMAIN || "api.in.exotel.com")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
  const accountSid = encodeURIComponent(String(process.env.EXOTEL_ACCOUNT_SID || "").trim())
  return `https://${host}/v1/Accounts/${accountSid}/Calls/connect.json`
}

const getProviderCallId = (data) =>
  data?.Call?.Sid ||
  data?.Call?.CallSid ||
  data?.call?.sid ||
  data?.Sid ||
  data?.CallSid ||
  data?.sid ||
  data?.id ||
  null

const connectTwoNumbers = async ({ agentPhone, leadPhone }) => {
  const missing = getMissingConfiguration()
  if (missing.length) {
    const error = new Error(`Exotel is not configured. Missing: ${missing.join(", ")}`)
    error.statusCode = 503
    throw error
  }

  const callbackBase = String(process.env.BACKEND_URL).replace(/\/$/, "")
  const form = new URLSearchParams()
  form.set("From", agentPhone)
  form.set("To", leadPhone)
  form.set("CallerId", String(process.env.EXOTEL_CALLER_ID).trim())
  form.set("Record", "true")
  form.set("StatusCallback", `${callbackBase}/api/calls/webhook`)

  try {
    const response = await axios.post(getExotelEndpoint(), form, {
      auth: {
        username: String(process.env.EXOTEL_API_KEY).trim(),
        password: String(process.env.EXOTEL_API_TOKEN).trim(),
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 20000,
    })

    const providerCallId = getProviderCallId(response.data)
    if (!providerCallId) {
      const error = new Error("Exotel accepted the request but did not return a call identifier")
      error.statusCode = 502
      throw error
    }

    return {
      provider: "exotel",
      providerCallId:String(providerCallId),
      status:String(response.data?.Call?.Status || response.data?.status || "initiated").toLowerCase(),
      raw:response.data,
    }
  } catch (error) {
    if (error.statusCode) throw error

    const providerMessage =
      error.response?.data?.RestException?.Message ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message
    const wrapped = new Error(`Exotel call failed: ${providerMessage || "provider request failed"}`)
    wrapped.statusCode = error.response?.status || 502
    throw wrapped
  }
}

module.exports = {
  connectTwoNumbers,
  getMissingConfiguration,
}
