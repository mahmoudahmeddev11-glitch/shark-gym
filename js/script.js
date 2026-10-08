const SUB_DAYS = {
  monthly: 30,
  '3months': 90,
  '6months': 180,
  yearly: 365,
  private: 30
};

const SUB_LABELS = {
  monthly: 'شهري',
  '3months': '3 شهور',
  '6months': '6 شهور',
  yearly: 'سنوي',
  private: 'برايفت'
};

let ADMIN = {
  user: "admin",
  pass: "shark2024",
  youssefPass: "mahmoud"
};

let SUB_PRICES = {
  monthly: 200,
  '3months': 550,
  '6months': 1000,
  yearly: 1800,
  private: 500
};

let members = [];
let staff = [];
let attLog = [];
let expenses = [];
let archives = [];
let daysLog = [];
let trashBin = [];
let payments = [];
let manualFixedIncome = null;

let editMemberIdx = -1;
let editRenewIdx = -1;
let editPayIdx = -1;
let editStaffIdx = -1;

let currentDetailType = '';
let currentDetailIdx = -1;

let db;
let systemDate = null;

window.onload = function () {
  initDatabase(function () {
    if (sessionStorage.getItem('sg_session_active') === 'true') {
      enterApp();
    }
  });
};

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* =========================================================
   DATABASE
========================================================= */

function initDatabase(callback) {
  const request = indexedDB.open("SharkGymDB", 6);

  request.onupgradeneeded = function (e) {
    const database = e.target.result;

    if (!database.objectStoreNames.contains("system_config")) {
      database.createObjectStore("system_config");
    }
  };

  request.onsuccess = function (e) {
    db = e.target.result;
    loadDataFromDB(callback);
  };

  request.onerror = function () {
    alert("❌ فشل تشغيل محرك التخزين المتقدم!");
  };
}

function loadDataFromDB(callback) {
  const transaction = db.transaction(
    ["system_config"],
    "readonly"
  );

  const store = transaction.objectStore("system_config");

  const req = store.get("app_state");

  req.onsuccess = function () {
    if (req.result) {
      const d = req.result;

      members = d.members || [];
      staff = d.staff || [];
      attLog = d.attLog || [];
      expenses = d.expenses || [];
      archives = d.archives || [];
      daysLog = d.daysLog || [];
      trashBin = d.trashBin || [];
      payments = d.payments || [];

      manualFixedIncome =
        d.manualFixedIncome !== undefined
          ? d.manualFixedIncome
          : null;

      SUB_PRICES = d.prices || SUB_PRICES;
      ADMIN = d.admin || ADMIN;

      systemDate = d.systemDate || null;

      if (!ADMIN.youssefPass) {
        ADMIN.youssefPass = "mahmoud";
      }
    }

    callback();
  };
}

function save() {
  if (!db) return;

  const transaction = db.transaction(
    ["system_config"],
    "readwrite"
  );

  const store = transaction.objectStore("system_config");

  const appState = {
    members,
    staff,
    attLog,
    expenses,
    archives,
    daysLog,
    trashBin,
    payments,
    manualFixedIncome,
    prices: SUB_PRICES,
    admin: ADMIN,
    systemDate
  };

  store.put(appState, "app_state");
}

/* =========================================================
   DATE SYSTEM
========================================================= */

function realToday() {
  const d = new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
}

function today() {
  return systemDate || realToday();
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

/*
  مهم جدًا:
  ممنوع استخدام new Date("2026-08-01")
  في حسابات الاشتراك لأن JavaScript قد يتعامل معه كـ UTC.

  نحن نحول التاريخ يدويًا إلى تاريخ محلي.
*/
function parseDateLocal(dateStr) {
  if (!dateStr) {
    return new Date(NaN);
  }

  const parts = String(dateStr)
    .split('-')
    .map(Number);

  if (
    parts.length !== 3 ||
    !parts[0] ||
    !parts[1] ||
    !parts[2]
  ) {
    return new Date(NaN);
  }

  const [y, m, d] = parts;

  return new Date(y, m - 1, d);
}

function formatDateAr(dateStr, options = {}) {
  const d = parseDateLocal(dateStr);

  if (Number.isNaN(d.getTime())) {
    return dateStr || '—';
  }

  return d.toLocaleDateString(
    'ar-EG',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }
  );
}

function monthKey(dateStr) {
  return String(dateStr || '').slice(0, 7);
}

function monthLabel(dateStr) {
  const key = monthKey(dateStr);

  if (!key) {
    return 'شهر غير محدد';
  }

  const d = parseDateLocal(`${key}-01`);

  if (Number.isNaN(d.getTime())) {
    return key;
  }

  return d.toLocaleDateString(
    'ar-EG',
    {
      year: 'numeric',
      month: 'long'
    }
  );
}

function daysLeft(end) {
  const endDate = parseDateLocal(end);
  const baseDate = parseDateLocal(today());

  if (
    Number.isNaN(endDate.getTime()) ||
    Number.isNaN(baseDate.getTime())
  ) {
    return 0;
  }

  return Math.ceil(
    (endDate - baseDate) / 86400000
  );
}

function addDays(dateStr, days) {
  const d = parseDateLocal(dateStr || today());

  if (Number.isNaN(d.getTime())) {
    return today();
  }

  d.setDate(
    d.getDate() + Number(days || 0)
  );

  const y = d.getFullYear();

  const m = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    d.getDate()
  ).padStart(2, '0');

  return `${y}-${m}-${day}`;
}

function updateTopDate() {
  const input =
    document.getElementById('top-date-input');

  if (input) {
    input.value = today();
  }
}

function changeSystemDate(value) {
  if (!value) return;

  systemDate = value;

  save();

  updateTopDate();

  renderDashboard();
  renderMembers();
  renderAttMembers();
  renderAttStaff();
  renderAttLog();
  renderFinance();
  renderDaysLog();
  renderYoussefSection();
}

function memberStatus(m) {
  const dl = daysLeft(m.end);

  if (dl < 0) {
    return {
      label: 'منتهي',
      cls: 'badge-danger'
    };
  }

  if (dl <= 7) {
    return {
      label: `ينتهي بعد ${dl}ي`,
      cls: 'badge-warn'
    };
  }

  return {
    label: 'نشط',
    cls: 'badge-success'
  };
}

function calcDuration(i, o) {
  if (!i || !o) {
    return '—';
  }

  const [ih, im] = i
    .split(':')
    .map(Number);

  const [oh, om] = o
    .split(':')
    .map(Number);

  let t =
    (oh * 60 + om) -
    (ih * 60 + im);

  if (t < 0) {
    t += 1440;
  }

  return `${Math.floor(t / 60)}س ${t % 60}د`;
}

function fmt(n) {
  return Number(n || 0)
    .toLocaleString('en-US');
}

/* =========================================================
   LOGIN / APP
========================================================= */

function toggleLoginPassword() {
  const input =
    document.getElementById('l-pass');

  const button =
    document.querySelector('.password-toggle');

  if (!input || !button) return;

  const showing =
    input.type === 'text';

  input.type =
    showing
      ? 'password'
      : 'text';

  button.textContent =
    showing
      ? '👁️'
      : '🙈';
}

function doLogin() {
  const u =
    document.getElementById('l-user')
      .value
      .trim();

  const p =
    document.getElementById('l-pass')
      .value;

  if (
    u === ADMIN.user &&
    p === ADMIN.pass
  ) {
    sessionStorage.setItem(
      'sg_session_active',
      'true'
    );

    enterApp();
  } else {
    document
      .getElementById('login-err')
      .style.display = 'block';
  }
}

function enterApp() {
  updateTopDate();

  document
    .getElementById('login-screen')
    .style.display = 'none';

  document
    .getElementById('app')
    .style.display = 'block';

  document
    .getElementById('top-admin')
    .textContent =
    '👤 ' + ADMIN.user;

  startClock();

  document
    .getElementById('main-sidebar')
    .classList.add('open');

  renderDashboard();
}

function doLogout() {
  sessionStorage.removeItem(
    'sg_session_active'
  );

  document
    .getElementById('app')
    .style.display = 'none';

  document
    .getElementById('login-screen')
    .style.display = 'flex';

  document.getElementById(
    'l-user'
  ).value = '';

  document.getElementById(
    'l-pass'
  ).value = '';

  document.getElementById(
    'login-err'
  ).style.display = 'none';
}

function startClock() {
  function update() {
    const now = new Date();

    updateTopDate();

    const time =
      document.getElementById('top-time');

    if (time) {
      time.textContent =
        now.toLocaleTimeString(
          'ar-EG',
          {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }
        );
    }
  }

  update();

  setInterval(update, 1000);
}

function toggleSidebar() {
  document
    .getElementById('main-sidebar')
    .classList.toggle('open');
}

function checkSectionAuth(name, btn) {
  const password = prompt(
    'برجاء إدخال كلمة مرور المسؤول لدخول القسم:'
  );

  if (password === null) return;

  if (password === ADMIN.pass) {
    showPage(name, btn);
  } else {
    alert('كلمة المرور غير صحيحة!');
  }
}

function checkYoussefAuth(btn) {
  const password = prompt(
    '🔐 برجاء إدخال كلمة المرور لدخول قسم كابتن يوسف:'
  );

  if (password === null) return;

  if (
    password ===
    (ADMIN.youssefPass || "mahmoud")
  ) {
    showPage('youssef', btn);
  } else {
    alert(
      '❌ كلمة المرور الخاصة بكابتن يوسف غير صحيحة!'
    );
  }
}

function showPage(name, btn) {
  document
    .querySelectorAll('.page')
    .forEach(p =>
      p.classList.remove('active')
    );

  document
    .querySelectorAll('.nav-item')
    .forEach(b =>
      b.classList.remove('active')
    );

  const page =
    document.getElementById(
      'page-' + name
    );

  if (!page) return;

  page.classList.add('active');

  if (btn) {
    btn.classList.add('active');
  }

  if (window.innerWidth <= 768) {
    document
      .getElementById('main-sidebar')
      .classList.remove('open');
  }

  if (name === 'dashboard') {
    renderDashboard();
  } else if (name === 'members') {
    renderMembers();
  } else if (name === 'attendance') {
    renderAttMembers();
    renderAttStaff();
    renderAttLog();
  } else if (name === 'days-log') {
    renderDaysLog();
  } else if (name === 'finance') {
    renderFinance();
  } else if (name === 'youssef') {
    renderYoussefSection();
  } else if (name === 'settings') {
    renderSettings();
  }
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  document.getElementById(
    'new-user'
  ).value = ADMIN.user;

  document.getElementById(
    'new-pass'
  ).value = '';

  document.getElementById(
    'confirm-pass'
  ).value = '';

  document.getElementById(
    'new-youssef-pass'
  ).value = '';

  document.getElementById(
    'confirm-youssef-pass'
  ).value = '';

  let html = '';

  for (let key in SUB_PRICES) {
    html += `
      <div
        class="form-group"
        style="margin-bottom:10px"
      >
        <label>
          سعر ${SUB_LABELS[key]}
        </label>

        <input
          type="number"
          id="price-${key}"
          value="${SUB_PRICES[key]}"
        />
      </div>
    `;
  }

  document.getElementById(
    'prices-form'
  ).innerHTML = html;
}

