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
    qAndA: [{
      question: { type: String, required: true },
      askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
      answers: [{
        answer: { type: String, required: true },
        answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
        createdAt: { type: Date, default: Date.now }
      }],
      createdAt: { type: Date, default: Date.now }
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
    completionRate: { type: Number, min: 0, max: 100, default: 0 }
  });
  

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;