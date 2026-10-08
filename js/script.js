const SUB_DAYS   = { monthly:30, '3months':90, '6months':180, yearly:365, private:30 };
const SUB_LABELS = { monthly:'شهري', '3months':'3 شهور', '6months':'6 شهور', yearly:'سنوي', private:'برايفت' };

let ADMIN = { user:"admin", pass:"shark2024", youssefPass:"mahmoud" };
let SUB_PRICES = { monthly:200, '3months':550, '6months':1000, yearly:1800, private:500 };

let members   = [];
let staff     = [];
let attLog    = [];
let expenses  = [];
let archives  = [];
let daysLog   = [];
let trashBin  = [];
let payments  = [];
let manualFixedIncome = null;

let editMemberIdx = -1, editRenewIdx = -1, editPayIdx = -1, editStaffIdx = -1;
let currentDetailType = '', currentDetailIdx = -1;
let db;
let systemDate = null;
let clockTimer = null;

window.onload = function() {
  initDatabase(function() {
    if (sessionStorage.getItem('sg_session_active') === 'true') {
      enterApp();
    }
  });
};

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// =====================================================
// DATABASE
// =====================================================

function initDatabase(callback) {
  const request = indexedDB.open("SharkGymDB", 6);

  request.onupgradeneeded = function(e) {
    const database = e.target.result;

    if (!database.objectStoreNames.contains("system_config")) {
      database.createObjectStore("system_config");
    }
  };

  request.onsuccess = function(e) {
    db = e.target.result;
    loadDataFromDB(callback);
  };

  request.onerror = function() {
    alert("❌ فشل تشغيل محرك التخزين المتقدم!");
  };
}

