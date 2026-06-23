const crypto = require("crypto")
const axios = require("axios")

const requiredEnvironment = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "JWT_SECRET",
]

const getMissingConfiguration = () => {
  const missing = requiredEnvironment.filter((name) => !String(process.env[name] || "").trim())
  if (!String(process.env.TWILIO_WEBHOOK_BASE_URL || process.env.BACKEND_URL || "").trim()) {
    missing.push("TWILIO_WEBHOOK_BASE_URL (or BACKEND_URL)")
  }
  return missing
}

const cleanPhone = (value) => String(value || "").replace(/\D/g, "")

const toE164 = (value) => {
  const digits = cleanPhone(value)
  const countryCode = cleanPhone(process.env.TWILIO_DEFAULT_COUNTRY_CODE || "91")
  const normalized = digits.length === 10 && countryCode ? `${countryCode}${digits}` : digits
  return normalized ? `+${normalized}` : ""
}

const getCallbackBase = () =>
  String(process.env.TWILIO_WEBHOOK_BASE_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")

const assertPublicCallbackBase = () => {
  let url
  try {
    url = new URL(getCallbackBase())
  } catch (error) {
    const configError = new Error("TWILIO_WEBHOOK_BASE_URL must be a valid public HTTPS URL")
    configError.statusCode = 503
    throw configError
  }
  const hostname = url.hostname.toLowerCase()
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) {
    const configError = new Error(
      "Twilio cannot reach localhost. Set TWILIO_WEBHOOK_BASE_URL to your deployed backend or an HTTPS tunnel URL."
    )
    configError.statusCode = 503
    throw configError
  }
}

const createWebhookToken = (callLogId) =>
  crypto
    .createHmac("sha256", String(process.env.JWT_SECRET || ""))
    .update(`twilio-call:${callLogId}`)
    .digest("hex")

const verifyWebhookToken = (callLogId, token) => {
  if (!callLogId || !token) return false
  const expected = Buffer.from(createWebhookToken(callLogId))
  const supplied = Buffer.from(String(token))
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)
}

const getSignedCallbackUrl = (path, callLogId) => {
  const url = new URL(`${getCallbackBase()}${path}`)
  url.searchParams.set("callLogId", String(callLogId))
  url.searchParams.set("token", createWebhookToken(callLogId))
  return url.toString()
}

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const buildBridgeTwiml = ({ callLogId, leadPhone }) => {
  const callerId = toE164(process.env.TWILIO_PHONE_NUMBER)
  const destination = toE164(leadPhone)
  const statusUrl = getSignedCallbackUrl("/api/calls/twilio/status", callLogId)
  const recordingUrl = getSignedCallbackUrl("/api/calls/twilio/recording", callLogId)

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `<Dial callerId="${escapeXml(callerId)}" answerOnBridge="true" record="record-from-answer-dual" recordingStatusCallback="${escapeXml(recordingUrl)}" recordingStatusCallbackMethod="POST">`,
    `<Number statusCallback="${escapeXml(statusUrl)}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${escapeXml(destination)}</Number>`,
    "</Dial>",
    "</Response>",
  ].join("")
}

const getProviderMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.detail ||
  error.message ||
  "provider request failed"

const getActionableProviderMessage = (message, code, status) => {
  const normalized = String(message || "").toLowerCase()
  if (code === 20003 || status === 401 || /authenticate|credential|auth token/.test(normalized)) {
    return "Twilio authentication failed. Rotate the exposed Auth Token and update TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
  }
  if (code === 21210 || code === 21211 || /not a valid phone number|invalid.*number/.test(normalized)) {
    return "Twilio rejected a phone number. Use valid E.164 numbers, for example +919011108510."
  }
  if (code === 21219 || /trial.*verified|unverified/.test(normalized)) {
    return "This Twilio trial account can call only verified numbers. Verify both the agent and lead numbers in Twilio Console."
  }
  if (/insufficient|balance|funds|credit/.test(normalized)) {
    return "The Twilio account has insufficient balance. Add funds and try again."
  }
  if (/permission|geographic/.test(normalized)) {
    return "Enable Voice geographic permissions in Twilio for the destination country."
  }
  return `Twilio call failed: ${message}`
}

const connectTwoNumbers = async ({ agentPhone, leadPhone, callLogId }) => {
  const missing = getMissingConfiguration()
  if (missing.length) {
    const error = new Error(`Twilio Voice is not configured. Missing: ${missing.join(", ")}`)
    error.statusCode = 503
    throw error
  }
  assertPublicCallbackBase()

  const accountSid = String(process.env.TWILIO_ACCOUNT_SID).trim()
  const authToken = String(process.env.TWILIO_AUTH_TOKEN).trim()
  const form = new URLSearchParams()
  form.set("To", toE164(agentPhone))
  form.set("From", toE164(process.env.TWILIO_PHONE_NUMBER))
  form.set("Url", getSignedCallbackUrl("/api/calls/twilio/voice", callLogId))
  form.set("Method", "POST")
  form.set("StatusCallback", getSignedCallbackUrl("/api/calls/twilio/status", callLogId))
  form.set("StatusCallbackMethod", "POST")
  for (const event of ["initiated", "ringing", "answered", "completed"]) {
    form.append("StatusCallbackEvent", event)
  }

  try {
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls.json`,
      form,
      {
        auth:{ username:accountSid, password:authToken },
        headers:{ "Content-Type":"application/x-www-form-urlencoded" },
        timeout:20000,
      }
    )
    if (!response.data?.sid) {
      const error = new Error("Twilio accepted the request but did not return a Call SID")
      error.statusCode = 502
      throw error
    }
    return {
      provider:"twilio",
      providerCallId:String(response.data.sid),
      status:String(response.data.status || "queued").toLowerCase(),
      raw:response.data,
    }
  } catch (error) {
    if (error.statusCode) throw error
    const providerStatus = error.response?.status || 502
    const providerCode = Number(error.response?.data?.code) || null
    const wrapped = new Error(
      getActionableProviderMessage(getProviderMessage(error), providerCode, providerStatus)
    )
    wrapped.statusCode = providerStatus
    throw wrapped
  }
}

const getRecordingStream = (recordingUrl) => {
  const url = /\.(mp3|wav)(?:\?|$)/i.test(recordingUrl) ? recordingUrl : `${recordingUrl}.mp3`
  return axios.get(url, {
    auth:{
      username:String(process.env.TWILIO_ACCOUNT_SID || "").trim(),
      password:String(process.env.TWILIO_AUTH_TOKEN || "").trim(),
    },
    responseType:"stream",
    timeout:20000,
  })
}

module.exports = {
  buildBridgeTwiml,
  connectTwoNumbers,
  getMissingConfiguration,
  getRecordingStream,
  verifyWebhookToken,
}
