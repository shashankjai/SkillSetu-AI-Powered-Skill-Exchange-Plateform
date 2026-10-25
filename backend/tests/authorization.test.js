// Authorization checks added during the audit. These paths return before any database call,
// so no MongoDB connection is needed.
jest.mock("node-cron", () => ({ schedule: jest.fn() }));

const { getUserCallHistory } = require("../controllers/videoCallController");
const { sendNotification } = require("../controllers/notificationController");

const USER_A = "507f1f77bcf86cd799439011";
const USER_B = "507f1f77bcf86cd799439012";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("video call history", () => {
  it("refuses to show another user's call history", async () => {
    const res = mockRes();
    await getUserCallHistory({ params: { userId: USER_B }, user: { id: USER_A, role: "user" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("sendNotification abuse protection", () => {
  it("rejects an invalid recipient id", async () => {
    const res = mockRes();
    await sendNotification({ body: { userId: "nope", message: "hi", type: "session_request" }, user: { id: USER_A, role: "user" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects over-long messages", async () => {
    const res = mockRes();
    await sendNotification({ body: { userId: USER_B, message: "x".repeat(301), type: "session_request" }, user: { id: USER_A, role: "user" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("stops normal users from sending system-style notification types", async () => {
    const res = mockRes();
    await sendNotification({ body: { userId: USER_B, message: "Your account is locked", type: "feedback_request" }, user: { id: USER_A, role: "user" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
