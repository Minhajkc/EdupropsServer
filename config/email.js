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

const sendContactFormEmail = async (formData) => {
    const { name, email, message } = formData;
    try {
        await transporter.sendMail({
            from: 'myeduprops@gmail.com',
            to: 'myeduprops@gmail.com', // Change this to your email address
            subject: 'New Contact Form Submission',
            text: `
                You have received a new message from the contact form:

                Name: ${name}
                Email: ${email}
                Message: ${message}
            `,
        });
    } catch (error) {
        console.error('Error sending contact form email:', error);
    }
};


module.exports = {
    sendOtpEmail,
    sendContactFormEmail
};
