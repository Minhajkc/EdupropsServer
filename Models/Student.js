const mongoose = require('mongoose')

const StudentSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String,  },
    firstName: String,
    lastName: String,
    membershipType: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver' },
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    performance: [{
      course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      score: Number,
      completedLessons: Number
    }],
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date
  });

const Student = mongoose.model('Student',StudentSchema)
module.exports = Student;