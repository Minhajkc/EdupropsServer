
const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');
const Mentor = require('../Models/Mentor')
const cloudinary = require('../Services/cloudinaryConfig');
const streamifier = require('streamifier');
const Course = require('../Models/Course')
const Student = require('../Models/Student');
const { sendOtpEmail } = require('../config/email');
const { google } = require('googleapis');
const mongoose = require('mongoose');






const passwordResetOtps = {};


const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const uploadFileToCloudinary = (fileBuffer) => {

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'raw' },
          (error, result) => {
            if (error) {
              reject(new Error('Cloudinary upload failed: ' + error.message));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
  };
  

const Register = async (req, res) => {

    try {
        const { firstName, lastName, username, email, password, confirmPassword, degree } = req.body;

        if (!firstName || !lastName || !username || !email || !password || !degree || !req.fileUrl) {
            return res.status(400).json({ error: 'All fields are required, including the file' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const mentor = new Mentor({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword, // Store the hashed password
            degree,
            resume: req.fileUrl, 
        });

        await mentor.save();
        res.status(201).json({ message: 'Mentor registered successfully' });
    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(500).json({ error: 'Server error' });
    }
};

const Login = async (req, res) => {

    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const mentor = await Mentor.findOne({ email });
     
        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        if (mentor.isActive === 'rejected') {
            const now = new Date();
            const rejectionDate = new Date(mentor.rejectionDate);
            const daysSinceRejection = Math.floor((now - rejectionDate) / (1000 * 60 * 60 * 24));

            if (daysSinceRejection < 3) {
                return res.status(400).json({
                    message: `Your account has been rejected. You can reapply after ${3 - daysSinceRejection} day's.`
                });
            } else {
                await Mentor.deleteOne({ _id: mentor._id });
                return res.status(400).json({ message: 'Your account was rejected and has been deleted. Please reapply.' });
            }
        }


        if(mentor.isActive ==='pending'){
            return res.status(400).json({ message: 'Your account is pending verification' });
        }

       
        const match = await bcrypt.compare(password, mentor.password);

        if (!match) {
            return res.status(401).json({ message: 'Password not match' });
        }

        const accessToken = jwt.sign(
            { id: mentor._id, username: mentor.username, role: 'mentor' },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );
        
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 15 * 60 * 1000, 
        });

        res.status(200).json({
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred during login' });
    }
};


const passwordResetSendOtp = async (req, res) => {

    const { email } = req.body;
    const mentor = await Mentor.findOne({email})
    if (!mentor) {
        return res.status(404).json({ message: 'Mentor not found.' });
    }
    if (mentor.isActive === 'rejected') {
        return res.status(400).json({ message: `Sorry your account is rejected ! please try after 3 day's` });
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
        const mentor = await Mentor.findOne({ email });
        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found.' });
        }

        mentor.password = await bcrypt.hash(newPassword, 10);
        await mentor.save();

        
        delete passwordResetOtps[email];

        return res.status(200).json({ message: 'Password reset successful.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
};

const getMentorProfile = async (req, res) => {
    try {
      // Find mentor by ID and exclude password field
      const mentor = await Mentor.findById(req.user.id)
        .select('-password')
        .populate({
          path: 'assignedCourses', // Path to the assignedCourses array
          select: 'title _id', // Select only the 'title' field from the Course model
        });
      
      // If mentor not found
      if (!mentor) {
        return res.status(404).json({ message: 'Mentor not found.' });
      }

      // Send mentor data with populated course titles
      res.status(200).json({ mentor });
    } catch (error) {
      console.error('Error fetching mentor profile:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };
  


const logoutMentor = async (req, res) => {
    try {
        res.clearCookie('accessToken'); 
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error });
    }
  };

  const sendChatMessage = async (req, res) => {
      
    try {
        const mentorId = req.user.id; // Get the mentor ID from the authenticated user
        const { message } = req.body; // Get the message from the request body

        // Find the mentor and populate their assigned courses
        const mentor = await Mentor.findById(mentorId)

        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        // Check if the mentor has any assigned courses
        if (mentor.assignedCourses.length === 0) {
            return res.status(404).json({ message: 'No assigned courses found for the mentor' });
        }

        // Select the first assigned course (you can modify this logic as needed)
        const courseId = mentor.assignedCourses[0]; // Get the first course
        const course = await Course.findById(courseId);

        // Create the new chat message
        const newMessage = {
            message,
            sentBy: mentorId,
            createdAt: Date.now(),
        };


        // Add the new message to the course chats
        course.chats.push(newMessage);
        await course.save();

        res.status(200).json({ message: 'Message sent', chat: course.chats });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ message: 'Server error' });
    }
};


const retrieveChatMessage = async (req, res) => {
    try {
        const mentorId = req.user.id; // Assuming the mentor is authenticated and `req.user` holds their ID

        // Find the mentor and populate their assigned courses
        const mentor = await Mentor.findById(mentorId).populate('assignedCourses');

        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        // Get the course IDs from the mentor's assignedCourses
        const courseIds = mentor.assignedCourses.map(course => course._id);

        // Find all the courses and populate their chats
        const courses = await Course.find({ _id: { $in: courseIds } }).populate({
            path: 'chats.sentBy',
            select: 'username',
        });

        // Check if any courses were found
        if (!courses || courses.length === 0) {
            return res.status(404).json({ message: 'Courses not found' });
        }

        // Gather all chats from the courses
        const allChats = [];

        courses.forEach(course => {
            if (course.chats && course.chats.length > 0) {
                const formattedChats = course.chats.map(chat => ({
                    message: chat.message,
                    sender: chat.sentBy?.username || 'Mentor', // Get the username from the populated field
                    createdAt: chat.createdAt,
                }));
                allChats.push(...formattedChats); // Add all formatted chats to the allChats array
            }
        });

        res.status(200).json({ allChats });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ message: 'Server error' });
    }
};




const scheduleMeet = async (req, res) => {
  const { courseId } = req.params;
  const { name, date, startTime, endTime, meetingLink } = req.body;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.scheduleMeets.push({
      name,
      date,
      startTime,
      endTime,
      link: meetingLink,
    });

    await course.save(); // Save the updated course document
    res.status(200).json({ message: 'Meeting scheduled successfully', course });
  } catch (error) {
    res.status(400).json({ message: 'Error scheduling meeting: ' + error.message });
  }
};

const getScheduledMeets = async (req, res) => {

  const { courseId } = req.params; // Get courseId from params

  try {

    const course = await Course.findById(courseId).select('scheduleMeets'); // Only select the scheduleMeets field
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Return the scheduled meetings
    res.status(200).json({ meets: course.scheduleMeets });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const updateMeeting = async (req, res) => {

  const { courseId, meetingId } = req.params;
  const { name, date, startTime, endTime } = req.body;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find the meeting to update
    const meeting = course.scheduleMeets.id(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }


    // Update the meeting details
    meeting.name = name || meeting.name;
    meeting.date = date || meeting.date;
    meeting.startTime = startTime || meeting.startTime;
    meeting.endTime = endTime || meeting.endTime;

    await course.save(); // Save the updated course document
    res.status(200).json({ message: 'Meeting updated successfully', course });
  } catch (error) {
    res.status(400).json({ message: 'Error updating meeting: ' + error.message });
  }
};

const deleteMeeting = async (req, res) => {

  const { courseId, meetingId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find the meeting by ID and remove it
    const meeting = course.scheduleMeets.id(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }


    meeting.deleteOne(); // Remove the meeting from the array

    await course.save(); // Save the updated course document
    res.status(200).json({ message: 'Meeting deleted successfully', course });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting meeting: ' + error.message });
  }
};

const getStudentsByCourse = async (req, res) => {

  try {
    const mentorId = req.user.id;  // assuming user is attached to req in the middleware

    // Step 1: Find the mentor based on the logged-in user ID
    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Step 2: Extract the course ID from the mentor's assignedCourses array
    const assignedCourse = mentor.assignedCourses[0]; // Assuming there's only one course ID in the array

    if (!assignedCourse) {
      return res.status(404).json({ message: 'No course assigned to this mentor' });
    }console.log(assignedCourse)

    // Step 3: Find students who have purchased this course
    const students = await Student.find({ purchasedCourses: assignedCourse}).select('username email');
    const students2 = await Student.find({ subscription:assignedCourse})
    console.log(students2)

    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found for this course' });
    }

    // Step 4: Return the list of students
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports = {
    Register,
    uploadFileToCloudinary,
    Login,
    passwordResetSendOtp,
    passwordResetVerifyOtp,
    passwordResetResetPassword,
    getMentorProfile,
    logoutMentor,
    sendChatMessage,
    retrieveChatMessage,
    scheduleMeet,
    getScheduledMeets,
    updateMeeting,
    deleteMeeting,
    getStudentsByCourse

};