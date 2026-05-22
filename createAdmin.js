const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const user = await User.findOneAndUpdate(
      { email: "admin@gmail.com" },
      {
        password: hashedPassword,
        role: "admin",
      },
      { new: true }
    );

    if (!user) {
      console.log("Admin user not found");
      process.exit(1);
    }

    console.log("Admin password reset successfully");
    console.log("Email: admin@gmail.com");
    console.log("Password: admin123");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

resetAdminPassword();