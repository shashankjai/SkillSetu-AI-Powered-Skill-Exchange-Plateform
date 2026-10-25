const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const bodyParser = require("body-parser");

// Import routes and controllers
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const matchRoutes = require("./routes/matchRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const videoCallRoutes = require("./routes/videoCallRoutes");
const {
  setSocketIO: setSessionSocketIO,
} = require("./controllers/sessionController");
const {
  setSocket: setNotificationSocketIO,
} = require("./controllers/notificationController");
const adminRoutes = require("./routes/adminRoutes"); // ← Admin dashboard routes
const reportRoutes = require("./routes/reportRoutes"); // Import reportRoutes
const roadmapRoutes = require("./routes/roadmapRoutes"); // AI personalized learning roadmaps
const chatbotRoutes = require("./routes/chatbotRoutes"); // AI Learning Assistant chatbot
const { seedKnowledge } = require("./services/knowledgeSeeder"); // RAG knowledge base seeding

dotenv.config();

mongoose.set("bufferCommands", false);

const app = express();
const server = http.createServer(app);

// Support multiple frontend origins via `FRONTEND_URLS` (comma-separated) or single `FRONTEND_URL`.
const FRONTEND_URLS =
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173,https://skillsetu-client.onrender.com,https://skill-setu-client.onrender.com,https://skill-setu-full-stack.vercel.app,https://skill-setu-full-stack-c2go.vercel.app,https://skill-setu-full-stack-onfe-3ilotf4ml-shashankjais-projects.vercel.app";
const allowedOrigins = FRONTEND_URLS.split(",").map((s) => s.trim());

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalized = origin.trim();

  if (allowedOrigins.includes("*") || allowedOrigins.includes(normalized)) {
    return true;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true;
  }

  if (
    normalized.endsWith(".vercel.app") &&
    (normalized.includes("skill-setu-full-stack") ||
      normalized.includes("skill-setu-full-stack-onfe"))
  ) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: Origin not allowed"), false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-auth-token"],
  credentials: true,
};

// ✅ Create Socket.IO instance ONCE
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: Origin not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-auth-token"],
    credentials: true,
  },
});

// ✅ Create namespaces from single instance
const sessionSocket = io.of("/sessions");
const notificationSocket = io.of("/notifications");

// Pass the socket instances to controllers
setSessionSocketIO(sessionSocket);
setNotificationSocketIO(notificationSocket);

// ─── MIDDLEWARE ───────────────────────────────────────────────────
// Use body parsing for both JSON and URL encoded data
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cors(corsOptions));

// Serve static files (images) from 'uploads' folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ← Add this to explicitly serve profile pictures:
app.use(
  "/uploads/profile-pictures",
  express.static(path.join(__dirname, "uploads/profile-pictures")),
);

// Serve media files from 'message-uploads' folder
app.use(
  "/uploads/message-uploads",
  express.static(path.join(__dirname, "uploads")),
);

// MongoDB connection with a fallback to local DB and clearer errors
const connectWithFallback = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri =
    process.env.MONGO_FALLBACK_URI || "mongodb://127.0.0.1:27017/skillsetu";

  try {
    await mongoose.connect(primaryUri);
    console.log("Connected to MongoDB (primary)");
    return true;
  } catch (err) {
    console.error(
      "Error connecting to primary MongoDB URI:",
      err.message || err,
    );

    if (
      err.code === "ENOTFOUND" ||
      (err.message && err.message.includes("querySrv"))
    ) {
      console.warn(
        "SRV DNS lookup failed for primary MongoDB URI. Attempting fallback DB...",
      );
      try {
        await mongoose.connect(fallbackUri);
        console.log("Connected to MongoDB (fallback local)");
        return true;
      } catch (err2) {
        console.error(
          "Fallback MongoDB connection also failed:",
          err2.message || err2,
        );
        console.error(
          "Please check your MONGO_URI environment variable, network DNS, or start a local MongoDB instance.",
        );
      }
    } else {
      console.error("Please check your MONGO_URI and network connectivity.");
    }
  }

  try {
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB ready, checking admin user...");
      const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PIC_URL } =
        process.env;

      let admin = await User.findOne({ email: ADMIN_EMAIL });
      if (!admin) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
        admin = new User({
          name: ADMIN_NAME || "Administrator",
          email: ADMIN_EMAIL,
          password: hash,
          role: "admin",
          profilePicture: ADMIN_PIC_URL ? path.basename(ADMIN_PIC_URL) : "",
        });
        await admin.save();
        console.log("🚀 Admin user seeded:", ADMIN_EMAIL);
      }
    }
  } catch (seedErr) {
    console.error("Error during admin seeding:", seedErr.message || seedErr);
  }

  // RAG knowledge base: seed it in the background (never blocks startup). Idempotent: skipped when
  // already complete. Disable with RAG_AUTO_SEED=false; force a rebuild with `npm run seed:knowledge`.
  if (mongoose.connection.readyState === 1 && process.env.RAG_AUTO_SEED !== "false") {
    seedKnowledge()
      .then((r) => console.log("[RAG] knowledge base:", r.skipped ? `skipped (${r.reason})` : `seeded ${r.processed}/${r.total} chunks`))
      .catch((e) => console.warn("[RAG] knowledge seeding failed:", e.message || e));
  }

  return mongoose.connection.readyState === 1;
};

