import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  points: { type: Number, default: 0 }
});

export default mongoose.model("User", UserSchema);





// import mongoose from "mongoose";

// const mealResponseSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//   },
//   date: {
//     type: Date,
//     required: true,
//   },
//   breakfast: {
//     type: String,
//     enum: ["YES", "NO"],
//     default: "YES",
//   },
//   lunch: {
//     type: String,
//     enum: ["YES", "NO"],
//     default: "YES",
//   },
//   dinner: {
//     type: String,
//     enum: ["YES", "NO"],
//     default: "YES",
//   },
// });

// const userSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },

//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },

//   password: {
//     type: String,
//     required: true,
//   },

//   meals: [mealResponseSchema],

//   points: {
//     type: Number,
//     default: 0,
//   },
// });

// userSchema.methods.calculatePoints = function () {
//   let total = 0;
//   this.meals.forEach((meal) => {
//     if (meal.breakfast === "NO") total += 15;
//     if (meal.lunch === "NO") total += 15;
//     if (meal.dinner === "NO") total += 15;
//   });
//   this.points = total;
//   return this.points;
// };

// const User = mongoose.model("User", userSchema);

// export default User;
