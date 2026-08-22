# ⌨️ Keyboard Cemetery

**ระบบติดตามอุปกรณ์ห้อง Computer Lab** — เว็บแอปพลิเคชันขนาดเล็กที่จัดทำขึ้น
สำหรับงานวิชา Docker เพื่อบันทึกและติดตามสถานะคีย์บอร์ดในห้อง Computer Lab

## 1. ภาพรวมโปรเจกต์ (Project Overview)

Keyboard Cemetery ช่วยให้เจ้าหน้าที่ดูแลห้องแล็บสามารถ:

- ดู Dashboard สรุปจำนวนคีย์บอร์ดแยกตามสถานะ Total / Working / Broken / Repairing
- แสดงรายการคีย์บอร์ดทั้งหมดพร้อมตำแหน่งและรายละเอียดปัญหา
- เพิ่มข้อมูลคีย์บอร์ดใหม่
- แก้ไขสถานะของคีย์บอร์ด (Working / Broken / Repairing)
- ลบข้อมูลคีย์บอร์ด

ระบบนี้ไม่มีระบบ Login เพราะตั้งใจออกแบบให้เรียบง่าย และเน้นการสาธิต
แนวคิดของ Docker เป็นหลัก ไม่ใช่ระบบยืนยันตัวตน

## 2. สถาปัตยกรรมระบบ (Architecture)

โปรเจกต์นี้ทำงานด้วย **3 containers** ที่เชื่อมต่อกันผ่าน
Docker Compose network:

| Container         | หน้าที่                                              | พอร์ต         |
|--------------------|-------------------------------------------------------|---------------|
| `keyboard-app`     | เว็บเซิร์ฟเวอร์ Node.js + Express สร้างจาก `Dockerfile` ของโปรเจกต์เอง | Host `8080` → Container `3000` |
| `keyboard-db`      | PostgreSQL official image สำหรับเก็บข้อมูลคีย์บอร์ด    | `5432` (ใช้งานภายในเท่านั้น) |
| `keyboard-pgadmin` | pgAdmin official image — เว็บ UI สำหรับดู/จัดการฐานข้อมูล PostgreSQL | Host `5050` → Container `80` |

`keyboard-app` และ `keyboard-pgadmin` เชื่อมต่อไปยัง `keyboard-db` โดยใช้
**ชื่อ service** ของ Compose คือ `db` เป็น hostname (ไม่ใช่ `localhost`)
เนื่องจากทุก container ทำงานแยกกันบน Compose network เดียวกัน

ข้อมูล PostgreSQL ถูกเก็บไว้ใน **named Docker volume** (`keyboard_data`)
และการตั้งค่า/การเชื่อมต่อของ pgAdmin ถูกเก็บไว้ใน volume แยก
(`pgadmin_data`) ทำให้ข้อมูลทั้งสองส่วนยังคงอยู่แม้ container จะถูกสร้างใหม่

ดูแผนภาพสถาปัตยกรรมแบบ Mermaid ได้ที่ [`system-diagram.md`](./system-diagram.md)

## 3. โครงสร้างโปรเจกต์ (Project Structure)

```text
keyboard-cemetery/
│
├── app/
│   ├── package.json          # Dependencies ของ Node.js (express, pg)
│   ├── package-lock.json
│   ├── server.js             # Express server + REST API + การเชื่อมต่อฐานข้อมูล
│   │
│   └── public/                # Frontend แบบ static (ให้บริการโดย Express)
│       ├── index.html
│       ├── style.css
│       └── app.js
│
├── Dockerfile                 # ใช้ build image ของ keyboard-app
├── docker-compose.yml         # กำหนด service app + db + pgadmin, network, volume
├── .dockerignore
├── system-diagram.md          # แผนภาพสถาปัตยกรรมแบบ Mermaid
└── README.md
```

## 4. Build Docker Image

Build image ของแอปพลิเคชันจาก `Dockerfile` ของโปรเจกต์เอง:

```bash
docker build --no-cache -t keyboard-cemetery-app .
```

`--no-cache` บังคับให้ Docker สร้างทุก layer ใหม่ทั้งหมดโดยไม่ใช้ cache
เดิม ซึ่งมีประโยชน์ในการยืนยันว่า Dockerfile ทำงานได้ถูกต้องตั้งแต่
สภาวะเริ่มต้น (สำคัญมากสำหรับการตรวจงานหรือสาธิต)

## 5. Run ด้วย Docker Compose

Build และเริ่มการทำงานของทั้งสาม container (app + db + pgadmin) แบบ foreground:

```bash
docker compose up --build
```

## 6. Run แบบ Background

```bash
docker compose up -d --build
```

## 7. ตรวจสอบสถานะ Container

```bash
docker compose ps
```

ควรเห็นทั้ง `keyboard-app`, `keyboard-db` และ `keyboard-pgadmin`
อยู่ในสถานะ `Up`

## 8. ดู Logs

```bash
docker compose logs
```

สามารถใช้ `docker compose logs -f app`, `docker compose logs -f db`
หรือ `docker compose logs -f pgadmin` เพื่อดู log ของ service ใดตัวหนึ่ง
แบบต่อเนื่อง (follow)

## 9. Stop การทำงาน

```bash
docker compose down
```

คำสั่งนี้จะหยุดและลบ container พร้อมทั้ง network เริ่มต้น แต่
**จะไม่ลบ named volume** (`keyboard_data`, `pgadmin_data`) ดังนั้น
ข้อมูลคีย์บอร์ดและการตั้งค่า pgAdmin จะไม่หายไป