connectWithFallback();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/video-call", videoCallRoutes);
app.use("/api/admin", adminRoutes); // ← Mount Admin Dashboard routes
app.use("/api/reports", reportRoutes); // ← Mount Admin Dashboard routes
app.use("/api/roadmaps", roadmapRoutes); // ← Mount Roadmap routes
app.use("/api/chatbot", chatbotRoutes); // ← Mount AI Assistant Chatbot routes

// ✅ Session namespace handling
sessionSocket.on("connection", (socket) => {
  console.log("A user connected to session socket");

  const sessionId = socket.handshake.query.sessionId;
  console.log("Received sessionId:", sessionId);

  if (sessionId) {
    socket.join(sessionId);
  }

  socket.on("join-call", async ({ sessionId: roomId, userId }) => {
    if (!roomId) return;
    socket.join(roomId);

    const members = await sessionSocket.in(roomId).fetchSockets();
    const peerIds = members
      .filter((memberSocket) => memberSocket.id !== socket.id)
      .map((memberSocket) => memberSocket.id);

    if (peerIds.length > 0) {
      socket.emit("peer-joined", { userId, peerSocketId: peerIds[0] });
      socket
        .to(roomId)
        .emit("peer-joined", { userId, peerSocketId: socket.id });
    }
  });

  socket.on(
    "video-call-request",
    ({ sessionId: roomId, senderId, senderName }) => {
      if (!roomId || !senderId) return;
      socket.to(roomId).emit("video-call-request", {
        sessionId: roomId,
        senderId,
        senderName: senderName || "Peer",
      });
    },
  );

  socket.on(
    "video-call-accepted",
    ({ sessionId: roomId, senderId, acceptedBy }) => {
      if (!roomId || !acceptedBy) return;
      socket.to(roomId).emit("video-call-accepted", {
        sessionId: roomId,
        senderId,
        acceptedBy,
      });
    },
  );

  socket.on("offer", ({ sessionId: roomId, senderId, receiverId, offer }) => {
    if (!roomId || !offer) return;
    socket.to(roomId).emit("offer", { offer, senderId, receiverId });
  });

  socket.on("answer", ({ sessionId: roomId, senderId, receiverId, answer }) => {
    if (!roomId || !answer) return;
    socket.to(roomId).emit("answer", { answer, senderId, receiverId });
  });

  socket.on("ice-candidate", ({ sessionId: roomId, senderId, candidate }) => {
    if (!roomId || !candidate) return;
    socket.to(roomId).emit("ice-candidate", { candidate, senderId });
  });

  socket.on("leave-call", ({ sessionId: roomId, userId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    sessionSocket.to(roomId).emit("leave-call", { userId });
  });

  socket.on("toggle-mute", ({ sessionId: roomId, userId, isMuted }) => {
    if (!roomId) return;
    socket.to(roomId).emit("toggle-mute", { userId, isMuted });
  });

  socket.on("toggle-video", ({ sessionId: roomId, userId, isVideoOff }) => {
    if (!roomId) return;
    socket.to(roomId).emit("toggle-video", { userId, isVideoOff });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected from session socket");
  });
});

// ✅ Notification namespace handling
notificationSocket.on("connection", (socket) => {
  console.log("A user connected to notification socket");

  socket.on("disconnect", () => {
    console.log("A user disconnected from notification socket");
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("SkillSetu API is running");
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
