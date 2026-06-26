const mongoose = require('mongoose');
const User = require('./src/models/User').default;
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telangana_properties');
    
    const userData = {
      name: 'Pranaykumar',
      email: 'testtest@gmail.com',
      phone: '7601033499',
      aadhaar: '660015190699',
      role: 'citizen',
      isActive: true,
      emailVerified: false,
      phoneVerified: false
    };

    const user = new User(userData);
    console.log("Before save");
    await user.save();
    console.log("Save successful!");
  } catch (error) {
    console.error("CAUGHT ERROR:", error.stack || error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
