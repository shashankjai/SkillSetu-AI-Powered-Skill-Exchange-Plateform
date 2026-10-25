// Safety rules in the admin controller. These paths answer before any database call.
jest.mock("../models/User", () => ({ exists: jest.fn().mockResolvedValue(null), findById: jest.fn(), findByIdAndDelete: jest.fn() }));
jest.mock("../models/Session", () => ({}));
jest.mock("../models/Message", () => ({}));
jest.mock("../models/Report", () => ({}));
jest.mock("../models/Skill", () => ({}));
jest.mock("bcryptjs", () => ({ genSalt: jest.fn(), hash: jest.fn(), compare: jest.fn() }));

const admin = require("../controllers/adminController");

const ME = "507f1f77bcf86cd799439011";
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const asAdmin = { id: ME, role: "admin" };

describe("admin self-protection", () => {
  it("does not let an admin delete their own account", async () => {
    const res = mockRes();
    await admin.deleteUser({ params: { id: ME }, user: asAdmin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("does not let an admin block themselves", async () => {
    const res = mockRes();
    await admin.blockUser({ params: { id: ME }, user: asAdmin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("admin input validation", () => {
  it("rejects an unknown role when adding a user", async () => {
    const res = mockRes();
    await admin.addUser({ body: { name: "A", email: "a@example.com", password: "secret1", role: "superuser" }, user: asAdmin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects a weak password when adding a user", async () => {
    const res = mockRes();
    await admin.addUser({ body: { name: "A", email: "a@example.com", password: "123" }, user: asAdmin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects a weak new admin password", async () => {
    const res = mockRes();
    await admin.changePassword({ body: { currentPassword: "oldpass", newPassword: "12" }, user: asAdmin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
