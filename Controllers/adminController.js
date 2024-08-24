const bcrypt = require('bcrypt');
const Admin = require('../Models/AdminModel');
const Student = require('../Models/Student');
const Mentor = require('../Models/Mentor')
const Course = require('../Models/Course')
const Category = require('../Models/CourseCategory')
const cloudinary = require('../Services/cloudinaryConfig');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

const AdminLogin = async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await Admin.findOne({ username });
      
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      const isMatch = await bcrypt.compare(password, admin.password);
  
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid password" });
      }
  
      const accessToken = generateAccessToken(admin);
      const refreshToken = generateRefreshToken(admin);;
  
 
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
  
     res.cookie('accessToken',accessToken,{
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1 hour
     })

     res.json({ accessToken, admin });
  
    } catch (err) {
   
      console.error('Error during admin login:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };

  const checkAuth = (req, res) => {
    if (req.user) {
        res.status(200).json({ user: req.user }); // Authenticated: 200 OK
    } else {
        res.status(401).json({ message: 'Unauthorized' }); // Unauthenticated: 401 Unauthorized
    }
};



const Logout = async (req,res) =>{
    try {

        res.cookie('accessToken', '', {
          maxAge: 0, 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'Strict' 
        });
    
        res.status(200).json({ message: 'Successfully logged out' });
      } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'An error occurred while logging out' });
      }
}

const AuthPage = async(req,res) =>{
    try {
        const students = await Student.find();
        console.log(students);
        
        res.status(200).json(students);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
      }
}

const BlockStudent = async (req, res) => {
    try {
      const student = await Student.findById(req.params.id);
  
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      if (typeof student.blocked === 'undefined') {
        student.blocked = true;  
      } else {
        student.blocked = true;  
      }
  
      await student.save();
      res.status(200).json(student);
    } catch (err) {
      res.status(500).json({ message: 'Failed to block student' });
    }
  };
  
  const UnBlockStudent = async (req, res) => {
    try {
      const student = await Student.findById(req.params.id);
  
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      if (typeof student.blocked === 'undefined') {
        student.blocked = false;  
      } else {
        student.blocked = false;  
      }
  
      await student.save();
      res.status(200).json(student);
    } catch (err) {
      res.status(500).json({ message: 'Failed to unblock student' });
    }
  };
  
  const GetMentors = async (req, res) => {
    try {
        const mentors = await Mentor.find();
        res.status(200).json(mentors);
    } catch (err) {
        console.error('Error fetching mentors:', err);
        res.status(500).json({ error: 'Failed to fetch mentors' });
    }
};

const ApproveMentor = async (req,res)=>{
    try {
        const mentorId = req.params.id;
        
        const mentor = await Mentor.findByIdAndUpdate(
            mentorId,
            { isActive: 'active' },
            { new: true } // Return the updated document
        );

        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        res.json(mentor);
    } catch (err) {
        console.error('Error approving mentor:', err);
        res.status(500).json({ message: 'Failed to approve mentor' });
    }
}

const RejectMentor = async (req,res) =>{
    try {
        const mentorId = req.params.id;
        
        const mentor = await Mentor.findByIdAndUpdate(
            mentorId,
            { isActive: 'rejected',
                rejectionDate: new Date()
             },
            
            { new: true } 
        );

        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        res.json(mentor);
    } catch (err) {
        console.error('Error rejecting mentor:', err);
        res.status(500).json({ message: 'Failed to reject mentor' });
    }
}

