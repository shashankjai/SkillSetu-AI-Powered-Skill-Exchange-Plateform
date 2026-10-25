// backend/routes/roadmapRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  generateAndSaveRoadmap,
  getUserRoadmaps,
  getRoadmapById,
  deleteRoadmap,
} = require("../controllers/roadmapController");

// All roadmap endpoints are protected by JWT authentication
router.post("/generate", verifyToken, generateAndSaveRoadmap);
router.get("/", verifyToken, getUserRoadmaps);
router.get("/:id", verifyToken, getRoadmapById);
router.delete("/:id", verifyToken, deleteRoadmap);

module.exports = router;

