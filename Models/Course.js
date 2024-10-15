const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    duration: { type: Number, required: true }, 
    category: { type: String, required: true },
    image:String,
    whatYouLearn: { type: String, required: true },
    lessons: [{
      title: String,
      description: String,
      url:[{}]
    }],
    chats: [{
      message: { type: String, required: true },   // Message content
      sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // User who sent the message
      createdAt: { type: Date, default: Date.now }  // Time the message was sent
    }],    
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    clicks: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
      rating: { type: Number, min: 1, max: 5, required: true },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    lastAccessedAt: { type: Date },
    completionRate: { type: Number, min: 0, max: 100, default: 0 },
    googleMeet: [
      {
        name: { type: String, required: true },
        date: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        link: { type: String, required: true },
      },
    ],
  });
  

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;