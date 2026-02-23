import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s, 16s, 32s with exponential backoff

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set.');
      }

      // Log a sanitized version for debugging (hide password)
      const sanitized = uri.replace(/:([^@]+)@/, ':****@');
      console.log(`[${new Date().toISOString()}] Connecting to MongoDB: ${sanitized}`);

      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,  // 30s to find a server
        connectTimeoutMS: 30000,          // 30s socket connect timeout
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
