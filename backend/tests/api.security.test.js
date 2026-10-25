// backend/tests/api.security.test.js
const { verifyToken, ensureAdmin } = require("../middlewares/auth");

describe("API Security, Authentication & Authorization Tests", () => {
  describe("8. Unauthorized API Requests (verifyToken middleware)", () => {
    it("should reject requests without x-auth-token header (401)", async () => {
      const req = {
        header: jest.fn().mockReturnValue(null),
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ msg: "No authentication token, access denied" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid token (401)", async () => {
      const req = {
        header: jest.fn().mockReturnValue("invalid.jwt.token"),
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ msg: "Token is not valid" })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("10. Admin Authorization Check (ensureAdmin)", () => {
    it("should block non-admin users with 403", () => {
      const req = {
        user: { id: "u123", role: "user" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      ensureAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Access denied: Admins only" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should permit admin users to proceed", () => {
      const req = {
        user: { id: "admin123", role: "admin" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      ensureAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

