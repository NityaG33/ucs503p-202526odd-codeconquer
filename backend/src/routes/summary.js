// backend/src/routes/summary.js
import { Router } from "express";
import { getConnection } from "../db/oracle.js";

const router = Router();

/**
 * GET /api/summary?mealId=1
 * Returns: { mealId, total, noCount, yesCount }
 */
router.get("/", async (req, res) => {
  try {
    const mealId = Number(req.query.mealId);
    if (!mealId) {
      return res.status(400).json({ ok: false, error: "mealId is required" });
    }

    const total = Number(process.env.TOTAL_STUDENTS || 900);
    const conn = await getConnection();

    // ✅ Count NO responses for that meal
    const result = await conn.execute(
      `SELECT COUNT(*) FROM NoResponses WHERE meal_id = :mealId`,
      { mealId }
    );
    const noCount = Number(result.rows[0][0]) || 0;

    await conn.close();

    const yesCount = total - noCount;

    console.log(`[SUMMARY] meal ${mealId} → NO=${noCount} YES=${yesCount}`);

    return res.json({
      ok: true,
      mealId,
      total,
      noCount,
      yesCount,
    });
  } catch (e) {
    console.error("GET /api/summary error:", e);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
