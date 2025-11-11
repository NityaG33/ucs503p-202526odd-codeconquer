import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  menu_id: mongoose.Schema.Types.ObjectId,
  meal_type: { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
  response: String,
  token: String,
  valid_until: Date,
});

export default mongoose.model("Attendance", AttendanceSchema);
