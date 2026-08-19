// app.js - โค้ดฝั่ง Frontend (Vanilla JS) ของ Keyboard Cemetery
// เรียกใช้งาน Express API บน origin เดียวกัน (ใช้ relative path)

const API_BASE = "/api";

async function loadStats() {
  const res = await fetch(`${API_BASE}/stats`);
  const stats = await res.json();
  document.getElementById("stat-total").textContent = stats.total;
  document.getElementById("stat-working").textContent = stats.working;
  document.getElementById("stat-broken").textContent = stats.broken;
  document.getElementById("stat-repairing").textContent = stats.repairing;
}

async function loadKeyboards() {
  const res = await fetch(`${API_BASE}/keyboards`);
  const keyboards = await res.json();
  const tbody = document.getElementById("keyboard-tbody");
  tbody.innerHTML = "";

  keyboards.forEach((kb) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(kb.keyboard_code)}</td>
      <td>${escapeHtml(kb.lab_room)}</td>
      <td>${escapeHtml(kb.brand)} ${escapeHtml(kb.model)}</td>
      <td><span class="status-badge ${kb.status}">${kb.status}</span></td>
      <td>${kb.problem_description ? escapeHtml(kb.problem_description) : "-"}</td>
      <td class="row-actions">
        <select data-id="${kb.id}" class="status-select">
          <option value="Working" ${kb.status === "Working" ? "selected" : ""}>Working</option>
          <option value="Broken" ${kb.status === "Broken" ? "selected" : ""}>Broken</option>
          <option value="Repairing" ${kb.status === "Repairing" ? "selected" : ""}>Repairing</option>
        </select>
        <button class="delete-btn" data-id="${kb.id}">ลบ</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", onStatusChange);
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", onDelete);
  });
}

async function onStatusChange(e) {
  const id = e.target.dataset.id;
  const status = e.target.value;
  await fetch(`${API_BASE}/keyboards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  await refreshAll();
}

async function onDelete(e) {
  const id = e.target.dataset.id;
  if (!confirm("ยืนยันการลบรายการคีย์บอร์ดนี้หรือไม่?")) return;
  await fetch(`${API_BASE}/keyboards/${id}`, { method: "DELETE" });
  await refreshAll();
}

document.getElementById("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById("form-message");
  messageEl.textContent = "";
  messageEl.className = "message";

  const payload = {
    keyboard_code: document.getElementById("f-code").value.trim(),
    lab_room: document.getElementById("f-lab").value.trim(),
    brand: document.getElementById("f-brand").value.trim(),
    model: document.getElementById("f-model").value.trim(),
    status: document.getElementById("f-status").value,
    problem_description: document.getElementById("f-problem").value.trim() || null,
  };

  const res = await fetch(`${API_BASE}/keyboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    messageEl.textContent = "เพิ่มคีย์บอร์ดเรียบร้อยแล้ว";
    messageEl.className = "message success";
    e.target.reset();
    await refreshAll();
  } else {
    const err = await res.json();
    messageEl.textContent = err.error || "ไม่สามารถเพิ่มคีย์บอร์ดได้";
    messageEl.className = "message error";
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function refreshAll() {
  await Promise.all([loadStats(), loadKeyboards()]);
}

refreshAll();
