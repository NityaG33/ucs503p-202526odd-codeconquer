// routes/user.js

import express from "express";
import User from "../models/User.js";
import { getCurrentMeal } from "../utils/timeHelpers.js";

const router = express.Router();

router.post("/mark-meal", async (req, res) => {
  const userId = req.body.userId;
  const mealChoice = "NO"; // user is marking NO for current meal
  const mealType = getCurrentMeal();

  if (!mealType) {
    return res.status(400).json({ message: "Meal selection not available right now" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const user = await User.findById(userId);

  if (!user) return res.status(404).json({ message: "User not found" });

  // Find or create today's record
  let todayMeal = user.meals.find((m) => m.date.getTime() === today.getTime());
  if (!todayMeal) {
    todayMeal = { date: today };
    user.meals.push(todayMeal);
  }

  todayMeal[mealType] = mealChoice;

  // Update points
  user.calculatePoints();
  await user.save();

  res.json({ message: `Marked NO for ${mealType}`, points: user.points });
});

export default router;
