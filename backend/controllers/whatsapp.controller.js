const crypto = require("crypto")
const prisma = require("../lib/prisma")

const normalizeRecipientPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "")
  const countryCode = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "")
  return digits.length === 10 && countryCode ? `${countryCode}${digits}` : digits
}

const toWhatsAppAddress = (phone) => {
  const value = String(phone || "").trim()
  if (!value) return ""
  if (value.toLowerCase().startsWith("whatsapp:")) return value
  const digits = normalizeRecipientPhone(value)
  return digits ? `whatsapp:+${digits}` : ""
}

const isAdmin = (req) =>
  ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(String(req.authUser?.role || "").toUpperCase())

const createCallbackToken = (id) =>
  crypto.createHmac("sha256", String(process.env.JWT_SECRET || ""))
    .update(`twilio-whatsapp:${id}`)
    .digest("hex")

const verifyCallbackToken = (id, token) => {
  if (!id || !token) return false
  const expected = Buffer.from(createCallbackToken(id))
  const supplied = Buffer.from(String(token))
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)
}

const getCallbackUrl = (id) => {
  const base = String(process.env.TWILIO_WEBHOOK_BASE_URL || process.env.BACKEND_URL || "")
    .trim()
    .replace(/\/$/, "")
  const url = new URL(`${base}/api/whatsapp/status`)
  url.searchParams.set("messageId", String(id))
  url.searchParams.set("token", createCallbackToken(id))
  return url.toString()
}

const getConfig = () => ({
  accountSid:String(process.env.TWILIO_ACCOUNT_SID || "").trim(),
  authToken:String(process.env.TWILIO_AUTH_TOKEN || "").trim(),
  from:toWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM || process.env.WHATSAPP_TWILIO_FROM),
})

const assertLeadAccess = async (req, leadId) => {
  const lead = await prisma.lead.findUnique({ where:{ id:leadId } })
  if (!lead) {
    const error = new Error("Lead not found")
    error.statusCode = 404
    throw error
  }
  if (!isAdmin(req) && lead.teamId && Number(lead.teamId) !== Number(req.authUser?.id)) {
    const error = new Error("You can message only your assigned leads")
    error.statusCode = 403
    throw error
  }
  return lead
}

const sendWhatsAppMessage = async (req, res) => {
  let messageLog = null
  try {
    const leadId = Number(req.body?.leadId)
    const userId = Number(req.authUser?.id)
    if (!leadId) return res.status(400).json({ message:"leadId is required" })
    if (!userId) return res.status(401).json({ message:"Authentication is required" })
    await assertLeadAccess(req, leadId)

    const { accountSid, authToken, from } = getConfig()
    if (!accountSid || !authToken || !from) {
      return res.status(503).json({
        message:"Twilio WhatsApp is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM.",
      })
    }
    const to = toWhatsAppAddress(req.body?.phone)
    const body = String(req.body?.message || "").trim()
    if (!to) return res.status(400).json({ message:"Lead WhatsApp phone number is required" })
    if (!body) return res.status(400).json({ message:"WhatsApp message is required" })

    messageLog = await prisma.whatsAppMessage.create({
      data:{ leadId, userId, direction:"outgoing", from, to, body, status:"queued" },
    })
    const payload = new URLSearchParams({
      From:from,
      To:to,
      Body:body,
      StatusCallback:getCallbackUrl(messageLog.id),
    })
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method:"POST",
        headers:{
          Authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type":"application/x-www-form-urlencoded",
        },
        body:payload,
      }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const providerMessage = result?.message || result?.error_message || "Twilio WhatsApp rejected the message"
      await prisma.whatsAppMessage.update({
        where:{ id:messageLog.id },
        data:{ status:"failed", errorCode:String(result?.code || response.status), errorMessage:providerMessage },
      })
      return res.status(response.status).json({ message:providerMessage })
    }

    const saved = await prisma.whatsAppMessage.update({
      where:{ id:messageLog.id },
      data:{ providerMessageId:result.sid || null, status:result.status || "queued", sentAt:new Date() },
    })
    res.status(201).json({
      message:"WhatsApp message queued",
      provider:"twilio",
      providerMessageId:saved.providerMessageId,
      providerStatus:saved.status,
      data:saved,
    })
  } catch (error) {
    if (messageLog?.id) {
      await prisma.whatsAppMessage.update({
        where:{ id:messageLog.id },
        data:{ status:"failed", errorMessage:error.message },
      }).catch(() => null)
    }
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to send WhatsApp message" })
  }
}

const listLeadMessages = async (req, res) => {
  try {
    const leadId = Number(req.params.leadId)
    if (!leadId) return res.status(400).json({ message:"Valid leadId is required" })
    await assertLeadAccess(req, leadId)
    const data = await prisma.whatsAppMessage.findMany({
      where:{ leadId },
      orderBy:{ createdAt:"asc" },
      take:200,
    })
    res.json({ data })
  } catch (error) {
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to load messages" })
  }
}

const updateMessageStatus = async (req, res) => {
  try {
    const id = Number(req.query.messageId)
    if (!verifyCallbackToken(id, req.query.token)) {
      return res.status(403).json({ message:"Invalid callback signature" })
    }
    const status = String(req.body.MessageStatus || req.body.SmsStatus || "").toLowerCase()
    const errorCode = req.body.ErrorCode ? String(req.body.ErrorCode) : null
    await prisma.whatsAppMessage.update({
      where:{ id },
      data:{
        ...(req.body.MessageSid ? { providerMessageId:String(req.body.MessageSid) } : {}),
        ...(status ? { status } : {}),
        errorCode,
        ...(status === "delivered" ? { deliveredAt:new Date() } : {}),
        ...(status === "read" ? { readAt:new Date() } : {}),
      },
    })
    res.sendStatus(204)
  } catch (error) {
    console.error("WhatsApp status callback error:", error.message)
    res.sendStatus(500)
  }
}

module.exports = { sendWhatsAppMessage, listLeadMessages, updateMessageStatus }
