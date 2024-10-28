const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date,
    tax: { type: Number, default: 0 }, // New field for tax
    discount: { type: Number, default: 0 }, // New field for discount
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
    }],
    goldRate: {
        type: Number,
        required: true,
        default: 600, 
      },
      platinumRate: {
        type: Number,
        required: true,
        default: 1100, 
      },
      reviews: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            userName: { type: String, required: true },
            rating: { type: Number, required: true },
            reviewText: { type: String, required: true },
            date: { type: Date, default: Date.now }
        }
    ],
    subscriptionEmail: {
      type: [String], // Array of strings to store subscribed emails
      default: [],
    },
});

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