function loadDataFromDB(callback) {
  const transaction = db.transaction(["system_config"], "readonly");
  const store = transaction.objectStore("system_config");

  const req = store.get("app_state");

  req.onsuccess = function() {

    if (req.result) {
      const d = req.result;

      members   = d.members || [];
      staff     = d.staff || [];
      attLog    = d.attLog || [];
      expenses  = d.expenses || [];
      archives  = d.archives || [];
      daysLog   = d.daysLog || [];
      trashBin  = d.trashBin || [];
      payments  = d.payments || [];

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
  if (!db) {
    console.warn('SharkGymDB is not ready yet.');
    return;
  }

  const transaction =
    db.transaction(["system_config"], "readwrite");

  const store =
    transaction.objectStore("system_config");

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

// =====================================================
// HELPERS
// =====================================================

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
  return new Date().toTimeString().slice(0,5);
}

function parseDateLocal(dateStr) {
  if (!dateStr) {
    return new Date(NaN);
  }

  const [y, m, d] =
    dateStr.split('-').map(Number);

  return new Date(y, m - 1, d);
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
  const d = parseDateLocal(
    dateStr || today()
  );

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

function fmt(n) {
  return Number(n || 0)
    .toLocaleString('en-US');
}

function memberStatus(m) {
  const dl = daysLeft(m.end);

  if (dl < 0) {
    return {
      label:'منتهي',
      cls:'badge-danger'
    };
  }

  if (dl <= 7) {
    return {
      label:`ينتهي بعد ${dl}ي`,
      cls:'badge-warn'
    };
  }

  return {
    label:'نشط',
    cls:'badge-success'
  };
}

function calcDuration(i, o) {
  if (!i || !o) {
    return '—';
  }

  const [ih, im] =
    i.split(':').map(Number);

  const [oh, om] =
    o.split(':').map(Number);

  let t =
    (oh * 60 + om) -
    (ih * 60 + im);

  if (t < 0) {
    t += 1440;
  }

  return `${Math.floor(t / 60)}س ${t % 60}د`;
}

// =====================================================
// SYSTEM DATE + PASSWORD TOGGLE
// =====================================================

function updateTopDate() {
  const input =
    document.getElementById('top-date-input');

  if (input) {
    input.value = today();
  }
}

function changeSystemDate(value) {
  if (!value) {
    return;
  }

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

function toggleLoginPassword() {
  const input =
    document.getElementById('l-pass');

  const button =
    document.querySelector('.password-toggle');

  if (!input || !button) {
    return;
  }

  const showing =
    input.type === 'text';

  input.type =
    showing ? 'password' : 'text';

  button.textContent =
    showing ? '👁️' : '🙈';

  button.setAttribute(
    'aria-label',
    showing
      ? 'إظهار كلمة المرور'
      : 'إخفاء كلمة المرور'
  );

  button.setAttribute(
    'title',
    showing
      ? 'إظهار كلمة المرور'
      : 'إخفاء كلمة المرور'
  );
}

// =====================================================
// APP CONTROLLER
// =====================================================

function doLogin() {
  const u =
    document.getElementById('l-user')
      .value.trim();

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

    document.getElementById(
      'login-err'
    ).style.display = 'block';

  }
}

function enterApp() {
  document.getElementById(
    'login-screen'
  ).style.display = 'none';

  document.getElementById(
    'app'
  ).style.display = 'block';

  document.getElementById(
    'top-admin'
  ).textContent =
    '👤 ' + ADMIN.user;

  startClock();

  document.getElementById(
    'main-sidebar'
  ).classList.add('open');

  renderDashboard();
}

function doLogout() {
  sessionStorage.removeItem(
    'sg_session_active'
  );

  document.getElementById(
    'app'
  ).style.display = 'none';

  document.getElementById(
    'login-screen'
  ).style.display = 'flex';

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

    const timeEl =
      document.getElementById(
        'top-time'
      );

    if (timeEl) {
      timeEl.textContent =
        now.toLocaleTimeString(
          'ar-EG',
          {
            hour:'2-digit',
            minute:'2-digit',
            second:'2-digit'
          }
        );
    }

    updateTopDate();
  }

  if (clockTimer) {
    clearInterval(clockTimer);
  }

  update();

  clockTimer =
    setInterval(update, 1000);
}

function toggleSidebar() {
  document
    .getElementById('main-sidebar')
    .classList.toggle('open');
}

function checkSectionAuth(name, btn) {

  const password =
    prompt(
      'برجاء إدخال كلمة مرور المسؤول لدخول القسم:'
    );

  if (password === null) {
    return;
  }

  if (password === ADMIN.pass) {
    showPage(name, btn);
  } else {
    alert('كلمة المرور غير صحيحة!');
  }
}

function checkYoussefAuth(btn) {

  const password =
    prompt(
      '🔐 برجاء إدخال كلمة المرور لدخول قسم كابتن يوسف:'
    );

  if (password === null) {
    return;
  }

  if (
    password ===
    (ADMIN.youssefPass || "mahmoud")
  ) {

    showPage(
      'youssef',
      btn
    );

  } else {

    alert(
      '❌ كلمة المرور الخاصة بكابتن يوسف غير صحيحة!'
    );

  }
}

function showPage(name, btn) {

  document
    .querySelectorAll('.page')
    .forEach(
      p => p.classList.remove('active')
    );

  document
    .querySelectorAll('.nav-item')
    .forEach(
      b => b.classList.remove('active')
    );

  const page =
    document.getElementById(
      'page-' + name
    );

  if (page) {
    page.classList.add('active');
  }

  if (btn) {
    btn.classList.add('active');
  }

  if (
    window.innerWidth <= 768
  ) {
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

// =====================================================
// SETTINGS
// =====================================================

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

    if (!input) continue;

    const val =
      +input.value;

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
    confirm(
      'هل أنت تأكد من تصفير سجل الحضور اليومي للمتواجدين بالكامل؟'
    )
  ) {

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
    renderAttMembers();
    renderAttStaff();
    renderAttLog();
  }
}

function resetAll() {

  const p =
    prompt(
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

// =====================================================
// DASHBOARD
// =====================================================

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
      <div class="stat-num">
        ${members.length}
      </div>
      <div class="stat-lbl">
        إجمالي الأعضاء
      </div>
    </div>

    <div class="stat-card success">
      <div class="stat-num">
        ${active}
      </div>
      <div class="stat-lbl">
        اشتراكات نشطة
      </div>
    </div>

    <div class="stat-card warn">
      <div class="stat-num">
        ${expiring}
      </div>
      <div class="stat-lbl">
        تنتهي قريباً
      </div>
    </div>

    <div class="stat-card danger">
      <div class="stat-num">
        ${debts}
      </div>
      <div class="stat-lbl">
        ديون ومستحقات
      </div>
    </div>

    <div class="stat-card info">
      <div class="stat-num">
        ${present}
      </div>
      <div class="stat-lbl">
        أعضاء بالجيم
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-num">
        ${sPresent}
      </div>
      <div class="stat-lbl">
        موظفون الآن
      </div>
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
            `أهلاً بك يا ${m.name} 👋🏼\n` +
            `نود تذكيرك بأن اشتراكك في Shark Gym ينتهي خلال ${daysLeft(m.end)} أيام (بتاريخ ${m.end}).\n` +
            `يسعدنا تجديد اشتراكك للاستمرار في التمرين! 💪🏼🦈`
          );

        return `
          <div class="att-row">

            <div>

              <div class="att-name">
                ${m.name}
                (${m.phone || 'بدون رقم'})
              </div>

              <div class="att-sub">
                ينتهي بعد ${daysLeft(m.end)}
                يوم (${m.end})
              </div>

            </div>

            <div
              style="display:flex;gap:6px"
            >

              ${
                m.phone
                ?
                `
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

    : `
      <div class="empty">
        لا توجد اشتراكات تنتهي قريباً
      </div>
    `;

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

    : `
      <div class="empty">
        لا توجد ديون مستحقة
      </div>
    `;

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
              ${s.role}
              — دخل الساعة ${s.checkIn}
            </div>

          </div>

          <span class="badge badge-purple">
            موظف
          </span>

        </div>
      `;

    });

  } else {

    presHtml = `
      <div class="empty">
        لا يوجد أحد داخل الجيم الآن
      </div>
    `;
  }

  document.getElementById(
    'dash-present'
  ).innerHTML = presHtml;
}

// =====================================================
// MEMBERS
// =====================================================

function renderMembers() {

  const q =
    (
      document.getElementById(
        'member-search'
      )?.value || ''
    ).trim();

  const list =
    members.filter(m => {

      const name =
        String(m.name || '');

      const phone =
        String(m.phone || '');

      return (
        !q ||
        name.includes(q) ||
        phone.includes(q)
      );
    });

  if (!list.length) {

    document.getElementById(
      'members-table'
    ).innerHTML = `
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
  ).innerHTML = list.map(m => {

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
        : (SUB_LABELS[m.sub] || m.sub);

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

        <td>
          ${idx + 1}
        </td>

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

          <span
            class="badge ${st.cls}"
          >
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

    const el =
      document.getElementById(id);

    if (el) {
      el.value = '';
    }

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
    addDays(
      today(),
      30
    );

  onSubChange();

  document.getElementById(
    'modal-member'
  ).classList.add('open');
}

function editMember(idx) {

  editMemberIdx = idx;

  const m =
    members[idx];

  document.getElementById(
    'modal-member-title'
  ).textContent =
    '✏️ تعديل بيانات العضو';

  document.getElementById(
    'm-name'
  ).value =
    m.name || '';

  document.getElementById(
    'm-phone'
  ).value =
    m.phone || '';

  document.getElementById(
    'm-age'
  ).value =
    m.age || '';

  document.getElementById(
    'm-gender'
  ).value =
    m.gender || 'ذكر';

  document.getElementById(
    'm-sub'
  ).value =
    m.sub || 'monthly';

  document.getElementById(
    'm-coach'
  ).value =
    m.coach || '';

  document.getElementById(
    'm-start'
  ).value =
    m.start || today();

  document.getElementById(
    'm-end'
  ).value =
    m.end || addDays(today(),30);

  document.getElementById(
    'm-price'
  ).value =
    m.price || 0;

  document.getElementById(
    'm-paid'
  ).value =
    m.paid || 0;

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
        SUB_PRICES[sub] || 0;
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

  const isEditing =
    editMemberIdx >= 0;

  const oldMember =
    isEditing
      ? members[editMemberIdx]
      : null;

  const oldPaid =
    oldMember
      ? Number(oldMember.paid || 0)
      : 0;

  const mId =
    isEditing
      ? oldMember.id
      : Date.now();

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

  if (isEditing) {

    Object.assign(
      members[editMemberIdx],
      obj
    );

  } else {

    members.push({
      ...obj,
      present:false,
      checkIn:null,
      checkOut:null
    });

  }

  /*
    مهم:
    لو عدلنا بيانات العضو فقط لا نسجل دفعة جديدة.
    نسجل فقط الزيادة الجديدة في المدفوع.
  */

  const newPaymentAmount =
    isEditing
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

      memberId:
        mId,

      memberName:
        name,

      sub:
        sub === 'private'
          ? `برايفت (${coach || 'كابتن'})`
          : SUB_LABELS[sub],

      amount:
        newPaymentAmount,

      date:
        today()
    });
  }

  save();

  closeModal(
    'modal-member'
  );

  renderMembers();
  renderDashboard();
  renderFinance();
  renderYoussefSection();
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
      members.splice(
        idx,
        1
      )[0];

    trashBin.push({
      type:'عضو / اشتراك',
      item:deleted,
      deletedAt:today()
    });

    save();

    renderMembers();
    renderDashboard();
    renderFinance();
    renderTrashBin();

  } else if (
    password !== null
  ) {

    alert(
      'الباسورد غلط!'
    );
  }
}

