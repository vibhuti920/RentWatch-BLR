 const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');

// Get all complaints
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Submit a new complaint
router.post('/', async (req, res) => {
  try {
    const { type, title, description } = req.body;
    const complaint = new Complaint({ type, title, description });
    await complaint.save();
    res.status(201).json(complaint);
  } catch (err) {
    res.status(400).json({ error: 'Failed to submit complaint' });
  }
});
// Like a complaint
router.post('/:id/like', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.json(complaint);
  } catch (err) {
    res.status(400).json({ error: 'Failed to like complaint' });
  }
});

// Dislike a complaint
router.post('/:id/dislike', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $inc: { dislikes: 1 } },
      { new: true }
    );
    res.json(complaint);
  } catch (err) {
    res.status(400).json({ error: 'Failed to dislike complaint' });
  }
});

module.exports = router;

