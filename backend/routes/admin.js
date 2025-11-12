// routes/admin.js

import express from "express";
import Menu from "../models/menu.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js"; 

const router = express.Router();

/*
 * 1️⃣ Add or Update Today's Menu
 *    Admin can call this endpoint once a day (or multiple times to update)
 *    POST /admin/menu
 */

router.post("/update-menu", async (req, res) => {
  try {
    const { day, meals } = req.body;

    let existingMenu = await Menu.findOne({ day });

    if (existingMenu) {
      existingMenu.meals = meals;
      await existingMenu.save();
      return res.json({ message: "Menu updated successfully" });
    }

    const newMenu = new Menu({ day, meals });
    await newMenu.save();

    res.json({ message: "Menu created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch menu for the week (or all)
router.get("/menu", async (req, res) => {
  try {
    const menus = await Menu.find();
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: "Error fetching menu" });
  }
});

router.post("/menu", async (req, res) => {
  try {
    const { breakfast, lunch, dinner } = req.body;
    if (!breakfast || !lunch || !dinner)
      return res.status(400).json({ message: "All fields required" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingMenu = await Menu.findOne({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (existingMenu) {
      existingMenu.breakfast = breakfast;
      existingMenu.lunch = lunch;
      existingMenu.dinner = dinner;
      await existingMenu.save();
      return res.json({ message: "Menu updated successfully!" });
    } else {
      await Menu.create({ date: today, breakfast, lunch, dinner });
      return res.json({ message: "Menu saved successfully!" });
    }
  } catch (err) {
    console.error("Menu save error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




/*
 * 2️⃣ Get All Menus (for admin dashboard)
 *    GET /admin/menus
 */
router.get("/menus", async (req, res) => {
  try {
    const menus = await Menu.find().sort({ date: -1 });
    res.json(menus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
 * 3️⃣ Get or Update Meal Timings
 *    GET  /admin/timings   → fetch current timings
 *    POST /admin/timings   → update timings
 */

// Fetch timings
router.get("/timings", async (req, res) => {
  try {
    let timing = await MealTiming.findOne();
    if (!timing) {
      // create default timings if not found
      timing = await MealTiming.create({});
    }
    res.json(timing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update timings
router.post("/timings", async (req, res) => {
  try {
    // You can later connect to a Timings model if you want persistence
    console.log("Meal timings received:", req.body);
    res.json({ message: "Meal timings saved successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/meal-stats", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date required" });

    const selectedDate = new Date(date);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const menu = await Menu.findOne({ date: { $gte: start, $lt: end } });
    if (!menu)
      return res.json([]);

    const stats = [];
    const mealTypes = ["breakfast", "lunch", "dinner"];

    for (const mealType of mealTypes) {
      const yesCount = await Attendance.countDocuments({
        menu_id: menu._id,
        meal_type: mealType,
        response: "YES",
      });

      const noCount = await Attendance.countDocuments({
        menu_id: menu._id,
        meal_type: mealType,
        response: "NO",
      });

      stats.push({
        mealType,
        items: menu[mealType],
        yesCount,
        noCount,
        timing: "-", // you can later fetch from timings model
      });
    }

    res.json(stats);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
