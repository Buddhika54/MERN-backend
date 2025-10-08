const mongoose = require('mongoose');
const crypto = require('crypto');

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    contactNumber: { type: String },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
  },
  { timestamps: true }
);

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
}

CustomerSchema.methods.setPassword = function (password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  this.passwordSalt = salt;
  this.passwordHash = hash;
};

CustomerSchema.methods.validatePassword = function (password) {
  try {
    if (!this.passwordSalt || !this.passwordHash) return false;
    const hash = hashPassword(password, this.passwordSalt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(this.passwordHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
};

module.exports = mongoose.model('Customer', CustomerSchema);
