// routes/no.js
import { Router } from "express";
import { getConnection } from "../db/oracle.js";

const router = Router();

router.post("/", async (req, res) => {
  const { rollNo, hostelId, mealId, reason } = req.body || {};
  console.log("NO hit body:", req.body);

  if (!rollNo || !hostelId || mealId === undefined || mealId === null) {
    return res.status(400).json({
      ok: false,
      error: "Missing fields. Required: rollNo, hostelId, mealId",
      got: req.body,
    });
  }

  const mealIdNum = Number(mealId);
  if (!Number.isFinite(mealIdNum)) {
    return res.status(400).json({ ok: false, error: "mealId must be a number" });
  }

  // ✅ Normalize roll/hostel to match DB regardless of user input case/whitespace
  const normRoll = String(rollNo).trim().toUpperCase();
  const normHostel = String(hostelId).trim().toUpperCase();

  let conn;
  try {
    conn = await getConnection();

    // ✅ Case-insensitive match using UPPER() on both sides
    const stu = await conn.execute(
      `SELECT id
         FROM Students
        WHERE UPPER(roll_no) = :roll
          AND UPPER(hostel_id) = :hostel`,
      { roll: normRoll, hostel: normHostel }
    );

    if (!stu.rows?.length) {
      return res.status(400).json({ ok: false, error: "Student not found" });
    }
    const studentId = stu.rows[0][0];

    const meal = await conn.execute(`SELECT id FROM Meals WHERE id = :m`, { m: mealIdNum });
    if (!meal.rows?.length) {
      return res.status(400).json({ ok: false, error: "Meal not found" });
    }

    try {
      await conn.execute(
        `INSERT INTO NoResponses (student_id, meal_id, created_at)
         VALUES (:sid, :mid, SYSTIMESTAMP)`,
        { sid: studentId, mid: mealIdNum },
        { autoCommit: true }
      );
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();
      if (!(msg.includes("unique") || msg.includes("ora-00001"))) {
        console.error("INSERT NoResponses failed:", e);
        return res.status(500).json({ ok: false, error: "DB error on insert" });
      }
      // Duplicate -> OK (idempotent)
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/no error:", e);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  } finally {
    if (conn) { try { await conn.close(); } catch {} }
  }
});

// Optional: staff view (unchanged)
router.get("/list", async (req, res) => {
  const mealIdNum = Number(req.query.mealId);
  if (!Number.isFinite(mealIdNum)) {
    return res.status(400).json({ ok: false, error: "mealId (number) is required" });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT s.id AS STUDENTID, s.name AS NAME, s.roll_no AS ROLL_NO,
              s.hostel_id AS HOSTEL_ID, nr.created_at AS CREATED_AT
         FROM NoResponses nr
         JOIN Students s ON s.id = nr.student_id
        WHERE nr.meal_id = :mid
        ORDER BY nr.created_at DESC`,
      { mid: mealIdNum }
    );

    const rows = result.rows || [];
    const cols = result.metaData?.map(c => c.name) || [];
    const data = rows.map(r => Object.fromEntries(r.map((v, i) => [cols[i], v])));

    return res.json({ ok: true, mealId: mealIdNum, count: data.length, data });
  } catch (e) {
    console.error("GET /api/no/list error:", e);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  } finally {
    if (conn) { try { await conn.close(); } catch {} }
  }
});
// --- add near the bottom, before `export default router;` ---

/**
 * GET /api/no/export?mealId=1
 * Streams a CSV attachment with NO students for the meal.
 */
router.get("/export", async (req, res) => {
  const mealIdNum = Number(req.query.mealId);
  if (!Number.isFinite(mealIdNum)) {
    return res.status(400).json({ ok: false, error: "mealId (number) is required" });
  }

  let conn;
  try {
    conn = await getConnection();

    // Fetch list
    const result = await conn.execute(
      `SELECT s.id        AS STUDENT_ID,
              s.name      AS NAME,
              s.roll_no   AS ROLL_NO,
              s.hostel_id AS HOSTEL_ID,
              nr.created_at AS CREATED_AT
         FROM NoResponses nr
         JOIN Students s ON s.id = nr.student_id
        WHERE nr.meal_id = :mid
        ORDER BY nr.created_at DESC`,
      { mid: mealIdNum }
    );

    const rows = result.rows || [];
    const headers = result.metaData?.map(c => c.name) || [];

    // Build CSV in-memory (safe for moderate sizes)
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [];
    lines.push(headers.join(","));              // header row
    for (const r of rows) {
      lines.push(r.map(esc).join(","));         // data rows
    }
    const csv = lines.join("\n");

    const fname = `no_list_meal_${mealIdNum}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.send(csv);
  } catch (e) {
    console.error("GET /api/no/export error:", e);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  } finally {
    if (conn) { try { await conn.close(); } catch {} }
  }
});

export default router;
