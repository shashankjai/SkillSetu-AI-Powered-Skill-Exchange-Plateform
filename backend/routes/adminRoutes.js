const express = require("express");
const router = express.Router();
const { verifyToken, ensureAdmin } = require("../middlewares/auth");
const adminCtrl = require("../controllers/adminController");
const upload = require("../middlewares/upload");

// Protect all admin routes
router.use(verifyToken, ensureAdmin);

router.get("/dashboard", adminCtrl.getDashboardOverview);

// RAG knowledge base: rebuild embeddings for the built-in platform guide (admin only)
router.post("/knowledge/reseed", async (req, res) => {
  try {
    const result = await require("../services/knowledgeSeeder").seedKnowledge({ force: true });
    res.json({ msg: result.skipped ? `Skipped: ${result.reason}` : "Knowledge base reseeded.", ...result });
  } catch (err) {
    res.status(500).json({ msg: err.message || "Failed to reseed knowledge base." });
  }
});

// User management
router.get("/users", adminCtrl.getAllUsers);
router.get("/users/:id", adminCtrl.getUserById);
router.post("/users", adminCtrl.addUser);
router.patch("/users/:id", adminCtrl.updateUserByAdmin);
router.delete("/users/:id", adminCtrl.deleteUser);
router.patch("/users/:id/block", adminCtrl.blockUser);
router.patch("/users/:id/unblock", adminCtrl.unblockUser);

// Report management
router.get("/reports", adminCtrl.getAllReports);
router.patch("/reports/:id", adminCtrl.updateReportStatus);
router.patch("/reports/:id/resolve", adminCtrl.resolveReport);
router.get("/session-chats/:sessionId", adminCtrl.getSessionChats);

// Skills management
router.get("/skills", adminCtrl.getAdminSkills);
router.post("/skills", adminCtrl.createSkill);
router.patch("/skills/:id", adminCtrl.updateSkill);
router.delete("/skills/:id", adminCtrl.deleteSkill);

// Sessions management
router.get("/sessions", adminCtrl.getAdminSessions);

// Analytics and notifications
router.get("/analytics", adminCtrl.getAnalytics);
router.get("/notifications", adminCtrl.getAdminNotifications);

// Profile section
router.get("/profile", adminCtrl.getProfile);
router.put(
  "/profile",
  upload.single("profilePicture"),
  adminCtrl.updateProfile,
);
router.put("/profile/password", adminCtrl.changePassword);

// Engagement statistics route
router.get("/engagement-stats", adminCtrl.getEngagementStats);

module.exports = router;
