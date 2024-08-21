const mongoose = require('mongoose');

const CourseCategory = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Category = mongoose.model('CourseCategory', CourseCategory);

module.exports = Category;
