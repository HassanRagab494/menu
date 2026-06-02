/* ============================================================
   app.js  —  Firebase Firestore + shared logic
   ============================================================ */

import { initializeApp }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs,
         addDoc, deleteDoc, doc, setDoc,
         onSnapshot }                           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Firebase config ── */
const firebaseConfig = {
  apiKey:            "AIzaSyBiypWAyKNuD-ND2D6RmeHp_UUV0VTbxRM",
  authDomain:        "test-avc-6b9c5.firebaseapp.com",
  projectId:         "test-avc-6b9c5",
  storageBucket:     "test-avc-6b9c5.firebasestorage.app",
  messagingSenderId: "790981327074",
  appId:             "1:790981327074:web:e7e7a9fccd6b7fc34fc6bb",
};

const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);

/* ── collections ── */
const ITEMS_COL  = "menu_items";
const CONFIG_COL = "config";

/* ── password (غيريه لأي كلمة تحبيها) ── */
const ADMIN_PASSWORD = "toty2025";

/* ── category icons ── */
const CAT_ICONS = {
  "مقبلات":    "🥗",
  "أكل رئيسي": "🍛",
  "حلويات":   "🍮",
  "مشروبات":  "🥤",
};

/* ── toast ── */
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

/* ============================================================
   MENU PAGE  (index.html)
   ============================================================ */
window.initMenuPage = function () {
  /* اسم المطبخ */
  onSnapshot(doc(db, CONFIG_COL, "resto"), (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      document.getElementById("resto-name").textContent = d.name || "مطبخ أم أحمد";
      document.getElementById("resto-sub").textContent  = d.sub  || "أكل بيتي بطعم الأصل";
    }
  });

  /* الأصناف — real-time */
  onSnapshot(collection(db, ITEMS_COL), (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMenuPage(items);
  });
};

function renderMenuPage(items) {
  const body = document.getElementById("menu-body");
  if (!body) return;
  if (!items.length) {
    body.innerHTML = '<p class="text-center text-muted py-5">المنيو فاضي دلوقتي!</p>';
    return;
  }
  const cats = [...new Set(items.map(i => i.cat))];
  body.innerHTML = cats.map(cat => {
    const icon     = CAT_ICONS[cat] || "🍽️";
    const catItems = items.filter(i => i.cat === cat);
    return `
      <div class="cat-label">${icon} ${cat}</div>
      ${catItems.map(i => `
        <div class="menu-item-card">
          <span class="item-name">${i.name}</span>
          <span class="item-price">${i.price} جنيه</span>
        </div>
      `).join("")}
    `;
  }).join("");
}

/* ============================================================
   ADMIN PAGE  (admin.html)
   ============================================================ */

/* ── password gate ── */
window.initAdminPage = function () {
  const gate    = document.getElementById("password-gate");
  const content = document.getElementById("admin-content");

  /* لو كانت دخلت قبل كده في نفس الجلسة */
  if (sessionStorage.getItem("admin_auth") === "yes") {
    gate.style.display    = "none";
    content.style.display = "block";
    loadAdminData();
    return;
  }

  gate.style.display    = "flex";
  content.style.display = "none";
};

window.checkPassword = function () {
  const val = document.getElementById("inp-password").value;
  if (val === ADMIN_PASSWORD) {
    sessionStorage.setItem("admin_auth", "yes");
    document.getElementById("password-gate").style.display   = "none";
    document.getElementById("admin-content").style.display   = "block";
    loadAdminData();
  } else {
    document.getElementById("pass-error").style.display = "block";
    document.getElementById("inp-password").value = "";
  }
};

/* enter key on password field */
window.handlePassKey = function (e) {
  if (e.key === "Enter") window.checkPassword();
};

/* ── load admin data ── */
function loadAdminData() {
  /* بيانات المطبخ */
  onSnapshot(doc(db, CONFIG_COL, "resto"), (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      document.getElementById("inp-resto-name").value = d.name || "";
      document.getElementById("inp-resto-sub").value  = d.sub  || "";
    }
  });

  /* الأصناف real-time */
  onSnapshot(collection(db, ITEMS_COL), (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAdminList(items);
    updateStats(items);
    window._adminItems = items; /* عشان Export يشتغل */
  });
}

/* save restaurant info */
window.saveRestoInfo = async function () {
  const name = document.getElementById("inp-resto-name").value.trim() || "مطبخ أم أحمد";
  const sub  = document.getElementById("inp-resto-sub").value.trim()  || "أكل بيتي بطعم الأصل";
  await setDoc(doc(db, CONFIG_COL, "resto"), { name, sub });
  showToast("✅ تم حفظ البيانات");
};

