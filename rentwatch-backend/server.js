const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/rentwatch')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use the Complaint model from models/Complaint.js (includes createdAt)
const Complaint = require('./models/Complaint');
const User = require('./models/User');

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// simple middleware to decode JWT if present and attach user to req
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      // ignore invalid token
    }
  }
  next();
});

// POST complaint (uses req.user if available)
// POST complaint - require authentication
app.post('/api/complaints', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const { complainedUserId, issueType, description } = req.body;
  if (!complainedUserId) return res.status(400).json({ error: 'complainedUserId is required' });
  // create and store with references
  const complaint = new Complaint({
    type: req.user.role,
    complainantId: req.user.id,
    complainedUserId,
    complainantName: req.user.name,
    complainantEmail: req.user.email,
    issueType,
    description
  });
  await complaint.save();
  res.status(201).json({ message: 'Complaint saved', complaint });
});

// GET complaints
// Internal: all complaints with identifying info (admin use)
app.get('/api/complaints', async (req, res) => {
  const complaints = await Complaint.find().sort({ createdAt: -1, _id: -1 });
  res.json(complaints);
});

// Public complaints (hide identifying info)
app.get('/api/public/complaints', async (req, res) => {
  const complaints = await Complaint.find().sort({ createdAt: -1, _id: -1 });
  const publicView = complaints.map(c => ({
    id: c._id,
    issueType: c.issueType,
    description: c.description,
    role: c.type,
    date: c.createdAt,
    status: c.status,
    likes: c.likes,
    dislikes: c.dislikes
  }));
  res.json(publicView);
});

// Get users list for complainant to target (search would be better)
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'name email role');
  res.json(users);
});

// Notifications for logged-in user: complaints where complainedUserId == user.id
app.get('/api/notifications', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const complaints = await Complaint.find({ complainedUserId: req.user.id }).sort({ createdAt: -1 });
  res.json(complaints.map(c => ({ id: c._id, complainantName: c.complainantName, issueType: c.issueType, description: c.description, date: c.createdAt, status: c.status })));
});

// Mark complaint as resolved — only the complained user can resolve
app.post('/api/complaints/:id/resolve', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (String(c.complainedUserId) !== String(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  c.status = 'Resolved';
  c.resolvedAt = new Date();
  await c.save();
  res.json({ message: 'Resolved', resolvedAt: c.resolvedAt });
});

// List complaints filed by the authenticated user
app.get('/api/my/complaints', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const complaints = await Complaint.find({ complainantId: req.user.id }).sort({ createdAt: -1 });
  // include verification fields
  res.json(complaints.map(c => ({ id: c._id, complainedUserId: c.complainedUserId, issueType: c.issueType, description: c.description, date: c.createdAt, status: c.status, resolvedAt: c.resolvedAt, verified: !!c.verified, verifiedAt: c.verifiedAt })));
});

// Verify a resolved complaint - only the original complainant can verify
app.post('/api/complaints/:id/verify', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (String(c.complainantId) !== String(req.user.id)) return res.status(403).json({ error: 'Only the original complainant can verify' });
  if (c.status !== 'Resolved') return res.status(400).json({ error: 'Complaint must be resolved before verification' });
  if (c.verified) return res.status(400).json({ error: 'Already verified' });
  c.verified = true;
  c.verifiedAt = new Date();
  c.verifiedBy = req.user.id;
  await c.save();
  res.json({ message: 'Verified', verifiedAt: c.verifiedAt });
});

// Like
app.post('/api/complaints/:id/like', async (req, res) => {
  await Complaint.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.json({ message: "Liked!" });
});

// Dislike
app.post('/api/complaints/:id/dislike', async (req, res) => {
  await Complaint.findByIdAndUpdate(req.params.id, { $inc: { dislikes: 1 } });
  res.json({ message: "Disliked!" });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

// Serve frontend static files from parent folder (one level up)
const path = require('path');
const frontendRoot = path.join(__dirname, '..');
app.use(express.static(frontendRoot));

// Health endpoint
app.get('/api/health', async (req, res) => {
  const readyState = mongoose.connection.readyState; // 0 = disconnected, 1 = connected
  res.json({ server: 'ok', mongoState: readyState });
});
