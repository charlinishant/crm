const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const sessionService = require("../services/session.service");

const getJwtSecret = () =>
  String(process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret").trim();

const normalizeRole = (role) => {
  const value = String(role || "").trim().toUpperCase();
  if (value === "SALESPERSON") return "SALES";

  const allowedRoles = new Set([
    "PRE_SALES",
    "SALES",
    "POST_SALES",
    "MANAGER",
    "ADMIN",
    "AGENCY_USER",
    "AGENT",
    "CHANNEL_PARTNER",
  ]);

  return allowedRoles.has(value) ? value : "SALES";
};

const normalizeDepartment = (department, role) => {
  const value = String(department || role || "").trim().toUpperCase();
  const allowedDepartments = new Set(["PRE_SALES", "SALES", "POST_SALES"]);

  return allowedDepartments.has(value) ? value : null;
};

exports.register = async (req, res) => {
  try {
    const { email, username, password, role, firstName, lastName, phone, department } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const cleanedPhone = phone ? String(phone).replace(/\D/g, "").slice(-10) : null;
    const normalizedRole = normalizeRole(role);
    const normalizedDept = normalizeDepartment(department, normalizedRole);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          ...(username ? [{ username: String(username).trim() }] : []),
          ...(cleanedPhone ? [{ phone: cleanedPhone }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email, username, or phone" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: username ? String(username).trim() : null,
        password: hashedPassword,
        role: normalizedRole,
        department: normalizedDept,
        firstName: firstName ? String(firstName).trim() : null,
        lastName: lastName ? String(lastName).trim() : null,
        phone: cleanedPhone,
      },
    });

    res.status(201).json({ message: "User registered successfully", data: { id: newUser.id, email: newUser.email } });
  } catch (err) {
    console.error("Register error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ message: "User already exists with this email, username, or phone" });
    }
    res.status(500).json({ message: err.message || "Something went wrong" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    let loginIdentifier = null;
    let user = null;

    if (email) {
      loginIdentifier = String(email || "").trim();
    } else if (username) {
      loginIdentifier = String(username || "").trim();
    }

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: "Email or username and password are required" });
    }

    user = await prisma.user.findFirst({
      where: {
        OR: [{ email: loginIdentifier.toLowerCase() }, { username: loginIdentifier }],
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Password is not set for this user" });
    }

    const isBcryptPassword = String(user.password).startsWith("$2");
    const isMatch = isBcryptPassword ? await bcrypt.compare(password, user.password) : password === user.password;

    if (!isMatch) {
      return res.status(404).json({ message: "Invalid password" });
    }

    if (!isBcryptPassword) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(password, 10) },
      });
    }

    // Create a new session record
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = req.headers["user-agent"] || null;

    const session = await sessionService.createSession({
      userId: user.id,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });

    // JWT token with session identifier
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id,
        sessionToken: session.sessionToken,
      },
      getJwtSecret(),
      { expiresIn: "24h" } // Session inactivity of 1 hour is managed dynamically via heartbeats
    );

    const data = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      teamId: user.teamId,
      profilePhoto: user.profilePhoto,
      sessionId: session.id,
      sessionToken: session.sessionToken,
    };

    res.status(200).json({
      message: "Success",
      token,
      sessionToken: session.sessionToken,
      sessionId: session.id,
      data,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.authUser?.id || req.body?.userId;
    const sessionToken = req.authUser?.sessionToken || req.body?.sessionToken || req.headers["x-session-token"];

    await sessionService.closeSession({
      userId,
      sessionToken,
      reason: "logged_out",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Unable to complete logout" });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const userId = req.authUser?.id || req.body?.userId;
    const sessionToken = req.authUser?.sessionToken || req.body?.sessionToken || req.headers["x-session-token"];

    if (!userId && !sessionToken) {
      return res.status(401).json({ active: false, message: "Authentication required" });
    }

    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = req.headers["user-agent"] || null;

    const result = await sessionService.recordHeartbeat({
      userId,
      sessionToken,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });

    if (!result.active) {
      return res.status(200).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Heartbeat error:", err);
    res.status(500).json({ active: true, error: err.message });
  }
};

exports.sessionCloseBeacon = async (req, res) => {
  try {
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {}
    }

    const userId = payload?.userId || req.authUser?.id;
    const sessionToken = payload?.sessionToken || req.headers["x-session-token"];

    if (userId || sessionToken) {
      await sessionService.closeSession({
        userId,
        sessionToken,
        reason: "logged_out",
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Session close beacon error:", err);
    res.status(200).json({ success: false });
  }
};

exports.forceLogout = async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.body.userId;
    if (!targetUserId) {
      return res.status(400).json({ message: "Target userId is required" });
    }

    await sessionService.forceLogoutUser(targetUserId, req.authUser?.id);

    res.status(200).json({ message: "User session terminated successfully" });
  } catch (err) {
    console.error("Force logout error:", err);
    res.status(500).json({ message: "Unable to force logout user" });
  }
};
