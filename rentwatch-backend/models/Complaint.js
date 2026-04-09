const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  type: { type: String, enum: ['tenant', 'landlord'], required: true },
  complainantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  complainedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // stored for internal/audit use but not exposed publicly
  complainantName: String,
  complainantEmail: String,
  issueType: String,
  description: String,
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending','Resolved'], default: 'Pending' },
  resolvedAt: { type: Date },
  // verification: whether the original complainant verified the rectification
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', complaintSchema);
