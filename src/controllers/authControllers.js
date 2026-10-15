const bcrypt = require('bcrypt');
const admin = require('../database/adminModel');
const user = require('../database/userModel');

async function login(req, res) {
  const { username, password, role } = req.body;

  // console.log('username: ', username);
  if (role == 'admin') {
    const adminExists = await admin.findOne({ name: username });

    if (!adminExists) {
      return res.status(404).json({
        message: 'Admin not found!',
      });
    }

    const passwordMatch = await bcrypt.compare(password, adminExists.password);

    if (!passwordMatch) {
      return res.status(400).json({
        message: 'incorrect credentials!',
      });
    }

    // 2. CREATE THE SESSION HERE
    req.session.role = 'admin';
    req.session.user = {
      id: adminExists._id,
      name: adminExists.name,
      email: adminExists.email,
      isPasswordReset: adminExists.isPasswordReset || false,
    };

    return res.status(200).json({
      message: 'Login successful',
      role: 'admin',
      isPasswordReset: adminExists.isPasswordReset,
    });
  } else if (role == 'user') {
    const userExists = await user.findOne({ name: username });

    if (!userExists) {
      return res.status(404).json({
        message: 'User not found! Please re-check credentials or ask admin to create user!',
      });
    }

    const passwordMatch = await bcrypt.compare(password, userExists.password);

    if (!passwordMatch) {
      return res.status(400).json({
        message: 'incorrect credentials!',
      });
    }

    req.session.role = 'user';
    req.session.user = {
      id: userExists._id,
      name: userExists.name,
      email: userExists.email,
      permissions: userExists.permissions,
    };

    return res.status(200).json({
      message: 'Login succesful!',
      role: 'user',
    });
  }
}

async function userSignup(req, res) {
  try {
    const { username, email, password } = req.body;

    const existingUser = await user.findOne({ name: username });

    if (existingUser) {
      return res.status(400).json({
        message: 'Username already registered, please login with your credentials.',
      });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = new user({
      name: username,
      email: email,
      password: hashedPass,
    });

    await newUser.save();

    return res.status(200).json({
      message: 'User registered successfully!',
    });
  } catch (error) {
    console.log('error in registering user: ', error);
    return res.status(500).json({
      message: 'internal server error in registering user!',
    });
  }
}

module.exports = { login, userSignup };