// =====================================================
// RENEW & PAYMENTS
// =====================================================

function openRenew(idx) {

  editRenewIdx = idx;

  const m =
    members[idx];

  document.getElementById(
    'renew-info'
  ).innerHTML = `
    <b>العضو:</b> ${m.name}<br>
    <b>الاشتراك الحالي:</b>
    ${
      m.sub === 'private'
        ? `برايفت (${m.coach || 'كابتن'})`
        : (SUB_LABELS[m.sub] || m.sub)
    }
    <br>
    <b>ينتهي في:</b> ${m.end}
  `;

  document.getElementById(
    'r-sub'
  ).value =
    'monthly';

  document.getElementById(
    'r-paid'
  ).value = '';

  document.getElementById(
    'r-coach'
  ).value = '';

  document.getElementById(
    'r-start'
  ).value =
    today();

  document.getElementById(
    'r-end'
  ).value =
    addDays(
      today(),
      30
    );

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
      SUB_PRICES[sub] || 0;

    const start =
      document.getElementById(
        'r-start'
      ).value ||
      today();

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

  if (!m) {
    alert(
      '❌ العضو غير موجود'
    );
    return;
  }

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

  m.sub =
    sub;

  m.coach =
    coach;

  m.start =
    start;

  m.end =
    end;

  m.price =
    price;

  m.paid =
    paid;

  if (paid > 0) {

    payments.push({

      id:
        Date.now() +
        Math.random(),

      memberId:
        m.id,

      memberName:
        m.name,

      sub:
        sub === 'private'
          ? `برايفت (${coach || 'كابتن'})`
          : SUB_LABELS[sub],

      amount:
        paid,

      date:
        today()
    });
  }

  save();

  closeModal(
    'modal-renew'
  );

  renderMembers();
  renderDashboard();
  renderFinance();
  renderYoussefSection();
}

function openPay(idx) {

  editPayIdx = idx;

  const m =
    members[idx];

  if (!m) {
    return;
  }

  const total =
    Number(m.price || 0);

  const paid =
    Number(m.paid || 0);

  const remaining =
    Math.max(
      0,
      total - paid
    );

  document.getElementById(
    'pay-info'
  ).innerHTML = `
    <b>العضو:</b> ${m.name}<br>
    <b>المبلغ الكلي:</b>
    ${fmt(total)} ج.م<br>
    <b>المدفوع:</b>
    ${fmt(paid)} ج.م<br>
    <b>المتبقي:</b>
    <span style="color:var(--danger)">
      ${fmt(remaining)} ج.م
    </span>
  `;

  document.getElementById(
    'pay-amount'
  ).value =
    remaining;

  document.getElementById(
    'modal-pay'
  ).classList.add('open');
}

