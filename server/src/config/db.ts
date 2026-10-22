import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixmyroad';
  try {
    await mongoose.connect(uri);
    console.log(`[Database] Successfully connected to MongoDB at ${uri}`);
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
}