function changeAdminCredentials() {
  const u =
    document.getElementById(
      'new-user'
    ).value.trim();

  const p =
    document.getElementById(
      'new-pass'
    ).value;

  const cp =
    document.getElementById(
      'confirm-pass'
    ).value;

  if (!u) {
    alert('❌ أدخل اسم المستخدم');
    return;
  }

  if (p) {
    if (p !== cp) {
      alert(
        '❌ كلمة المرور وتأكيدها غير متطابقين!'
      );
      return;
    }

    ADMIN.pass = p;
  }

  ADMIN.user = u;

  save();

  alert(
    '✅ تم حفظ كلمة مرور وبيانات الأدمن بنجاح!'
  );

  renderSettings();
}

function changeYoussefCredentials() {
  const yp =
    document.getElementById(
      'new-youssef-pass'
    ).value;

  const cyp =
    document.getElementById(
      'confirm-youssef-pass'
    ).value;

  if (!yp) {
    alert(
      '❌ أدخل كلمة المرور الجديدة لقسم كابتن يوسف'
    );
    return;
  }

  if (yp !== cyp) {
    alert(
      '❌ كلمة المرور وتأكيدها لقسم كابتن يوسف غير متطابقين!'
    );
    return;
  }

  ADMIN.youssefPass = yp;

  save();

  alert(
    '✅ تم حفظ كلمة المرور المخصصة لقسم كابتن يوسف بنجاح!'
  );

  renderSettings();
}

function savePrices() {
  for (let key in SUB_PRICES) {
    const input =
      document.getElementById(
        `price-${key}`
      );

    const val =
      input
        ? +input.value
        : 0;

    if (val >= 0) {
      SUB_PRICES[key] = val;
    }
  }

  save();

  alert(
    '✅ تم حفظ تعديلات الأسعار بنجاح!'
  );
}

function clearAttendance() {
  if (
    !confirm(
      'هل أنت تأكد من تصفير سجل الحضور اليومي للمتواجدين بالكامل؟'
    )
  ) {
    return;
  }

  members.forEach(m => {
    m.present = false;
    m.checkIn = null;
    m.checkOut = null;
  });

  staff.forEach(s => {
    s.present = false;
    s.checkIn = null;
    s.checkOut = null;
  });

  attLog = [];

  save();

  alert(
    '✅ تم تصفير سجل الحضور والغياب اليومي'
  );

  renderDashboard();
}

