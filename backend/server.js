// backend/server.js (ESM)

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import cron from "node-cron";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import Menu from "./models/menu.js";
import Attendance from "./models/Attendance.js";

// Optional: admin/menu/user route modules (keep if you use them)
import adminRoutes from "./routes/admin.js";
import menuRoutes from "./routes/menu.js";
import userRoutes from "./routes/user.js";

dotenv.config();
await connectDB(); // connectDB should handle process.env.MONGO_URI and logging

const app = express();
app.use(cors());
app.use(express.json());

// ESM __dirname helper
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend (ensure public contains student.html & scriptStudent.js)
app.use(express.static(path.join(__dirname, "public")));

// Mount optional route files under /api/admin, /api/menu, /api/user if present
// (They should export express.Router())
if (adminRoutes) app.use("/api/admin", adminRoutes);
if (menuRoutes) app.use("/api/menuRouteFiles", menuRoutes); // avoid naming collision with /api/menu below
if (userRoutes) app.use("/api/userRouteFiles", userRoutes); // avoid collision

// ----------------------------
// Core API endpoints (frontend depends on these)
// ----------------------------

// Auth (login/register)
app.post("/api/auth", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      user = await User.create({ name: name?.trim() || "", email: email.toLowerCase().trim(), points: 0 });
    }
    return res.json({ user });
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Fetch user points
app.get("/api/points/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("points");
    return res.json({ points: user ? user.points : 0 });
  } catch (err) {
    console.error("Points error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Weekly menu (frontend expects /api/menu)
app.get("/api/menu", async (req, res) => {
  try {
    const menu = await Menu.find().sort({ date: 1 });

    // Convert stored UTC dates to explicit IST strings so frontend can find today's menu
    const adjusted = menu.map(m => {
      const utcDate = new Date(m.date);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(utcDate.getTime() + istOffset);
      return {
        _id: m._id,
        date: istDate.toISOString().replace("Z", "+05:30"),
        breakfast: m.breakfast,
        lunch: m.lunch,
        dinner: m.dinner,
      };
    });

    return res.json(adjusted);
  } catch (err) {
    console.error("Menu error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Attendance marking (handles NO and YES)
app.post("/api/attendance", async (req, res) => {
  try {
    const { user_id, menu_id, meal_type, response } = req.body;

    if (!user_id || !menu_id || !meal_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find existing attendance
    let existing = await Attendance.findOne({ user_id, menu_id, meal_type });

    // current IST
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    // cutoff definition (hours only)
    const cutoff = {
      breakfast: { hour: 6, minute: 0 },
      lunch: { hour: 11, minute: 0 },
      dinner: { hour: 17, minute: 0 }
    };

    // block re-marking NO if already NO
    if (existing && existing.response === "NO" && response === "NO") {
      return res.status(400).json({ error: "Already marked as NO for this meal" });
    }

    // If trying to mark NO after cutoff
    if (response === "NO") {
      if (!cutoff[meal_type]) {
        return res.status(400).json({ error: "Invalid meal_type" });
      }
      const cutoffHour = cutoff[meal_type].hour;
      if (nowIST.getHours() >= cutoffHour) {
        return res.status(400).json({
          error: `Cutoff time (${cutoffHour.toString().padStart(2, "0")}:00) passed for ${meal_type}. You can no longer skip this meal.`
        });
      }

      if (existing) {
        existing.response = "NO";
        existing.token = null;
        await existing.save();
      } else {
        await Attendance.create({
          user_id,
          menu_id,
          meal_type,
          response: "NO",
          token: null
        });
      }

      return res.json({ success: true, message: "Marked as NO (No QR generated)" });
    }

    // Default: mark YES and create token (this branch currently used if frontend calls without response or intends YES)
    const token = `${user_id}_${menu_id}_${meal_type}_${Date.now()}`;
    const validUntil = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getTime() + 2 * 60 * 60 * 1000;

    if (existing) {
      existing.response = "YES";
      existing.token = token;
      existing.valid_until = new Date(validUntil);
      await existing.save();
    } else {
      await Attendance.create({
        user_id,
        menu_id,
        meal_type,
        response: "YES",
        token,
        valid_until: new Date(validUntil)
      });
    }

    // Give points only on YES (15 points)
    await User.findByIdAndUpdate(user_id, { $inc: { points: 15 } });

    return res.json({ success: true, message: "Marked YES with QR token", token });
  } catch (err) {
    console.error("Attendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Generate QR image (data URL -> PNG buffer)
app.get("/api/qr/:token", async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).json({ error: "Missing token" });

    const dataUrl = await QRCode.toDataURL(token);
    const img = Buffer.from(dataUrl.split(",")[1], "base64");
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length
    });
    res.end(img);
  } catch (err) {
    console.error("QR error:", err);
    return res.status(500).json({ error: "QR generation failed" });
  }
});

// Active QR for a user (frontend polls this)
app.get("/api/activeQR/:userId", async (req, res) => {
  try {
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const active = await Attendance.findOne({
      user_id: req.params.userId,
      response: "YES",
      token: { $ne: null },
      valid_until: { $gte: nowIST }
    }).sort({ _id: -1 });

    if (!active) return res.json({ token: null });
    return res.json({ token: active.token });
  } catch (err) {
    console.error("Active QR error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ----------------------------
// Cron Jobs: auto-mark YES for unmarked users (if you rely on this)
// ----------------------------

async function autoMarkYes(mealType) {
  try {
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const istStart = new Date(nowIST);
    istStart.setHours(0, 0, 0, 0);
    const istEnd = new Date(nowIST);
    istEnd.setHours(23, 59, 59, 999);

    // convert IST day bounds back to UTC for storage queries
    const startUTC = new Date(istStart.getTime() - 5.5 * 60 * 60 * 1000);
    const endUTC = new Date(istEnd.getTime() - 5.5 * 60 * 60 * 1000);

    const todayMenu = await Menu.findOne({ date: { $gte: startUTC, $lte: endUTC } });
    if (!todayMenu) return console.log("⚠️ No menu for today");

    const users = await User.find();
    for (const user of users) {
      const existing = await Attendance.findOne({
        user_id: user._id,
        menu_id: todayMenu._id,
        meal_type: mealType
      });
      if (existing) continue;

      const token = `${user._id}_${todayMenu._id}_${mealType}_${Date.now()}`;
      await Attendance.create({
        user_id: user._id,
        menu_id: todayMenu._id,
        meal_type: mealType,
        response: "YES",
        token,
        valid_until: new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getTime() + 2 * 60 * 60 * 1000
      });

      await User.findByIdAndUpdate(user._id, { $inc: { points: 15 } });
    }

    console.log(`✅ Auto-marked YES for ${mealType}`);
  } catch (err) {
    console.error("autoMarkYes error:", err);
  }
}

// schedule cron jobs (IST)
cron.schedule("0 6 * * *", () => autoMarkYes("breakfast"), { timezone: "Asia/Kolkata" });
cron.schedule("0 11 * * *", () => autoMarkYes("lunch"), { timezone: "Asia/Kolkata" });
cron.schedule("0 17 * * *", () => autoMarkYes("dinner"), { timezone: "Asia/Kolkata" });

// optional: generateMealQRCodes job (if you want to refresh/generate tokens at serving time)
async function generateMealQRCodes(mealType) {
  try {
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const validUntil = new Date(nowIST.getTime() + 2 * 60 * 60 * 1000);

    // find most recent menu on or before now (using UTC stored dates)
    const todaysMenus = await Menu.find({ date: { $lte: nowIST } }).sort({ date: -1 }).limit(1);
    if (!todaysMenus.length) return console.log("⚠️ No menu for today");
    const todayMenu = todaysMenus[0];

    const yesRecords = await Attendance.find({
      menu_id: todayMenu._id,
      meal_type: mealType,
      response: "YES"
    });

    for (const att of yesRecords) {
      att.token = `${att.user_id}_${todayMenu._id}_${mealType}_${Date.now()}`;
      att.valid_until = validUntil;
      await att.save();
    }
    console.log(`✅ QRs generated for ${mealType} (${yesRecords.length})`);
  } catch (err) {
    console.error("generateMealQRCodes error:", err);
  }
}

// schedule QR generation at serving times (adjust times if needed)
cron.schedule("0 8 * * *", () => generateMealQRCodes("breakfast"), { timezone: "Asia/Kolkata" });
cron.schedule("0 13 * * *", () => generateMealQRCodes("lunch"), { timezone: "Asia/Kolkata" });
cron.schedule("0 19 * * *", () => generateMealQRCodes("dinner"), { timezone: "Asia/Kolkata" });

// ----------------------------
// Frontend routes
// ----------------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "student.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

// ----------------------------
// Start server
// ----------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
