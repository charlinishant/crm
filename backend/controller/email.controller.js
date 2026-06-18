const nodemailer = require("nodemailer")
const fs = require("fs")
const prisma = require("../lib/prisma")
const path = require("path")

const DEFAULT_SENDER_EMAIL = "morenishant7777@gmail.com"
const getConfiguredSenderEmail = () => process.env.EMAIL || DEFAULT_SENDER_EMAIL
const getConfiguredSenderPassword = () =>
  String(process.env.EMAIL_PASSWORD || process.env.PASSWORD || "").replace(/\s/g, "")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: getConfiguredSenderEmail(),
    pass: getConfiguredSenderPassword(),
  },
})

let emailLogColumnsReady = false
let emailLogColumnNames = null

const emailLogOptionalColumns = [
  ["subject", "VARCHAR(255) NULL"],
  ["leadId", "INT NULL"],
  ["leadName", "VARCHAR(255) NULL"],
  ["sentByUserId", "INT NULL"],
  ["sentByName", "VARCHAR(255) NULL"],
  ["sentByEmail", "VARCHAR(255) NULL"],
  ["error", "VARCHAR(191) NULL"],
]

const getEmailLogColumnNames = async () => {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EmailLog'",
  )

  return new Set(rows.map((row) => row.COLUMN_NAME || row.column_name || row.Column_name).filter(Boolean))
}

const ensureEmailLogColumns = async () => {
  if (emailLogColumnsReady && emailLogColumnNames) return emailLogColumnNames

  let existingColumns = await getEmailLogColumnNames()

  for (const [column, definition] of emailLogOptionalColumns) {
    if (!existingColumns.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`EmailLog\` ADD COLUMN \`${column}\` ${definition}`).catch(() => null)
    }
  }

  existingColumns = await getEmailLogColumnNames()
  emailLogColumnNames = existingColumns
  emailLogColumnsReady = true
  return existingColumns
}

const createEmailLog = async (data) => {
  const availableColumns = await ensureEmailLogColumns()
  const logData = data?.data || data
  const valuesByColumn = {
    from: String(logData.from || getConfiguredSenderEmail()),
    to: String(logData.to || ""),
    subject: logData.subject || null,
    leadId: logData.leadId ? Number(logData.leadId) : null,
    leadName: logData.leadName || null,
    sentByUserId: logData.sentByUserId ? Number(logData.sentByUserId) : null,
    sentByName: logData.sentByName || null,
    sentByEmail: logData.sentByEmail || null,
    success: Boolean(logData.success),
    error: logData.error || null,
  }
  const insertColumns = Object.keys(valuesByColumn).filter((column) => availableColumns.has(column))
  const columnSql = insertColumns.map((column) => `\`${column}\``).join(", ")
  const valueSql = insertColumns.map(() => "?").join(", ")
  const values = insertColumns.map((column) => valuesByColumn[column])

  await prisma.$executeRawUnsafe(`INSERT INTO \`EmailLog\` (${columnSql}) VALUES (${valueSql})`, ...values)
}

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const getLeadEmail = (lead) => {
  if (lead?.email) return lead.email
  if (lead?.primaryEmail) return lead.primaryEmail
  const emails = lead?.emails
  if (!emails) return ""
  if (Array.isArray(emails)) {
    const first = emails[0]
    return typeof first === "object" ? first?.value || first?.email || "" : first || ""
  }
  if (typeof emails === "object") return emails.value || emails.email || ""
  return emails
}

const getName = (value) =>
  [value?.firstName, value?.lastName].filter(Boolean).join(" ") ||
  value?.username ||
  value?.email ||
  ""

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "")

const getAuthUser = async (req) => {
  if (!req.authUser?.id) return null

  return prisma.user.findUnique({
    where: { id: Number(req.authUser.id) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
    },
  })
}

const getMailErrorMessage = (error) => {
  if (error?.code === "EAUTH" || error?.responseCode === 535) {
    return "Gmail rejected the sender login. Use a Gmail App Password in EMAIL_PASSWORD, not the normal Gmail account password."
  }

  return error?.message || "Something went wrong"
}

