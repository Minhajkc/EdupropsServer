const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const client = new OAuth2Client('997696378611-qvopoihd2m7gvegm7hi8ud1t7aftrfv5.apps.googleusercontent.com');
const Student = require('../Models/Student');
const { sendOtpEmail, sendContactFormEmail } = require('../config/email');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const Category = require('../Models/CourseCategory')
const Course = require('../Models/Course')
const Admin = require('../Models/AdminModel')
const Mentor = require('../Models/Mentor')
const Ad = require('../Models/Ad')
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
        console.log(otpStore,'Otp stored');
        
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
        

        savedStudent.refreshToken = refreshToken;
        savedStudent.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        await savedStudent.save();
        
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

        user.refreshToken = refreshToken;
        user.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        await user.save();

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

        student.refreshToken = refreshToken;
        student.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        await student.save(); // Save the user with updated tokens

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
    const student = await Student.findById(req.user.id)
      .select('-password') // Exclude password field
      .populate({
        path: 'purchasedCourses', // Populate purchased courses
      })
      .populate({
        path: 'subscription', // Populate subscriptions
      });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Fetch purchased courses with instructors and scheduleMeets
    const purchasedCourses = await Course.find({ _id: { $in: student.purchasedCourses } })
      .select('title instructor scheduleMeets') // Select title, instructor, and scheduleMeets
      .lean();

    const purchasedInstructors = purchasedCourses.map(course => course.instructor);

    // Fetch subscription courses with instructors and scheduleMeets
    const subscriptionCourses = await Course.find({ _id: { $in: student.subscription } })
      .select('title instructor scheduleMeets')
      .lean();

    const subscriptionInstructors = subscriptionCourses.map(course => course.instructor);

    // Combine both purchased and subscription instructors
    let allInstructors = [...purchasedInstructors, ...subscriptionInstructors];
    allInstructors = allInstructors.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Fetch mentors based on instructor IDs
    const mentors = await Mentor.find({ _id: { $in: allInstructors } })
      .select('username email degree') // Fetch only necessary fields
      .lean();

    // Extract scheduleMeets from both purchased and subscription courses
    
    const scheduleMeets = [
      ...purchasedCourses,
      ...subscriptionCourses
    ]
      .filter(course => course.scheduleMeets && course.scheduleMeets.length > 0) // Ensure scheduleMeets exists
      .map(course => ({
        courseTitle: course.title,
        meetings: course.scheduleMeets.map(meet => ({
          name: meet.name,
          date:meet.date,
          startTime: meet.startTime,
          endTime: meet.endTime,
          link: meet.link
        }))
      }));
  

    // Return student, mentors, and scheduleMeets
    res.status(200).json({ student, mentors, scheduleMeets });
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
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error });
    }
}

