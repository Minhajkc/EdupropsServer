const mongoose = require('mongoose');

const MentorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  degree: String,
  resume: String,
  specialization: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  isActive: {
    type: String,
    enum: ['pending', 'active'], 
    default: 'pending' 
  }
});

const Mentor = mongoose.model('Mentor', MentorSchema);
module.exports = Mentor;
