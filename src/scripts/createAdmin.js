require('dotenv').config('../../.env');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const admin = require('../database/adminModel.js');

async function CreateAdmin() {
  try {
    await mongoose.connect(process.env.DB_URI);

    const existingAdmin = await admin.findOne({ name: 'admin' });

    if (existingAdmin) {
      console.log('admin already exists!');
      process.exit(0);
    }

    const defaultPassword = 'a';
    const hashedPass = await bcrypt.hash(defaultPassword, 10);
    const newAdmin = new admin({
      name: 'admin',
      password: hashedPass,
      email: 'admin@uiet.edu',
    });
    await newAdmin.save();

    console.log('Default admin created successfully!');
    console.log('Username:admin');
    console.log('Password:a');
    console.log('email:admin@uiet.edu');
    console.log('Please change password after login.');
  } catch (error) {
    console.log('Error creating Default admin: ', error);
    process.exit(0);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

CreateAdmin();