/* add item */
window.addItem = async function () {
  const name  = document.getElementById("inp-name").value.trim();
  const price = parseFloat(document.getElementById("inp-price").value);
  const cat   = document.getElementById("inp-cat").value;
  if (!name || isNaN(price) || price <= 0) {
    showToast("⚠️ اكتب الاسم والسعر صح");
    return;
  }
  await addDoc(collection(db, ITEMS_COL), { name, price: Math.round(price), cat });
  document.getElementById("inp-name").value  = "";
  document.getElementById("inp-price").value = "";
  showToast("✅ تم إضافة " + name);
};

/* delete item */
window.deleteItem = async function (id) {
  await deleteDoc(doc(db, ITEMS_COL, id));
  showToast("🗑 تم الحذف");
};

/* render admin list */
function renderAdminList(items) {
  const el = document.getElementById("items-list");
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<p class="text-center text-muted py-3" style="font-size:14px">مفيش أصناف لسه</p>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div class="admin-item-row">
      <div>
        <div class="item-name-admin">${i.name}</div>
        <div class="item-meta">
          <span class="badge-cat">${CAT_ICONS[i.cat] || ""} ${i.cat}</span>
          <strong style="color:var(--green-main)">${i.price} جنيه</strong>
        </div>
      </div>
      <button
        class="btn btn-sm btn-outline-danger"
        style="font-family:'Cairo',sans-serif;font-size:13px;border-radius:8px"
        onclick="deleteItem('${i.id}')">
        🗑 حذف
      </button>
    </div>
  `).join("");
}

/* stats */
function updateStats(items) {
  const countEl = document.getElementById("stat-items");
  const catsEl  = document.getElementById("stat-cats");
  const avgEl   = document.getElementById("stat-avg");
  if (countEl) countEl.textContent = items.length;
  if (catsEl)  catsEl.textContent  = new Set(items.map(i => i.cat)).size;
  if (avgEl) {
    const avg = items.length
      ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length)
      : 0;
    avgEl.textContent = avg + " ج";
  }
}

/* ============================================================
   IMAGE EXPORT
   ============================================================ */
function buildSnapshot() {
  const items = window._adminItems || [];
  const snap  = document.getElementById("snapshot-target");
  if (!snap) return;

  const nameEl = document.getElementById("inp-resto-name");
  const subEl  = document.getElementById("inp-resto-sub");
  const name   = nameEl ? nameEl.value || "مطبخ أم أحمد" : "مطبخ أم أحمد";
  const sub    = subEl  ? subEl.value  || "أكل بيتي بطعم الأصل" : "أكل بيتي بطعم الأصل";
  const cats   = [...new Set(items.map(i => i.cat))];

  snap.innerHTML = `
    <div class="snap-hero">
      <span class="icon">🍽️</span>
      <h1>${name}</h1>
      <p>${sub}</p>
    </div>
    <div class="snap-body">
      ${cats.map(cat => `
        <div class="snap-cat-title">${CAT_ICONS[cat] || ""} ${cat}</div>
        ${items.filter(i => i.cat === cat).map(i => `
          <div class="snap-item">
            <span class="sname">${i.name}</span>
            <span class="sprice">${i.price} جنيه</span>
          </div>
        `).join("")}
      `).join("")}
      <div class="snap-footer">كل الأسعار بالجنيه المصري</div>
    </div>
  `;
}

async function getExportCanvas() {
  buildSnapshot();
  return await html2canvas(document.getElementById("snapshot-target"), {
    scale: 2, useCORS: true, backgroundColor: "#f5f0e8", width: 400,
  });
}

window.downloadPNG = async function () {
  showToast("⏳ جاري تجهيز الصورة...");
  const canvas = await getExportCanvas();
  const link   = document.createElement("a");
  link.download = "menu.png";
  link.href     = canvas.toDataURL("image/png");
  link.click();
  showToast("✅ تم تحميل الصورة!");
};

window.copyImage = async function () {
  showToast("⏳ جاري التحضير...");
  try {
    const canvas = await getExportCanvas();
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        showToast("✅ تم النسخ! الصق في واتساب");
      } catch {
        const link = document.createElement("a");
        link.download = "menu.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("✅ تم التحميل");
      }
    });
  } catch {
    showToast("❌ حصل خطأ، جرب تحميل الصورة");
  }
};

/* ── auto-init based on current page ── */
if (location.pathname.includes("admin")) {
  window.initAdminPage();
} else {
  window.initMenuPage();
}
