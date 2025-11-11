// routes/menu.js

import express from "express";
import Menu from "../models/menu.js";
import { getCurrentMeal } from "../utils/timeHelpers.js";

const router = express.Router();

router.get("/today", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const menu = await Menu.findOne({ date: today });
  const activeMeal = getCurrentMeal();

  if (!menu) {
    return res.status(404).json({ message: "Menu not found for today" });
  }

  res.json({
    menu,
    activeMeal, // e.g. "lunch"
  });
});

export default router;
