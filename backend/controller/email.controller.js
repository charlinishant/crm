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

exports.sendWelcomeEmail = async (req, res) => {
  try {
    const data = req.body

    let user = await prisma.user.findUnique({
      where: {
        id: data.id,
      },
    })

    if (!user) {
      res.status(404).json("User not found")
    }

    let htmlTemplate = fs.readFileSync(
      path.join(__dirname, "./templates/welcome.html"),
      "utf-8",
    )

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: "Welcome email",
      html: htmlTemplate,
    })

    await prisma.emailLog.create({
      data: { from: process.env.EMAIL, to: user.email, success: true },
    })
    res.status(200).json("Email send successfully")
  } catch (error) {
    console.log(error)
    await prisma.emailLog.create({
      data: {
        from: process.env.EMAIL,
        to: user.email,
        success: false,
        error: error,
      },
    })
    res.status(404).json("Something went wrong")
  }
}
