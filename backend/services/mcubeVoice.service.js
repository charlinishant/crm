const axios = require("axios")
const mcubeConfig = require("./mcubeConfig.service")

const cleanPhone = (value) => String(value || "").replace(/\D/g, "")

const getClickToCallToken = () => mcubeConfig.getServiceConfig().click2callToken

const getClickToCallUrl = () =>
  String(mcubeConfig.getServiceConfig().click2callUrl || "https://api.mcube.com/Restmcube-api/outbound-calls")
    .trim()
    .replace(/\/Restmcube-api\/Calldata\/?$/i, "/Restmcube-api/outbound-calls")

const getDispositionToken = () => mcubeConfig.getServiceConfig().dispositionToken

const getDispositionUrl = () =>
  String(mcubeConfig.getServiceConfig().dispositionUrl || "https://config.mcube.com/business/disposition-api/disposition").trim()

const getRequestTimeout = () => mcubeConfig.getServiceConfig().requestTimeoutMs

const shouldSendCrmMetadata = () => mcubeConfig.getServiceConfig().sendCrmMetadata

const getWebphoneConfig = () => {
  const config = mcubeConfig.getServiceConfig()
  if (!config.webphoneToken) return null

  return {
    baseUrl: config.webphoneUrl,
    token: config.webphoneToken,
    tokenParam: String(process.env.MCUBE_WEBPHONE_TOKEN_PARAM || "auth_token").trim() || "auth_token",
  }
}

const normalizeIndianPhone = (value) => {
  const config = mcubeConfig.getServiceConfig()
  const digits = cleanPhone(value)
  const defaultCountryCode = String(config.defaultCountryCode || "91").replace(/\D/g, "")
  if (digits.length > 10 && defaultCountryCode && digits.startsWith(defaultCountryCode)) return digits.slice(-10)
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1)
  return digits
}

const isConfiguredVirtualNumber = (value) => {
  const config = mcubeConfig.getServiceConfig()
  const phone = normalizeIndianPhone(value)
  return [
    config.inboundNumber,
    config.outboundNumber,
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

const connectTwoNumbers = async ({ agentExtension, agentPhone, leadPhone, callLogId, leadId, requestId, agentMode }) => {
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
  if (!/^\d{10}$/.test(normalizedAgentPhone)) {
    const error = new Error("Executive mobile number (10 digits) is required to place an outbound call. Please configure the agent's 10-digit phone number.")
    error.statusCode = 400
    throw error
  }

  if (normalizedAgentPhone && isConfiguredVirtualNumber(normalizedAgentPhone)) {
    const error = new Error("Enter the sales user's mobile number as Agent phone. Do not enter the MCube inbound or outbound virtual number.")
    error.statusCode = 400
    throw error
  }

  const config = mcubeConfig.getServiceConfig()
const callbackUrl = String(process.env.MCUBE_CALLBACK_URL || "").trim() || "1"
const payload = {
    HTTP_AUTHORIZATION:token,
    exenumber:normalizedAgentPhone,
    custnumber:normalizedLeadPhone,
    refurl:callbackUrl,
  }
  if (shouldSendCrmMetadata()) {
    payload.refid = String(requestId || callLogId)
    payload.crmCallLogId = String(callLogId)
    payload.crmLeadId = leadId ? String(leadId) : ""
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
  const config = mcubeConfig.getServiceConfig()
  if (!config.webphoneToken) return null

  return {
    baseUrl: config.webphoneUrl,
    token: config.webphoneToken,
    tokenParam:String(process.env.MCUBE_WEBPHONE_TOKEN_PARAM || "auth_token").trim() || "auth_token",
  }
}

const buildBrowserPhoneUrl = ({ agentEmail, agentExtension, agentPhone, leadPhone, callLogId, leadId, agentId, agentName, leadName }) => {
  const config = getBrowserPhoneConfig()
  if (!config) {
    const error = new Error("MCube browser softphone is not configured. Check MCUBE_WEBPHONE_TOKEN or MCUBE_TOKEN in backend .env.")
    error.statusCode = 503
    throw error
  }
  const email = String(agentEmail || "").trim()
  if (!email) {
    const error = new Error("Sales user email is required for MCube browser softphone login.")
    error.statusCode = 400
    throw error
  }

  const url = new URL(config.baseUrl)
  url.searchParams.set("username", email.toLowerCase())
  if (config.token) {
    url.searchParams.set(config.tokenParam || "auth_token", config.token)
  }

  const authUrl = url.toString()
  return { authUrl, phoneUrl: authUrl }
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