function resetAll() {
  const p = prompt(
    '⚠️ تحذير: هذا الخيار سيمسح جميع البيانات والاشتراكات! أدخل كلمة مرور المسؤول للتأكيد:'
  );

  if (p === ADMIN.pass) {
    indexedDB.deleteDatabase(
      "SharkGymDB"
    );

    localStorage.clear();
    sessionStorage.clear();

    alert(
      '✅ تم إعادة ضبط النظام بالكامل. سيتم إعادة تحميل الصفحة.'
    );

    location.reload();
  } else if (p !== null) {
    alert(
      '❌ كلمة المرور غير صحيحة!'
    );
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const active =
    members.filter(
      m => daysLeft(m.end) >= 0
    ).length;

  const expiring =
    members.filter(
      m =>
        daysLeft(m.end) >= 0 &&
        daysLeft(m.end) <= 7
    ).length;

  const debts =
    members.filter(
      m =>
        Number(m.paid || 0) <
        Number(m.price || 0)
    ).length;

  const present =
    members.filter(
      m => m.present
    ).length;

  const sPresent =
    staff.filter(
      s => s.present
    ).length;

  document.getElementById(
    'dash-stats'
  ).innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${members.length}</div>
      <div class="stat-lbl">إجمالي الأعضاء</div>
    </div>

    <div class="stat-card success">
      <div class="stat-num">${active}</div>
      <div class="stat-lbl">اشتراكات نشطة</div>
    </div>

    <div class="stat-card warn">
      <div class="stat-num">${expiring}</div>
      <div class="stat-lbl">تنتهي قريباً</div>
    </div>

    <div class="stat-card danger">
      <div class="stat-num">${debts}</div>
      <div class="stat-lbl">ديون ومستحقات</div>
    </div>

    <div class="stat-card info">
      <div class="stat-num">${present}</div>
      <div class="stat-lbl">أعضاء بالجيم</div>
    </div>

    <div class="stat-card">
      <div class="stat-num">${sPresent}</div>
      <div class="stat-lbl">موظفون الآن</div>
    </div>
  `;

  const exp =
    members.filter(
      m =>
        daysLeft(m.end) >= 0 &&
        daysLeft(m.end) <= 7
    );

  document.getElementById(
    'dash-expiring'
  ).innerHTML = exp.length
    ? exp.map(m => {
        const cleanPhone =
          m.phone
            ? String(m.phone)
                .replace(/[^0-9]/g, '')
            : '';

        const waPhone =
          cleanPhone.startsWith('0')
            ? '2' + cleanPhone
            : cleanPhone;

        const msg =
          encodeURIComponent(
            `أهلاً بك يا ${m.name} 👋🏼\nنود تذكيرك بأن اشتراكك في Shark Gym ينتهي خلال ${daysLeft(m.end)} أيام (بتاريخ ${m.end}).\nيسعدنا تجديد اشتراكك للاستمرار في التمرين! 💪🏼🦈`
          );

        return `
          <div class="att-row">
            <div>
              <div class="att-name">
                ${m.name}
                (${m.phone || 'بدون رقم'})
              </div>

              <div class="att-sub">
                ينتهي بعد ${daysLeft(m.end)} يوم
                (${m.end})
              </div>
            </div>

            <div style="display:flex;gap:6px">
              ${
                m.phone
                  ? `
                    <a
                      href="https://wa.me/${waPhone}?text=${msg}"
                      target="_blank"
                      class="btn btn-sm btn-whatsapp"
                    >
                      💬 واتساب
                    </a>
                  `
                  : ''
              }

              <button
                class="btn btn-sm btn-warn"
                onclick="openRenew(${members.indexOf(m)})"
              >
                🔄 تجديد
              </button>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="empty">لا توجد اشتراكات تنتهي قريباً</div>';

  const dbList =
    members.filter(
      m =>
        Number(m.paid || 0) <
        Number(m.price || 0)
    );

  document.getElementById(
    'dash-debt'
  ).innerHTML = dbList.length
    ? dbList.map(m => `
        <div class="att-row">
          <div>
            <div class="att-name">
              ${m.name}
            </div>

            <div
              class="att-sub"
              style="color:var(--danger)"
            >
              متبقي:
              ${fmt(
                Number(m.price || 0) -
                Number(m.paid || 0)
              )}
              ج.م
            </div>
          </div>

          <button
            class="btn btn-sm btn-danger"
            onclick="openPay(${members.indexOf(m)})"
          >
            💳 تحصيل
          </button>
        </div>
      `).join('')
    : '<div class="empty">لا توجد ديون مستحقة</div>';

  const pres =
    members.filter(
      m => m.present
    );

  const sprPresent =
    staff.filter(
      s => s.present
    );

  let presHtml = '';

  if (
    pres.length ||
    sprPresent.length
  ) {
    pres.forEach(m => {
      presHtml += `
        <div class="att-row">
          <div>
            <div class="att-name">
              👤 ${m.name}
            </div>

            <div class="att-sub">
              دخل الساعة ${m.checkIn}
            </div>
          </div>

          <span class="badge badge-success">
            عضو
          </span>
        </div>
      `;
    });

    sprPresent.forEach(s => {
      presHtml += `
        <div class="att-row">
          <div>
            <div class="att-name">
              🏋️ ${s.name}
            </div>

            <div class="att-sub">
              ${s.role} — دخل الساعة ${s.checkIn}
            </div>
          </div>

          <span class="badge badge-purple">
            موظف
          </span>
        </div>
      `;
    });
  } else {
    presHtml =
      '<div class="empty">لا يوجد أحد داخل الجيم الآن</div>';
  }

  document.getElementById(
    'dash-present'
  ).innerHTML = presHtml;
}

/* =========================================================
   MEMBERS
========================================================= */

function renderMembers() {
  const q =
    (
      document.getElementById(
        'member-search'
      )?.value || ''
    ).trim();

  const list =
    members.filter(
      m =>
        !q ||
        String(m.name || '')
          .includes(q) ||
        String(m.phone || '')
          .includes(q)
    );

  if (!list.length) {
    document.getElementById(
      'members-table'
    ).innerHTML =
      `
        <tr>
          <td colspan="12">
            <div class="empty">
              لا توجد نتائج
            </div>
          </td>
        </tr>
      `;

    return;
  }

  document.getElementById(
    'members-table'
  ).innerHTML =
    list.map(m => {
      const idx =
        members.indexOf(m);

      const st =
        memberStatus(m);

      const dl =
        daysLeft(m.end);

      const debt =
        Number(m.price || 0) -
        Number(m.paid || 0);

      const subName =
        m.sub === 'private'
          ? `برايفت (${m.coach || 'كابتن'})`
          : SUB_LABELS[m.sub];

      return `
        <tr
          class="${
            dl < 0
              ? 'tr-danger'
              : dl <= 7
                ? 'tr-warn'
                : ''
          }"
        >
          <td>${idx + 1}</td>

          <td>
            <b>${m.name}</b>
          </td>

          <td>
            ${m.phone || '—'}
          </td>

          <td>
            ${m.age || '-'}
          </td>

          <td>
            <span class="badge badge-info">
              ${subName}
            </span>
          </td>

          <td>
            ${m.start || '—'}
          </td>

          <td>
            ${m.end || '—'}
          </td>

          <td>
            ${fmt(m.price)} ج.م
          </td>

          <td
            style="color:var(--success)"
          >
            ${fmt(m.paid)} ج.م
          </td>

          <td>
            ${
              debt > 0
                ? `
                  <span
                    style="
                      color:var(--danger);
                      font-weight:700
                    "
                  >
                    ${fmt(debt)} ج.م
                  </span>
                `
                : `
                  <span
                    style="
                      color:var(--success)
                    "
                  >
                    ✅ مكتمل
                  </span>
                `
            }
          </td>

          <td>
            <span class="badge ${st.cls}">
              ${st.label}
            </span>
          </td>

          <td>
            <button
              class="btn btn-sm btn-ghost"
              onclick="editMember(${idx})"
            >
              ✏️
            </button>

            <button
              class="btn btn-sm btn-ghost"
              onclick="openRenew(${idx})"
            >
              🔄
            </button>

            ${
              debt > 0
                ? `
                  <button
                    class="btn btn-sm btn-ghost"
                    onclick="openPay(${idx})"
                  >
                    💳
                  </button>
                `
                : ''
            }

            <button
              class="btn btn-sm btn-ghost"
              onclick="deleteMemberProtected(${idx})"
              style="color:var(--danger)"
            >
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
}

function openAddMember() {
  editMemberIdx = -1;

  document.getElementById(
    'modal-member-title'
  ).textContent =
    '➕ إضافة عضو جديد';

  [
    'm-name',
    'm-phone',
    'm-notes',
    'm-age',
    'm-paid',
    'm-coach'
  ].forEach(id => {
    document.getElementById(id).value = '';
  });

  document.getElementById(
    'm-gender'
  ).value = 'ذكر';

  document.getElementById(
    'm-sub'
  ).value = 'monthly';

  document.getElementById(
    'm-start'
  ).value = today();

  document.getElementById(
    'm-end'
  ).value =
    addDays(today(), 30);

  onSubChange();

  document.getElementById(
    'modal-member'
  ).classList.add('open');
}

function editMember(idx) {
  editMemberIdx = idx;

  const m = members[idx];

  document.getElementById(
    'modal-member-title'
  ).textContent =
    '✏️ تعديل بيانات العضو';

  document.getElementById(
    'm-name'
  ).value = m.name;

  document.getElementById(
    'm-phone'
  ).value = m.phone;

  document.getElementById(
    'm-age'
  ).value = m.age || '';

  document.getElementById(
    'm-gender'
  ).value =
    m.gender || 'ذكر';

  document.getElementById(
    'm-sub'
  ).value = m.sub;

  document.getElementById(
    'm-coach'
  ).value =
    m.coach || '';

  document.getElementById(
    'm-start'
  ).value = m.start;

  document.getElementById(
    'm-end'
  ).value = m.end;

  document.getElementById(
    'm-price'
  ).value = m.price;

  document.getElementById(
    'm-paid'
  ).value = m.paid;

  document.getElementById(
    'm-remaining'
  ).value =
    Math.max(
      0,
      Number(m.price || 0) -
      Number(m.paid || 0)
    );

  document.getElementById(
    'm-notes'
  ).value =
    m.notes || '';

  onSubChange(true);

  document.getElementById(
    'modal-member'
  ).classList.add('open');
}

function onSubChange(isEdit = false) {
  const sub =
    document.getElementById(
      'm-sub'
    ).value;

  const coachGroup =
    document.getElementById(
      'coach-field-group'
    );

  const priceInput =
    document.getElementById(
      'm-price'
    );

  if (sub === 'private') {
    coachGroup.style.display =
      'block';

    priceInput.readOnly =
      false;

    priceInput.style.background =
      '#fff';

    if (!isEdit) {
      priceInput.value =
        SUB_PRICES.private || 500;
    }
  } else {
    coachGroup.style.display =
      'none';

    priceInput.readOnly =
      false;

    priceInput.style.background =
      '#fff';

    if (!isEdit) {
      priceInput.value =
        SUB_PRICES[sub];
    }

    const start =
      document.getElementById(
        'm-start'
      ).value;

    if (
      start &&
      !isEdit
    ) {
      document.getElementById(
        'm-end'
      ).value =
        addDays(
          start,
          SUB_DAYS[sub]
        );
    }
  }

  updateRemaining();
}

function updateRemaining() {
  const price =
    +document.getElementById(
      'm-price'
    ).value || 0;

  const paid =
    +document.getElementById(
      'm-paid'
    ).value || 0;

  document.getElementById(
    'm-remaining'
  ).value =
    Math.max(
      0,
      price - paid
    );
}

function saveMember() {
  const name =
    document.getElementById(
      'm-name'
    ).value.trim();

  const phone =
    document.getElementById(
      'm-phone'
    ).value.trim();

  if (!name) {
    alert(
      'برجاء إدخال الاسم الكامل'
    );
    return;
  }

  if (
    !phone ||
    phone.length < 11
  ) {
    alert(
      '❌ رقم الهاتف يجب ألا يقل عن 11 رقم!'
    );
    return;
  }

  const sub =
    document.getElementById(
      'm-sub'
    ).value;

  const start =
    document.getElementById(
      'm-start'
    ).value;

  const end =
    document.getElementById(
      'm-end'
    ).value;

  const price =
    +document.getElementById(
      'm-price'
    ).value || 0;

  const paid =
    Math.min(
      price,
      +document.getElementById(
        'm-paid'
      ).value || 0
    );

  const coach =
    document.getElementById(
      'm-coach'
    ).value.trim();

  const mId =
    editMemberIdx >= 0
      ? members[editMemberIdx].id
      : Date.now();

  const oldPaid =
    editMemberIdx >= 0
      ? Number(
          members[
            editMemberIdx
          ].paid || 0
        )
      : 0;

  const obj = {
    id: mId,
    name,
    phone,
    age:
      +document.getElementById(
        'm-age'
      ).value || 0,

    gender:
      document.getElementById(
        'm-gender'
      ).value,

    sub,
    coach,
    start,
    end,
    price,
    paid,

    notes:
      document.getElementById(
        'm-notes'
      ).value
  };

  if (editMemberIdx >= 0) {
    Object.assign(
      members[editMemberIdx],
      obj
    );
  } else {
    members.push({
      ...obj,
      present: false,
      checkIn: null,
      checkOut: null
    });
  }

  /*
    عند تعديل عضو:
    لا نسجل دفعة جديدة إلا إذا زاد المبلغ المدفوع.

    عند إضافة عضو جديد:
    نسجل المبلغ المدفوع اليوم.
  */
  const newPaymentAmount =
    editMemberIdx >= 0
      ? Math.max(
          0,
          paid - oldPaid
        )
      : paid;

  if (newPaymentAmount > 0) {
    payments.push({
      id:
        Date.now() +
        Math.random(),

      memberId: mId,
      memberName: name,

      sub:
        sub === 'private'
          ? `برايفت (${coach || 'كابتن'})`
          : SUB_LABELS[sub],

      amount:
        newPaymentAmount,

      /*
        تاريخ الدفع الحقيقي
        وليس تاريخ بداية الاشتراك.
      */
      date: today()
    });
  }

  save();

  closeModal(
    'modal-member'
  );

  renderMembers();
  renderDashboard();
  renderFinance();
}

function deleteMemberProtected(idx) {
  const password =
    prompt(
      `أدخل باسورد المسؤول لتأكيد حذف العضو "${members[idx].name}":`
    );

  if (
    password === ADMIN.pass ||
    password === ADMIN.youssefPass
  ) {
    const deleted =
      members.splice(idx, 1)[0];

    trashBin.push({
      type: 'عضو / اشتراك',
      item: deleted,
      deletedAt: today()
    });

    save();

    renderMembers();
    renderDashboard();
    renderTrashBin();
  } else if (
    password !== null
  ) {
    alert(
      'الباسورد غلط!'
    );
  }
}

/* =========================================================
   RENEW & PAYMENTS
========================================================= */

function openRenew(idx) {
  editRenewIdx = idx;

  const m = members[idx];

  document.getElementById(
    'renew-info'
  ).innerHTML = `
    <b>العضو:</b> ${m.name}
    <br>
    <b>الاشتراك الحالي:</b>
    ${SUB_LABELS[m.sub]}
    <br>
    <b>ينتهي في:</b>
    ${m.end}
  `;

  document.getElementById(
    'r-sub'
  ).value = 'monthly';

  document.getElementById(
    'r-paid'
  ).value = '';

  document.getElementById(
    'r-coach'
  ).value = '';

  document.getElementById(
    'r-start'
  ).value = today();

  document.getElementById(
    'r-end'
  ).value =
    addDays(today(), 30);

  onRenewSubChange();

  document.getElementById(
    'modal-renew'
  ).classList.add('open');
}

function onRenewSubChange() {
  const sub =
    document.getElementById(
      'r-sub'
    ).value;

  const coachGroup =
    document.getElementById(
      'r-coach-field-group'
    );

  const priceInput =
    document.getElementById(
      'r-price'
    );

  if (sub === 'private') {
    coachGroup.style.display =
      'block';

    priceInput.value =
      SUB_PRICES.private || 500;
  } else {
    coachGroup.style.display =
      'none';

    priceInput.value =
      SUB_PRICES[sub];

    const start =
      document.getElementById(
        'r-start'
      ).value || today();

    document.getElementById(
      'r-end'
    ).value =
      addDays(
        start,
        SUB_DAYS[sub]
      );
  }

  updateRenewRemaining();
}

function updateRenewRemaining() {
  const price =
    +document.getElementById(
      'r-price'
    ).value || 0;

  const paid =
    +document.getElementById(
      'r-paid'
    ).value || 0;

  document.getElementById(
    'r-remaining'
  ).value =
    Math.max(
      0,
      price - paid
    );
}

function saveRenew() {
  const m =
    members[editRenewIdx];

  if (!m) return;

  const sub =
    document.getElementById(
      'r-sub'
    ).value;

  const price =
    +document.getElementById(
      'r-price'
    ).value || 0;

  const paid =
    Math.min(
      price,
      +document.getElementById(
        'r-paid'
      ).value || 0
    );

  const start =
    document.getElementById(
      'r-start'
    ).value;

  const end =
    document.getElementById(
      'r-end'
    ).value;

  const coach =
    document.getElementById(
      'r-coach'
    ).value.trim();

  m.sub = sub;
  m.coach = coach;
  m.start = start;
  m.end = end;
  m.price = price;
  m.paid = paid;

  if (paid > 0) {
    payments.push({
      id:
        Date.now() +
        Math.random(),

      memberId: m.id,
      memberName: m.name,

      sub:
        sub === 'private'
          ? `برايفت (${coach || 'كابتن'})`
          : SUB_LABELS[sub],

      amount: paid,

      /*
        الدفع حصل اليوم.
        لا نستخدم تاريخ بداية الاشتراك هنا.
      */
      date: today()
    });
  }

  save();

  closeModal(
    'modal-renew'
  );

  renderMembers();
  renderDashboard();
  renderFinance();
}

function openPay(idx) {
  editPayIdx = idx;

  const m = members[idx];

  document.getElementById(
    'pay-info'
  ).innerHTML = `
    <b>العضو:</b> ${m.name}
    <br>
    <b>المبلغ الكلي:</b>
    ${fmt(m.price)} ج.م
    <br>
    <b>المدفوع:</b>
    ${fmt(m.paid)} ج.م
    <br>
    <b>المتبقي:</b>
    <span style="color:var(--danger)">
      ${fmt(
        Number(m.price || 0) -
        Number(m.paid || 0)
      )} ج.م
    </span>
  `;

  document.getElementById(
    'pay-amount'
  ).value =
    Number(m.price || 0) -
    Number(m.paid || 0);

  document.getElementById(
    'modal-pay'
  ).classList.add('open');
}

function savePayment() {
  const m =
    members[editPayIdx];

  if (!m) return;

  const amt =
    +document.getElementById(
      'pay-amount'
    ).value || 0;

  if (amt <= 0) {
    alert(
      'أدخل مبلغ صحيح'
    );
    return;
  }

  m.paid =
    Math.min(
      Number(m.price || 0),
      Number(m.paid || 0) +
      amt
    );

  payments.push({
    id:
      Date.now() +
      Math.random(),

    memberId: m.id,
    memberName: m.name,

    sub:
      m.sub === 'private'
        ? `برايفت (${m.coach || 'كابتن'})`
        : SUB_LABELS[m.sub],

    amount: amt,

    date: today()
  });

  save();

  closeModal(
    'modal-pay'
  );

  renderMembers();
  renderDashboard();
  renderFinance();
}

/* =========================================================
   ATTENDANCE
========================================================= */

function renderAttMembers() {
  const q =
    document.getElementById(
      'att-search'
    )?.value || '';

  const list =
    members.filter(
      m =>
        !q ||
        String(m.name || '')
          .includes(q)
    );

  document.getElementById(
    'att-members-table'
  ).innerHTML =
    list.map(m => {
      const idx =
        members.indexOf(m);

      return `
        <tr>
          <td>
            <b>${m.name}</b>
          </td>

          <td>
            <span class="badge badge-info">
              ${SUB_LABELS[m.sub] || m.sub}
            </span>
          </td>

          <td>
            <span
              class="badge ${
                m.present
                  ? 'badge-success'
                  : 'badge-gray'
              }"
            >
              ${
                m.present
                  ? '✅ داخل'
                  : '⭕ خارج'
              }
            </span>
          </td>

          <td>
            ${m.checkIn || '—'}
          </td>

          <td>
            ${m.checkOut || '—'}
          </td>

          <td>
            ${
              m.present
                ? `
                  <button
                    class="btn btn-sm btn-danger"
                    onclick="memberCheckOut(${idx})"
                  >
                    🚪 خروج
                  </button>
                `
                : `
                  <button
                    class="btn btn-sm btn-success"
                    onclick="memberCheckIn(${idx})"
                  >
                    🚶 دخول
                  </button>
                `
            }
          </td>
        </tr>
      `;
    }).join('');
}

function renderAttStaff() {
  document.getElementById(
    'att-staff-table'
  ).innerHTML =
    staff.map((s, i) => `
      <tr>
        <td>
          <b>${s.name}</b>
        </td>

        <td>
          ${s.role}
        </td>

        <td>
          <span
            class="badge ${
              s.present
                ? 'badge-success'
                : 'badge-gray'
            }"
          >
            ${
              s.present
                ? '✅ داخل'
                : '⭕ خارج'
            }
          </span>
        </td>

        <td>
          ${s.checkIn || '—'}
        </td>

        <td>
          ${s.checkOut || '—'}
        </td>

        <td>
          ${
            s.present
              ? `
                <button
                  class="btn btn-sm btn-danger"
                  onclick="staffCheckOut(${i})"
                >
                  🚪 خروج
                </button>
              `
              : `
                <button
                  class="btn btn-sm btn-success"
                  onclick="staffCheckIn(${i})"
                >
                  🚶 دخول
                </button>
              `
          }
        </td>
      </tr>
    `).join('');
}

function renderAttLog() {
  const todayDate =
    today();

  const todayAttLog =
    attLog.filter(
      l => l.date === todayDate
    );

  document.getElementById(
    'att-log-table'
  ).innerHTML =
    todayAttLog
      .slice()
      .reverse()
      .map((l, i) => `
        <tr>
          <td>${i + 1}</td>

          <td>
            ${l.name}
          </td>

          <td>
            <span
              class="badge ${
                l.type === 'عضو'
                  ? 'badge-info'
                  : 'badge-purple'
              }"
            >
              ${l.type}
            </span>
          </td>

          <td>
            ${l.checkIn || '—'}
          </td>

          <td>
            ${l.checkOut || '—'}
          </td>

          <td>
            ${
              l.checkOut
                ? calcDuration(
                    l.checkIn,
                    l.checkOut
                  )
                : '—'
            }
          </td>
        </tr>
      `)
      .join('');
}

function memberCheckIn(idx) {
  const m =
    members[idx];

  if (!m) return;

  m.present = true;
  m.checkIn = nowTime();
  m.checkOut = null;

  attLog.push({
    name: m.name,
    type: 'عضو',
    checkIn: m.checkIn,
    checkOut: null,
    date: today()
  });

  save();

  renderAttMembers();
  renderDashboard();
}

function memberCheckOut(idx) {
  const m =
    members[idx];

  if (!m) return;

  m.present = false;
  m.checkOut = nowTime();

  const rec =
    attLog
      .filter(
        x =>
          x.name === m.name &&
          !x.checkOut &&
          x.date === today()
      )
      .pop();

  if (rec) {
    rec.checkOut =
      m.checkOut;
  }

  save();

  renderAttMembers();
  renderDashboard();
}

function staffCheckIn(idx) {
  const s =
    staff[idx];

  if (!s) return;

  s.present = true;
  s.checkIn = nowTime();
  s.checkOut = null;

  attLog.push({
    name: s.name,
    type: 'موظف',
    checkIn: s.checkIn,
    checkOut: null,
    date: today()
  });

  save();

  renderAttStaff();
  renderDashboard();
}

function staffCheckOut(idx) {
  const s =
    staff[idx];

  if (!s) return;

  s.present = false;
  s.checkOut = nowTime();

  const rec =
    attLog
      .filter(
        x =>
          x.name === s.name &&
          !x.checkOut &&
          x.date === today()
      )
      .pop();

  if (rec) {
    rec.checkOut =
      s.checkOut;
  }

  save();

  renderAttStaff();
  renderDashboard();
}

function switchAttTab(
  tab,
  btn
) {
  document
    .querySelectorAll('.tab-btn')
    .forEach(b =>
      b.classList.remove('active')
    );

  if (btn) {
    btn.classList.add('active');
  }

  document.getElementById(
    'att-members-section'
  ).style.display =
    tab === 'members'
      ? 'block'
      : 'none';

  document.getElementById(
    'att-staff-section'
  ).style.display =
    tab === 'staff'
      ? 'block'
      : 'none';

  document.getElementById(
    'att-log-section'
  ).style.display =
    tab === 'log'
      ? 'block'
      : 'none';

  if (tab === 'staff') {
    renderAttStaff();
  }

  if (tab === 'log') {
    renderAttLog();
  }
}

/* =========================================================
   FINISH DAY
========================================================= */

function finishDayPrompt() {
  const currentDate =
    today();

  if (
    !confirm(
      `🌅 هل أنت متأكد من إنهاء يوم ${formatDateAr(currentDate)} وتصفير السجل اليومي؟`
    )
  ) {
    return;
  }

  if (
    daysLog.some(
      day => day.date === currentDate
    )
  ) {
    alert(
      `⚠️ اليوم (${currentDate}) تم إنهاؤه بالفعل.`
    );

    return;
  }

  const todayPaymentsList =
    payments.filter(
      p => p.date === currentDate
    );

  const todayIncomesList =
    todayPaymentsList.map(p => ({
      name: p.memberName,
      sub: p.sub,
      amount:
        Number(p.amount) || 0,
      paymentDate: p.date
    }));

  const todayExpensesList =
    expenses
      .filter(
        e => e.date === currentDate
      )
      .map(e => ({
        id: e.id,
        desc: e.desc,
        cat: e.cat || 'عام',
        amount:
          Number(e.amount) || 0,
        date: e.date
      }));

  const todayAttList =
    attLog
      .filter(
        l => l.date === currentDate
      )
      .map(l => ({
        ...l
      }));

  const todayIncomeTotal =
    todayIncomesList.reduce(
      (a, p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const todayExpTotal =
    todayExpensesList.reduce(
      (a, e) =>
        a +
        Number(e.amount || 0),
      0
    );

  const dayRecord = {
    id: Date.now(),

    date: currentDate,

    attCount:
      todayAttList.length,

    income:
      todayIncomeTotal,

    expenses:
      todayExpTotal,

    net:
      todayIncomeTotal -
      todayExpTotal,

    logDetails:
      todayAttList,

    incomesList:
      todayIncomesList,

    expensesList:
      todayExpensesList
  };

  daysLog.push(
    dayRecord
  );

  /*
    مهم جدًا:
    لا نحذف payments هنا.

    المدفوعات تظل محفوظة بتاريخها
    حتى نقدر نرجع لها في الأرشيف.

    الذي يتم تصفيره فعليًا هو الحضور اليومي.
  */
  attLog =
    attLog.filter(
      l => l.date !== currentDate
    );

  members.forEach(m => {
    m.present = false;
    m.checkIn = null;
    m.checkOut = null;
  });

  staff.forEach(s => {
    s.present = false;
    s.checkIn = null;
    s.checkOut = null;
  });

  save();

  alert(
    `✅ تم إنهاء يوم (${currentDate}) ونقله إلى سجل الأيام بنجاح.`
  );

  renderDashboard();
  renderAttMembers();
  renderAttStaff();
  renderAttLog();
  renderFinance();
  renderDaysLog();
  renderYoussefSection();
}

/* =========================================================
   DAYS LOG
========================================================= */

function renderDaysLog() {
  const dateSearch =
    document.getElementById(
      'days-log-date-search'
    )?.value;

  let filtered =
    daysLog;

  if (dateSearch) {
    filtered =
      daysLog.filter(
        d =>
          d.date === dateSearch
      );
  }

  if (!filtered.length) {
    document.getElementById(
      'days-log-table'
    ).innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا يوجد سجل أيام مطابق
          </div>
        </td>
      </tr>
    `;

    return;
  }

  document.getElementById(
    'days-log-table'
  ).innerHTML =
    filtered
      .slice()
      .sort(
        (a, b) =>
          String(b.date)
            .localeCompare(
              String(a.date)
            )
      )
      .map(d => {
        const realIdx =
          daysLog.indexOf(d);

        return `
          <tr>
            <td>
              <b>${d.date}</b>
              <div class="att-sub">
                ${formatDateAr(d.date)}
              </div>
            </td>

            <td>
              ${Number(d.attCount || 0)}
              شخص
            </td>

            <td
              style="
                color:var(--success);
                font-weight:700
              "
            >
              ${fmt(d.income)}
              ج.م
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(d.expenses)}
              ج.م
            </td>

            <td
              style="
                color:var(--accent);
                font-weight:700
              "
            >
              ${fmt(d.net)}
              ج.م
            </td>

            <td>
              <button
                class="btn btn-sm btn-ghost"
                onclick="viewDayDetails(${realIdx})"
              >
                👁️ التفاصيل والتعديل
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
}

function viewDayDetails(idx) {
  currentDetailType = 'day';
  currentDetailIdx = idx;

  const d =
    daysLog[idx];

  if (!d) return;

  document.getElementById(
    'details-modal-title'
  ).textContent =
    `📅 التفاصيل الشاملة واليومية: ${formatDateAr(d.date)}`;

  let html = `
    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:15px;
        gap:10px;
        flex-wrap:wrap;
      "
    >
      <button
        class="btn btn-sm btn-danger"
        onclick="deleteCurrentDayLog(${idx})"
      >
        🗑️ حذف اليوم بالكامل
      </button>

      <span
        class="badge badge-purple"
        style="font-size:13px"
      >
        صافي اليوم:
        ${fmt(d.net)} ج.م
      </span>
    </div>

    <div
      class="form-grid three"
      style="margin-bottom:15px"
    >
      <div class="form-group">
        <label>تاريخ اليوم</label>
        <input
          type="date"
          id="det-day-date"
          value="${d.date || ''}"
        />
      </div>

      <div class="form-group">
        <label>إجمالي الإيرادات</label>
        <input
          type="number"
          id="det-day-inc"
          value="${Number(d.income || 0)}"
        />
      </div>

      <div class="form-group">
        <label>إجمالي المصروفات</label>
        <input
          type="number"
          id="det-day-exp"
          value="${Number(d.expenses || 0)}"
        />
      </div>
    </div>

    <div class="card-title">
      <span>
        💵 الإيرادات والاشتراكات المحصلة لهذا اليوم
      </span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الاشتراك</th>
            <th>المبلغ المحصل</th>
          </tr>
        </thead>

        <tbody>
  `;

  if (
    !d.incomesList ||
    !d.incomesList.length
  ) {
    html += `
      <tr>
        <td colspan="4">
          <div class="empty">
            لا توجد اشتراكات مسجلة بتاريخ هذا اليوم
          </div>
        </td>
      </tr>
    `;
  } else {
    d.incomesList.forEach(
      (inc, i) => {
        html += `
          <tr>
            <td>${i + 1}</td>
            <td>
              <b>${inc.name}</b>
            </td>
            <td>
              ${inc.sub}
            </td>
            <td
              style="
                color:var(--success);
                font-weight:700
              "
            >
              ${fmt(inc.amount)}
              ج.م
            </td>
          </tr>
        `;
      }
    );
  }

  html += `
        </tbody>
      </table>
    </div>

    <div
      class="card-title"
      style="margin-top:15px"
    >
      <span>
        💸 المصروفات والمستهلكات لهذا اليوم
      </span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الوصف والبيان</th>
            <th>الفئة</th>
            <th>المبلغ</th>
          </tr>
        </thead>

        <tbody>
  `;

  if (
    !d.expensesList ||
    !d.expensesList.length
  ) {
    html += `
      <tr>
        <td colspan="4">
          <div class="empty">
            لا توجد مصروفات مسجلة بهذا اليوم
          </div>
        </td>
      </tr>
    `;
  } else {
    d.expensesList.forEach(
      (exp, i) => {
        html += `
          <tr>
            <td>${i + 1}</td>

            <td>
              <b>${exp.desc}</b>
            </td>

            <td>
              ${exp.cat || 'عام'}
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(exp.amount)}
              ج.م
            </td>
          </tr>
        `;
      }
    );
  }

  html += `
        </tbody>
      </table>
    </div>

    <div
      class="card-title"
      style="margin-top:15px"
    >
      <span>
        🚪 سجل الحضور والانصراف لهذا اليوم
        (${d.attCount || 0} شخص)
      </span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>النوع</th>
            <th>وقت الدخول</th>
            <th>وقت الخروج</th>
          </tr>
        </thead>

        <tbody>
  `;

  if (
    !d.logDetails ||
    !d.logDetails.length
  ) {
    html += `
      <tr>
        <td colspan="5">
          <div class="empty">
            لا يوجد سجل حضور مسجل لهذا اليوم
          </div>
        </td>
      </tr>
    `;
  } else {
    d.logDetails.forEach(
      (att, i) => {
        html += `
          <tr>
            <td>${i + 1}</td>

            <td>
              <b>${att.name}</b>
            </td>

            <td>
              <span
                class="badge ${
                  att.type === 'عضو'
                    ? 'badge-info'
                    : 'badge-purple'
                }"
              >
                ${att.type}
              </span>
            </td>

            <td>
              ${att.checkIn || '—'}
            </td>

            <td>
              ${att.checkOut || '—'}
            </td>
          </tr>
        `;
      }
    );
  }

  html += `
        </tbody>
      </table>
    </div>

    <div class="form-divider"></div>

    <button
      class="btn btn-primary"
      style="width:100%"
      onclick="saveDayDetailsChanges(${idx})"
    >
      💾 حفظ التعديلات على اليوم
    </button>
  `;

  document.getElementById(
    'details-modal-body'
  ).innerHTML = html;

  document.getElementById(
    'modal-details'
  ).classList.add('open');
}

function saveDayDetailsChanges(idx) {
  const d =
    daysLog[idx];

  if (!d) return;

  const dateInput =
    document.getElementById(
      'det-day-date'
    );

  const incomeInput =
    document.getElementById(
      'det-day-inc'
    );

  const expenseInput =
    document.getElementById(
      'det-day-exp'
    );

  if (!dateInput?.value) {
    alert(
      '❌ اختر تاريخ اليوم.'
    );
    return;
  }

  d.date =
    dateInput.value;

  d.income =
    Number(
      incomeInput?.value
    ) || 0;

  d.expenses =
    Number(
      expenseInput?.value
    ) || 0;

  d.net =
    d.income -
    d.expenses;

  save();

  closeModal(
    'modal-details'
  );

  renderDaysLog();

  alert(
    '✅ تم حفظ التعديلات على اليوم بنجاح!'
  );
}

function deleteCurrentDayLog(idx) {
  if (
    !confirm(
      'هل أنت تأكد من حذف هذا اليوم بالكامل من الأرشيف؟'
    )
  ) {
    return;
  }

  const deleted =
    daysLog.splice(idx, 1)[0];

  if (!deleted) return;

  trashBin.push({
    type: 'سجل يوم',
    item: deleted,
    deletedAt: today()
  });

  save();

  closeModal(
    'modal-details'
  );

  renderDaysLog();
  renderTrashBin();
}

/* =========================================================
   STAFF
========================================================= */

function renderStaff() {
  const q =
    document.getElementById(
      'staff-search'
    )?.value || '';

  const list =
    staff.filter(
      s =>
        !q ||
        String(s.name || '')
          .includes(q)
    );

  document.getElementById(
    'staff-table'
  ).innerHTML =
    list.map(s => {
      const idx =
        staff.indexOf(s);

      return `
        <tr>
          <td>
            ${idx + 1}
          </td>

          <td>
            <b>${s.name}</b>
          </td>

          <td>
            <span class="badge badge-purple">
              ${s.role}
            </span>
          </td>

          <td>
            ${s.phone || '—'}
          </td>

          <td
            style="
              font-weight:700;
              color:var(--accent)
            "
          >
            ${fmt(s.salary)}
            ج.م
          </td>

          <td>
            ${s.hire || '—'}
          </td>

          <td>
            <span
              class="badge ${
                s.present
                  ? 'badge-success'
                  : 'badge-gray'
              }"
            >
              ${
                s.present
                  ? 'داخل'
                  : 'خارج'
              }
            </span>
          </td>

          <td>
            <button
              class="btn btn-sm btn-ghost"
              onclick="editStaff(${idx})"
            >
              ✏️
            </button>

            <button
              class="btn btn-sm btn-ghost"
              style="color:var(--danger)"
              onclick="deleteStaffProtected(${idx})"
            >
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
}

