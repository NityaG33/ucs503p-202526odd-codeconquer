import mongoose from "mongoose";

const MenuSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  breakfast: String,
  lunch: String,
  dinner: String,
});

export default mongoose.model("Menu", MenuSchema);



// import mongoose from "mongoose";

// const menuSchema = new mongoose.Schema(
//   {
//     date: {
//       type: Date,
//       required: true,
//       default: Date.now, // ✅ auto-stores current timestamp if not provided
//       unique: true,
//     },
//     breakfast: { type: String, required: true },
//     lunch: { type: String, required: true },
//     dinner: { type: String, required: true },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
//   },
//   { timestamps: true } // ✅ adds createdAt, updatedAt fields
// );

// const Menu = mongoose.model("Menu", menuSchema);
// export default Menu;
