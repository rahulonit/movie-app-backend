import mongoose from "mongoose";

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  cached.conn = await mongoose.connect(process.env.MONGO_URI!);
  return cached.conn;
}
