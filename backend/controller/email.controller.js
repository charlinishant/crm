const nodeailer = require("nodemailer")
const fs = require("fs")
const prisma = require("../lib/prisma")
const path = require("path")

const transporter = nodeailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
})

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const getLeadEmail = (lead) => {
  const emails = lead?.emails
  if (!emails) return ""
  if (Array.isArray(emails)) {
    const first = emails[0]
    return typeof first === "object" ? first?.value || first?.email || "" : first || ""
  }
  if (typeof emails === "object") return emails.value || emails.email || ""
  return emails
}

exports.getEmailSenders = async (req, res) => {
  const senders = [
    process.env.EMAIL,
    ...(process.env.EMAIL_SENDERS || "").split(","),
  ]
    .map((email) => String(email || "").trim())
    .filter(Boolean)

  res.status(200).json({
    data: Array.from(new Set(senders)),
  })
}

exports.sendLeadEmail = async (req, res) => {
  let logData = {
    from: req.body?.from || process.env.EMAIL || "",
    to: req.body?.to || "",
    success: false,
  }

  try {
    const { leadId, from, to, subject, body } = req.body

    if (!subject || !String(subject).trim() || !body || !String(body).trim()) {
      return res.status(400).json({ message: "Subject and body are required" })
    }

    let lead = null
    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: Number(leadId) },
      })
    }

    if (leadId && !lead) {
      return res.status(404).json({ message: "Lead not found" })
    }

    const receiverEmail = String(to || getLeadEmail(lead)).trim()
    const senderEmail = String(from || process.env.EMAIL || "").trim()

    if (!receiverEmail) {
      return res.status(400).json({ message: "Receiver email is required" })
    }

    logData = {
      from: senderEmail || process.env.EMAIL || "",
      to: receiverEmail,
      success: false,
    }

    await transporter.sendMail({
      from: senderEmail || process.env.EMAIL,
      replyTo: senderEmail || process.env.EMAIL,
      to: receiverEmail,
      subject: String(subject).trim(),
      text: String(body).trim(),
      html: `<div>${escapeHtml(body).replace(/\n/g, "<br />")}</div>`,
    })

    await prisma.emailLog.create({
      data: { ...logData, success: true },
    })

    res.status(200).json({ message: "Email sent successfully" })
  } catch (error) {
    console.log(error)
    await prisma.emailLog.create({
      data: {
        ...logData,
        success: false,
        error: error?.message || String(error),
      },
    }).catch(() => null)
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.sendWelcomeEmail = async (req, res) => {
  try {
    const data = req.body

    let lead = await prisma.lead.findUnique({
      where: {
        id: data.leadId,
      },
    })

    if (!lead) {
      res.status(404).json("Lead not found")
    }


    let htmlTemplate = fs.readFileSync(
      path.join(__dirname, "./templates/welcome.html"),
      "utf-8",
    )
    
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: lead.emails[0]["value"],
      subject: "Welcome email",
      html: htmlTemplate,
    })

    await prisma.emailLog.create({
      data: { from: process.env.EMAIL, to: lead.emails[0]["value"], success: true },
    })

    res.status(200).json("Email send successfully")
  } catch (error) {
    console.log(error)
    await prisma.emailLog.create({
      data: {
        from: process.env.EMAIL,
        to: lead.emails[0]["value"],
        success: false,
        error: error,
      },
    })
    res.status(404).json("Something went wrong")
  }
}