function openAddStaff() {
  editStaffIdx = -1;

  [
    's-name',
    's-phone',
    's-salary'
  ].forEach(id => {
    document.getElementById(id).value = '';
  });

  document.getElementById(
    's-hire'
  ).value = today();

  document.getElementById(
    'modal-staff'
  ).classList.add('open');
}

function editStaff(idx) {
  editStaffIdx = idx;

  const s =
    staff[idx];

  if (!s) return;

  document.getElementById(
    's-name'
  ).value = s.name;

  document.getElementById(
    's-phone'
  ).value = s.phone;

  document.getElementById(
    's-role'
  ).value = s.role;

  document.getElementById(
    's-salary'
  ).value = s.salary;

  document.getElementById(
    's-hire'
  ).value = s.hire;

  document.getElementById(
    's-status'
  ).value =
    s.status || 'نشط';

  document.getElementById(
    'modal-staff'
  ).classList.add('open');
}

function saveStaff() {
  const name =
    document.getElementById(
      's-name'
    ).value.trim();

  const phone =
    document.getElementById(
      's-phone'
    ).value.trim();

  if (!name) {
    return;
  }

  if (
    phone &&
    phone.length < 11
  ) {
    alert(
      "❌ رقم الهاتف يجب ألا يقل عن 11 رقم!"
    );
    return;
  }

  const obj = {
    name,

    role:
      document.getElementById(
        's-role'
      ).value,

    phone,

    salary:
      +document.getElementById(
        's-salary'
      ).value || 0,

    hire:
      document.getElementById(
        's-hire'
      ).value,

    status:
      document.getElementById(
        's-status'
      ).value
  };

  if (editStaffIdx >= 0) {
    Object.assign(
      staff[editStaffIdx],
      obj
    );
  } else {
    staff.push({
      id: Date.now(),
      ...obj,
      present: false,
      checkIn: null,
      checkOut: null,
      deductions: 0,
      salaryPaid: false
    });
  }

  save();

  closeModal(
    'modal-staff'
  );

  renderStaff();
}