exports.getEmailSenders = async (req, res) => {
  const senders = [
    getConfiguredSenderEmail(),
    ...(process.env.EMAIL_SENDERS || "").split(","),
  ]
    .map((email) => String(email || "").trim())
    .filter(Boolean)

  res.status(200).json({
    data: Array.from(new Set(senders)),
  })
}

exports.getEmailLogs = async (req, res) => {
  try {
    const availableColumns = await ensureEmailLogColumns()
    const requestedColumns = [
      "id",
      "createdAt",
      "from",
      "to",
      "subject",
      "leadId",
      "leadName",
      "sentByUserId",
      "sentByName",
      "sentByEmail",
      "success",
      "error",
    ]
    const selectColumns = requestedColumns.filter((column) => availableColumns.has(column))
    const selectSql = selectColumns.map((column) => `\`${column}\``).join(", ")
    const rows = await prisma.$queryRawUnsafe(`SELECT ${selectSql} FROM \`EmailLog\` ORDER BY \`createdAt\` DESC LIMIT 100`)
    const logs = rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      from: row.from,
      to: row.to,
      subject: row.subject || null,
      leadId: row.leadId || null,
      leadName: row.leadName || null,
      sentByUserId: row.sentByUserId || null,
      sentByName: row.sentByName || null,
      sentByEmail: row.sentByEmail || null,
      success: Boolean(row.success),
      error: row.error || null,
    }))

    res.status(200).json({ data: logs })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to load email logs" })
  }
}

exports.sendLeadEmail = async (req, res) => {
  let logData = {
    from: req.body?.from || getConfiguredSenderEmail(),
    to: req.body?.to || "",
    subject: req.body?.subject || "",
    success: false,
  }

  try {
    const { leadId, from, to, subject, body } = req.body
    const authUser = await getAuthUser(req)

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
    const senderEmail = String(from || getConfiguredSenderEmail()).trim()

    if (!receiverEmail) {
      return res.status(400).json({ message: "Receiver email is required" })
    }

    logData = {
      from: senderEmail || getConfiguredSenderEmail(),
      to: receiverEmail,
      subject: String(subject).trim(),
      leadId: lead?.id || null,
      leadName: getLeadName(lead) || null,
      sentByUserId: authUser?.id || null,
      sentByName: getName(authUser) || null,
      sentByEmail: authUser?.email || null,
      success: false,
    }

    if (!getConfiguredSenderPassword()) {
      await createEmailLog({
        data: {
          ...logData,
          success: false,
          error: "Sender email password/app password is not configured",
        },
      }).catch(() => null)

      return res.status(500).json({
        message: "Sender email password/app password is not configured",
      })
    }

    await transporter.sendMail({
      from: senderEmail || getConfiguredSenderEmail(),
      replyTo: senderEmail || getConfiguredSenderEmail(),
      to: receiverEmail,
      subject: String(subject).trim(),
      text: String(body).trim(),
      html: `<div>${escapeHtml(body).replace(/\n/g, "<br />")}</div>`,
    })

    await createEmailLog({
      data: { ...logData, success: true },
    })

    res.status(200).json({ message: "Email sent successfully" })
  } catch (error) {
    const message = getMailErrorMessage(error)
    console.error(message)
    await createEmailLog({
      data: {
        ...logData,
        success: false,
        error: message,
      },
    }).catch(() => null)
    res.status(500).json({ message })
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
      from: getConfiguredSenderEmail(),
      to: lead.emails[0]["value"],
      subject: "Welcome email",
      html: htmlTemplate,
    })

    await createEmailLog({
      data: {
        from: getConfiguredSenderEmail(),
        to: lead.emails[0]["value"],
        subject: "Welcome email",
        leadId: lead.id,
        leadName: getLeadName(lead) || null,
        success: true,
      },
    })

    res.status(200).json("Email send successfully")
  } catch (error) {
    console.log(error)
    await createEmailLog({
      data: {
        from: getConfiguredSenderEmail(),
        to: lead.emails[0]["value"],
        subject: "Welcome email",
        leadId: lead.id,
        leadName: getLeadName(lead) || null,
        success: false,
        error: error?.message || String(error),
      },
    })
    res.status(404).json("Something went wrong")
  }
}
