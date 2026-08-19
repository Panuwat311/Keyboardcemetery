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

โปรเจกต์นี้ทำงานด้วย **2 containers** ที่เชื่อมต่อกันผ่าน
Docker Compose network:

| Container       | หน้าที่                                              | พอร์ต         |
|-----------------|-------------------------------------------------------|---------------|
| `keyboard-app`  | เว็บเซิร์ฟเวอร์ Node.js + Express สร้างจาก `Dockerfile` ของโปรเจกต์เอง | Host `8080` → Container `3000` |
| `keyboard-db`   | PostgreSQL official image สำหรับเก็บข้อมูลคีย์บอร์ด    | `5432` (ใช้งานภายในเท่านั้น) |

`keyboard-app` เชื่อมต่อไปยัง `keyboard-db` โดยใช้ **ชื่อ service** ของ
Compose คือ `db` เป็น hostname (ไม่ใช่ `localhost`) เนื่องจากทั้งสอง
container ทำงานแยกกันบน Compose network เดียวกัน

ข้อมูล PostgreSQL ถูกเก็บไว้ใน **named Docker volume** (`keyboard_data`)
ทำให้ข้อมูลยังคงอยู่แม้ container จะถูกสร้างใหม่

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
├── docker-compose.yml         # กำหนด service app + db, network, volume
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

Build และเริ่มการทำงานของทั้งสอง container (app + db) แบบ foreground:

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

ควรเห็นทั้ง `keyboard-app` และ `keyboard-db` อยู่ในสถานะ `Up`

## 8. ดู Logs

```bash
docker compose logs
```

สามารถใช้ `docker compose logs -f app` หรือ `docker compose logs -f db`
เพื่อดู log ของ service ใดตัวหนึ่งแบบต่อเนื่อง (follow)

## 9. Stop การทำงาน

```bash
docker compose down
```

คำสั่งนี้จะหยุดและลบ container พร้อมทั้ง network เริ่มต้น แต่
**จะไม่ลบ named volume** (`keyboard_data`) ดังนั้นข้อมูลคีย์บอร์ด
จะไม่หายไป

## 10. เข้าใช้งานแอปพลิเคชัน

เปิดเบราว์เซอร์ไปที่:

```text
http://localhost:8080
```

## 11. ขั้นตอนการสาธิต Docker (Demonstration Checklist)

1. Build image ด้วย `docker build --no-cache -t keyboard-cemetery-app .`
2. ตรวจสอบว่า image ถูกสร้างขึ้นจริง: `docker images`
3. รัน `docker compose up --build`
4. ตรวจสอบว่า app container ทำงานอยู่: `docker compose ps`
5. ตรวจสอบว่า PostgreSQL container ทำงานอยู่: `docker compose ps`
6. เปิดเบราว์เซอร์ที่ `http://localhost:8080`
7. เพิ่มคีย์บอร์ดใหม่ผ่านฟอร์ม "เพิ่มคีย์บอร์ด"
8. ตรวจสอบว่าคีย์บอร์ดใหม่ปรากฏในตารางรายการ
9. เปลี่ยนสถานะคีย์บอร์ดจาก `Working` เป็น `Broken`
10. สังเกตว่าตัวเลขใน Dashboard เปลี่ยนแปลงตามสถานะที่แก้ไข
11. ลบข้อมูลคีย์บอร์ดออกจากระบบ
12. แสดงผลลัพธ์ของ `docker compose ps` (ทั้งสอง container ทำงานปกติ)
13. แสดงผลลัพธ์ของ `docker compose logs`
14. อธิบายว่า `keyboard-app` เชื่อมต่อไปยัง `keyboard-db` โดยใช้ชื่อ
    service ของ Compose คือ `db` (ดูที่ `DB_HOST=db` ใน
    `docker-compose.yml` และการตั้งค่า `pg.Pool` ใน `app/server.js`)
    ซึ่งเป็นการสื่อสารระหว่าง container ต่อ container ไม่ใช่ `localhost`
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
จะลบ named volume พร้อมกับ container ทั้งหมด ซึ่งจะทำให้ข้อมูล
คีย์บอร์ดหายไปด้วย

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
- **Containerization:** Docker + Docker Compose