function savePayment() {

  const m =
    members[editPayIdx];

  if (!m) {
    alert(
      '❌ العضو غير موجود'
    );
    return;
  }

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

  const remaining =
    Math.max(
      0,
      Number(m.price || 0) -
      Number(m.paid || 0)
    );

  const actualAmount =
    Math.min(
      amt,
      remaining
    );

  if (actualAmount <= 0) {
    alert(
      '❌ لا يوجد مبلغ متبقي على العضو.'
    );
    return;
  }

  m.paid =
    Number(m.paid || 0) +
    actualAmount;

  payments.push({

    id:
      Date.now() +
      Math.random(),

    memberId:
      m.id,

    memberName:
      m.name,

    sub:
      m.sub === 'private'
        ? `برايفت (${m.coach || 'كابتن'})`
        : SUB_LABELS[m.sub],

    amount:
      actualAmount,

    date:
      today()
  });

  save();

  closeModal(
    'modal-pay'
  );

  renderMembers();
  renderDashboard();
  renderFinance();
  renderYoussefSection();
}

// =====================================================
// ATTENDANCE
// =====================================================

function renderAttMembers() {

  const q =
    document.getElementById(
      'att-search'
    )?.value || '';

  const list =
    members.filter(m => {

      const name =
        String(m.name || '');

      return (
        !q ||
        name.includes(q)
      );
    });

  const table =
    document.getElementById(
      'att-members-table'
    );

  if (!table) {
    return;
  }

  table.innerHTML =
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
              ${
                m.sub === 'private'
                  ? `برايفت (${m.coach || 'كابتن'})`
                  : (SUB_LABELS[m.sub] || m.sub)
              }
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

  const table =
    document.getElementById(
      'att-staff-table'
    );

  if (!table) {
    return;
  }

  table.innerHTML =
    staff.map((s,i) => `

      <tr>

        <td>
          <b>${s.name}</b>
        </td>

        <td>
          ${s.role || '—'}
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

  const table =
    document.getElementById(
      'att-log-table'
    );

  if (!table) {
    return;
  }

  const todayDate =
    today();

  const todayAttLog =
    attLog.filter(
      l => l.date === todayDate
    );

  table.innerHTML =
    todayAttLog
      .slice()
      .reverse()
      .map((l,i) => `

        <tr>

          <td>
            ${i + 1}
          </td>

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

      `).join('');

  if (!todayAttLog.length) {

    table.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا يوجد سجل حضور اليوم
          </div>
        </td>
      </tr>
    `;
  }
}

function memberCheckIn(idx) {

  const m =
    members[idx];

  if (!m) return;

  if (m.present) {
    return;
  }

  m.present = true;
  m.checkIn = nowTime();
  m.checkOut = null;

  attLog.push({
    id:
      Date.now() +
      Math.random(),

    name:
      m.name,

    type:
      'عضو',

    checkIn:
      m.checkIn,

    checkOut:
      null,

    date:
      today()
  });

  save();

  renderAttMembers();
  renderAttLog();
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
          x.type === 'عضو' &&
          x.date === today() &&
          !x.checkOut
      )
      .pop();

  if (rec) {
    rec.checkOut =
      m.checkOut;
  }

  save();

  renderAttMembers();
  renderAttLog();
  renderDashboard();
}

function staffCheckIn(idx) {

  const s =
    staff[idx];

  if (!s) return;

  if (s.present) {
    return;
  }

  s.present = true;
  s.checkIn = nowTime();
  s.checkOut = null;

  attLog.push({

    id:
      Date.now() +
      Math.random(),

    name:
      s.name,

    type:
      'موظف',

    checkIn:
      s.checkIn,

    checkOut:
      null,

    date:
      today()
  });

  save();

  renderAttStaff();
  renderAttLog();
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
          x.type === 'موظف' &&
          x.date === today() &&
          !x.checkOut
      )
      .pop();

  if (rec) {
    rec.checkOut =
      s.checkOut;
  }

  save();

  renderAttStaff();
  renderAttLog();
  renderDashboard();
}

