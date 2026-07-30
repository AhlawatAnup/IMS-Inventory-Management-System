// HPACK CONFIG FILE
const path = require('path');

module.exports = {
  entries: {
    home: './public_src/home/html/home.html',
    admin: './public_src/admin/html/admin.html',
    user: './public_src/user/html/user.html',
    // teacher: './public_src/teacher/html/teacher.html',
    // teacher_registration: './public_src/registration/teacher/html/teacher.registration.html',
    // student_registration: './public_src/registration/student/html/student.registration.html',
  },

  output: {
    path: path.resolve(__dirname, 'public'),
  },
};
