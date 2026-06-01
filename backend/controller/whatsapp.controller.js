const normalizeRecipientPhone = (phone) => {
  const cleanPhone = String(phone || "").replace(/\D/g, "")
  const defaultCountryCode = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "")

  if (!cleanPhone) return ""
  if (cleanPhone.length === 10 && defaultCountryCode) return `${defaultCountryCode}${cleanPhone}`
  return cleanPhone
}

const toTwilioWhatsAppAddress = (phone) => {
  const value = String(phone || "").trim()
  if (!value) return ""
  if (value.toLowerCase().startsWith("whatsapp:")) return value

  const normalizedPhone = normalizeRecipientPhone(value)
  return normalizedPhone ? `whatsapp:+${normalizedPhone}` : ""
}

const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM || process.env.WHATSAPP_TWILIO_FROM

  return {
    accountSid,
    authToken,
    from: toTwilioWhatsAppAddress(from),
  }
}

const sendWhatsAppMessage = async (req, res) => {
  try {
    const { phone, message, leadId } = req.body || {}
    const { accountSid, authToken, from } = getTwilioConfig()

    if (!accountSid || !authToken || !from) {
      return res.status(500).json({
        message:
          "Twilio WhatsApp API is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in backend .env.",
      })
    }

    const recipientPhone = toTwilioWhatsAppAddress(phone)
    if (!recipientPhone) {
      return res.status(400).json({ message: "Lead WhatsApp phone number is required" })
    }

    const body = String(message || "").trim()
    if (!body) {
      return res.status(400).json({ message: "WhatsApp message is required" })
    }

    const payload = new URLSearchParams({
      From: from,
      To: recipientPhone,
      Body: body,
    })

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload,
      }
    )

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      return res.status(response.status).json({
        message: result?.message || result?.error_message || "Twilio WhatsApp API rejected the message",
        error: result,
      })
    }

    res.status(response.status).json({
      message: "WhatsApp message sent",
      leadId: leadId || null,
      provider: "twilio",
      providerHttpStatusCode: response.status,
      providerHttpStatusText: response.statusText || "Created",
      providerMessageId: result?.sid || null,
      providerStatus: result?.status || null,
      providerResponse: result,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to send WhatsApp message" })
  }
}

module.exports = {
  sendWhatsAppMessage,
}
