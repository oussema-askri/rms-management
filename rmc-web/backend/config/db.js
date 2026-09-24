const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set. Create backend/.env from .env.example.');
      process.exit(1);
    }

    // useNewUrlParser / useUnifiedTopology were removed in Mongoose 8 and only
    // produce deprecation warnings if passed.
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;