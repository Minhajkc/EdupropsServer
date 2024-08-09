const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/Eduprops', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('DB Connected');
    } catch (error) {
        console.error('DB connection error:', error);
        process.exit(1); 
    }
};

module.exports = connectDB;
