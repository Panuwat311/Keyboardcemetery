# แผนภาพระบบ (System Diagram) — Keyboard Cemetery

แผนภาพนี้แสดงความสัมพันธ์ระหว่าง container, พอร์ตเครือข่าย และ
persistent volume ในโปรเจกต์ Keyboard Cemetery

```mermaid
flowchart LR

    User["👤 ผู้ใช้ / เบราว์เซอร์"]
    Admin["🛠️ ผู้ดูแลระบบ / เบราว์เซอร์"]

    subgraph Docker["🐳 Docker Compose Network"]
        App["📦 keyboard-app container
        Node.js + Express
        Listen ที่พอร์ต :3000"]

        DB["🐘 keyboard-db container
        PostgreSQL
        Listen ที่พอร์ต :5432"]

        PgAdmin["🖥️ keyboard-pgadmin container
        pgAdmin 4
        Listen ที่พอร์ต :80"]

        Volume[("💾 keyboard_data
        Named Docker Volume")]

        PgAdminVolume[("💾 pgadmin_data
        Named Docker Volume")]
    end

    User -->|"HTTP request\nlocalhost:8080"| App
    App -->|"SQL query\nhost: db, port: 5432"| DB
    DB -->|"อ่าน/เขียนข้อมูล"| Volume

    Admin -->|"HTTP request\nlocalhost:5050"| PgAdmin
    PgAdmin -->|"SQL query\nhost: db, port: 5432"| DB
    PgAdmin -->|"อ่าน/เขียนการตั้งค่า"| PgAdminVolume

    style User fill:#1b1d21,stroke:#6c7ae0,color:#fff
    style Admin fill:#1b1d21,stroke:#6c7ae0,color:#fff
    style App fill:#1b1d21,stroke:#4caf50,color:#fff
    style DB fill:#1b1d21,stroke:#e0a856,color:#fff
    style PgAdmin fill:#1b1d21,stroke:#d675c9,color:#fff
    style Volume fill:#1b1d21,stroke:#9a9a9a,color:#fff
    style PgAdminVolume fill:#1b1d21,stroke:#9a9a9a,color:#fff
```

## คำอธิบาย

- **ผู้ใช้ / เบราว์เซอร์** ส่ง HTTP request ไปที่ `http://localhost:8080`
  ซึ่ง Docker จะแมปพอร์ตนี้ไปยังพอร์ต `3000` ภายใน container `keyboard-app`
- **keyboard-app** (Node.js + Express) ทำหน้าที่ให้บริการหน้าเว็บ
  (HTML/CSS/JS) และเปิด REST API (`/api/keyboards`, `/api/stats`, ...)
- **keyboard-app** เชื่อมต่อไปยัง **keyboard-db** โดยใช้ชื่อ service
  ของ Docker Compose คือ `db` ผ่านพอร์ต `5432` ซึ่งเป็นการสื่อสารระหว่าง
  container ต่อ container โดยตรง ไม่ผ่าน `localhost`
- **keyboard-db** (PostgreSQL) เก็บข้อมูลคีย์บอร์ดทั้งหมดไว้ในตาราง
  `keyboards`
- **keyboard_data** คือ named Docker volume ที่ mount ไว้ที่
  `/var/lib/postgresql/data` ภายใน container `keyboard-db`
  ซึ่งเป็นสิ่งที่ทำให้ข้อมูลยังคงอยู่แม้จะรัน `docker compose down`
  (ลบ container) ตราบใดที่ไม่ใช้ flag `-v`
- **ผู้ดูแลระบบ** ส่ง HTTP request ไปที่ `http://localhost:5050` ซึ่ง Docker
  จะแมปพอร์ตนี้ไปยังพอร์ต `80` ภายใน container `keyboard-pgadmin` (container
  ที่ 3 ของโปรเจกต์)
- **keyboard-pgadmin** (pgAdmin 4) เป็นเว็บ UI สำหรับดูและจัดการฐานข้อมูล
  โดยเชื่อมต่อไปยัง **keyboard-db** ด้วยชื่อ service `db` เช่นเดียวกับ
  ที่ keyboard-app ใช้ — แสดงให้เห็นว่า container หลายตัวเชื่อมต่อไปยัง
  database container เดียวกันได้พร้อมกันผ่าน network ภายในของ Compose
- **pgadmin_data** คือ named Docker volume ที่เก็บการตั้งค่า/การเชื่อมต่อ
  ที่บันทึกไว้ใน pgAdmin ให้อยู่ถาวรเช่นเดียวกับ `keyboard_data`
