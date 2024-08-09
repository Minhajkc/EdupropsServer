const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail', // or other email service
    auth: {
        user: 'myeduprops@gmail.com',
        pass: 'hdiw hynm gcuz tpdp',
    },
});

const sendOtpEmail = async (to, otp) => {
    try {
        await transporter.sendMail({
            from: 'myeduprops@gmail.com',
            to,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
        });
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }
};

module.exports = {
    sendOtpEmail,
};
