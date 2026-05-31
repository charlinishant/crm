const normalizeRecipientPhone = (phone) => {
  const cleanPhone = String(phone || "").replace(/\D/g, "")
  const defaultCountryCode = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "")

  if (!cleanPhone) return ""
  if (cleanPhone.length === 10 && defaultCountryCode) return `${defaultCountryCode}${cleanPhone}`
  return cleanPhone
}

const sendWhatsAppMessage = async (req, res) => {
  try {
    const { phone, message, leadId } = req.body || {}
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0"

    if (!token || !phoneNumberId) {
      return res.status(500).json({
        message: "WhatsApp API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend .env.",
      })
    }

    const recipientPhone = normalizeRecipientPhone(phone)
    if (!recipientPhone) {
      return res.status(400).json({ message: "Lead WhatsApp phone number is required" })
    }

    if (!String(message || "").trim()) {
      return res.status(400).json({ message: "WhatsApp message is required" })
    }

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: String(message).trim(),
        },
      }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      return res.status(response.status).json({
        message: result?.error?.message || "WhatsApp API rejected the message",
        error: result?.error,
      })
    }

    res.status(200).json({
      message: "WhatsApp message sent",
      leadId: leadId || null,
      providerMessageId: result?.messages?.[0]?.id || null,
      providerResponse: result,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to send WhatsApp message" })
  }
}

module.exports = {
  sendWhatsAppMessage,
}
