const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true }, // URL or path to the image
  link: { type: String, required: true },
  position: {
    type: String,
    enum: [
      'homepage1',
      'homepage2',
      'homepage3',
      'coursepage',
      'coursefullviewpage',
      'mentorpage',
      'coursecategorypage',
    ],
    required: true,
  },
});

const Ad = mongoose.model('Ad', adSchema);
module.exports = Ad;
