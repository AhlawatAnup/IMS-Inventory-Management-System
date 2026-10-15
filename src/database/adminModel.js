const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  permissions: {
    type: Object,
    default: {
      read: true,
      write: true,
      manageUsers: true,
    },
  },
  isPasswordReset: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('admin', adminSchema, 'admins');
