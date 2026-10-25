const express = require("express");
const router = express.Router();
const {
  getCallDetailsForSession,
  initiateVideoCall,
  endVideoCall,
  getUserCallHistory,
} = require("../controllers/videoCallController");
const { verifyToken } = require("../middlewares/auth");

router.get("/session/:sessionId", verifyToken, getCallDetailsForSession);
router.post("/initiate", verifyToken, initiateVideoCall);
router.put("/:callId/end", verifyToken, endVideoCall);
router.get("/history/:userId", verifyToken, getUserCallHistory);

module.exports = router;
