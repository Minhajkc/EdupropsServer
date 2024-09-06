const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const client = new OAuth2Client('997696378611-qvopoihd2m7gvegm7hi8ud1t7aftrfv5.apps.googleusercontent.com');
const Student = require('../Models/Student');
const { sendOtpEmail } = require('../config/email');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const Category = require('../Models/CourseCategory')
const Course = require('../Models/Course')
require('dotenv').config();


const otpStore = {}; 
const passwordResetOtps = {};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });



const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const createStudent = async (req, res) => {
    try {
        const { password, confirmPassword, email, username } = req.body;

        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Email is already registered' });
        }  

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const otp = generateOtp();
        otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 }; 
        console.log(otp);
        console.log(otpStore,'otp stored');
        
        await sendOtpEmail(email, otp);

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp, password, confirmPassword } = req.body;

        const storedOtp = otpStore[email];

        if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.expires) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({ ...req.body, password: hashedPassword });
        const savedStudent = await newStudent.save();

        const accessToken = generateAccessToken(savedStudent);
        const refreshToken = generateRefreshToken(savedStudent);

        
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
     
        delete otpStore[email];

        res.status(201).json(savedStudent);
    } catch (error) {
        console.error(error); // Log error details for debugging
        res.status(400).json({ message: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {

        const user = await Student.findOne({ email });
         

        
        if (!user) {
            return res.status(400).json({ message: 'Invalid email' });
        }


        if(user.blocked){
            return res.status(400).json({ message: 'Your account has been blocked' });
        }


        if(user && user.password ==='googleauth'){
            return res.status(400).json({ message: 'Please log in using Google.' });
        }


        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid  password' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set secure to true in production
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({ message: 'Login successful',Student:user });
    } catch (error) {
        console.error(error); // Log error details for debugging
        res.status(500).json({ message: 'Internal server error' });
    }
};

const googleauth = async (req, res) => {
    const { idToken } = req.body;
    try {
        
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        let student = await Student.findOne({ email });

        if (student) {
            if (student.blocked) {
                return res.status(400).json({ message: 'Your account has been blocked.' });
            }
            
            student.lastLogin = new Date();
            await student.save();
        } else {
          
            student = new Student({
                username: email,
                email,
                password: 'googleauth', 
                firstName,
                lastName,
                blocked: false 
            });

            await student.save();
        }

   
        const accessToken = generateAccessToken(student);
        const refreshToken = generateRefreshToken(student);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({ message: 'Authenticated successfully!', Student:student });
    } catch (error) {
        console.error('Error verifying ID token:', error);
        res.status(401).json({ message: 'Invalid token.' });
    }
};


const passwordResetSendOtp = async (req, res) => {
    const { email } = req.body;
    const student = await Student.findOne({email})
    if (!student) {
        return res.status(404).json({ message: 'User not found.' });
    }
    if (student.password === 'googleauth') {
        return res.status(400).json({ message: 'Please log in with Google. You cannot reset the password for this account.' });
    }
    const otp = generateOtp();
    passwordResetOtps[email] = otp;
    try {
        await sendOtpEmail(email, otp);
        console.log(passwordResetOtps);
        return res.status(200).json({ message: 'OTP sent to email.' });
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
};


const passwordResetVerifyOtp = (req, res) => {
    const { email, otp } = req.body;

    if (passwordResetOtps[email] && passwordResetOtps[email] === otp) {
        return res.status(200).json({ message: 'OTP verified.' });
    } else {
        return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }
};


const passwordResetResetPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const user = await Student.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

       
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        
        delete passwordResetOtps[email];

        return res.status(200).json({ message: 'Password reset successful.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
};


const getStudentProfile = async (req, res) => {
    try {
        // Fetch student with populated purchasedCourses
        const student = await Student.findById(req.user.id)
            .select('-password') // Exclude password field
            .populate({
                path: 'purchasedCourses', // Field to populate
            });
            console.log(student)

        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        res.status(200).json({ student });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};



const getCategory = async (req,res) =>{
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const getCoursesByCategoryId = async (req, res) => {
    const { id } = req.params; // This is the category ID

    try {
        // Fetch all courses that have the matching category ID
        const courses = await Course.find({ category: id });
        
        if (courses.length === 0) {
            return res.status(404).json({ message: 'No courses found for this category' });
        }

        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getCourseFullView = async (req, res) => {
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ message: 'Invalid course ID.' });
    }

    try {
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        
        const lessonsInfo = course.lessons.map(lesson => ({
            title: lesson.title,
            description: lesson.description,
            videoCount: lesson.url ? lesson.url.length : 0, // Count the number of videos
        }));
        const firstLessonFirstVideoUrl = course.lessons[0] && course.lessons[0].url ? course.lessons[0].url[0] : null;
        const response = {
            id:course._id,
            title: course.title,
            whatYouLearn:course.whatYouLearn,
            category:course.category,
            description: course.description,
            lessonCount: course.lessons.length, // Total number of lessons
            lessonsInfo, // Includes title, description, and video count for each lesson
            image: course.image,
            price: course.price,
            duration: course.duration,
            category: course.category,
            instructor: course.instructor,
            firstLessonFirstVideoUrl
        };

        res.json(response);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const logout = async (req,res) =>{
    try {

        res.clearCookie('accessToken'); 
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error });
    }
}

const addToCart = async (req, res) => {
    const { courseId } = req.params;
    const studentId = req.student;
  
    try {
      // Find the student by ID
      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      // Check if the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      // Check if the course is already in the cart
      const isCourseInCart = student.cart.some(item => item?.courseId?.toString() === courseId);
    if (isCourseInCart) {
      return res.status(400).json({ message: 'Course already in cart' });
    }
  
      // Add course to cart with its price
      student.cart.push({ courseId: course._id, price: course.price });
      await student.save();
  
      // Calculate the total amount
      const totalAmount = student.cart.reduce((total, item) => total + item.price, 0);
  
      return res.status(200).json({
        message: 'Course added to cart',
        cart: student.cart,
        totalAmount
      });
    } catch (error) {
      console.error('Error adding course to cart:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  
  const getCartItems = async (req, res) => {
    try {
      const studentId = req.student;
  
      const student = await Student.findById(studentId).populate('cart.courseId');

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      let subtotal = 0;
      const transformedCourses = student.cart.map(item => {
        subtotal += item.courseId.price;
  
        return {
          ...item.courseId._doc, // Spread the course data
          lessonsCount: item.courseId.lessons.length, // Add lessons count
          price: item.courseId.price // Include the course price
        };
      });
  
      const discount = 5; // Apply any logic for discount here
      const tax = 20; // Apply tax logic here
      const total = subtotal - discount + tax;
  
      transformedCourses.forEach(course => {
        delete course.lessons;
      });
  
      res.status(200).json({
        courses: transformedCourses,
        subtotal,
        discount,
        tax,
        total,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error, please try again later' });
    }
  };

  const removeFromCart = async (req, res) => {
  
    try {
      const studentId = req.student;
      const courseId = req.params.courseId;
  
      // Find the student and update the cart
      const result = await Student.updateOne(
        { _id: studentId },
        { $pull: { cart: { courseId: courseId } } }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: 'Course not found in cart' });
      }
  
      return res.status(200).json({ message: 'Course removed from cart' });
    } catch (error) {
      console.error('Error removing course from cart:', error);
      return res.status(500).json({ message: 'Server error, please try again later' });
    }
  };


  const CreateOrder = async (req, res) => {
    try {
      const { amount, currency } = req.body; // Get amount and currency from the request
  
      const options = {
        amount: amount * 100, // Razorpay expects the amount in paise (1 INR = 100 paise)
        currency: currency || 'INR', // Default to INR if no currency is provided
        receipt: crypto.randomBytes(10).toString('hex'), // Unique receipt ID
      };
  

      const order = await razorpay.orders.create(options);
  
      if (!order) {
        return res.status(500).send('Some error occurred');
      }
  
      return res.json(order);
    } catch (error) {
      // Send error response if something goes wrong
      console.error('Error creating Razorpay order:', error);
      res.status(500).send('Server Error');
    }
  };

  const verifyPayment = async(req,res)=>{
    try {
        const { order_id, payment_id, signature } = req.body;

        const body = order_id + '|' + payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest('hex');
    
  
        if (expectedSignature === signature) {
          return res.json({ status: 'success' });
        } else {
          return res.status(400).json({ status: 'failure' });
        }
      } catch (error) {
        res.status(500).send(error);
      }
  }

  const savePurchase = async (req, res) => {
  
    try {
      const { cartData } = req.body;
      const studentId = req.student;

  

      const student = await Student.findById(studentId);
 
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      const purchasedCourseIds = cartData.map(item => item._id); // Assuming each item in cartData has a courseId

 
      student.purchasedCourses.push(...purchasedCourseIds);
      student.cart = []
 
      await student.save();
  
      return res.json({ status: 'success' });
    } catch (error) {
      console.error('Error saving purchase:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  
  
  

module.exports = {
    createStudent,
    verifyOtp,
    login,
    googleauth,
    passwordResetSendOtp,
    passwordResetVerifyOtp,
    passwordResetResetPassword,
    getStudentProfile,
    getCategory,
   getCoursesByCategoryId,
   getCourseFullView,
   logout,
   addToCart,
   getCartItems,
   removeFromCart,
   CreateOrder,
   verifyPayment,
   savePurchase
};
