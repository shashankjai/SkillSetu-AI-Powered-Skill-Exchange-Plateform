// Input validation and brute-force protection added to the auth controller (no database needed).
jest.mock("../models/User", () => {
  const User = function (data) {
    Object.assign(this, data);
  };
  User.findOne = jest.fn().mockResolvedValue(null);
  return User;
});
jest.mock("bcryptjs", () => ({
  genSalt: jest.fn().mockResolvedValue("salt"),
  hash: jest.fn().mockResolvedValue("hash"),
  compare: jest.fn().mockResolvedValue(false),
}));
jest.mock("jsonwebtoken", () => ({ sign: jest.fn(() => "token") }));

const { registerUser, loginUser } = require("../controllers/authController");

const mockRes = () => {
  const res = { headers: {} };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn((k, v) => {
    res.headers[k] = v;
  });
  return res;
};

describe("registerUser validation", () => {
  it("rejects passwords shorter than 6 characters", async () => {
    const res = mockRes();
    await registerUser({ body: { name: "Asha", email: "asha@example.com", password: "123" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects a non-string email (NoSQL injection attempt)", async () => {
    const res = mockRes();
    await registerUser({ body: { name: "Asha", email: { $gt: "" }, password: "secret1" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("loginUser protection", () => {
  it("rejects a non-string email", async () => {
    const res = mockRes();
    await loginUser({ ip: "1.1.1.1", body: { email: { $ne: null }, password: "x" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("locks out after 10 failed attempts for the same email and IP", async () => {
    let res;
    for (let i = 0; i < 11; i += 1) {
      res = mockRes();
      await loginUser({ ip: "9.9.9.9", body: { email: "Victim@example.com", password: "wrong" } }, res);
    }
    expect(res.status).toHaveBeenLastCalledWith(429);
    expect(Number(res.headers["Retry-After"])).toBeGreaterThan(0);
  });
});
