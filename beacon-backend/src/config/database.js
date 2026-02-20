import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 uses the new URL parser and unified topology by default
    });

    console.log(`[${new Date().toISOString()}] MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] MongoDB connection error:`, err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[${new Date().toISOString()}] MongoDB disconnected. Attempting reconnect...`);
    });

    return conn;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] MongoDB connection failed:`, error.message);
    process.exit(1);
  }
};

export default connectDB;