## 10. เข้าใช้งานแอปพลิเคชัน

เปิดเบราว์เซอร์ไปที่:

```text
http://localhost:8080
```

### เข้าใช้งาน pgAdmin (จัดการฐานข้อมูล)

```text
http://localhost:5050
```

Login ด้วย:
- **Email:** `admin@keyboardcemetery.com`
- **Password:** `admin1234`

หลัง login แล้ว เพิ่ม server ใหม่ใน pgAdmin โดยตั้งค่าดังนี้ (คลิกขวา
ที่ "Servers" → "Register" → "Server..."):
- **Host name/address:** `db` (ชื่อ service ของ Compose ไม่ใช่ `localhost`)
- **Port:** `5432`
- **Username:** `keyboard_admin`
- **Password:** `keyboard_pass`

## 11. ขั้นตอนการสาธิต Docker (Demonstration Checklist)

1. Build image ด้วย `docker build --no-cache -t keyboard-cemetery-app .`
2. ตรวจสอบว่า image ถูกสร้างขึ้นจริง: `docker images`
3. รัน `docker compose up --build`
4. ตรวจสอบว่าทั้งสาม container ทำงานอยู่: `docker compose ps`
5. เปิดเบราว์เซอร์ที่ `http://localhost:8080`
6. เพิ่มคีย์บอร์ดใหม่ผ่านฟอร์ม "เพิ่มคีย์บอร์ด"
7. ตรวจสอบว่าคีย์บอร์ดใหม่ปรากฏในตารางรายการ
8. เปลี่ยนสถานะคีย์บอร์ดจาก `Working` เป็น `Broken`
9. สังเกตว่าตัวเลขใน Dashboard เปลี่ยนแปลงตามสถานะที่แก้ไข
10. ลบข้อมูลคีย์บอร์ดออกจากระบบ
11. เปิดเบราว์เซอร์ที่ `http://localhost:5050` login เข้า pgAdmin แล้ว
    connect ไปยัง server `db` เพื่อแสดงข้อมูลในตาราง `keyboards` โดยตรง
    ผ่าน SQL — ใช้พิสูจน์ว่า container ที่ 3 (pgAdmin) เชื่อมต่อไปยัง
    container db ตัวเดียวกับที่ app ใช้งานอยู่จริง
12. แสดงผลลัพธ์ของ `docker compose ps` (ทั้งสาม container ทำงานปกติ)
13. แสดงผลลัพธ์ของ `docker compose logs`
14. อธิบายว่า `keyboard-app` และ `keyboard-pgadmin` เชื่อมต่อไปยัง
    `keyboard-db` โดยใช้ชื่อ service ของ Compose คือ `db` (ดูที่
    `DB_HOST=db` ใน `docker-compose.yml` และการตั้งค่า `pg.Pool` ใน
    `app/server.js`) ซึ่งเป็นการสื่อสารระหว่าง container ต่อ container
    ไม่ใช่ `localhost`
15. ทดสอบการคงอยู่ของข้อมูล (Persistence Test) ตามขั้นตอนด้านล่าง

## 12. การทดสอบ Persistence (Docker Volume)

เพื่อพิสูจน์ว่าข้อมูล PostgreSQL ยังคงอยู่แม้ container จะถูกลบ
เนื่องจากใช้ named volume:

```bash
docker compose down
docker compose up -d
```

โหลดหน้าเว็บ `http://localhost:8080` ใหม่อีกครั้ง จะเห็นว่าข้อมูล
คีย์บอร์ดที่เพิ่ม/แก้ไขไว้ก่อนหน้ายังคงอยู่ครบถ้วน เพราะข้อมูลถูกเก็บไว้
ใน named volume `keyboard_data` ไม่ได้อยู่ใน writable layer ของ
container `keyboard-db`

**ห้ามใช้** `docker compose down -v` ในการทดสอบนี้ เพราะ flag `-v`
จะลบ named volume (`keyboard_data` และ `pgadmin_data`) พร้อมกับ
container ทั้งหมด ซึ่งจะทำให้ข้อมูลคีย์บอร์ดและการตั้งค่า pgAdmin
หายไปด้วย

## 13. REST API Reference

| Method | Endpoint              | คำอธิบาย                          |
|--------|------------------------|-------------------------------------|
| GET    | `/api/keyboards`       | แสดงรายการคีย์บอร์ดทั้งหมด           |
| GET    | `/api/keyboards/:id`   | แสดงข้อมูลคีย์บอร์ดตัวเดียว          |
| POST   | `/api/keyboards`       | เพิ่มคีย์บอร์ดใหม่                   |
| PUT    | `/api/keyboards/:id`   | แก้ไขสถานะ/รายละเอียดของคีย์บอร์ด    |
| DELETE | `/api/keyboards/:id`   | ลบข้อมูลคีย์บอร์ด                    |
| GET    | `/api/stats`           | ข้อมูลสถิติสำหรับ Dashboard          |

ตัวอย่างผลลัพธ์ของ `GET /api/stats`:

```json
{
  "total": 30,
  "working": 22,
  "broken": 5,
  "repairing": 3
}
```

## 14. Technology Stack

- **Backend:** Node.js + Express
- **Frontend:** HTML + CSS + Vanilla JavaScript (ไม่ใช้ framework)
- **Database:** PostgreSQL (official Alpine image)
- **DB Admin UI:** pgAdmin 4 (official image)
- **Containerization:** Docker + Docker Compose (3 containers: app, db, pgadmin)
