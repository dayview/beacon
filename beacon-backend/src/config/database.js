import mongoose from 'mongoose';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s with exponential backoff

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        // Mongoose 8 uses the new URL parser and unified topology by default
      });

      console.log(`[${new Date().toISOString()}] MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] MongoDB connection error:`, err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn(`[${new Date().toISOString()}] MongoDB disconnected. Mongoose will auto-reconnect.`);
      });

      return conn;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`,
        error.message
      );

      if (attempt === MAX_RETRIES) {
        console.error(`[${new Date().toISOString()}] All ${MAX_RETRIES} connection attempts exhausted. Exiting.`);
        process.exit(1);
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[${new Date().toISOString()}] Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
