# -----------------------------------------------------------------------
# Dockerfile สำหรับ keyboard-app (Node.js + Express)
# เขียนขึ้นเฉพาะสำหรับโปรเจกต์ Keyboard Cemetery
# -----------------------------------------------------------------------

# ใช้ Node.js Alpine base image ขนาดเล็ก เพื่อให้ image สุดท้ายมีขนาดเบา
FROM node:22-alpine

# กำหนด working directory ภายใน container
# คำสั่งถัดไปทั้งหมด (COPY, RUN, CMD) จะทำงานโดยอ้างอิงจาก path นี้
WORKDIR /app

# คัดลอกไฟล์ dependency manifest เข้ามาก่อน
# ทำให้ Docker สามารถ cache layer ของ "npm install" ไว้ได้
# และข้ามขั้นตอนนี้เมื่อ build ใหม่ในกรณีที่แก้ไขแค่ source code
COPY app/package.json app/package-lock.json ./

# ติดตั้งเฉพาะ production dependencies เท่านั้น (ไม่รวม devDependencies)
RUN npm install --omit=dev

# คัดลอก source code ของแอปพลิเคชันส่วนที่เหลือเข้าไปใน image
COPY app/ .

# ระบุ port ที่ Express server ใช้ภายใน container
# บรรทัดนี้เป็นเพียงข้อมูลอธิบาย (documentation) การ publish port จริง
# จะถูกกำหนดใน docker-compose.yml
EXPOSE 3000

# คำสั่งเริ่มต้นการทำงานของ Express server
CMD ["node", "server.js"]
