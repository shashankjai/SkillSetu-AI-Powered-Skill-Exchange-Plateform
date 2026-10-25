// backend/utils/AppError.js
class AppError extends Error {
  constructor(status, msg, code) {
    super(msg);
    this.name = "AppError";
    this.status = status;
    this.code = code || undefined;
  }
}
module.exports = AppError;
