// backend/controllers/adminController.js

const User = require("../models/User");
const Session = require("../models/Session");
const Message = require("../models/Message");
const Report = require("../models/Report");
const Skill = require("../models/Skill");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// ---- small validation helpers ---------------------------------------------------------------
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const isEmailLike = (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length <= 254;
const validPassword = (v) => typeof v === "string" && v.length >= 6 && Buffer.byteLength(v) <= 72;

const normalizeSkillName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeUserStatus = (status) => {
  if (!status || status === "active") return "";
  return status === "blocked" ? "blocked" : status;
};

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profilePicture: user.profilePicture || "",
  skillsToTeach: user.skillsToTeach || [],
  skillsToLearn: user.skillsToLearn || [],
  status: normalizeUserStatus(user.status),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getDashboardOverview = async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalSessions,
      completedSessions,
      pendingReports,
      totalReports,
      reportedUsers,
      totalMatches,
      users,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        $or: [
          { updatedAt: { $gte: last30Days } },
          { createdAt: { $gte: last30Days } },
        ],
        status: { $ne: "blocked" },
      }),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      Session.countDocuments(),
      Session.countDocuments({ status: { $in: ["completed", "fulfilled"] } }),
      Report.countDocuments({
        status: { $in: ["pending", "open", "under review"] },
      }),
      Report.countDocuments(),
      Report.distinct("targetUser").then((list) => list.length),
      Session.countDocuments({
        status: {
          $in: ["pending", "accepted", "completed", "scheduled", "confirmed"],
        },
      }),
      User.find({}, "skillsToTeach skillsToLearn").lean(),
    ]);

    const skillCounts = new Map();
    users.forEach((user) => {
      const list = [
        ...(user.skillsToTeach || []),
        ...(user.skillsToLearn || []),
      ];
      list.forEach((skill) => {
        const clean = normalizeSkillName(skill);
        if (!clean) return;
        skillCounts.set(clean, (skillCounts.get(clean) || 0) + 1);
      });
    });

    const totalSkills = skillCounts.size;
    const growthRate = totalUsers
      ? Number(((newUsers / totalUsers) * 100).toFixed(1))
      : 0;

    res.status(200).json({
      totalUsers,
      activeUsers,
      newUsers,
      totalSkills,
      totalMatches,
      totalSessions,
      completedSessions,
      reportedUsers,
      pendingReports,
      totalReports,
      userGrowth: growthRate,
      recentActivity: Math.max(0, newUsers),
      statusSummary: {
        active: activeUsers,
        blocked: await User.countDocuments({ status: "blocked" }),
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch dashboard overview" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      status = "all",
      role = "all",
      sort = "newest",
    } = req.query;
    const query = {};

    if (status === "active") query.status = { $ne: "blocked" };
    if (status === "blocked") query.status = "blocked";
    if (status === "suspended") query.status = "suspended";
    if (role !== "all") query.role = role;

    if (search) {
      // escape the text: a raw user-typed regex can be slow (ReDoS) or match everything
      const safe = escapeRegex(String(search).slice(0, 100));
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
      role: { role: 1 },
    };

    const users = await User.find(query)
      .sort(sortMap[sort] || sortMap.newest)
      .select("-password -__v");

    res.status(200).json(users.map(serializeUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id).select("-password -__v");
    if (!user) return res.status(404).json({ message: "User not found" });

    const sessions = await Session.find({
      $or: [{ userId1: user._id }, { userId2: user._id }],
    })
      .populate("userId1", "name email")
      .populate("userId2", "name email");

    const reports = await Report.find({
      $or: [{ reporter: user._id }, { targetUser: user._id }],
    })
      .populate("reporter", "name email")
      .populate("targetUser", "name email");

    res.status(200).json({
      user: serializeUser(user),
      sessions,
      reports,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch user details" });
  }
};

const addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }
    if (typeof name !== "string" || name.trim().length > 80 || !isEmailLike(email) || !validPassword(password)) {
      return res.status(400).json({ message: "Enter a name (max 80 chars), a valid email and a password of 6-72 characters." });
    }
    if (role !== undefined && !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: 'Role must be "user" or "admin".' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (await User.exists({ email: { $in: [email, cleanEmail] } })) {
      return res.status(400).json({ message: "Email already in use." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || "user",
    });

    await user.save();
    res.status(201).json({
      message: "User created",
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      email,
      role,
      status,
      skillsToTeach,
      skillsToLearn,
      profilePicture,
    } = req.body;

    if (name) {
      if (typeof name !== "string" || name.trim().length > 80) {
        return res.status(400).json({ message: "Name must be text up to 80 characters." });
      }
      user.name = name.trim();
    }
    if (email) {
      if (!isEmailLike(email)) return res.status(400).json({ message: "Enter a valid email." });
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== user.email && (await User.exists({ email: cleanEmail, _id: { $ne: user._id } }))) {
        return res.status(400).json({ message: "Email already in use." });
      }
      user.email = cleanEmail;
    }
    if (role && ["user", "admin"].includes(role)) {
      // an admin must not remove their own admin rights by accident (nobody could then manage the site)
      if (String(user._id) === String(req.user.id) && role !== "admin") {
        return res.status(400).json({ message: "You cannot remove your own admin role." });
      }
      user.role = role;
    }
    if (typeof status !== "undefined") {
      user.status = status === "blocked" ? "blocked" : "";
    }
    if (skillsToTeach) {
      user.skillsToTeach = Array.isArray(skillsToTeach)
        ? skillsToTeach
            .map((skill) => normalizeSkillName(skill))
            .filter(Boolean)
        : [];
    }
    if (skillsToLearn) {
      user.skillsToLearn = Array.isArray(skillsToLearn)
        ? skillsToLearn
            .map((skill) => normalizeSkillName(skill))
            .filter(Boolean)
        : [];
    }
    if (profilePicture !== undefined)
      user.profilePicture = profilePicture || "";

    await user.save();

    res.status(200).json({
      message: "User updated successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (String(id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    // Remove the person's private data too (it used to be left behind forever). Shared records such as
    // sessions and their messages are kept because the other participant still needs them.
    await Promise.allSettled([
      require("../models/Notification").deleteMany({ userId: id }),
      require("../models/ChatbotMessage").deleteMany({ user: id }),
      require("../models/Roadmap").deleteMany({ user: id }),
    ]);
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

const blockUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (String(id) === String(req.user.id)) {
    return res.status(400).json({ message: "You cannot block your own account." });
  }
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "blocked";
    await user.save();

    res.status(200).json({ message: "User has been blocked", userId: id });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ message: "Server error blocking user" });
  }
};

const unblockUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "";
    await user.save();

    res.status(200).json({ message: "User has been unblocked", userId: id });
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(500).json({ message: "Server error unblocking user" });
  }
};

