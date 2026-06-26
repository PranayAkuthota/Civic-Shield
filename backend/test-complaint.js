const mongoose = require('mongoose');
const Complaint = require('./src/models/Complaint').default;
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telangana_properties');
    const complaint = await Complaint.findById('6a3e5d995fc58cda9c37427d');
    console.log(complaint);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

test();
