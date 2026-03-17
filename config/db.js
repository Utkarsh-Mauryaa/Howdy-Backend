import mongoose from "mongoose";


export const connectDB = async () => {
try {
    const conn =  await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected to: ${conn.connection.host}`)
} catch (e) {
    console.log(`Cannot can't to database because of this error: ${e.message}`);
    process.exit(1);
}
}
