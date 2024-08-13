const Student = require('../../Models/Student'); 

const checkBlockedStatus = async (req, res, next) => {
  try {
    const userId = req.user._id; 

    const student = await Student.findById(userId);
    console.log(student,'student');
    
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (student.blocked) {
      return res.status(403).json({ message: 'Access denied. Your account is blocked.' });
    }
  
    next();
  } catch (err) {
    console.error('Error checking blocked status:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = checkBlockedStatus;