function deleteStaffProtected(idx) {
  const p =
    prompt(
      'أدخل الباسورد الحذف:'
    );

  if (
    p === ADMIN.pass ||
    p === ADMIN.youssefPass
  ) {
    const deleted =
      staff.splice(idx, 1)[0];

    if (!deleted) return;

    trashBin.push({
      type: 'موظف',
      item: deleted,
      deletedAt: today()
    });

    save();

    renderStaff();
    renderTrashBin();
  }
}

function renderSalary() {
  const total =
    staff.reduce(
      (a, s) =>
        a +
        Number(s.salary || 0) -
        Number(s.deductions || 0),
      0
    );

  const paid =
    staff
      .filter(
        s => s.salaryPaid
      )
      .reduce(
        (a, s) =>
          a +
          Number(s.salary || 0) -
          Number(s.deductions || 0),
        0
      );

  document.getElementById(
    'salary-summary'
  ).innerHTML = `
    <div class="salary-box">
      <div class="salary-num">
        ${fmt(total)} ج.م
      </div>

      <div class="salary-lbl">
        إجمالي الرواتب الصافية
      </div>
    </div>

    <div class="salary-box">
      <div
        class="salary-num"
        style="color:var(--success)"
      >
        ${fmt(paid)} ج.م
      </div>

      <div class="salary-lbl">
        تم الصرف
      </div>
    </div>

    <div class="salary-box">
      <div
        class="salary-num"
        style="color:var(--danger)"
      >
        ${fmt(total - paid)} ج.م
      </div>

      <div class="salary-lbl">
        متبقي
      </div>
    </div>
  `;

  document.getElementById(
    'salary-table'
  ).innerHTML =
    staff.map((s, i) => {
      const net =
        Number(s.salary || 0) -
        Number(s.deductions || 0);

      return `
        <tr>
          <td>
            <b>${s.name}</b>
          </td>

          <td>
            ${s.role}
          </td>

          <td>
            ${fmt(s.salary)}
            ج.م
          </td>

          <td>
            <input
              class="inline-input"
              type="number"
              value="${s.deductions || 0}"
              placeholder="خصم/سلفة"
              onchange="
                staff[${i}].deductions=+this.value;
                save();
                renderSalary()
              "
            />
          </td>

          <td
            style="
              font-weight:700;
              color:var(--accent)
            "
          >
            ${fmt(net)}
            ج.م
          </td>

          <td>
            <span
              class="badge ${
                s.salaryPaid
                  ? 'badge-success'
                  : 'badge-warn'
              }"
            >
              ${
                s.salaryPaid
                  ? '✅ تم الصرف'
                  : '⏳ لم يتم'
              }
            </span>
          </td>

          <td>
            <button
              class="btn btn-sm ${
                s.salaryPaid
                  ? 'btn-ghost'
                  : 'btn-success'
              }"
              onclick="toggleSalary(${i})"
            >
              ${
                s.salaryPaid
                  ? '↩️ إلغاء'
                  : '💸 صرف'
              }
            </button>
          </td>
        </tr>
      `;
    }).join('');
}

function toggleSalary(i) {
  staff[i].salaryPaid =
    !staff[i].salaryPaid;

  save();

  renderSalary();
  renderYoussefSection();
}

/* =========================================================
   FINANCE
========================================================= */