const createCategory = async (req, res) => {
    try {
        const { name, description,icon } = req.body;
        console.log(icon);
        

        const existingCategory = await Category.findOne({ name });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        const newCategory = new Category({ name, description,icon });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
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

const createCourse = async (req, res) => {
    try {
        const { title, description, price, instructor, duration, category, whatYouLearn } = req.body;
        let imageUrl = '';

        if (!title || !description || !price || !duration || !category || !whatYouLearn ) {
            return res.status(400).json({ message: 'All fields except instructor are required' });
        }

       
        if (req.files && req.files.image) {
            const image = req.files.image;

            const result = await cloudinary.uploader.upload(image.tempFilePath, {
                folder: 'CourseIconImage', 
            });
            imageUrl = result.secure_url;
        }

        
        const newCourse = new Course({
            title,
            description,
            price,
            instructor,
            duration,
            category,
            whatYouLearn,
            image: imageUrl,
        });

        // Save the course to the database
        await newCourse.save();

        // Send a response with the created course
        res.status(201).json(newCourse);

    } catch (error) {
        console.error('Error occurred while creating course:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            requestBody: req.body
        });

        res.status(500).json({
            message: 'Failed to create course',
            error: {
                message: error.message,
                stack: error.stack,
            }
        });
    }
};


const getCategoryById = async (req,res) => {

    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
            }
            res.json(category);
            } catch (err) {
                res.status(500).json({ message: err.message });
    }

}

const getCourses = async (req,res) =>{
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}


const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Step 1: Find and delete related courses
        const relatedCourses = await Course.find({ category: id });
        if (relatedCourses.length > 0) {
            await Course.deleteMany({ category: id });
        }

        // Step 2: Delete the category
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json({ message: 'Category and related courses deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting category and related courses' });
    }
};


const editcategory = async (req, res) => {

    const { id } = req.params;
    const { name, description, icon } = req.body;

    try {
        const category = await Category.findByIdAndUpdate(
            id,
            { name, description, icon },
            { new: true, runValidators: true } 
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error updating category' });
    }
};


const deleteCourse= async (req, res) => {
    const { id } = req.params;
    try {
    
        const course = await Course.findByIdAndDelete(id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
            }
     
            await Course.deleteMany({ id: course.id });
            res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting category and related courses' });
    }
};

const getCourseById = async (req, res) => {
    const { id } = req.params;

    try {
        
        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateCourse = async (req,res) =>{
    const { id } = req.params;
    const updatedData = req.body;

    try {
   
        if (req.files && req.files.image) {
            const image = req.files.image;
            const result = await cloudinary.uploader.upload(image.tempFilePath, {
                folder: 'courses', 
                use_filename: true,
                unique_filename: false,
            });
            updatedData.image = result.secure_url;
        }

        const course = await Course.findByIdAndUpdate(id, updatedData, { new: true });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json(course);
    } catch (err) {
        console.error('Error occurred while updating course:', err.message);
        res.status(500).json({ message: 'Failed to update course' });
    }
}


const AddVideo = async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const videoFiles = req.files;  // Retrieve the files from the request

    try {
 
        if (!videoFiles || Object.keys(videoFiles).length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const uploadedVideos = await Promise.all(
            Object.values(videoFiles).map(async (file) => {
                try {
                    const result = await cloudinary.uploader.upload(file.tempFilePath, {
                        resource_type: 'video',
                        folder:'Videos'
                    });
                    return result.secure_url;
                } catch (uploadError) {
                    console.error('Cloudinary upload error:', uploadError.message);
                    throw uploadError;
                }
            })
        );

        const newVideoEntry = {
            title,
            description,
            url: uploadedVideos  
        };


        course.lessons.push(newVideoEntry);
        await course.save();

        res.json(course);
    } catch (err) {
        console.error('AddVideo error:', err.message);
        res.status(500).json({ message: err.message });
    }
};


const deleteLesson = async (req,res) =>{

    const { courseId, lessonIndex } = req.params;

    try {
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (lessonIndex < 0 || lessonIndex >= course.lessons.length) {
            return res.status(400).json({ message: 'Invalid lesson index' });
        }

        course.lessons.splice(lessonIndex, 1);
        await course.save();

        res.status(200).json({ message: 'Lesson deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}


module.exports = {
   AdminLogin,
   checkAuth,
   Logout,
   AuthPage,
   BlockStudent,
   UnBlockStudent,
   GetMentors,
   ApproveMentor,
   RejectMentor,
   createCategory,
   getCategory,
   createCourse,
   getCategoryById,
   getCourses,
   deleteCategory,
   editcategory,
   deleteCourse,
   getCourseById,
   updateCourse,
   AddVideo,
   deleteLesson
};
