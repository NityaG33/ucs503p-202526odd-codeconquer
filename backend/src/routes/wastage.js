import express from "express";
import { getConnection } from "../db/oracle.js";
import ExcelJS from "exceljs";

const router = express.Router();

router.post("/", async (req, res) => {
  const { mealId, totalCookedKg = 0, usedKg, leftoverKg, notedByUser, breakdown = [] } = req.body;
  if (!mealId || usedKg == null || leftoverKg == null || !notedByUser)
    return res.status(400).json({ error: "mealId, usedKg, leftoverKg, notedByUser required" });

  let conn;
  try {
    conn = await getConnection();
    await conn.execute("BEGIN");

    const ins = await conn.execute(
      `INSERT INTO WastageLog (meal_id, totalCookedKg, usedKg, leftoverKg, notedByUser)
       VALUES (:mid, :t, :u, :l, :uid)
       RETURNING id INTO :outId`,
      { mid: mealId, t: totalCookedKg, u: usedKg, l: leftoverKg, uid: notedByUser, outId: { dir: 3003, type: 2002 } }
    );
    const wastageId = ins.outBinds.outId[0];

    for (const row of breakdown) {
      if (!row?.categoryId || row?.kg == null) continue;
      await conn.execute(
        `INSERT INTO WastageBreakdown (wastage_id, category_id, kg)
         VALUES (:wid, :cid, :kg)`,
        { wid: wastageId, cid: row.categoryId, kg: row.kg }
      );
    }

    await conn.execute("COMMIT");
    res.json({ ok: true, wastageId });
  } catch (e) {
    if (conn) try { await conn.execute("ROLLBACK"); } catch {}
    console.error("wastage create:", e);
    res.status(500).json({ ok: false, error: "Failed to save wastage" });
  } finally {
    if (conn) await conn.close();
  }
});

router.get("/series", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from & to (YYYY-MM-DD) required" });

  let conn;
  try {
    conn = await getConnection();
    const r = await conn.execute(
      `SELECT w.id, w.meal_id, w.totalCookedKg, w.usedKg, w.leftoverKg, w.created_at,
              m.starts_at, m.meal_type
         FROM WastageLog w
         JOIN Meals m ON m.id = w.meal_id
        WHERE w.created_at >= TO_DATE(:f,'YYYY-MM-DD')
          AND w.created_at <  TO_DATE(:t,'YYYY-MM-DD') + 1
        ORDER BY w.created_at`,
      { f: from, t: to }
    );
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    console.error("wastage series:", e);
    res.status(500).json({ ok: false, error: "Failed to fetch series" });
  } finally { if (conn) await conn.close(); }
});

// KEEP the imports at top as-is
// import express from "express";
// import { getConnection } from "../db/oracle.js";
// import ExcelJS from "exceljs";

// ... keep other routes unchanged ...

router.get("/pie", async (req, res) => {
  const mealId = Number(req.query.mealId);
  if (!mealId) return res.status(400).json({ error: "mealId required" });

  let conn;
  try {
    conn = await getConnection();
    const r = await conn.execute(
      `SELECT c.id AS categoryId, c.name, NVL(SUM(b.kg),0) AS kg
         FROM WastageCategory c
         LEFT JOIN WastageBreakdown b ON b.category_id = c.id
         LEFT JOIN WastageLog w ON w.id = b.wastage_id
        WHERE w.meal_id = :mid OR w.meal_id IS NULL
        GROUP BY c.id, c.name
        ORDER BY c.name`,
      { mid: mealId }
    );

    // 🔧 Convert array rows to objects with column names
    const cols = r.metaData?.map(c => c.name) || [];
    const data = (r.rows || []).map(row =>
      Object.fromEntries(row.map((v, i) => [cols[i], v]))
    );

    // Example shape now: [{ CATEGORYID: 3, NAME: "Bread Crumbs", KG: 0 }, ...]
    return res.json({ ok: true, data });
  } catch (e) {
    console.error("pie:", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch pie" });
  } finally {
    if (conn) await conn.close();
  }
});


router.get("/export", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from & to required" });

  let conn;
  try {
    conn = await getConnection();

    const logs = await conn.execute(
      `SELECT w.id, w.meal_id, w.totalCookedKg, w.usedKg, w.leftoverKg, w.created_at,
              m.meal_type, m.starts_at
         FROM WastageLog w
         JOIN Meals m ON m.id = w.meal_id
        WHERE w.created_at >= TO_DATE(:f,'YYYY-MM-DD')
          AND w.created_at <  TO_DATE(:t,'YYYY-MM-DD') + 1
        ORDER BY w.created_at`,
      { f: from, t: to }
    );

    const cats = await conn.execute(`SELECT id, name FROM WastageCategory ORDER BY name`);

    const bks = await conn.execute(
      `SELECT b.wastage_id, c.name AS cat, b.kg
         FROM WastageBreakdown b
         JOIN WastageCategory c ON c.id = b.category_id
        WHERE b.wastage_id IN (
              SELECT w.id FROM WastageLog w
               WHERE w.created_at >= TO_DATE(:f,'YYYY-MM-DD')
                 AND w.created_at <  TO_DATE(:t,'YYYY-MM-DD') + 1
             )`,
      { f: from, t: to }
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Wastage");
    const catCols = cats.rows.map(c => ({ header: c.NAME, key: `cat_${c.ID}`, width: 16 }));

    ws.columns = [
      { header: "Log ID", key: "id", width: 8 },
      { header: "Meal ID", key: "mealId", width: 8 },
      { header: "Meal Type", key: "mealType", width: 12 },
      { header: "Starts At", key: "startsAt", width: 22 },
      { header: "Total Cooked (Kg)", key: "total", width: 16 },
      { header: "Used (Kg)", key: "used", width: 12 },
      { header: "Leftover (Kg)", key: "left", width: 16 },
      { header: "Created At", key: "created", width: 22 },
      ...catCols
    ];

    const byLog = {};
    for (const row of bks.rows) {
      const wid = row.WASTAGE_ID;
      byLog[wid] ??= {};
      byLog[wid][row.CAT] = Number(row.KG);
    }

    for (const l of logs.rows) {
      const data = {
        id: l.ID,
        mealId: l.MEAL_ID,
        mealType: l.MEAL_TYPE,
        startsAt: new Date(l.STARTS_AT).toISOString(),
        total: Number(l.TOTALCOOKEDKG || 0),
        used: Number(l.USEDKG),
        left: Number(l.LEFTOVERKG),
        created: new Date(l.CREATED_AT).toISOString()
      };
      const catMap = byLog[l.ID] || {};
      for (const c of cats.rows) data[`cat_${c.ID}`] = Number(catMap[c.NAME] || 0);
      ws.addRow(data);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="wastage_${from}_to_${to}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("export:", e);
    res.status(500).json({ ok: false, error: "Export failed" });
  } finally { if (conn) await conn.close(); }
});

export default router;
