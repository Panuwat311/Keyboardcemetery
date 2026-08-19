// server.js
// Keyboard Cemetery - ฝั่ง Backend (Express)
// เชื่อมต่อไปยัง PostgreSQL ที่ทำงานอยู่คนละ container (ใช้ชื่อ service "db")

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.APP_PORT || 3000;

// -----------------------------------------------------------------------
// การเชื่อมต่อฐานข้อมูล
// อ่านค่า configuration จาก environment variables ที่กำหนดไว้ใน docker-compose.yml
// ค่า host ต้องเป็นชื่อ service ของ Docker Compose ("db") เท่านั้น ห้ามใช้ "localhost"
// เพราะ app และ database ทำงานอยู่คนละ container กัน
// -----------------------------------------------------------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const VALID_STATUSES = ["Working", "Broken", "Repairing"];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------------------------------------------------
// ตรวจสอบว่ามีตาราง "keyboards" แล้วหรือยัง ถ้ายังไม่มีให้สร้างขึ้นมา
// พร้อมกับสร้างข้อมูลตัวอย่างจำนวนเล็กน้อย เพื่อให้พร้อม Demo ได้ทันที
// หลังจากเริ่มระบบครั้งแรก
// -----------------------------------------------------------------------
async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS keyboards (
      id SERIAL PRIMARY KEY,
      keyboard_code VARCHAR(20) UNIQUE NOT NULL,
      lab_room VARCHAR(50) NOT NULL,
      brand VARCHAR(50) NOT NULL,
      model VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Working',
      problem_description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM keyboards");
  if (rows[0].count === 0) {
    await pool.query(`
      INSERT INTO keyboards (keyboard_code, lab_room, brand, model, status, problem_description)
      VALUES
        ('KB-001', 'LAB-301', 'Logitech', 'K120', 'Working', NULL),
        ('KB-002', 'LAB-301', 'Dell', 'KB216', 'Broken', 'Spacebar not working'),
        ('KB-003', 'LAB-302', 'HP', 'K150', 'Repairing', 'USB cable damaged')
    `);
    console.log("สร้างข้อมูลตัวอย่างคีย์บอร์ดเรียบร้อยแล้ว");
  }
}

// -----------------------------------------------------------------------
// REST API
// -----------------------------------------------------------------------

// GET /api/stats - จำนวนคีย์บอร์ดแยกตามสถานะสำหรับ Dashboard
app.get("/api/stats", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Working')::int AS working,
        COUNT(*) FILTER (WHERE status = 'Broken')::int AS broken,
        COUNT(*) FILTER (WHERE status = 'Repairing')::int AS repairing
      FROM keyboards
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลสถิติได้" });
  }
});

// GET /api/keyboards - แสดงรายการคีย์บอร์ดทั้งหมด
app.get("/api/keyboards", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM keyboards ORDER BY keyboard_code ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการคีย์บอร์ดได้" });
  }
});

// GET /api/keyboards/:id - แสดงข้อมูลคีย์บอร์ดตัวเดียว
app.get("/api/keyboards/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM keyboards WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบคีย์บอร์ดนี้" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลคีย์บอร์ดได้" });
  }
});

// POST /api/keyboards - เพิ่มคีย์บอร์ดใหม่
app.post("/api/keyboards", async (req, res) => {
  const { keyboard_code, lab_room, brand, model, status, problem_description } = req.body;

  if (!keyboard_code || !lab_room || !brand || !model) {
    return res.status(400).json({ error: "กรุณากรอก keyboard_code, lab_room, brand และ model ให้ครบ" });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO keyboards (keyboard_code, lab_room, brand, model, status, problem_description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [keyboard_code, lab_room, brand, model, status || "Working", problem_description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "keyboard_code นี้มีอยู่ในระบบแล้ว" });
    }
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถเพิ่มคีย์บอร์ดได้" });
  }
});

// PUT /api/keyboards/:id - แก้ไขสถานะ / รายละเอียดปัญหาของคีย์บอร์ด
app.put("/api/keyboards/:id", async (req, res) => {
  const { status, problem_description, lab_room, brand, model } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE keyboards
       SET status = COALESCE($1, status),
           problem_description = COALESCE($2, problem_description),
           lab_room = COALESCE($3, lab_room),
           brand = COALESCE($4, brand),
           model = COALESCE($5, model),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [status, problem_description, lab_room, brand, model, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบคีย์บอร์ดนี้" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถแก้ไขข้อมูลคีย์บอร์ดได้" });
  }
});

// DELETE /api/keyboards/:id - ลบข้อมูลคีย์บอร์ด
app.delete("/api/keyboards/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM keyboards WHERE id = $1",
      [req.params.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "ไม่พบคีย์บอร์ดนี้" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถลบคีย์บอร์ดได้" });
  }
});

// -----------------------------------------------------------------------
// Startup: พยายามเชื่อมต่อฐานข้อมูลซ้ำหลายครั้ง เนื่องจาก container ของ
// Postgres อาจยังเริ่มต้นไม่เสร็จในขณะที่ container ของ app เริ่มทำงาน
// -----------------------------------------------------------------------
async function start() {
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await initDatabase();
      break;
    } catch (err) {
      console.log(`ฐานข้อมูลยังไม่พร้อม (ครั้งที่ ${attempt}/${maxRetries}): ${err.message}`);
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log(`Keyboard Cemetery app กำลังทำงานที่พอร์ต ${PORT}`);
  });
}

start();
