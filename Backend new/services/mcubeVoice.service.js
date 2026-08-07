const axios = require("axios")

const MCUBE_OUTBOUND_URL = "https://api.mcube.com/Restmcube-api/outbound-calls"
const MCUBE_WIDGET_AUTH_URL = "https://mcube.vmc.in/common-widget/Phone/auth"
const MCUBE_DISPOSITION_URL = "https://config.mcube.com/business/disposition-api/disposition"

const cleanPhone = (value) => String(value || "").replace(/\D/g, "")

const getClickToCallToken = () =>
  String(process.env.MCUBE_CLICK2CALL_TOKEN || process.env.MCUBE_TOKEN || "").trim()

const getClickToCallUrl = () =>
  String(process.env.MCUBE_CLICK2CALL_URL || process.env.MCUBE_OUTBOUND_API_URL || MCUBE_OUTBOUND_URL).trim()

const getDispositionToken = () =>
  String(process.env.MCUBE_DISPOSITION_TOKEN || process.env.MCUBE_TOKEN || "").trim()

const getDispositionUrl = () =>
  String(process.env.MCUBE_DISPOSITION_URL || MCUBE_DISPOSITION_URL).trim()

const getRequestTimeout = () => {
  const configured = Number(process.env.MCUBE_REQUEST_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0 ? configured : 20000
}

const normalizeIndianPhone = (value) => {
  const digits = cleanPhone(value)
  const defaultCountryCode = String(process.env.DEFAULT_PHONE_COUNTRY_CODE || process.env.MCUBE_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "")
  if (digits.length > 10 && defaultCountryCode && digits.startsWith(defaultCountryCode)) return digits.slice(-10)
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1)
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

const getProviderErrorMessage = (message, agentPhone) => {
  const text = String(message || "").trim()
  const normalizedText = text.toLowerCase()

  if (
    normalizedText.includes("not opted") ||
    normalizedText.includes("outbound calls") ||
    normalizedText.includes("oncall")
  ) {
    return `MCube rejected sales number ${agentPhone}. Enable this mobile as an outbound executive in MCube, or wait until the executive is free, then try again.`
  }

  return text || "MCube did not accept the call request"
}

const connectTwoNumbers = async ({ agentExtension, agentPhone, leadPhone, callLogId, leadId, requestId }) => {
  const token = getClickToCallToken()
  if (!token) {
    const error = new Error("MCube is not configured. Missing: MCUBE_CLICK2CALL_TOKEN")
    error.statusCode = 503
    throw error
  }

  const normalizedAgentPhone = normalizeIndianPhone(agentPhone)
  const normalizedLeadPhone = normalizeIndianPhone(leadPhone)
  const normalizedAgentExtension = String(agentExtension || "").trim()

  if (!/^\d{10}$/.test(normalizedLeadPhone)) {
    const error = new Error("Customer phone number is unavailable.")
    error.statusCode = 400
    throw error
  }
  if (!normalizedAgentExtension && !/^\d{10}$/.test(normalizedAgentPhone)) {
    const error = new Error("MCUBE calling number is not configured for this user.")
    error.statusCode = 400
    throw error
  }

  if (isConfiguredVirtualNumber(normalizedAgentPhone)) {
    const error = new Error("Enter the sales user's mobile number as Agent phone. Do not enter the MCube inbound or outbound virtual number.")
    error.statusCode = 400
    throw error
  }

  const payload = {
    HTTP_AUTHORIZATION:token,
    exenumber:normalizedAgentPhone,
    custnumber:normalizedLeadPhone,
    refurl:String(process.env.MCUBE_CALLBACK_URL || callLogId),
    refid:String(requestId || callLogId),
    crmCallLogId:String(callLogId),
    crmLeadId:leadId ? String(leadId) : "",
  }
  if (normalizedAgentExtension) {
    payload.ext = normalizedAgentExtension
    payload.extension = normalizedAgentExtension
    payload.exten = normalizedAgentExtension
    payload.agentExt = normalizedAgentExtension
    payload.sipExt = normalizedAgentExtension
    payload.extInfo = normalizedAgentExtension
  }

  try {
    const response = await axios.post(
      getClickToCallUrl(),
      payload,
      {
        headers:{ "Content-Type":"application/json" },
        timeout:getRequestTimeout(),
      }
    )

    if (!isSuccessResponse(response.data)) {
      const message = getProviderErrorMessage(
        firstValue(response.data, ["msg", "message", "error", "detail"]),
        normalizedAgentPhone
      )
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
    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.response?.data?.error ||
      error.message
    const wrapped = new Error(
      getProviderErrorMessage(providerMessage, normalizedAgentPhone) ||
      "MCube call failed"
    )
    wrapped.statusCode = error.response?.status || 502
    throw wrapped
  }
}

const getRecordingUrlCandidates = (recordingUrl) => {
  const url = String(recordingUrl || "").trim()
  if (!url) return []
  const candidates = [url]
  if (url.startsWith("http://")) candidates.push(url.replace(/^http:\/\//, "https://"))
  if (url.startsWith("https://")) candidates.push(url.replace(/^https:\/\//, "http://"))
  return [...new Set(candidates)]
}

const getRecordingStream = async (recordingUrl) => {
  let lastError = null
  const candidates = getRecordingUrlCandidates(recordingUrl)

  for (const url of candidates) {
    try {
      return await axios.get(url, {
        responseType:"stream",
        timeout:60000,
        maxRedirects:5,
        headers:{
          Accept:"audio/*,application/octet-stream,*/*",
          "User-Agent":"Mozilla/5.0 CRM recording loader",
        },
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error("Recording URL is empty")
}

const submitInboundDisposition = async ({ callId, disposition, notes, phone, leadName, callLogId }) => {
  const token = getDispositionToken()
  const normalizedCallId = String(callId || "").trim()

  if (!token) {
    const error = new Error("MCube disposition API is not configured. Missing: MCUBE_DISPOSITION_TOKEN or MCUBE_TOKEN")
    error.statusCode = 503
    throw error
  }
  if (!normalizedCallId) {
    const error = new Error("MCube callid is required before sending inbound disposition.")
    error.statusCode = 400
    throw error
  }

  const payload = {
    Authorization:token,
    callid:normalizedCallId,
    custom1:String(disposition || "").trim(),
    custom2:String(notes || "").trim(),
    custom3:String(phone || "").trim(),
    custom4:String(leadName || callLogId || "").trim(),
  }

  try {
    const response = await axios.post(
      getDispositionUrl(),
      payload,
      {
        headers:{ "Content-Type":"application/json" },
        timeout:getRequestTimeout(),
      }
    )
    if (!isSuccessResponse(response.data)) {
      const providerMessage = firstValue(response.data, ["msg", "message", "error", "detail"])
      const error = new Error(providerMessage || "MCube did not accept the inbound disposition.")
      error.statusCode = 502
      throw error
    }
    return {
      success:true,
      provider:"mcube",
      raw:response.data,
    }
  } catch (error) {
    if (error.statusCode) throw error
    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.response?.data?.error ||
      error.message
    const wrapped = new Error(providerMessage || "MCube inbound disposition failed")
    wrapped.statusCode = error.response?.status || 502
    throw wrapped
  }
}

const getBrowserPhoneConfig = () => {
  const baseUrl = String(
    process.env.MCUBE_WEBPHONE_URL ||
    process.env.MCUBE_SOFTPHONE_URL ||
    MCUBE_WIDGET_AUTH_URL
  ).trim()
  const token = String(
    process.env.MCUBE_WEBPHONE_TOKEN ||
    process.env.MCUBE_SOFTPHONE_TOKEN ||
    process.env.MCUBE_TOKEN ||
    ""
  ).trim()
  if (!token) return null

  return {
    baseUrl,
    token,
    tokenParam:String(process.env.MCUBE_WEBPHONE_TOKEN_PARAM || "auth_token").trim() || "auth_token",
  }
}

const buildBrowserPhoneUrl = ({ agentEmail, agentExtension, agentPhone, leadPhone, callLogId, leadId, agentId, agentName, leadName }) => {
  const config = getBrowserPhoneConfig()
  if (!config) {
    const error = new Error("MCube browser softphone is not configured. Add MCUBE_TOKEN or MCUBE_WEBPHONE_TOKEN to backend .env.")
    error.statusCode = 503
    throw error
  }
  if (!String(agentEmail || "").trim()) {
    const error = new Error("Sales user email is required for MCube browser softphone login.")
    error.statusCode = 400
    throw error
  }

  const addWidgetParams = (url, includeAuth = false) => {
    url.searchParams.set("username", String(agentEmail).trim())
    if (includeAuth && config.token) url.searchParams.set(config.tokenParam, config.token)
    if (normalizedAgentPhone) {
      url.searchParams.set("exenumber", normalizedAgentPhone)
      url.searchParams.set("agentPhone", normalizedAgentPhone)
      url.searchParams.set("mobile", normalizedAgentPhone)
    }
    if (normalizedAgentExtension) {
      url.searchParams.set("ext", normalizedAgentExtension)
      url.searchParams.set("extension", normalizedAgentExtension)
      url.searchParams.set("exten", normalizedAgentExtension)
      url.searchParams.set("agentExt", normalizedAgentExtension)
      url.searchParams.set("sipExt", normalizedAgentExtension)
      url.searchParams.set("extInfo", normalizedAgentExtension)
    }
    if (callLogId) url.searchParams.set("crmCallLogId", String(callLogId))
    if (leadId) url.searchParams.set("crmLeadId", String(leadId))
    if (agentId) url.searchParams.set("crmAgentId", String(agentId))
    if (agentName) url.searchParams.set("agentName", String(agentName))
    if (leadName) url.searchParams.set("leadName", String(leadName))
    return url
  }

  const normalizedAgentPhone = normalizeIndianPhone(agentPhone)
  const normalizedAgentExtension = String(agentExtension || "").trim()
  const authUrl = addWidgetParams(new URL(config.baseUrl), true).toString()
  return { authUrl, phoneUrl:authUrl }
}

module.exports = {
  buildBrowserPhoneUrl,
  cleanPhone,
  connectTwoNumbers,
  firstValue,
  getRecordingStream,
  getBrowserPhoneConfig,
  getClickToCallToken,
  getClickToCallUrl,
  isConfiguredVirtualNumber,
  normalizeIndianPhone,
  submitInboundDisposition,
}