function switchAttTab(tab, btn) {

  document
    .querySelectorAll(
      '#page-attendance .tab-btn'
    )
    .forEach(
      b => b.classList.remove('active')
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

// =====================================================
// FINISH DAY
// =====================================================

function finishDayPrompt() {

  if (
    !confirm(
      "🌅 هل أنت متأكد من إنهاء اليوم وتصفير السجل اليومي ونقله لسجل الأيام؟"
    )
  ) {
    return;
  }

  const todayDate =
    today();

  /*
    منع تسجيل نفس اليوم مرتين.
  */

  if (
    daysLog.some(
      day =>
        day.date === todayDate
    )
  ) {

    alert(
      `⚠️ اليوم (${todayDate}) تم إنهاؤه بالفعل ولا يمكن تسجيله مرة ثانية.`
    );

    return;
  }

  const todayPaymentsList =
    payments.filter(
      p =>
        p.date === todayDate
    );

  const todayIncomesList =
    todayPaymentsList.map(p => ({
      name:
        p.memberName,

      sub:
        p.sub,

      amount:
        Number(p.amount) || 0
    }));

  const todayIncomeTotal =
    todayIncomesList.reduce(
      (a,p) =>
        a + p.amount,
      0
    );

  const todayExpensesList =
    expenses
      .filter(
        e =>
          e.date === todayDate
      )
      .map(e => ({
        desc:
          e.desc,

        cat:
          e.cat || 'عام',

        amount:
          Number(e.amount) || 0
      }));

  const todayExpTotal =
    todayExpensesList.reduce(
      (a,e) =>
        a + e.amount,
      0
    );

  const todayAttList =
    attLog.filter(
      l =>
        l.date === todayDate
    );

  daysLog.push({

    id:
      Date.now(),

    date:
      todayDate,

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
      [...todayAttList],

    incomesList:
      [...todayIncomesList],

    expensesList:
      [...todayExpensesList]
  });

  /*
    مهم جداً:
    لا نحذف payments هنا.

    كل دفعة لها تاريخ مستقل،
    وبالتالي دفعات أمس لن تظهر في اليوم الجديد،
    وفي نفس الوقت تظل موجودة لحساب الشهر والأرشيف.
  */

  attLog =
    attLog.filter(
      l =>
        l.date !== todayDate
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
    `✅ تم إنهاء وتصفير يوم (${todayDate}) ونقله إلى "سجل الأيام" بنجاح!`
  );

  renderDashboard();
  renderAttMembers();
  renderAttStaff();
  renderAttLog();
  renderFinance();
  renderDaysLog();
  renderYoussefSection();
}

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

  const table =
    document.getElementById(
      'days-log-table'
    );

  if (!table) {
    return;
  }

  if (!filtered.length) {

    table.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا يوجد سجل أيام مطبق لهذا التاريخ
          </div>
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    filtered
      .slice()
      .reverse()
      .map(d => {

        const realIdx =
          daysLog.indexOf(d);

        return `
          <tr>

            <td>
              <b>${d.date}</b>
            </td>

            <td>
              ${d.attCount || 0} شخص
            </td>

            <td
              style="
                color:var(--success);
                font-weight:700
              "
            >
              ${fmt(d.income)} ج.م
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(d.expenses)} ج.م
            </td>

            <td
              style="
                color:var(--accent);
                font-weight:700
              "
            >
              ${fmt(d.net)} ج.م
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

      }).join('');
}
function viewDayDetails(idx) {

  currentDetailType = 'day';
  currentDetailIdx = idx;

  const d =
    daysLog[idx];

  if (!d) {
    return;
  }

  document.getElementById(
    'details-modal-title'
  ).textContent =
    `📅 التفاصيل الشاملة واليومية: ${d.date}`;

  let html = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:15px;
        gap:10px;
        flex-wrap:wrap
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

        <label>
          تاريخ اليوم
        </label>

        <input
          type="date"
          id="det-day-date"
          value="${d.date}"
        />

      </div>

      <div class="form-group">

        <label>
          إجمالي الإيرادات (ج.م)
        </label>

        <input
          type="number"
          id="det-day-inc"
          value="${Number(d.income || 0)}"
        />

      </div>

      <div class="form-group">

        <label>
          إجمالي المصروفات (ج.م)
        </label>

        <input
          type="number"
          id="det-day-exp"
          value="${Number(d.expenses || 0)}"
        />

      </div>

    </div>

    <div
      class="card-title"
      style="margin-top:15px"
    >
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
      (inc,i) => {

        html += `
          <tr>

            <td>
              ${i + 1}
            </td>

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
              ${fmt(inc.amount)} ج.م
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
      (exp,i) => {

        html += `
          <tr>

            <td>
              ${i + 1}
            </td>

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
              ${fmt(exp.amount)} ج.م
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
      (att,i) => {

        html += `
          <tr>

            <td>
              ${i + 1}
            </td>

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

  if (!d) {
    return;
  }

  d.date =
    document.getElementById(
      'det-day-date'
    ).value;

  d.income =
    +document.getElementById(
      'det-day-inc'
    ).value || 0;

  d.expenses =
    +document.getElementById(
      'det-day-exp'
    ).value || 0;

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
    confirm(
      'هل أنت تأكد من حذف هذا اليوم بالكامل من الأرشيف؟'
    )
  ) {

    const deleted =
      daysLog.splice(
        idx,
        1
      )[0];

    if (!deleted) {
      return;
    }

    trashBin.push({
      type:'سجل يوم',
      item:deleted,
      deletedAt:today()
    });

    save();

    closeModal(
      'modal-details'
    );

    renderDaysLog();
    renderTrashBin();
  }
}

// =====================================================
// STAFF & SALARIES
// =====================================================

function renderStaff() {

  const q =
    document.getElementById(
      'staff-search'
    )?.value || '';

  const list =
    staff.filter(s => {

      const name =
        String(s.name || '');

      return (
        !q ||
        name.includes(q)
      );
    });

  const table =
    document.getElementById(
      'staff-table'
    );

  if (!table) {
    return;
  }

  if (!list.length) {

    table.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty">
            لا يوجد موظفون
          </div>
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    list.map((s,i) => {

      const realIdx =
        staff.indexOf(s);

      return `
        <tr>

          <td>
            ${i + 1}
          </td>

          <td>
            <b>${s.name}</b>
          </td>

          <td>
            <span class="badge badge-purple">
              ${s.role || '—'}
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
            ${fmt(s.salary)} ج.م
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
              onclick="editStaff(${realIdx})"
            >
              ✏️
            </button>

            <button
              class="btn btn-sm btn-ghost"
              style="color:var(--danger)"
              onclick="deleteStaffProtected(${realIdx})"
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

    const el =
      document.getElementById(id);

    if (el) {
      el.value = '';
    }

  });

  document.getElementById(
    's-role'
  ).value =
    'كابتن';

  document.getElementById(
    's-status'
  ).value =
    'نشط';

  document.getElementById(
    's-hire'
  ).value =
    today();

  document.getElementById(
    'modal-staff'
  ).classList.add('open');
}

function editStaff(idx) {

  editStaffIdx = idx;

  const s =
    staff[idx];

  if (!s) {
    return;
  }

  document.getElementById(
    's-name'
  ).value =
    s.name || '';

  document.getElementById(
    's-phone'
  ).value =
    s.phone || '';

  document.getElementById(
    's-role'
  ).value =
    s.role || 'كابتن';

  document.getElementById(
    's-salary'
  ).value =
    s.salary || 0;

  document.getElementById(
    's-hire'
  ).value =
    s.hire || today();

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
    alert(
      '❌ أدخل اسم الموظف'
    );
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

      id:
        Date.now(),

      ...obj,

      present:false,

      checkIn:null,

      checkOut:null,

      deductions:0,

      salaryPaid:false

    });
  }

  save();

  closeModal(
    'modal-staff'
  );

  renderStaff();
  renderAttStaff();
  renderYoussefSection();
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
      staff.splice(
        idx,
        1
      )[0];

    if (!deleted) {
      return;
    }

    trashBin.push({
      type:'موظف',
      item:deleted,
      deletedAt:today()
    });

    save();

    renderStaff();
    renderAttStaff();
    renderTrashBin();
    renderYoussefSection();

  } else if (
    p !== null
  ) {

    alert(
      '❌ كلمة المرور غير صحيحة!'
    );
  }
}

function renderSalary() {

  const summary =
    document.getElementById(
      'salary-summary'
    );

  const table =
    document.getElementById(
      'salary-table'
    );

  if (!table) {
    return;
  }

  const total =
    staff.reduce(
      (a,s) =>
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
        (a,s) =>
          a +
          Number(s.salary || 0) -
          Number(s.deductions || 0),
        0
      );

  if (summary) {

    summary.innerHTML = `

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
  }

  if (!staff.length) {

    table.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty">
            لا يوجد موظفون
          </div>
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    staff.map((s,i) => {

      const salary =
        Number(s.salary || 0);

      const deductions =
        Number(s.deductions || 0);

      const net =
        salary - deductions;

      return `
        <tr>

          <td>
            <b>${s.name}</b>
          </td>

          <td>
            ${s.role || '—'}
          </td>

          <td>
            ${fmt(salary)} ج.م
          </td>

          <td>

            <input
              class="inline-input"
              type="number"
              value="${deductions}"
              placeholder="خصم/سلفة"
              onchange="
                staff[${i}].deductions=+this.value || 0;
                save();
                renderSalary();
                renderYoussefSection();
              "
            />

          </td>

          <td
            style="
              font-weight:700;
              color:var(--accent)
            "
          >
            ${fmt(net)} ج.م
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

  if (!staff[i]) {
    return;
  }

  staff[i].salaryPaid =
    !staff[i].salaryPaid;

  save();

  renderSalary();
  renderYoussefSection();
}

// =====================================================
// FINANCE
// =====================================================

function renderFinance() {

  const todayDate =
    today();

  const todayPaymentsList =
    payments.filter(
      p =>
        p.date === todayDate
    );

  const todayIncome =
    todayPaymentsList.reduce(
      (a,p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const totalDebt =
    members.reduce(
      (a,m) =>
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
      e =>
        e.date === todayDate
    );

  const totalExp =
    todayExpensesList.reduce(
      (a,e) =>
        a +
        Number(e.amount || 0),
      0
    );

  const net =
    todayIncome -
    totalExp;

  const stats =
    document.getElementById(
      'finance-stats'
    );

  if (stats) {

    stats.innerHTML = `

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
  }

  const incomeEl =
    document.getElementById(
      'finance-income'
    );

  if (incomeEl) {

    incomeEl.innerHTML =
      todayPaymentsList.length

      ? todayPaymentsList.map(
          p => `

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
                ${fmt(p.amount)} ج.م
              </span>

            </div>

          `
        ).join('')

      : `
        <div class="empty">
          لا توجد إيرادات مسجلة اليوم
        </div>
      `;
  }

  const expenseEl =
    document.getElementById(
      'finance-expense'
    );

  if (expenseEl) {

    expenseEl.innerHTML =
      todayExpensesList.length

      ? todayExpensesList.map(
          e => `

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
                ${fmt(e.amount)} ج.م
              </span>

            </div>

          `
        ).join('')

      : `
        <div class="empty">
          لا توجد مصروفات مسجلة اليوم
        </div>
      `;
  }

  const debtQuery =
    (
      document.getElementById(
        'debt-search'
      )?.value || ''
    ).trim();

  const debtMembers =
    members.filter(m => {

      const name =
        String(m.name || '');

      const phone =
        String(m.phone || '');

      return (
        Number(m.paid || 0) <
        Number(m.price || 0)
        &&
        (
          !debtQuery ||
          name.includes(debtQuery) ||
          phone.includes(debtQuery)
        )
      );
    });

  const debtTable =
    document.getElementById(
      'debt-table'
    );

  if (!debtTable) {
    return;
  }

  if (!debtMembers.length) {

    debtTable.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا توجد ديون مطابقة للبحث
          </div>
        </td>
      </tr>
    `;

  } else {

    debtTable.innerHTML =
      debtMembers.map(m => `

        <tr>

          <td>
            <b>${m.name}</b>
          </td>

          <td>
            ${m.phone || '—'}
          </td>

          <td>
            ${fmt(m.price)} ج.م
          </td>

          <td
            style="color:var(--success)"
          >
            ${fmt(m.paid)} ج.م
          </td>

          <td
            style="
              color:var(--danger);
              font-weight:700
            "
          >
            ${
              fmt(
                Number(m.price || 0) -
                Number(m.paid || 0)
              )
            }
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

      `).join('');
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
  ).value =
    today();

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

  if (
    !desc ||
    !amt
  ) {

    alert(
      'برجاء إدخال وصف ومبلغ المصروف بشكل صحيح'
    );

    return;
  }

  const date =
    document.getElementById(
      'exp-date'
    ).value ||
    today();

  expenses.push({

    id:
      Date.now(),

    desc,

    cat,

    amount:
      amt,

    date
  });

  save();

  closeModal(
    'modal-expense'
  );

  renderFinance();
  renderYoussefSection();
}

// =====================================================
// CAPTAIN YOUSSEF
// =====================================================

function switchYoussefTab(tab, btn) {

  document
    .querySelectorAll(
      '#page-youssef .tab-btn'
    )
    .forEach(
      b =>
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

  const autoIncome =
    payments.reduce(
      (a,p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const totalIncome =
    manualFixedIncome !== null
      ? Number(manualFixedIncome || 0)
      : autoIncome;

  const totalExp =
    expenses.reduce(
      (a,e) =>
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
        (a,s) =>
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

  const incomeEl =
    document.getElementById(
      'yous-total-income'
    );

  const expEl =
    document.getElementById(
      'yous-total-exp'
    );

  const remEl =
    document.getElementById(
      'yous-rem-income'
    );

  if (incomeEl) {
    incomeEl.textContent =
      `${fmt(totalIncome)} ج.م`;
  }

  if (expEl) {
    expEl.textContent =
      `${fmt(grandTotalExp)} ج.م`;
  }

  if (remEl) {
    remEl.textContent =
      `${fmt(remainingIncome)} ج.م`;
  }

  const table =
    document.getElementById(
      'youssef-expenses-table'
    );

  if (!table) {
    return;
  }

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

          <td>
            #
          </td>

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
            ${fmt(net)} ج.م
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

  expenses.forEach(
    (e,i) => {

      rows += `

        <tr>

          <td>
            ${i + 1}
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
            ${fmt(e.amount)} ج.م
          </td>

          <td>
            ${e.date}
          </td>

          <td>

            <button
              class="btn btn-sm btn-ghost"
              style="color:var(--danger)"
              onclick="deleteExpense(${i})"
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

  table.innerHTML =
    rows;
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
    expenses.splice(
      idx,
      1
    )[0];

  if (!deleted) {
    return;
  }

  trashBin.push({

    type:
      'مصروف',

    item:
      deleted,

    deletedAt:
      today()
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

  if (input === null) {
    return;
  }

  if (
    input.trim() === ''
  ) {

    manualFixedIncome =
      null;

  } else {

    const val =
      +input;

    if (
      !isNaN(val) &&
      val >= 0
    ) {

      manualFixedIncome =
        val;

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

function closeAndArchiveMonth() {

  const password =
    prompt(
      '🔐 برجاء إدخال كلمة مرور كابتن يوسف لتأكيد إقفال الشهر وترحيله للأرشيف:'
    );

  if (
    password !==
    (ADMIN.youssefPass || "mahmoud")
  ) {

    if (password !== null) {

      alert(
        '❌ كلمة المرور غير صحيحة!'
      );
    }

    return;
  }

  const monthName =
    prompt(
      'أدخل اسم/عنوان الشهر لترحيله (مثال: أغسطس 2026):',
      new Date().toLocaleDateString(
        'ar-EG',
        {
          month:'long',
          year:'numeric'
        }
      )
    );

  if (!monthName) {
    return;
  }

  const autoIncome =
    payments.reduce(
      (a,p) =>
        a +
        Number(p.amount || 0),
      0
    );

  const totalIncome =
    manualFixedIncome !== null
      ? Number(manualFixedIncome || 0)
      : autoIncome;

  const totalExp =
    expenses.reduce(
      (a,e) =>
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
        (a,s) =>
          a +
          Number(s.salary || 0) -
          Number(s.deductions || 0),
        0
      );

  const grandTotalExp =
    totalExp +
    paidSalaries;

  const monthIncomes =
    payments.map(
      p => ({
        name:
          p.memberName,

        sub:
          p.sub,

        amount:
          Number(p.amount || 0)
      })
    );

  const monthSalaries =
    staff
      .filter(
        s => s.salaryPaid
      )
      .map(
        s => ({
          name:
            s.name,

          role:
            s.role,

          amount:
            Number(s.salary || 0) -
            Number(s.deductions || 0)
        })
      );

  const archiveRecord = {

    id:
      Date.now(),

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
      [...expenses],

    incomes:
      monthIncomes,

    salaries:
      monthSalaries,

    daysList:
      [...daysLog],

    archivedAt:
      today()
  };

  archives.push(
    archiveRecord
  );

  expenses = [];
  daysLog = [];
  payments = [];
  manualFixedIncome = null;

  staff.forEach(s => {

    s.salaryPaid =
      false;

    s.deductions =
      0;
  });

  save();

  alert(
    `✅ تم إقفال شهر "${monthName}" وترحيله بنجاح!`
  );

  renderYoussefSection();
  renderFinance();
  renderDaysLog();
}

function renderYoussefArchive() {

  const q =
    document.getElementById(
      'archive-search'
    )?.value || '';

  const list =
    archives.filter(a => {

      const title =
        String(a.title || '');

      const archivedAt =
        String(a.archivedAt || '');

      return (
        !q ||
        title.includes(q) ||
        archivedAt.includes(q)
      );
    });

  const table =
    document.getElementById(
      'youssef-archive-table'
    );

  if (!table) {
    return;
  }

  if (!list.length) {

    table.innerHTML = `
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

  table.innerHTML =
    list
      .slice()
      .reverse()
      .map(a => {

        const realIdx =
          archives.indexOf(a);

        return `
          <tr>

            <td>
              <b>${a.title}</b>
            </td>

            <td
              style="
                color:var(--success);
                font-weight:700
              "
            >
              ${fmt(a.income)} ج.م
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(a.expenses)} ج.م
            </td>

            <td
              style="
                color:var(--accent);
                font-weight:700
              "
            >
              ${fmt(a.net)} ج.م
            </td>

            <td>
              ${a.archivedAt}
            </td>

            <td>

              <button
                class="btn btn-sm btn-ghost"
                onclick="viewArchiveDetails(${realIdx})"
              >
                👁️ التفاصيل
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

      }).join('');
}

function viewArchiveDetails(idx) {

  const a =
    archives[idx];

  if (!a) {
    return;
  }

  document.getElementById(
    'details-modal-title'
  ).textContent =
    `📦 أرشيف: ${a.title}`;

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
          إجمالي دخل الشهر
        </div>

      </div>

      <div class="stat-card danger">

        <div class="stat-num">
          ${fmt(a.expenses)} ج.م
        </div>

        <div class="stat-lbl">
          إجمالي المنصرف
        </div>

      </div>

      <div class="stat-card info">

        <div class="stat-num">
          ${fmt(a.net)} ج.م
        </div>

        <div class="stat-lbl">
          الصافي (الأرباح)
        </div>

      </div>

    </div>

    <div class="card-title">
      <span>
        💵 تفاصيل الاشتراكات والمدفوعات
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
    !a.incomes ||
    !a.incomes.length
  ) {

    html += `
      <tr>
        <td colspan="4">
          <div class="empty">
            لا توجد تفاصيل مدفوعات مسجلة
          </div>
        </td>
      </tr>
    `;

  } else {

    a.incomes.forEach(
      (inc,i) => {

        html += `
          <tr>

            <td>
              ${i + 1}
            </td>

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
              ${fmt(inc.amount)} ج.م
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
        💸 المصروفات والمستهلكات والرواتب
      </span>
    </div>

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>#</th>
            <th>البيان</th>
            <th>الفئة / النوع</th>
            <th>المبلغ</th>
          </tr>

        </thead>

        <tbody>
  `;

  if (
    a.salaries &&
    a.salaries.length
  ) {

    a.salaries.forEach(
      s => {

        html += `
          <tr>

            <td>
              #
            </td>

            <td>
              مرتب:
              <b>${s.name}</b>
            </td>

            <td>
              رواتب
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(s.amount)} ج.م
            </td>

          </tr>
        `;
      }
    );
  }

  if (
    a.details &&
    a.details.length
  ) {

    a.details.forEach(
      (e,i) => {

        html += `
          <tr>

            <td>
              ${i + 1}
            </td>

            <td>
              <b>${e.desc}</b>
            </td>

            <td>
              ${e.cat || 'مستهلكات'}
            </td>

            <td
              style="
                color:var(--danger);
                font-weight:700
              "
            >
              ${fmt(e.amount)} ج.م
            </td>

          </tr>
        `;
      }
    );
  }

  if (
    (!a.salaries ||
      !a.salaries.length)
    &&
    (!a.details ||
      !a.details.length)
  ) {

    html += `
      <tr>
        <td colspan="4">
          <div class="empty">
            لا توجد مصروفات مسجلة بهذا الشهر
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

  document.getElementById(
    'details-modal-body'
  ).innerHTML =
    html;

  document.getElementById(
    'modal-details'
  ).classList.add('open');
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
      archives.splice(
        idx,
        1
      )[0];

    if (!deleted) {
      return;
    }

    trashBin.push({

      type:
        'أرشيف شهر',

      item:
        deleted,

      deletedAt:
        today()
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

// =====================================================
// TRASH BIN
// =====================================================

function renderTrashBin() {

  const table =
    document.getElementById(
      'trash-table-body'
    );

  if (!table) {
    return;
  }

  if (!trashBin.length) {

    table.innerHTML = `
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

  table.innerHTML =
    trashBin
      .slice()
      .reverse()
      .map(
        (t,i) => {

          const realIdx =
            trashBin.indexOf(t);

          const item =
            t.item || {};

          const desc =
            item.name ||
            item.desc ||
            item.title ||
            item.date ||
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
                <b>${desc}</b>
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
        }
      ).join('');
}

function restoreTrashItem(idx) {

  const item =
    trashBin[idx];

  if (!item) {
    return;
  }

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