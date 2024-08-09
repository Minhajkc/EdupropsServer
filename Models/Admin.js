const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date,
    advertisements: [{
        title: { type: String, required: true },
        description: { type: String, required: true },
        imageUrl: { type: String, required: true },
        linkUrl: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        targetAudience: { type: String, enum: ['all', 'students', 'teachers'] },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }]
});

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
