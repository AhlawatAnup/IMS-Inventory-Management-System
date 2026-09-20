const admin = require('../database/adminModel');
const user = require('../database/userModel');
const bcrypt = require('bcrypt');
const path = require('path');
const publicPath = path.join(__dirname, '../../public');

async function resetPassword(req, res) {
  if (!req.session || req.session.role !== 'admin') {
    return res.status(401).json({ error: 'Not authenticated as admin' });
  }

  const { oldPassword, newPassword } = req.body;
  const email = req.session.user.email;

  const admin_doc = await admin.findOne({ email: email });
  // console.log('req.session.email: ', req.session.user.email);

  if (admin_doc) {
    const matchOldPass = await bcrypt.compare(oldPassword, admin_doc.password);
    if (!matchOldPass) {
      return res.status(400).json({
        message: `old password didn't match!`,
      });
    }

    const newHashedPass = await bcrypt.hash(newPassword, 10);

    admin_doc.password = newHashedPass;
    admin_doc.isPasswordReset = true;

    await admin_doc.save();
    req.session.user.isPasswordReset = true;

    return res.status(200).json({
      message: 'Password reset successfully!',
    });
  } else {
    return res.status(404).json({
      message: 'Admin not found!',
    });
  }
}

async function getResetPassPage(req, res) {
  console.log('reset password page received', publicPath);
  return res.sendFile(path.join(publicPath, 'resetPass.pack', 'resetPass.html'));
}

async function fetchAllUsers(req, res) {
  try {
    console.log(req.session);
    console.log(req.session.role);

    if (!req.session || req.session.role !== 'admin') {
      return res.status(401).json({ error: 'Not authenticated as admin' });
    }

    const users = await user.find().select('-password');

    return res.status(200).json({
      count: users.length,
      users: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      message: 'Server error fetching users',
    });
  }
}

async function fetchUserById(req, res) {
  try {
    if (!req.session || req.session.role !== 'admin') {
      return res.status(401).json({ error: 'Not authenticated as admin' });
    }

    const { userId } = req.params;

    const userDoc = await user.findById(userId);

    if (!userDoc) {
      return res.status(404).json({
        message: 'User not found in database!',
      });
    }

    return res.status(200).json({
      user: userDoc,
    });
  } catch (error) {
    console.log('error fetching user by ID: ', error);
    return res.status(500).json({
      message: 'Internal Server error in fetching user by ID!',
    });
  }
}

async function updateUser(req, res) {
  try {
    if (!req.session || req.session.role !== 'admin') {
      return res.status(401).json({ error: 'Not authenticated as admin' });
    }

    const { userId } = req.params;
    const { username, email, permissions } = req.body;

    const updatedUser = await user.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: username,
          email: email,
          permissions: permissions,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.log('error in updating User: ', error);
    return res.status(500).json({
      message: 'Internal server error in updating user!',
    });
  }
}

async function deleteUserById(req, res) {
  try {
    if (!req.session || req.session.role !== 'admin') {
      return res.status(401).json({
        error: 'Not authenticated as admin',
      });
    }

    const { userId } = req.params;

    const userExists = await user.findByIdAndDelete(userId);

    if (!userExists) {
      return res.status(404).json({
        message: 'User not found!',
      });
    }

    return res.status(200).json({
      message: 'User deleted successfully!',
    });
  } catch (error) {
    console.log('Error in deleting user by ID: ', error);
    return res.status(500).json({
      message: 'Internal server error in deleting user!',
    });
  }
}

module.exports = {
  resetPassword,
  fetchAllUsers,
  fetchUserById,
  updateUser,
  getResetPassPage,
  deleteUserById,
};