const getAllReports = async (req, res) => {
  try {
    const { status = "all" } = req.query;
    const query = {};
    if (status !== "all") {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate("reporter", "name email")
      .populate("targetUser", "name email")
      .populate("session");

    res.status(200).json(
      reports.map((report) => ({
        ...report.toObject(),
        priority: report.priority || "medium",
      })),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid report ID" });

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (status) {
      const validStatuses = [
        "pending",
        "under review",
        "resolved",
        "rejected",
        "open",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid report status" });
      }
      report.status = status;
    }

    if (priority) {
      const allowed = Report.schema.path("priority")?.enumValues;
      if (allowed?.length && !allowed.includes(priority)) {
        return res.status(400).json({ message: `Priority must be one of: ${allowed.join(", ")}` });
      }
      report.priority = priority;
    }

    await report.save();
    res.status(200).json({ message: "Report updated", report });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to update report" });
  }
};

const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid report ID" });
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    report.status = "resolved";
    await report.save();
    res.status(200).json({
      message: "Report resolved",
      reportId: req.params.id,
      report,
    });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ message: error.message });
  }
};

const getSessionChats = async (req, res) => {
  const { sessionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ message: "Invalid session ID" });
  }
  try {
    const chats = await Message.find({ sessionId })
      .sort({ timestamp: 1 })
      .populate("senderId", "name")
      .populate("receiverId", "name");

    res.status(200).json(chats);
  } catch (err) {
    console.error("Error fetching session chats:", err);
    res.status(500).json({ message: "Server error fetching chats" });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      status: { $ne: "blocked" },
    });
    const totalSessions = await Session.countDocuments();
    const completedSessions = await Session.countDocuments({
      status: "completed",
    });
    const reportCount = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({
      status: { $in: ["pending", "open", "under review"] },
    });

    const recentSessions = await Session.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).lean();
    const skillCounts = new Map();
    const users = await User.find({}, "skillsToTeach skillsToLearn").lean();

    users.forEach((user) => {
      [...(user.skillsToTeach || []), ...(user.skillsToLearn || [])].forEach(
        (skill) => {
          const clean = normalizeSkillName(skill);
          if (!clean) return;
          skillCounts.set(clean, (skillCounts.get(clean) || 0) + 1);
        },
      );
    });

    const popularSkills = [...skillCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const monthly = {};
    recentSessions.forEach((session) => {
      const key = new Date(session.createdAt).toLocaleString("en-US", {
        month: "short",
      });
      monthly[key] = (monthly[key] || 0) + 1;
    });

    res.status(200).json({
      userCount: totalUsers,
      activeUsers,
      sessionCount: totalSessions,
      completedSessions,
      reportCount,
      pendingReports,
      popularSkills,
      monthly,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminSkills = async (req, res) => {
  try {
    const dbSkills = await Skill.find().sort({ name: 1 }).lean();
    const users = await User.find({}, "skillsToTeach skillsToLearn").lean();
    const counts = new Map();

    users.forEach((user) => {
      [...(user.skillsToTeach || []), ...(user.skillsToLearn || [])].forEach(
        (skill) => {
          const clean = normalizeSkillName(skill);
          if (!clean) return;
          counts.set(clean, (counts.get(clean) || 0) + 1);
        },
      );
    });

    const mergedSkills = dbSkills.map((skill) => ({
      _id: skill._id,
      name: skill.name,
      description: skill.description || "",
      active: skill.active !== false,
      count: counts.get(skill.name) || 0,
    }));

    [...counts.entries()].forEach(([name, count]) => {
      if (!mergedSkills.some((skill) => skill.name === name)) {
        mergedSkills.push({
          _id: new mongoose.Types.ObjectId().toString(),
          name,
          description: "",
          active: true,
          count,
        });
      }
    });

    res
      .status(200)
      .json(mergedSkills.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch skills" });
  }
};

const createSkill = async (req, res) => {
  try {
    const { name, description = "" } = req.body;
    if (typeof description !== "string" || description.length > 500) {
      return res.status(400).json({ message: "Description must be text up to 500 characters" });
    }
    const cleanName = normalizeSkillName(name);
    if (!cleanName) {
      return res.status(400).json({ message: "Skill name is required" });
    }

    const existing = await Skill.findOne({ name: cleanName });
    if (existing) {
      return res.status(400).json({ message: "Skill already exists" });
    }

    const skill = await Skill.create({
      name: cleanName,
      description,
      active: true,
    });

    res.status(201).json({ message: "Skill created", skill });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to create skill" });
  }
};

const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid skill ID" });
    const skill = await Skill.findById(id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    if (name) {
      const cleanName = normalizeSkillName(name);
      if (!cleanName) return res.status(400).json({ message: "Skill name cannot be empty" });
      if (cleanName !== skill.name && (await Skill.exists({ name: cleanName, _id: { $ne: skill._id } }))) {
        return res.status(400).json({ message: "Another skill already has this name" });
      }
      skill.name = cleanName;
    }
    if (typeof description !== "undefined") {
      if (typeof description !== "string" || description.length > 500) {
        return res.status(400).json({ message: "Description must be text up to 500 characters" });
      }
      skill.description = description;
    }
    if (typeof active !== "undefined") skill.active = Boolean(active);

    await skill.save();
    res.status(200).json({ message: "Skill updated", skill });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to update skill" });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid skill ID" });
    const skill = await Skill.findById(id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    skill.active = false;
    await skill.save();
    res.status(200).json({ message: "Skill deactivated", skill });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to deactivate skill" });
  }
};

const getAdminSessions = async (req, res) => {
  try {
    const { status = "all" } = req.query;
    const query = {};
    if (status !== "all") {
      query.status =
        status === "cancelled" ? { $in: ["cancelled", "canceled"] } : status;
    }

    const sessions = await Session.find(query)
      .populate("userId1", "name email profilePicture")
      .populate("userId2", "name email profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(
      sessions.map((session) => ({
        ...session.toObject(),
        status: session.status || "pending",
      })),
    );
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch sessions" });
  }
};

const getAdminNotifications = async (req, res) => {
  try {
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [pendingReports, newUsers, blockedUsers, recentReports] =
      await Promise.all([
        Report.countDocuments({
          status: { $in: ["pending", "open", "under review"] },
        }),
        User.countDocuments({ createdAt: { $gte: recentDate } }),
        User.countDocuments({ status: "blocked" }),
        Report.find({ createdAt: { $gte: recentDate } })
          .populate("reporter", "name")
          .populate("targetUser", "name")
          .limit(5)
          .lean(),
      ]);

    const items = [
      ...(pendingReports > 0
        ? [
            {
              id: "pending-reports",
              type: "pending_action",
              title: "Pending reviews",
              message: `${pendingReports} reports need admin review.`,
              unread: true,
            },
          ]
        : []),
      ...(newUsers > 0
        ? [
            {
              id: "new-users",
              type: "new_user",
              title: "New signups",
              message: `${newUsers} users joined in the last 7 days.`,
              unread: true,
            },
          ]
        : []),
      ...(blockedUsers > 0
        ? [
            {
              id: "blocked-users",
              type: "suspicious_activity",
              title: "Blocked users",
              message: `${blockedUsers} accounts are currently blocked.`,
              unread: true,
            },
          ]
        : []),
      ...recentReports.map((report) => ({
        id: report._id,
        type: "new_report",
        title: "New report",
        message: `${report.reporter?.name || "A user"} reported ${report.targetUser?.name || "someone"} for ${report.reason}.`,
        unread: true,
      })),
    ];

    res.status(200).json({
      unread: items.length,
      items,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch notifications" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture:
        user.profilePicture || "https://placehold.co/150x150?text=Admin",
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name) {
      if (typeof req.body.name !== "string" || req.body.name.trim().length > 80) {
        return res.status(400).json({ message: "Name must be text up to 80 characters." });
      }
      user.name = req.body.name.trim();
    }
    if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    } else if (req.file) {
      user.profilePicture = req.file.filename;
    }

    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Both current and new passwords are required." });
  }
  if (typeof currentPassword !== "string" || !validPassword(newPassword)) {
    return res.status(400).json({ message: "New password must be 6-72 characters." });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: "New password must be different from the current one." });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEngagementStats = async (req, res) => {
  try {
    const mostActiveUsers = await Session.aggregate([
      { $project: { participants: ["$userId1", "$userId2"] } },
      { $unwind: "$participants" },
      { $group: { _id: "$participants", sessionCount: { $sum: 1 } } },
      { $sort: { sessionCount: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          sessionCount: 1,
          name: "$user.name",
          email: "$user.email",
          skillsToTeach: "$user.skillsToTeach",
          skillsToLearn: "$user.skillsToLearn",
          role: "$user.role",
          profilePicture: "$user.profilePicture",
          socials: "$user.socials",
          status: "$user.status",
          createdAt: "$user.createdAt",
          updatedAt: "$user.updatedAt",
        },
      },
    ]);

    return res.status(200).json({ mostActiveUsers });
  } catch (error) {
    console.error("Engagement Stats Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch engagement stats" });
  }
};

module.exports = {
  getDashboardOverview,
  getAllUsers,
  getUserById,
  addUser,
  updateUserByAdmin,
  deleteUser,
  getAllReports,
  updateReportStatus,
  resolveReport,
  getAdminSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getAdminSessions,
  getAdminNotifications,
  getAnalytics,
  getProfile,
  updateProfile,
  changePassword,
  getEngagementStats,
  getSessionChats,
  blockUser,
  unblockUser,
};
