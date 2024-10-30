const bcrypt = require('bcrypt');
const Admin = require('../Models/AdminModel');
const Student = require('../Models/Student');
const Mentor = require('../Models/Mentor')
const Course = require('../Models/Course')
const Ad = require('../Models/Ad')
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
        const mentors = await Mentor.find().populate('assignedCourses', 'title');;
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
        const { title, description, price, duration, category, whatYouLearn } = req.body;
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
            duration,
            category,
            whatYouLearn,
            image: imageUrl,
        });


        await newCourse.save();

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
    const videoFiles = req.files;  

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

const getCourseDetailsForMentor = async (req, res) => {
    try {
      const courses = await Course.find().select('title _id category');
      const mentors = await Mentor.find().select('assignedCourses');
      const assignedCourseIds = mentors.flatMap(mentor => mentor.assignedCourses).filter(Boolean);
      const availableCourses = courses.filter(course => 
        !assignedCourseIds.some(assignedCourseId => assignedCourseId.equals(course._id))
      );
      const categoryIds = [...new Set(availableCourses.flatMap(course => course.category))];
      const categories = await Category.find({ _id: { $in: categoryIds } }).select('_id name');
      const categoryMap = categories.reduce((map, category) => {
        map[category._id.toString()] = category.name;
        return map;
      }, {});
      const coursesWithCategoryNames = availableCourses.map(course => ({
        title: course.title,
        courseId: course._id,
        categoryName: categoryMap[course.category.toString()] || 'Unknown'
      }));
      res.json(coursesWithCategoryNames);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  
  

const editLessonVideo = async (req, res) => {

    const { courseId, lessonId } = req.params;
    const { title, description, lessonIndex,editingVideoIndex } = req.body; 
    const videoFiles = req.files; 

    try {
        // Find the course by courseId
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Find the specific lesson by lessonId within the course
        const lesson = course.lessons.id(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // Update lesson details (title, description)
        lesson.title = title || lesson.title;
        lesson.description = description || lesson.description;

        // Handle video files update if they exist
        if (videoFiles && Object.keys(videoFiles).length > 0) {
            const uploadedVideos = await Promise.all(
                Object.values(videoFiles).map(async (file) => {
                    try {
                        const result = await cloudinary.uploader.upload(file.tempFilePath, {
                            resource_type: 'video',
                            folder: 'Videos'
                        });
                        return result.secure_url;
                    } catch (uploadError) {
                        console.error('Cloudinary upload error:', uploadError.message);
                        throw uploadError;
                    }
                })
            );

          
            if (!Array.isArray(lesson.url)) {
                lesson.url = [];
            }

            
            if (editingVideoIndex !== undefined && !isNaN(editingVideoIndex)) {
                const index = parseInt(editingVideoIndex, 10); 

                if (index >= 0 && index < lesson.url.length) {
                    
                    lesson.url[index] = uploadedVideos[0];
                } else {
                    return res.status(400).json({ message: 'Invalid lesson index' });
                }
            } else {
                
                lesson.url.push(...uploadedVideos);
            }
        }

        // Save the updated course document
        await course.save();

        res.json({ message: 'Lesson updated successfully', lesson });
    } catch (err) {
        console.error('editLessonVideo error:', err.message);
        res.status(500).json({ message: err.message });
    }
};


const updateAdminSettings = async (req, res) => {
    try {
        const { tax, discount } = req.body;


        const admin = await Admin.findOne(); // Modify this if you need to find a specific admin

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        admin.tax = tax;
        admin.discount = discount;
        await admin.save();

        res.status(200).json({ message: 'Updated successfully', admin });
    } catch (error) {
        console.error('Error updating admin settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAdminSettings = async (req, res) => {
    try {
        // Fetch the first admin document (assuming there's only one admin or you have a specific way to fetch settings)
        const admin = await Admin.findOne(); 

        if (!admin) {
            return res.status(404).json({ message: 'Admin settings not found' });
        }

        // Extract tax and discount from the admin document
        const { tax, discount } = admin;
        res.status(200).json({ tax, discount });
    } catch (error) {
        console.error('Error fetching admin settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateSubscriptionRates = async (req, res) => {
    try {
      const { goldRate, platinumRate } = req.body;
  
      // Fetch the current subscription rates from the database
      const currentAdmin = await Admin.findOne({});
  
      // If no document exists, return an error
      if (!currentAdmin) {
        return res.status(404).json({ message: 'No subscription rates found. Please create the rates first.' });
      }
  
      // Use current values if provided values are null or empty
      const updatedRates = {
        goldRate: (goldRate !== undefined && goldRate !== null && goldRate !== '') ? goldRate : currentAdmin.goldRate,
        platinumRate: (platinumRate !== undefined && platinumRate !== null && platinumRate !== '') ? platinumRate : currentAdmin.platinumRate,
      };
  
      // Perform the update
      const updatedAdmin = await Admin.findOneAndUpdate(
        {}, // Assuming there's only one admin document
        { $set: updatedRates }, // Only update the fields provided
        { new: true } // Return the updated document
      );
  
      return res.status(200).json({ message: 'Subscription rates updated successfully!', updatedAdmin });
    } catch (error) {
      console.error('Error updating subscription rates:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  
  
  

  const getSubscriptionRates = async (req, res) => {
    try {
 
      const adminData = await Admin.findOne({}, 'goldRate platinumRate'); // Only select the rates
  
      if (!adminData) {
        return res.status(404).json({ message: 'Admin data not found' });
      }
  
      return res.status(200).json({
        goldRate: adminData.goldRate,
        platinumRate: adminData.platinumRate,
      });
    } catch (error) {
      console.error('Error fetching subscription rates:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };

  const AddAds = async (req, res) => {
    try {
      let imageUrl;
  
      // Check if an image file is uploaded
      if (req.files && req.files.image) {
        const image = req.files.image;
        
        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'CourseIconImage', 
        });
        imageUrl = result.secure_url; // Get the secure URL of the uploaded image
      }
  
      const ad = new Ad({
        ...req.body,
        image: imageUrl, // Set the image URL in the ad object
      });
  
      await ad.save();
      res.status(201).json(ad);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  const GetAds = async (req,res)=>{
    try {
        const ads = await Ad.find();
        res.status(200).json(ads);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
  }

  const EditAds = async (req, res) => {
    try {
      let imageUrl;
  
      // Check if an image file is uploaded
      if (req.files && req.files.image) {
        const image = req.files.image;
  
        // Upload new image to Cloudinary
        const result = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'CourseIconImage', 
        });
        imageUrl = result.secure_url; // Get the secure URL of the uploaded image
      }
  
      // Find the ad and update it
      const ad = await Ad.findByIdAndUpdate(req.params.id, {
        ...req.body,
        ...(imageUrl && { image: imageUrl }), // Update image only if a new one is uploaded
      }, { new: true });
  
      if (!ad) return res.status(404).json({ error: 'Ad not found' });
      
      res.status(200).json(ad);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  
  const DeleteAds = async (req,res)=>{
    try {
        const ad = await Ad.findByIdAndDelete(req.params.id);
        if (!ad) return res.status(404).json({ error: 'Ad not found' });
        res.status(200).json({ message: 'Ad deleted successfully' });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
  }

  const updateCourseInstructor = async (req, res) => {
    const { courseId } = req.params;
    const { mentorId } = req.body;
  
    try {
      // Find the course by ID and update the instructor field
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        { instructor: mentorId }, // Update the instructor field with the mentor ID
        { new: true } // Return the updated course
      );
  
      if (!updatedCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      // Find the mentor to check the current assigned course
      const mentor = await Mentor.findById(mentorId);
  
      if (!mentor) {
        return res.status(404).json({ message: 'Mentor not found' });
      }
  
      // If the mentor already has this course assigned, do not update
      if (mentor.assignedCourses[0] === courseId) {
        return res.status(400).json({ message: 'Course is already assigned to this mentor' });
      }
  
      // Set the assignedCourses array to only contain the new courseId (replace any existing value)
      const updatedMentor = await Mentor.findByIdAndUpdate(
        mentorId,
        { assignedCourses: [courseId] }, // Replace the array with just the new courseId
        { new: true } // Return the updated mentor
      );
  
      return res.status(200).json({
        message: 'Instructor assigned successfully and mentor updated',
        course: updatedCourse,
        mentor: updatedMentor,
      });
    } catch (error) {
      console.error('Error updating course instructor and mentor:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  const editLessonVideos = async (req, res) => {
    const { courseId, lessonId } = req.params;
    const { editingVideoIndex } = req.body; 
    const videoFiles = req.files; 
  
    try {
    
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
  
    
        const lesson = course.lessons.id(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
     
  
  
        if (videoFiles && Object.keys(videoFiles).length > 0) {
            const uploadedVideos = await Promise.all(
                Object.values(videoFiles).map(async (file) => {
                    try {
                        const result = await cloudinary.uploader.upload(file.tempFilePath, {
                            resource_type: 'video',
                            folder: 'Videos'
                        });
  
                        return result.secure_url;
                    } catch (uploadError) {
                        console.error('Cloudinary upload error:', uploadError.message);
                        throw uploadError;
                    }
                })
            );
  
            // Ensure lesson.url is an array
            if (!Array.isArray(lesson.url)) {
                lesson.url = [];
            }
  
            // Update the video at the specified editingVideoIndex
            if (editingVideoIndex !== undefined && !isNaN(editingVideoIndex)) {
                const index = parseInt(editingVideoIndex, 10); 
  
                if (index >= 0 && index < lesson.url.length) {
                    lesson.url[index] = uploadedVideos[0]; // Update only the specified video
                } else {
                    return res.status(400).json({ message: 'Invalid lesson index' });
                }
            } else {
                // If no editing index is provided, push new videos to the array
                lesson.url.push(...uploadedVideos);
            }
        }
  
        // Save the updated course document
        await course.save();
  
        res.json({ message: 'Lesson video updated successfully', lesson });
    } catch (err) {
        console.error('editLessonVideo error:', err.message);
        res.status(500).json({ message: err.message });
    }
  };

  const updatelesson = async (req,res) => {

    const { courseId, lessonId } = req.params;
    const { title, description } = req.body;
  
    try {
        // Find the course by courseId
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
  
        // Find the specific lesson by lessonId within the course
        const lesson = course.lessons.id(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
  
        // Update lesson details (title, description) only if provided
        if (title) {
            lesson.title = title;
        }
        if (description) {
            lesson.description = description;
        }
  
        // Save the updated course
        await course.save();
  
        return res.status(200).json({ message: 'Lesson updated successfully!', lesson });
    } catch (error) {
        console.error('Error updating lesson:', error);
        return res.status(500).json({ message: 'Server error' });
    }
  }
  

  const getDashboardMetrics = async (req, res) => {
    try {
      // Count general metrics
      const userCount = await Student.countDocuments();
      const CourseCount = await Course.countDocuments();
      const CategoryCount = await Category.countDocuments();
      const mentorCount = await Mentor.countDocuments();
      const googleauthusers = await Student.countDocuments({ password: "googleauth" });
      const isBlocked = await Student.countDocuments({ blocked: true });


      const totalSalesData = await Student.aggregate([
        { $unwind: "$purchasedCourses" }, // Unwind the purchasedCourses array
        {
          $lookup: {
            from: "courses", // Ensure this matches your Course collection name
            localField: "purchasedCourses",
            foreignField: "_id",
            as: "courseDetails"
          }
        },
        { $unwind: "$courseDetails" }, // Unwind the courseDetails to get access to the price
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$courseDetails.price" } // Sum the prices of the purchased courses
          }
        },
        {
          $project: {
            _id: 0, // Exclude the _id field from the result
            totalSales: 1 // Include totalSales in the result
          }
        }
      ]);
  
      const totalSales = totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0;

      
     
  
    
      const mostPurchasedCourses = await Student.aggregate([
        { $unwind: "$purchasedCourses" }, // Unwind the array to get individual course IDs
        { $group: { _id: "$purchasedCourses", count: { $sum: 1 } } }, // Count occurrences of each course ID
        { $sort: { count: -1 } }, // Sort by count in descending order
        { $limit: 3 } // Limit to top 3
      ]);
  
      // Extract the course IDs from the aggregation result
      const topCourseIds = mostPurchasedCourses.map(course => course._id);
  
      // Fetch the details of the top 3 courses and populate the title
      const topCourses = await Course.find({ _id: { $in: topCourseIds } }).select("title");


      const membershipCounts = await Student.aggregate([
        { $group: { _id: "$membershipType", count: { $sum: 1 } } }
      ]);
  
      // Format membershipCounts for easy access in the frontend
      const membershipData = {
        silver: membershipCounts.find(type => type._id === 'silver')?.count || 0,
        platinum: membershipCounts.find(type => type._id === 'platinum')?.count || 0,
        gold: membershipCounts.find(type => type._id === 'gold')?.count || 0
      };
      


      const monthlyCounts = await Student.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" } // Group by year and month
            },
            count: { $sum: 1 } // Count number of students per month
          }
        },
        { $sort: { _id: 1 } } // Sort by date ascending
      ]);
  
      // Format the data for the frontend
      const formattedData = monthlyCounts.map(item => ({
        month: item._id,
        count: item.count,
      }));
  
      const data = {
        userCount,
        CourseCount,
        CategoryCount,
        mentorCount,
        topCourses,
        membershipData,
        formattedData, 
        googleauthusers,
        isBlocked,
        totalSales
      };
  
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  };
  



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
   deleteLesson,
   getCourseDetailsForMentor,
   editLessonVideo,
   updateAdminSettings,
   getAdminSettings,
   updateSubscriptionRates,
   getSubscriptionRates,
   GetAds,
   AddAds,
   EditAds,
   DeleteAds,
   updateCourseInstructor,
   editLessonVideos,
   updatelesson,
   getDashboardMetrics
};