const addToCart = async (req, res) => {
    const { courseId } = req.params;
    const studentId = req.student;
  
    try {

      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      


      const alreadyPurchased = student.purchasedCourses.some(
        (purchasedCourseId) => purchasedCourseId.toString() === course._id.toString()
      );
      
  
      if (alreadyPurchased) {
        return res.status(409).json({ message: 'Course already purchased' });
      }
      
      const isCourseInCart = student.cart.some(item => item?.courseId?.toString() === courseId);
    if (isCourseInCart) {
      return res.status(400).json({ message: 'Course already in cart' });
    }
  
      
      student.cart.push({ courseId: course._id, price: course.price });
      await student.save();
  
      
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

        // Fetch the student and populate cart items
        const student = await Student.findById(studentId).populate('cart.courseId');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Fetch the admin settings for discount and tax
        const adminSettings = await Admin.findOne();
        if (!adminSettings) {
            return res.status(500).json({ message: 'Admin settings not found' });
        }

        const { tax, discount } = adminSettings;

        let subtotal = 0;
        const transformedCourses = student.cart.map(item => {
            subtotal += item.courseId.price;

            return {
                ...item.courseId._doc, // Spread the course data
                lessonsCount: item.courseId.lessons.length, // Add lessons count
                price: item.courseId.price // Include the course price
            };
        });

        const total = (subtotal - discount) * (1 + tax / 100);


   
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
        amount: Math.round(amount * 100) ,
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

  const searchCategories = async (req, res) => {
    try {
      const searchTerm = req.query.searchTerm || ''; 
      const categories = await Category.find({
        name: { $regex: searchTerm, $options: 'i' }, 
      });
  
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching categories', error });
    }
  };
  
  
  const getCategoryCoursesById = async (req, res) => {
    const { id } = req.params; // Category ID
    const { searchTerm, sortOption } = req.query;
  
    try {
      // Create a search query for the title if a searchTerm is provided
      let searchQuery = { category: id };
      if (searchTerm) {
        searchQuery.title = { $regex: searchTerm, $options: 'i' }; // Case-insensitive search
      }
  
      // Map sort options directly to MongoDB field sorting
      const sortMapping = {
        'price-asc': { price: 1 },
        'price-desc': { price: -1 },
        'title-asc': { title: 1 },
        'title-desc': { title: -1 }
      };
  
      // Use sortOption or default to an empty object (no sorting)
      const sortQuery = sortMapping[sortOption] || {};
  
      // Fetch courses from the database with search and sorting
      const courses = await Course.find(searchQuery).sort(sortQuery);
  
      res.status(200).json(courses);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch courses', error });
    }
  };
  

  const GetMentorsCarousel = async (req,res) => {
    try {
        const mentors = await Mentor.find(); 

        res.status(200).json(mentors);
      } catch (error) {
        console.error('Error fetching mentors:', error);
        res.status(500).json({ message: 'Error fetching mentors' });
      }
  }

  const CreateOrderSubscription = async (req, res) => {
    try {
      const { amount, currency, subscriptionPlan } = req.body; // Get amount, currency, and plan details from the request
      const studentId = req.student; // Assuming studentId is available in req.student
  
      // Fetch the student document to check their current subscription
      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Check if the user is already subscribed to Gold or Platinum
      if (student.membershipType === 'platinum') {
        return res.status(400).json({ error: 'You are already subscribed to Platinum. You cannot purchase Gold or any other lower subscription.' });
      }
  
      if (student.membershipType === 'gold' && subscriptionPlan === 'gold') {
        return res.status(400).json({ error: 'You are already subscribed to Gold. You cannot purchase Gold again.' });
      }
  
      if (student.membershipType === 'gold' && subscriptionPlan === 'platinum') {
        // Allow upgrading from Gold to Platinum
        console.log('User is upgrading from Gold to Platinum');
      }
  
      // If validation passes, proceed with creating the order
      const options = {
        amount: Math.round(amount * 100), // Convert amount to paise (minor units)
        currency: currency || 'INR', // Default to INR if no currency is provided
        receipt: crypto.randomBytes(10).toString('hex'), // Unique receipt ID
      };
  
      // Create order with Razorpay
      const order = await razorpay.orders.create(options);
  
      if (!order) {
        return res.status(500).send('Order creation failed');
      }
  
      // Return order details if successful
      return res.json(order);
    } catch (error) {
      // Send error response if something goes wrong
      console.error('Error creating Razorpay order:', error);
      res.status(500).send('Server Error');
    }
  };
  
  const verifyPaymentSubscription = async(req,res)=>{

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

  const savePurchaseSubscription = async (req, res) => {

    try {
      const studentId = req.student;
      const { subscriptionPlan } = req.body; // Expecting the plan name like 'Gold' or 'Platinum'
  
      // Fetch the student document
      const student = await Student.findById(studentId);
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Fetch all categories
      const categories = await Category.find(); // Assuming 'Category' is the model for categories
  
      if (!categories || categories.length === 0) {
        return res.status(404).json({ error: 'No categories found' });
      }
  
      // Fetch courses from each category
      const courseLimit = subscriptionPlan === 'platinum' ? 3 : 2;
      let selectedCourses = [];
      for (const category of categories) {
        // Find courses belonging to this category (assuming category._id corresponds to Course.category)
        const courses = await Course.find({ category: category._id }).limit(courseLimit);
  
        // Add the selected courses from this category to the list
        selectedCourses = [...selectedCourses, ...courses];
      }
  
      // Update student's subscription with selected courses
      student.subscription = selectedCourses.map(course => course._id); // Save course IDs in subscription array
      if(subscriptionPlan === 'platinum'){
        student.membershipType = 'platinum'
      }else if (subscriptionPlan === 'gold'){
        student.membershipType = 'gold'
      }else{
        student.membershipType = 'silver'
      }
  
      // Save updated student document
      await student.save();
  
      return res.json({ status: 'success', subscribedCourses: student.subscription , membershipType:student.membershipType });
    } catch (error) {
      console.error('Error saving purchase:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };

    const getAllAds = async (req, res) => {
      try {
        const ads = await Ad.find(); // Fetch all ads from the database
        res.status(200).json(ads);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch ads', error });
      
      }
  }



  // POST route to send a chat message for a course
  const sendChatMessage =  async (req, res) => {

      try {
          const courseId = req.params.courseId;
          const userId = req.student; // Assuming you set `req.userId` in authentication middleware
  
          // Find the student
          const student = await Student.findById(userId).populate('purchasedCourses');
  
          if (!student) {
              return res.status(404).json({ message: 'User not found' });
          }
  
          // Check if the user has purchased the course
          const isPurchased = student.purchasedCourses.some(course => course._id.toString() === courseId);
  
          if (!isPurchased) {
              return res.status(403).json({ message: 'You have not purchased this course' });
          }
  
          // Find the course
          const course = await Course.findById(courseId);
  
          if (!course) {
              return res.status(404).json({ message: 'Course not found' });
          }
  

          const newMessage = {
              message: req.body.message, // Store the message as a question
              sentBy: userId, // The user who sent the message
              createdAt: Date.now(),
          };
  
          // Push the new message into the qAndA array
          course.chats.push(newMessage);
          await course.save();
  
          res.status(200).json({ message: 'Message sent', chat: course.chats });
      } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Server error' });
      }
  };
  
  // GET route to retrieve chat messages for a course
const retrieveChatMessage =  async (req, res) => {

      try {
          const courseId = req.params.courseId;
          const userId = req.student;
  
          // Find the student
          const student = await Student.findById(userId).populate('purchasedCourses');
  
          if (!student) {
              return res.status(404).json({ message: 'User not found' });
          }
  
          // Check if the user has purchased the course
          const isPurchased = student.purchasedCourses.some(course => course._id.toString() === courseId);
  
          if (!isPurchased) {
              return res.status(403).json({ message: 'You have not purchased this course' });
          }
  
          // Find the course
          const course = await Course.findById(courseId).populate({
            path: 'chats.sentBy', // Populate the sentBy field with user data
            select: 'username', // Only select the username field
        });
          if (!course) {
              return res.status(404).json({ message: 'Course not found' });
          }
          const formattedChats = course.chats.map(chat => ({
            message: chat.message,  
            sender: chat.sentBy?.username || 'Mentor', // Get the username from the populated field
            createdAt: chat.createdAt,
        }));
        res.status(200).json({ chat: formattedChats });
      } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Server error' });
      }
  };
  const addReview = async (req, res) => {
  
    const { userId, rating, reviewText, userName } = req.body.reviewdata; // Destructure the review data

    try {
        // Directly push the new review to the admin's reviews array
        await Admin.updateOne(
            {}, // This finds the first admin (or specify criteria if needed)
            { $push: { reviews: { userId, rating, reviewText, userName } } } // Add userName as well if you want
        );

        // Send success response
        return res.status(200).json({ message: 'Review added successfully' });
    } catch (error) {
        console.error('Error adding review:', error);
        return res.status(500).json({ message: 'Failed to add review', error: error.message });
    }
};


const getReviews = async (req, res) => {
  try {
      // Fetch the admin document and populate the reviews array
      const admin = await Admin.findOne(); // Only select the reviews field
      if (!admin || !admin.reviews) {
          return res.status(404).json({ message: 'No reviews found.' });
      }
      return res.status(200).json(admin.reviews); // Send the reviews as a response
  } catch (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};


const subscribeEmail = async (req, res) => {

  const { email } = req.body;

  // Validate the email format
  if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    const admin = await Admin.findOne();

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Push the email to the subscriptionEmail array if it doesn't already exist
    if (!admin.subscriptionEmail.includes(email)) {
      admin.subscriptionEmail.push(email);
      await admin.save(); // Save the updated admin document
    }

    res.status(200).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
}


const contactForm = async (req,res) => {
  const formData = req.body;

  try {
      await sendContactFormEmail(formData);
      return res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
      return res.status(500).json({ message: 'Failed to send message', error });
  }
}
  

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
   savePurchase,
   searchCategories,
   getCategoryCoursesById,
   GetMentorsCarousel,
   CreateOrderSubscription,
   verifyPaymentSubscription,
   savePurchaseSubscription,
   getAllAds,
   sendChatMessage,
   retrieveChatMessage,
   addReview,
   getReviews,
   subscribeEmail,
   contactForm
};