function renderFinance() {
  const todayDate =
    today();

  const todayPaymentsList =
    payments.filter(
      p => p.date === todayDate
    );

  const todayIncome =
    todayPaymentsList.reduce(
      (a, p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const totalDebt =
    members.reduce(
      (a, m) =>
        a +
        Math.max(
          0,
          Number(m.price || 0) -
          Number(m.paid || 0)
        ),
      0
    );

  const todayExpensesList =
    expenses.filter(
      e => e.date === todayDate
    );

  const totalExp =
    todayExpensesList.reduce(
      (a, e) =>
        a +
        Number(e.amount || 0),
      0
    );

  const net =
    todayIncome -
    totalExp;

  document.getElementById(
    'finance-stats'
  ).innerHTML = `
    <div class="stat-card success">
      <div class="stat-num">
        ${fmt(todayIncome)} ج.م
      </div>
      <div class="stat-lbl">
        إيرادات مدفوعات اليوم
      </div>
    </div>

    <div class="stat-card danger">
      <div class="stat-num">
        ${fmt(totalExp)} ج.م
      </div>
      <div class="stat-lbl">
        مصروفات اليوم
      </div>
    </div>

    <div
      class="stat-card ${
        net >= 0
          ? 'success'
          : 'danger'
      }"
    >
      <div class="stat-num">
        ${fmt(net)} ج.م
      </div>
      <div class="stat-lbl">
        الصافي اليومي التجاري
      </div>
    </div>

    <div class="stat-card warn">
      <div class="stat-num">
        ${fmt(totalDebt)} ج.م
      </div>
      <div class="stat-lbl">
        ديون ومستحقات
      </div>
    </div>
  `;

  document.getElementById(
    'finance-income'
  ).innerHTML =
    todayPaymentsList.length
      ? todayPaymentsList
          .map(p => `
            <div class="att-row">
              <div class="att-name">
                ${p.memberName}
                (${p.sub})
              </div>

              <span
                style="
                  color:var(--success);
                  font-weight:700
                "
              >
                ${fmt(p.amount)}
                ج.م
              </span>
            </div>
          `)
          .join('')
      : '<div class="empty">لا توجد إيرادات مسجلة اليوم</div>';

  document.getElementById(
    'finance-expense'
  ).innerHTML =
    todayExpensesList.length
      ? todayExpensesList
          .map(e => `
            <div class="att-row">
              <div>
                <div class="att-name">
                  ${e.desc}
                  (${e.cat || 'عام'})
                </div>

                <div class="att-sub">
                  ${e.date}
                </div>
              </div>

              <span
                style="
                  color:var(--danger);
                  font-weight:700
                "
              >
                ${fmt(e.amount)}
                ج.م
              </span>
            </div>
          `)
          .join('')
      : '<div class="empty">لا توجد مصروفات مسجلة اليوم</div>';

  const debtQuery =
    (
      document.getElementById(
        'debt-search'
      )?.value || ''
    ).trim();

  const debtMembers =
    members.filter(
      m =>
        Number(m.paid || 0) <
        Number(m.price || 0) &&
        (
          !debtQuery ||
          String(m.name || '')
            .includes(debtQuery) ||
          String(m.phone || '')
            .includes(debtQuery)
        )
    );

  if (!debtMembers.length) {
    document.getElementById(
      'debt-table'
    ).innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا توجد ديون مطابقة للبحث
          </div>
        </td>
      </tr>
    `;
  } else {
    document.getElementById(
      'debt-table'
    ).innerHTML =
      debtMembers
        .map(m => `
          <tr>
            <td>
              <b>${m.name}</b>
            </td>

            <td>
              ${m.phone || '—'}
            </td>

            <td>
              ${fmt(m.price)}
              ج.م
            </td>

            <td
              style="color:var(--success)"
            >
              ${fmt(m.paid)}
              ج.م
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(
                Number(m.price || 0) -
                Number(m.paid || 0)
              )}
              ج.م
            </td>

            <td>
              <button
                class="btn btn-sm btn-primary"
                onclick="openPay(${members.indexOf(m)})"
              >
                💳 تحصيل
              </button>
            </td>
          </tr>
        `)
        .join('');
  }
}

function openAddExpense() {
  document.getElementById(
    'exp-desc'
  ).value = '';

  document.getElementById(
    'exp-amount'
  ).value = '';

  document.getElementById(
    'exp-date'
  ).value = today();

  document.getElementById(
    'modal-expense'
  ).classList.add('open');
}

function saveExpense() {
  const desc =
    document.getElementById(
      'exp-desc'
    ).value.trim();

  const amt =
    +document.getElementById(
      'exp-amount'
    ).value || 0;

  const cat =
    document.getElementById(
      'exp-cat'
    ).value;

  const date =
    document.getElementById(
      'exp-date'
    ).value;

  if (
    !desc ||
    !amt ||
    !date
  ) {
    alert(
      'برجاء إدخال وصف ومبلغ وتاريخ المصروف بشكل صحيح'
    );

    return;
  }

  expenses.push({
    id: Date.now(),
    desc,
    cat,
    amount: amt,
    date
  });

  save();

  closeModal(
    'modal-expense'
  );

  renderFinance();
  renderYoussefSection();
}

/* =========================================================
   CAPTAIN YOUSSEF
========================================================= */

function switchYoussefTab(
  tab,
  btn
) {
  document
    .querySelectorAll(
      '#page-youssef .tab-btn'
    )
    .forEach(b =>
      b.classList.remove('active')
    );

  if (btn) {
    btn.classList.add('active');
  }

  document.getElementById(
    'youssef-current-sec'
  ).style.display =
    tab === 'current'
      ? 'block'
      : 'none';

  document.getElementById(
    'youssef-staff-sec'
  ).style.display =
    tab === 'staff-sec'
      ? 'block'
      : 'none';

  document.getElementById(
    'youssef-salary-sec'
  ).style.display =
    tab === 'salary-sec'
      ? 'block'
      : 'none';

  document.getElementById(
    'youssef-archive-sec'
  ).style.display =
    tab === 'archive'
      ? 'block'
      : 'none';

  document.getElementById(
    'youssef-trash-sec'
  ).style.display =
    tab === 'trash-sec'
      ? 'block'
      : 'none';

  if (tab === 'staff-sec') {
    renderStaff();
  }

  if (tab === 'salary-sec') {
    renderSalary();
  }

  if (tab === 'archive') {
    renderYoussefArchive();
  }

  if (tab === 'trash-sec') {
    renderTrashBin();
  }
}

function renderYoussefSection() {
  const currentMonth =
    monthKey(today());

  const currentPayments =
    payments.filter(
      p =>
        monthKey(p.date) ===
        currentMonth
    );

  const currentExpenses =
    expenses.filter(
      e =>
        monthKey(e.date) ===
        currentMonth
    );

  const autoIncome =
    currentPayments.reduce(
      (a, p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const totalIncome =
    manualFixedIncome !== null
      ? Number(manualFixedIncome)
      : autoIncome;

  const totalExp =
    currentExpenses.reduce(
      (a, e) =>
        a +
        Number(e.amount || 0),
      0
    );

  const paidSalaries =
    staff
      .filter(
        s => s.salaryPaid
      )
      .reduce(
        (a, s) =>
          a +
          Number(s.salary || 0) -
          Number(s.deductions || 0),
        0
      );

  const grandTotalExp =
    totalExp +
    paidSalaries;

  const remainingIncome =
    totalIncome -
    grandTotalExp;

  document.getElementById(
    'yous-total-income'
  ).textContent =
    `${fmt(totalIncome)} ج.م`;

  document.getElementById(
    'yous-total-exp'
  ).textContent =
    `${fmt(grandTotalExp)} ج.م`;

  document.getElementById(
    'yous-rem-income'
  ).textContent =
    `${fmt(remainingIncome)} ج.م`;

  let rows = '';

  staff
    .filter(
      s => s.salaryPaid
    )
    .forEach(s => {
      const net =
        Number(s.salary || 0) -
        Number(s.deductions || 0);

      rows += `
        <tr>
          <td>#</td>

          <td>
            مرتب الكابتن/الموظف:
            <b>${s.name}</b>
          </td>

          <td>
            <span class="badge badge-purple">
              مرتبات
            </span>
          </td>

          <td
            style="
              color:var(--danger);
              font-weight:700
            "
          >
            ${fmt(net)}
            ج.م
          </td>

          <td>
            ${today()}
          </td>

          <td>
            <span class="badge badge-gray">
              مرتبط بالرواتب
            </span>
          </td>
        </tr>
      `;
    });

  currentExpenses.forEach(
    e => {
      const originalIdx =
        expenses.indexOf(e);

      rows += `
        <tr>
          <td>
            ${originalIdx + 1}
          </td>

          <td>
            <b>${e.desc}</b>
          </td>

          <td>
            <span class="badge badge-warn">
              ${e.cat || 'مستهلكات'}
            </span>
          </td>

          <td
            style="
              color:var(--danger);
              font-weight:700
            "
          >
            ${fmt(e.amount)}
            ج.م
          </td>

          <td>
            ${e.date}
          </td>

          <td>
            <button
              class="btn btn-sm btn-ghost"
              style="color:var(--danger)"
              onclick="deleteExpense(${originalIdx})"
            >
              🗑️ حذف
            </button>
          </td>
        </tr>
      `;
    }
  );

  if (!rows) {
    rows = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا توجد مصاريف أو مستهلكات مسجلة لهذا الشهر حتى الآن
          </div>
        </td>
      </tr>
    `;
  }

  document.getElementById(
    'youssef-expenses-table'
  ).innerHTML = rows;
}

function openAddYoussefExpense() {
  openAddExpense();
}

function deleteExpense(idx) {
  if (
    !confirm(
      'هل أنت تأكد من حذف هذا المصروف ونقله لسلة المهملات؟'
    )
  ) {
    return;
  }

  const deleted =
    expenses.splice(idx, 1)[0];

  if (!deleted) return;

  trashBin.push({
    type: 'مصروف',
    item: deleted,
    deletedAt: today()
  });

  save();

  renderYoussefSection();
  renderFinance();
  renderTrashBin();
}

function setFixedMonthlyIncome() {
  const input =
    prompt(
      'أدخل إجمالي الدخل الثابت للشهر الحالي (أو اتركه فارغاً للاعتماد على إجمالي اشتراكات الأعضاء تلقائياً):',
      manualFixedIncome !== null
        ? manualFixedIncome
        : ''
    );

  if (input === null) return;

  if (input.trim() === '') {
    manualFixedIncome = null;
  } else {
    const val = +input;

    if (
      !isNaN(val) &&
      val >= 0
    ) {
      manualFixedIncome = val;
    } else {
      alert(
        'مبلغ غير صحيح'
      );
      return;
    }
  }

  save();

  renderYoussefSection();
}

/* =========================================================
   MONTH ARCHIVE
========================================================= */

function closeAndArchiveMonth() {
  const password =
    prompt(
      '🔐 برجاء إدخال كلمة مرور كابتن يوسف لتأكيد إقفال الشهر وترحيله للأرشيف:'
    );

  if (
    password !==
    (
      ADMIN.youssefPass ||
      'mahmoud'
    )
  ) {
    if (password !== null) {
      alert(
        '❌ كلمة المرور غير صحيحة!'
      );
    }

    return;
  }

  const currentMonth =
    monthKey(today());

  const defaultMonthName =
    monthLabel(today());

  const monthName =
    prompt(
      `أدخل اسم/عنوان الشهر لترحيله (مثال: ${defaultMonthName}):`,
      defaultMonthName
    );

  if (!monthName) return;

  /*
    منع أرشفة نفس الشهر مرتين.
  */
  if (
    archives.some(
      a =>
        a.monthKey ===
        currentMonth
    )
  ) {
    alert(
      `⚠️ شهر ${monthName} تم أرشفته بالفعل.`
    );

    return;
  }

  const monthPayments =
    payments.filter(
      p =>
        monthKey(p.date) ===
        currentMonth
    );

  const monthExpenses =
    expenses.filter(
      e =>
        monthKey(e.date) ===
        currentMonth
    );

  const monthDays =
    daysLog
      .filter(
        d =>
          monthKey(d.date) ===
          currentMonth
      )
      .map(d => ({
        ...d
      }));

  const autoIncome =
    monthPayments.reduce(
      (a, p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const totalIncome =
    manualFixedIncome !== null
      ? Number(manualFixedIncome)
      : autoIncome;

  const totalExp =
    monthExpenses.reduce(
      (a, e) =>
        a +
        Number(e.amount || 0),
      0
    );

  const paidSalaries =
    staff
      .filter(
        s => s.salaryPaid
      )
      .reduce(
        (a, s) =>
          a +
          Number(s.salary || 0) -
          Number(s.deductions || 0),
        0
      );

  const grandTotalExp =
    totalExp +
    paidSalaries;

  const monthIncomes =
    monthPayments.map(p => ({
      id: p.id,
      memberId: p.memberId,
      name: p.memberName,
      sub: p.sub,
      amount:
        Number(p.amount || 0),
      date: p.date
    }));

  const monthSalaries =
    staff
      .filter(
        s => s.salaryPaid
      )
      .map(s => ({
        name: s.name,
        role: s.role,
        amount:
          Number(s.salary || 0) -
          Number(s.deductions || 0)
      }));

  const archiveRecord = {
    id: Date.now(),

    /*
      المفتاح الحقيقي للشهر.
      مثال:
      2026-10
    */
    monthKey:
      currentMonth,

    title:
      monthName,

    income:
      totalIncome,

    expenses:
      grandTotalExp,

    net:
      totalIncome -
      grandTotalExp,

    details:
      monthExpenses.map(
        e => ({ ...e })
      ),

    incomes:
      monthIncomes,

    salaries:
      monthSalaries,

    daysList:
      monthDays,

    archivedAt:
      today()
  };

  archives.push(
    archiveRecord
  );

  /*
    نحذف فقط بيانات الشهر الذي تم إقفاله.
    لا نحذف تاريخ الشهور السابقة.
  */
  expenses =
    expenses.filter(
      e =>
        monthKey(e.date) !==
        currentMonth
    );

  payments =
    payments.filter(
      p =>
        monthKey(p.date) !==
        currentMonth
    );

  daysLog =
    daysLog.filter(
      d =>
        monthKey(d.date) !==
        currentMonth
    );

  manualFixedIncome = null;

  staff.forEach(s => {
    s.salaryPaid = false;
    s.deductions = 0;
  });

  save();

  alert(
    `✅ تم إقفال شهر "${monthName}" وترحيله للأرشيف بنجاح.`
  );

  renderYoussefSection();
  renderFinance();
  renderDaysLog();
  renderYoussefArchive();
}

/* =========================================================
   ARCHIVE MONTH LIST
========================================================= */

function renderYoussefArchive() {
  const q =
    (
      document.getElementById(
        'archive-search'
      )?.value || ''
    )
      .trim()
      .toLowerCase();

  const list =
    archives.filter(a => {
      const title =
        String(
          a.title || ''
        ).toLowerCase();

      const archivedAt =
        String(
          a.archivedAt || ''
        ).toLowerCase();

      return (
        !q ||
        title.includes(q) ||
        archivedAt.includes(q)
      );
    });

  if (!list.length) {
    document.getElementById(
      'youssef-archive-table'
    ).innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا يوجد أرشيف مطابق للبحث
          </div>
        </td>
      </tr>
    `;

    return;
  }

  document.getElementById(
    'youssef-archive-table'
  ).innerHTML =
    list
      .slice()
      .reverse()
      .map(a => {
        const realIdx =
          archives.indexOf(a);

        const dayCount =
          Array.isArray(
            a.daysList
          )
            ? a.daysList.length
            : 0;

        return `
          <tr>
            <td>
              <b>
                📅
                ${a.title || monthLabel(a.archivedAt)}
              </b>

              <div class="att-sub">
                ${dayCount}
                يوم محفوظ
              </div>
            </td>

            <td
              style="
                color:var(--success);
                font-weight:700
              "
            >
              ${fmt(a.income)}
              ج.م
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(a.expenses)}
              ج.م
            </td>

            <td
              style="
                color:var(--accent);
                font-weight:700
              "
            >
              ${fmt(a.net)}
              ج.م
            </td>

            <td>
              ${a.archivedAt || '—'}
            </td>

            <td>
              <button
                class="btn btn-sm btn-primary"
                onclick="viewArchiveDetails(${realIdx})"
              >
                📅 الأيام والتفاصيل
              </button>

              <button
                class="btn btn-sm btn-ghost"
                style="color:var(--danger)"
                onclick="deleteArchiveItem(${realIdx})"
              >
                🗑️ حذف
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
}

/*
  يفتح الشهر ويعرض الأيام الخاصة به.
*/
function viewArchiveDetails(idx) {
  const a =
    archives[idx];

  if (!a) return;

  const days =
    Array.isArray(a.daysList)
      ? a.daysList
          .slice()
          .sort(
            (x, y) =>
              String(x.date)
                .localeCompare(
                  String(y.date)
                )
          )
      : [];

  const filteredDays =
    days;

  document.getElementById(
    'details-modal-title'
  ).textContent =
    `📦 ${a.title || monthLabel(a.archivedAt)} — أيام الشهر`;

  let html = `
    <div
      class="stats-grid"
      style="margin-bottom:15px"
    >
      <div class="stat-card success">
        <div class="stat-num">
          ${fmt(a.income)} ج.م
        </div>

        <div class="stat-lbl">
          دخل الشهر
        </div>
      </div>

      <div class="stat-card danger">
        <div class="stat-num">
          ${fmt(a.expenses)} ج.م
        </div>

        <div class="stat-lbl">
          مصروفات الشهر
        </div>
      </div>

      <div class="stat-card info">
        <div class="stat-num">
          ${fmt(a.net)} ج.م
        </div>

        <div class="stat-lbl">
          صافي الشهر
        </div>
      </div>
    </div>

    <div class="card-title">
      <span>
        📅 أيام الشهر المحفوظة
      </span>
    </div>
  `;

  if (!filteredDays.length) {
    html += `
      <div class="empty">
        لا توجد أيام محفوظة داخل هذا الشهر.
      </div>
    `;
  } else {
    html += `
      <div class="archive-days-grid">
    `;

    filteredDays.forEach(
      day => {
        const dayIdx =
          days.indexOf(day);

        const income =
          Number(day.income || 0);

        const expensesTotal =
          Number(
            day.expenses || 0
          );

        html += `
          <div class="archive-day-card">

            <div
              class="archive-day-head"
            >
              <div>
                <b>
                  📅
                  ${formatDateAr(
                    day.date,
                    {
                      weekday: 'long'
                    }
                  )}
                </b>

                <div class="att-sub">
                  ${day.date}
                </div>
              </div>

              <span
                class="badge ${
                  day.net >= 0
                    ? 'badge-success'
                    : 'badge-danger'
                }"
              >
                ${fmt(day.net)}
                ج.م
              </span>
            </div>

            <div
              class="archive-day-stats"
            >
              <span>
                💰 دخل:
                <b>
                  ${fmt(income)}
                </b>
              </span>

              <span>
                💸 مصروف:
                <b>
                  ${fmt(expensesTotal)}
                </b>
              </span>

              <span>
                🚪 حضور:
                <b>
                  ${Number(
                    day.attCount || 0
                  )}
                </b>
              </span>
            </div>

            <div
              class="archive-day-actions"
            >
              <button
                class="btn btn-sm btn-primary"
                onclick="viewArchivedDayDetails(${idx}, ${dayIdx})"
              >
                👁️ عرض اليوم
              </button>

              <button
                class="btn btn-sm btn-ghost"
                onclick="editArchivedDay(${idx}, ${dayIdx})"
              >
                ✏️ تعديل
              </button>

              <button
                class="btn btn-sm btn-danger"
                onclick="deleteArchivedDay(${idx}, ${dayIdx})"
              >
                🗑️ حذف
              </button>
            </div>

          </div>
        `;
      }
    );

    html += `
      </div>
    `;
  }

  document.getElementById(
    'details-modal-body'
  ).innerHTML = html;

  document.getElementById(
    'modal-details'
  ).classList.add('open');
}

function getArchiveDay(
  archiveIdx,
  dayIdx
) {
  const a =
    archives[archiveIdx];

  if (
    !a ||
    !Array.isArray(
      a.daysList
    )
  ) {
    return null;
  }

  return {
    archive: a,
    day:
      a.daysList[dayIdx]
  };
}

function viewArchivedDayDetails(
  archiveIdx,
  dayIdx
) {
  const result =
    getArchiveDay(
      archiveIdx,
      dayIdx
    );

  if (
    !result ||
    !result.day
  ) {
    return;
  }

  const a =
    result.archive;

  const d =
    result.day;

  document.getElementById(
    'day-view-title'
  ).textContent =
    `📅 تفاصيل يوم ${formatDateAr(d.date)}`;

  let html = `
    <div class="stats-grid">

      <div class="stat-card success">
        <div class="stat-num">
          ${fmt(d.income)}
          ج.م
        </div>

        <div class="stat-lbl">
          دخل اليوم
        </div>
      </div>

      <div class="stat-card danger">
        <div class="stat-num">
          ${fmt(d.expenses)}
          ج.م
        </div>

        <div class="stat-lbl">
          مصروفات اليوم
        </div>
      </div>

      <div class="stat-card info">
        <div class="stat-num">
          ${fmt(d.net)}
          ج.م
        </div>

        <div class="stat-lbl">
          صافي اليوم
        </div>
      </div>

    </div>
  `;

  html += `
    <div
      class="card-title"
      style="margin-top:15px"
    >
      <span>
        💰 المدفوعات
      </span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الاشتراك</th>
            <th>المبلغ</th>
          </tr>
        </thead>

        <tbody>
  `;

  if (
    d.incomesList?.length
  ) {
    d.incomesList.forEach(
      (p, i) => {
        html += `
          <tr>
            <td>
              ${i + 1}
            </td>

            <td>
              ${p.name || '—'}
            </td>

            <td>
              ${p.sub || '—'}
            </td>

            <td
              style="
                color:var(--success);
                font-weight:700
              "
            >
              ${fmt(p.amount)}
              ج.م
            </td>
          </tr>
        `;
      }
    );
  } else {
    html += `
      <tr>
        <td colspan="4">
          <div class="empty">
            لا توجد مدفوعات محفوظة لهذا اليوم
          </div>
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  html += `
    <div
      class="card-title"
      style="margin-top:15px"
    >
      <span>
        💸 المصروفات
      </span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الوصف</th>
            <th>الفئة</th>
            <th>المبلغ</th>
          </tr>
        </thead>

        <tbody>
  `;

  if (
    d.expensesList?.length
  ) {
    d.expensesList.forEach(
      (e, i) => {
        html += `
          <tr>
            <td>
              ${i + 1}
            </td>

            <td>
              ${e.desc || '—'}
            </td>

            <td>
              ${e.cat || 'عام'}
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(e.amount)}
              ج.م
            </td>
          </tr>
        `;
      }
    );
  } else {
    html += `
      <tr>
        <td colspan="4">
          <div class="empty">
            لا توجد مصروفات محفوظة لهذا اليوم
          </div>
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  html += `
    <div
      class="card-title"
      style="margin-top:15px"
    >
      <span>
        🚪 الحضور والانصراف
      </span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>النوع</th>
            <th>الدخول</th>
            <th>الخروج</th>
          </tr>
        </thead>

        <tbody>
  `;

  if (
    d.logDetails?.length
  ) {
    d.logDetails.forEach(
      (x, i) => {
        html += `
          <tr>
            <td>
              ${i + 1}
            </td>

            <td>
              ${x.name || '—'}
            </td>

            <td>
              ${x.type || '—'}
            </td>

            <td>
              ${x.checkIn || '—'}
            </td>

            <td>
              ${x.checkOut || '—'}
            </td>
          </tr>
        `;
      }
    );
  } else {
    html += `
      <tr>
        <td colspan="5">
          <div class="empty">
            لا يوجد حضور مسجل لهذا اليوم
          </div>
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>

    <div class="form-divider"></div>

    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap
      "
    >
      <button
        class="btn btn-primary"
        onclick="editArchivedDay(${archiveIdx}, ${dayIdx})"
      >
        ✏️ تعديل اليوم
      </button>

      <button
        class="btn btn-danger"
        onclick="deleteArchivedDay(${archiveIdx}, ${dayIdx})"
      >
        🗑️ حذف اليوم
      </button>
    </div>
  `;

  document.getElementById(
    'day-view-body'
  ).innerHTML = html;

  document.getElementById(
    'modal-day-view'
  ).classList.add('open');
}

function editArchivedDay(
  archiveIdx,
  dayIdx
) {
  const result =
    getArchiveDay(
      archiveIdx,
      dayIdx
    );

  if (
    !result ||
    !result.day
  ) {
    return;
  }

  const d =
    result.day;

  closeModal(
    'modal-details'
  );

  closeModal(
    'modal-day-view'
  );

  document.getElementById(
    'details-modal-title'
  ).textContent =
    `✏️ تعديل يوم ${formatDateAr(d.date)}`;

  document.getElementById(
    'details-modal-body'
  ).innerHTML = `
    <div class="form-grid">

      <div class="form-group">
        <label>
          التاريخ
        </label>

        <input
          type="date"
          id="arch-edit-date"
          value="${d.date || ''}"
        />
      </div>

      <div class="form-group">
        <label>
          عدد الحضور
        </label>

        <input
          type="number"
          id="arch-edit-att"
          min="0"
          value="${Number(d.attCount || 0)}"
        />
      </div>

      <div class="form-group">
        <label>
          إجمالي الدخل
        </label>

        <input
          type="number"
          id="arch-edit-income"
          min="0"
          value="${Number(d.income || 0)}"
        />
      </div>

      <div class="form-group">
        <label>
          إجمالي المصروفات
        </label>

        <input
          type="number"
          id="arch-edit-expenses"
          min="0"
          value="${Number(d.expenses || 0)}"
        />
      </div>

    </div>

    <div class="alert alert-info">
      تعديل بيانات اليوم هنا يعدل سجل اليوم داخل الأرشيف فقط، ويحافظ على بيانات الشهر وباقي الأيام.
    </div>

    <button
      class="btn btn-primary"
      style="width:100%"
      onclick="saveArchivedDayChanges(${archiveIdx}, ${dayIdx})"
    >
      💾 حفظ التعديلات
    </button>
  `;

  document.getElementById(
    'modal-details'
  ).classList.add('open');
}

function saveArchivedDayChanges(
  archiveIdx,
  dayIdx
) {
  const result =
    getArchiveDay(
      archiveIdx,
      dayIdx
    );

  if (
    !result ||
    !result.day
  ) {
    return;
  }

  const a =
    result.archive;

  const d =
    result.day;

  const newDate =
    document.getElementById(
      'arch-edit-date'
    ).value;

  if (!newDate) {
    alert(
      '❌ اختر تاريخ اليوم.'
    );

    return;
  }

  d.date =
    newDate;

  d.attCount =
    Math.max(
      0,
      Number(
        document.getElementById(
          'arch-edit-att'
        ).value
      ) || 0
    );

  d.income =
    Math.max(
      0,
      Number(
        document.getElementById(
          'arch-edit-income'
        ).value
      ) || 0
    );

  d.expenses =
    Math.max(
      0,
      Number(
        document.getElementById(
          'arch-edit-expenses'
        ).value
      ) || 0
    );

  d.net =
    d.income -
    d.expenses;

  /*
    إعادة حساب ملخص الشهر من الأيام.
  */
  if (
    Array.isArray(
      a.daysList
    ) &&
    a.daysList.length
  ) {
    a.daysList.forEach(
      x => {
        x.net =
          Number(x.income || 0) -
          Number(x.expenses || 0);
      }
    );
  }

  a.daysList =
    (
      a.daysList || []
    )
      .slice()
      .sort(
        (x, y) =>
          String(x.date)
            .localeCompare(
              String(y.date)
            )
      );

  /*
    نستخدم إجمالي الأيام المحفوظة
    لملخص الأرشيف بعد التعديل.
  */
  a.income =
    a.daysList.reduce(
      (sum, x) =>
        sum +
        Number(x.income || 0),
      0
    );

  a.expenses =
    a.daysList.reduce(
      (sum, x) =>
        sum +
        Number(x.expenses || 0),
      0
    );

  a.net =
    a.income -
    a.expenses;

  save();

  closeModal(
    'modal-details'
  );

  renderYoussefArchive();

  alert(
    '✅ تم تعديل اليوم داخل الأرشيف بنجاح.'
  );
}

function deleteArchivedDay(
  archiveIdx,
  dayIdx
) {
  const result =
    getArchiveDay(
      archiveIdx,
      dayIdx
    );

  if (
    !result ||
    !result.day
  ) {
    return;
  }

  if (
    !confirm(
      `🗑️ هل أنت متأكد من حذف يوم ${result.day.date} من هذا الأرشيف؟`
    )
  ) {
    return;
  }

  const deleted =
    result.archive.daysList.splice(
      dayIdx,
      1
    )[0];

  if (!deleted) return;

  trashBin.push({
    type:
      'يوم من أرشيف شهر',

    item: {
      archiveId:
        result.archive.id,

      archiveTitle:
        result.archive.title,

      day: deleted
    },

    deletedAt:
      today()
  });

  result.archive.income =
    result.archive.daysList.reduce(
      (sum, x) =>
        sum +
        Number(x.income || 0),
      0
    );

  result.archive.expenses =
    result.archive.daysList.reduce(
      (sum, x) =>
        sum +
        Number(x.expenses || 0),
      0
    );

  result.archive.net =
    result.archive.income -
    result.archive.expenses;

  save();

  closeModal(
    'modal-details'
  );

  closeModal(
    'modal-day-view'
  );

  renderYoussefArchive();
  renderTrashBin();

  alert(
    '✅ تم حذف اليوم من الأرشيف ونقله إلى سلة المهملات.'
  );
}

function deleteArchiveItem(idx) {
  const password =
    prompt(
      'أدخل كلمة المرور لتأكيد حذف هذا الأرشيف:'
    );

  if (
    password === ADMIN.pass ||
    password === ADMIN.youssefPass
  ) {
    const deleted =
      archives.splice(idx, 1)[0];

    if (!deleted) return;

    trashBin.push({
      type: 'أرشيف شهر',
      item: deleted,
      deletedAt: today()
    });

    save();

    renderYoussefArchive();
    renderTrashBin();
  } else if (
    password !== null
  ) {
    alert(
      'كلمة المرور غير صحيحة!'
    );
  }
}

/* =========================================================
   TRASH BIN
========================================================= */

function renderTrashBin() {
  if (!trashBin.length) {
    document.getElementById(
      'trash-table-body'
    ).innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty">
            سلة المهملات فارغة
          </div>
        </td>
      </tr>
    `;

    return;
  }

  document.getElementById(
    'trash-table-body'
  ).innerHTML =
    trashBin
      .slice()
      .reverse()
      .map((t, i) => {
        const realIdx =
          trashBin.indexOf(t);

        let desc =
          t.item?.name ||
          t.item?.desc ||
          t.item?.title ||
          t.item?.date ||
          t.item?.day?.date ||
          'عنصر محذوف';

        return `
          <tr>
            <td>
              ${i + 1}
            </td>

            <td>
              <span class="badge badge-warn">
                ${t.type}
              </span>
            </td>

            <td>
              <b>
                ${desc}
              </b>
            </td>

            <td>
              ${t.deletedAt}
            </td>

            <td>
              <button
                class="btn btn-sm btn-success"
                onclick="restoreTrashItem(${realIdx})"
              >
                ↩️ استعادة
              </button>

              <button
                class="btn btn-sm btn-danger"
                onclick="permanentlyDeleteTrashItem(${realIdx})"
              >
                ❌ حذف نهائي
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
}

function restoreTrashItem(idx) {
  const item =
    trashBin[idx];

  if (!item) return;

  if (
    item.type ===
    'عضو / اشتراك'
  ) {
    members.push(
      item.item
    );
  } else if (
    item.type ===
    'موظف'
  ) {
    staff.push(
      item.item
    );
  } else if (
    item.type ===
    'مصروف'
  ) {
    expenses.push(
      item.item
    );
  } else if (
    item.type ===
    'سجل يوم'
  ) {
    daysLog.push(
      item.item
    );
  } else if (
    item.type ===
    'أرشيف شهر'
  ) {
    archives.push(
      item.item
    );
  } else if (
    item.type ===
    'يوم من أرشيف شهر'
  ) {
    const archive =
      archives.find(
        x =>
          x.id ===
          item.item.archiveId
      );

    if (archive) {
      archive.daysList =
        archive.daysList ||
        [];

      archive.daysList.push(
        item.item.day
      );

      archive.daysList =
        archive.daysList
          .slice()
          .sort(
            (a, b) =>
              String(a.date)
                .localeCompare(
                  String(b.date)
                )
          );

      archive.income =
        archive.daysList.reduce(
          (sum, x) =>
            sum +
            Number(
              x.income || 0
            ),
          0
        );

      archive.expenses =
        archive.daysList.reduce(
          (sum, x) =>
            sum +
            Number(
              x.expenses || 0
            ),
          0
        );

      archive.net =
        archive.income -
        archive.expenses;
    }
  }

  trashBin.splice(
    idx,
    1
  );

  save();

  renderTrashBin();
  renderMembers();
  renderStaff();
  renderFinance();
  renderYoussefSection();
  renderDaysLog();
  renderYoussefArchive();

  alert(
    '✅ تم استعادة العنصر بنجاح!'
  );
}

function permanentlyDeleteTrashItem(idx) {
  if (
    confirm(
      'هل أنت تأكد من حذف هذا العنصر نهائياً؟ لا يمكن التراجع عن هذه الخطوة.'
    )
  ) {
    trashBin.splice(
      idx,
      1
    );

    save();

    renderTrashBin();
  }
}