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

let db = null;
let clockTimer = null;


/* =========================================================
   INITIALIZATION
========================================================= */

window.onload = function () {

  initDatabase(function () {

    if (sessionStorage.getItem('sg_session_active') === 'true') {
      enterApp();
    }

  });

};


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

    db.onversionchange = function () {
      db.close();
    };

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
    admin: ADMIN
  };

  store.put(appState, "app_state");

}


/* =========================================================
   HELPERS
========================================================= */

function today() {

  const d = new Date();

  const y = d.getFullYear();

  const m = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    d.getDate()
  ).padStart(2, '0');

  return `${y}-${m}-${day}`;

}


function nowTime() {

  return new Date()
    .toTimeString()
    .slice(0, 5);

}


function addDays(dateStr, days) {

  const [year, month, day] =
    dateStr.split('-').map(Number);

  const d = new Date(
    year,
    month - 1,
    day
  );

  d.setDate(
    d.getDate() + Number(days || 0)
  );

  const y = d.getFullYear();

  const m = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const dayValue = String(
    d.getDate()
  ).padStart(2, '0');

  return `${y}-${m}-${dayValue}`;

}


function daysLeft(end) {

  if (!end) return 0;

  const [y, m, d] =
    end.split('-').map(Number);

  const target =
    new Date(y, m - 1, d);

  const now = new Date();

  const todayDate =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  return Math.ceil(
    (target - todayDate) / 86400000
  );

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

  if (!i || !o) return '—';

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


function fmt(n) {

  return Number(n || 0)
    .toLocaleString('en-US');

}


function escapeHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


function closeModal(id) {

  const el = document.getElementById(id);

  if (el) {
    el.classList.remove('open');
  }

}


/* =========================================================
   LOGIN / APP
========================================================= */

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

  if (clockTimer) {
    clearInterval(clockTimer);
  }

  function update() {

    const now = new Date();

    const dateEl =
      document.getElementById('top-date');

    const timeEl =
      document.getElementById('top-time');

    if (!dateEl || !timeEl) return;

    dateEl.textContent =
      now.toLocaleDateString(
        'ar-EG',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );

    timeEl.textContent =
      now.toLocaleTimeString(
        'ar-EG',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      );

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

  if (password === null) return;

  if (password === ADMIN.pass) {

    showPage(name, btn);

  } else {

    alert('❌ كلمة المرور غير صحيحة');

  }

}


function checkYoussefAuth(btn) {

  const password =
    prompt(
      'برجاء إدخال كلمة مرور قسم كابتن يوسف:'
    );

  if (password === null) return;

  if (
    password === ADMIN.youssefPass
  ) {

    showPage('youssef', btn);

  } else {

    alert('❌ كلمة المرور غير صحيحة');

  }

}


/* =========================================================
   PAGE CONTROLLER
========================================================= */

function showPage(name, btn) {

  document
    .querySelectorAll('.page')
    .forEach(p => p.classList.remove('active'));

  const page =
    document.getElementById(
      `page-${name}`
    );

  if (!page) return;

  page.classList.add('active');

  document
    .querySelectorAll('.nav-item')
    .forEach(b => b.classList.remove('active'));

  if (btn) {
    btn.classList.add('active');
  }

  if (name === 'dashboard') {
    renderDashboard();
  }

  else if (name === 'members') {
    renderMembers();
  }

  else if (name === 'attendance') {
    renderAttMembers();
    renderAttStaff();
    renderAttLog();
  }

  else if (name === 'days-log') {
    renderDaysLog();
  }

  else if (name === 'finance') {
    renderFinance();
  }

  else if (name === 'youssef') {
    renderYoussefSection();
  }

  else if (name === 'settings') {
    renderSettings();
  }

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const todayDate = today();

  const todayPaymentsList =
    payments.filter(
      p => p.date === todayDate
    );

  const todayIncome =
    todayPaymentsList.reduce(
      (a, p) => a + Number(p.amount || 0),
      0
    );

  const activeMembers =
    members.filter(
      m => daysLeft(m.end) >= 0
    ).length;

  const presentMembers =
    members.filter(
      m => m.present
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

  const expiring =
    members.filter(
      m => {
        const d = daysLeft(m.end);
        return d >= 0 && d <= 7;
      }
    );

  document.getElementById(
    'dash-stats'
  ).innerHTML = `

    <div class="stat-card info">
      <div class="stat-num">${fmt(members.length)}</div>
      <div class="stat-lbl">إجمالي الأعضاء</div>
    </div>

    <div class="stat-card success">
      <div class="stat-num">${fmt(activeMembers)}</div>
      <div class="stat-lbl">الأعضاء النشطون</div>
    </div>

    <div class="stat-card warn">
      <div class="stat-num">${fmt(presentMembers.length)}</div>
      <div class="stat-lbl">المتواجدون الآن</div>
    </div>

    <div class="stat-card success">
      <div class="stat-num">${fmt(todayIncome)} ج.م</div>
      <div class="stat-lbl">إيرادات اليوم</div>
    </div>

  `;


  document.getElementById(
    'dash-expiring'
  ).innerHTML = expiring.length

    ? expiring.map(m => {

        const d = daysLeft(m.end);

        return `
          <div class="att-row">

            <div>
              <div class="att-name">
                ${escapeHtml(m.name)}
              </div>

              <div class="att-sub">
                ${d === 0 ? 'ينتهي اليوم' : `متبقي ${d} يوم`}
              </div>
            </div>

            <span class="badge badge-warn">
              ${escapeHtml(m.end)}
            </span>

          </div>
        `;

      }).join('')

    : '<div class="empty">لا توجد اشتراكات ستنتهي خلال 7 أيام</div>';


  const debtMembers =
    members.filter(
      m =>
        Number(m.paid || 0) <
        Number(m.price || 0)
    );

  document.getElementById(
    'dash-debt'
  ).innerHTML = debtMembers.length

    ? debtMembers.slice(0, 10).map(m => {

        const debt =
          Number(m.price || 0) -
          Number(m.paid || 0);

        return `
          <div class="att-row">

            <div>
              <div class="att-name">
                ${escapeHtml(m.name)}
              </div>

              <div class="att-sub">
                المتبقي: ${fmt(debt)} ج.م
              </div>
            </div>

            <span class="badge badge-danger">
              ${fmt(debt)} ج.م
            </span>

          </div>
        `;

      }).join('')

    : '<div class="empty">لا توجد ديون مستحقة</div>';


  document.getElementById(
    'dash-present'
  ).innerHTML = presentMembers.length

    ? presentMembers.map(m => {

        return `
          <div class="att-row">

            <div>
              <div class="att-name">
                ${escapeHtml(m.name)}
              </div>

              <div class="att-sub">
                دخول: ${m.checkIn || '—'}
              </div>
            </div>

            <span class="badge badge-success">
              داخل الجيم
            </span>

          </div>
        `;

      }).join('')

    : '<div class="empty">لا يوجد أعضاء داخل الجيم حالياً</div>';

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
    ).trim().toLowerCase();

  const list =
    members.filter(m => {

      if (!q) return true;

      return (
        String(m.name || '')
          .toLowerCase()
          .includes(q) ||

        String(m.phone || '')
          .includes(q)
      );

    });


  const table =
    document.getElementById(
      'members-table'
    );

  if (!table) return;


  if (!list.length) {

    table.innerHTML = `
      <tr>
        <td colspan="12">
          <div class="empty">
            لا توجد بيانات مطابقة
          </div>
        </td>
      </tr>
    `;

    return;

  }


  table.innerHTML =
    list.map(m => {

      const idx =
        members.indexOf(m);

      const status =
        memberStatus(m);

      const remaining =
        Math.max(
          0,
          Number(m.price || 0) -
          Number(m.paid || 0)
        );

      return `
        <tr>

          <td>${idx + 1}</td>

          <td>
            <b>${escapeHtml(m.name)}</b>
          </td>

          <td>
            ${escapeHtml(m.phone || '—')}
          </td>

          <td>
            ${escapeHtml(m.age || '—')}
          </td>

          <td>
            <span class="badge badge-info">
              ${escapeHtml(
                SUB_LABELS[m.sub] || m.sub
              )}
            </span>
          </td>

          <td>${escapeHtml(m.start || '—')}</td>

          <td>${escapeHtml(m.end || '—')}</td>

          <td>${fmt(m.price)} ج.م</td>

          <td>${fmt(m.paid)} ج.م</td>

          <td>
            <span style="color:${remaining > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:700">
              ${fmt(remaining)} ج.م
            </span>
          </td>

          <td>
            <span class="badge ${status.cls}">
              ${status.label}
            </span>
          </td>

          <td>

            <div style="display:flex;gap:5px;flex-wrap:wrap">

              <button
                class="btn btn-sm btn-ghost"
                onclick="openEditMember(${idx})"
              >
                ✏️
              </button>

              <button
                class="btn btn-sm btn-success"
                onclick="openPay(${idx})"
              >
                💳
              </button>

              <button
                class="btn btn-sm btn-primary"
                onclick="openRenew(${idx})"
              >
                🔄
              </button>

              <button
                class="btn btn-sm btn-danger"
                onclick="deleteMember(${idx})"
              >
                🗑️
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join('');

}


/* =========================================================
   MEMBER MODAL
========================================================= */

function openAddMember() {

  editMemberIdx = -1;

  document.getElementById(
    'modal-member-title'
  ).textContent =
    '➕ إضافة عضو جديد';

  [
    'm-name',
    'm-phone',
    'm-age',
    'm-coach',
    'm-notes'
  ].forEach(id => {

    const el =
      document.getElementById(id);

    if (el) el.value = '';

  });


  document.getElementById(
    'm-gender'
  ).value = 'ذكر';

  document.getElementById(
    'm-sub'
  ).value = 'monthly';

  document.getElementById(
    'm-price'
  ).value =
    SUB_PRICES.monthly;

  document.getElementById(
    'm-paid'
  ).value = 0;

  const d = today();

  document.getElementById(
    'm-start'
  ).value = d;

  document.getElementById(
    'm-end'
  ).value =
    addDays(
      d,
      SUB_DAYS.monthly
    );

  updateRemaining();
  onSubChange();

  document.getElementById(
    'modal-member'
  ).classList.add('open');

}


function openEditMember(idx) {

  const m = members[idx];

  if (!m) return;

  editMemberIdx = idx;

  document.getElementById(
    'modal-member-title'
  ).textContent =
    '✏️ تعديل بيانات العضو';

  document.getElementById('m-name').value =
    m.name || '';

  document.getElementById('m-phone').value =
    m.phone || '';

  document.getElementById('m-age').value =
    m.age || '';

  document.getElementById('m-gender').value =
    m.gender || 'ذكر';

  document.getElementById('m-sub').value =
    m.sub || 'monthly';

  document.getElementById('m-price').value =
    Number(m.price || 0);

  document.getElementById('m-coach').value =
    m.coach || '';

  document.getElementById('m-start').value =
    m.start || today();

  document.getElementById('m-end').value =
    m.end || addDays(
      today(),
      SUB_DAYS[m.sub] || 30
    );

  document.getElementById('m-paid').value =
    Number(m.paid || 0);

  document.getElementById('m-notes').value =
    m.notes || '';

  onSubChange();
  updateRemaining();

  document.getElementById(
    'modal-member'
  ).classList.add('open');

}


function onSubChange() {

  const sub =
    document.getElementById(
      'm-sub'
    ).value;

  const coachGroup =
    document.getElementById(
      'coach-field-group'
    );

  if (sub === 'private') {

    coachGroup.style.display = 'grid';

  } else {

    coachGroup.style.display = 'none';

  }

  if (
    editMemberIdx === -1
  ) {

    document.getElementById(
      'm-price'
    ).value =
      SUB_PRICES[sub] || 0;

    const start =
      document.getElementById(
        'm-start'
      ).value || today();

    document.getElementById(
      'm-end'
    ).value =
      addDays(
        start,
        SUB_DAYS[sub] || 30
      );

  }

  updateRemaining();

}


function updateRemaining() {

  const price =
    Number(
      document.getElementById(
        'm-price'
      ).value
    ) || 0;

  const paid =
    Number(
      document.getElementById(
        'm-paid'
      ).value
    ) || 0;

  document.getElementById(
    'm-remaining'
  ).value =
    Math.max(0, price - paid);

}


function saveMember() {

  const name =
    document.getElementById(
      'm-name'
    ).value.trim();

  if (!name) {

    alert('❌ اكتب اسم العضو');

    return;

  }

  const phone =
    document.getElementById(
      'm-phone'
    ).value.trim();

  const age =
    Number(
      document.getElementById(
        'm-age'
      ).value
    ) || '';

  const gender =
    document.getElementById(
      'm-gender'
    ).value;

  const sub =
    document.getElementById(
      'm-sub'
    ).value;

  const price =
    Math.max(
      0,
      Number(
        document.getElementById(
          'm-price'
        ).value
      ) || 0
    );

  const paid =
    Math.max(
      0,
      Number(
        document.getElementById(
          'm-paid'
        ).value
      ) || 0
    );

  const start =
    document.getElementById(
      'm-start'
    ).value || today();

  const end =
    document.getElementById(
      'm-end'
    ).value ||
    addDays(
      start,
      SUB_DAYS[sub] || 30
    );

  const coach =
    document.getElementById(
      'm-coach'
    ).value.trim();

  const notes =
    document.getElementById(
      'm-notes'
    ).value.trim();


  const isEditing =
    editMemberIdx >= 0;

  const oldMember =
    isEditing
      ? members[editMemberIdx]
      : null;


  const oldPaid =
    Number(
      oldMember?.paid || 0
    );


  const member = {

    id:
      oldMember?.id ||
      (
        Date.now() +
        Math.floor(
          Math.random() * 10000
        )
      ),

    name,
    phone,
    age,
    gender,
    sub,
    price,
    paid,
    start,
    end,
    coach,
    notes,

    present:
      oldMember?.present || false,

    checkIn:
      oldMember?.checkIn || null,

    checkOut:
      oldMember?.checkOut || null

  };


  if (isEditing) {

    members[editMemberIdx] =
      member;

  } else {

    members.push(member);

  }


  /*
    مهم:
    لو عدلنا بيانات عضو موجود بالفعل
    لا نسجل نفس المدفوع مرة أخرى.

    يتم تسجيل الفرق فقط لو زاد
    المبلغ المدفوع فعلياً.
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

      memberId: member.id,

      memberName: member.name,

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

  closeModal('modal-member');

  renderMembers();

  renderDashboard();

  renderFinance();

}


/* =========================================================
   PAYMENT
========================================================= */

function openPay(idx) {

  editPayIdx = idx;

  const m = members[idx];

  if (!m) return;

  const remaining =
    Math.max(
      0,
      Number(m.price || 0) -
      Number(m.paid || 0)
    );

  document.getElementById(
    'pay-info'
  ).innerHTML = `

    <div style="line-height:1.8">

      <b>العضو:</b>
      ${escapeHtml(m.name)}
      <br>

      <b>المبلغ الكلي:</b>
      ${fmt(m.price)} ج.م
      <br>

      <b>المدفوع:</b>
      ${fmt(m.paid)} ج.م
      <br>

      <b>المتبقي:</b>
      <span style="color:var(--danger)">
        ${fmt(remaining)} ج.م
      </span>

    </div>

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

  if (!m) return;

  const amt =
    Number(
      document.getElementById(
        'pay-amount'
      ).value
    ) || 0;

  if (amt <= 0) {

    alert('❌ أدخل مبلغ صحيح');

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

    alert('⚠️ لا يوجد مبلغ متبقي على العضو');

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

  closeModal('modal-pay');

  renderMembers();

  renderDashboard();

  renderFinance();

}


/* =========================================================
   RENEW
========================================================= */

function openRenew(idx) {

  const m =
    members[idx];

  if (!m) return;

  editRenewIdx = idx;

  document.getElementById(
    'renew-info'
  ).innerHTML = `
    <b>العضو:</b>
    ${escapeHtml(m.name)}
    <br>
    <b>الاشتراك الحالي:</b>
    ${escapeHtml(
      SUB_LABELS[m.sub] || m.sub
    )}
  `;

  document.getElementById(
    'r-sub'
  ).value =
    m.sub || 'monthly';

  document.getElementById(
    'r-price'
  ).value =
    SUB_PRICES[m.sub] || m.price || 0;

  document.getElementById(
    'r-paid'
  ).value = 0;

  const start = today();

  document.getElementById(
    'r-start'
  ).value = start;

  document.getElementById(
    'r-end'
  ).value =
    addDays(
      start,
      SUB_DAYS[m.sub] || 30
    );

  document.getElementById(
    'r-coach'
  ).value =
    m.coach || '';

  onRenewSubChange();
  updateRenewRemaining();

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

  if (sub === 'private') {

    coachGroup.style.display =
      'grid';

  } else {

    coachGroup.style.display =
      'none';

  }

  document.getElementById(
    'r-price'
  ).value =
    SUB_PRICES[sub] || 0;

  const start =
    document.getElementById(
      'r-start'
    ).value || today();

  document.getElementById(
    'r-end'
  ).value =
    addDays(
      start,
      SUB_DAYS[sub] || 30
    );

  updateRenewRemaining();

}


function updateRenewRemaining() {

  const price =
    Number(
      document.getElementById(
        'r-price'
      ).value
    ) || 0;

  const paid =
    Number(
      document.getElementById(
        'r-paid'
      ).value
    ) || 0;

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
    Math.max(
      0,
      Number(
        document.getElementById(
          'r-price'
        ).value
      ) || 0
    );

  const paid =
    Math.max(
      0,
      Number(
        document.getElementById(
          'r-paid'
        ).value
      ) || 0
    );

  const start =
    document.getElementById(
      'r-start'
    ).value || today();

  const end =
    document.getElementById(
      'r-end'
    ).value ||
    addDays(
      start,
      SUB_DAYS[sub] || 30
    );

  const coach =
    document.getElementById(
      'r-coach'
    ).value.trim();


  m.sub = sub;
  m.price = price;
  m.paid = paid;
  m.start = start;
  m.end = end;
  m.coach = coach;

  m.present = false;
  m.checkIn = null;
  m.checkOut = null;


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

  closeModal('modal-renew');

  renderMembers();

  renderDashboard();

  renderFinance();

}


/* =========================================================
   MEMBER DELETE
========================================================= */

function deleteMember(idx) {

  const m =
    members[idx];

  if (!m) return;

  if (
    !confirm(
      `هل أنت متأكد من حذف العضو "${m.name}"؟`
    )
  ) {
    return;
  }

  trashBin.push({

    id:
      Date.now() +
      Math.random(),

    type: 'عضو',

    data:
      JSON.parse(
        JSON.stringify(m)
      ),

    title:
      m.name,

    deletedAt:
      today()

  });

  members.splice(idx, 1);

  payments =
    payments.filter(
      p => p.memberId !== m.id
    );

  save();

  renderMembers();

  renderDashboard();

  renderFinance();

}


/* =========================================================
   ATTENDANCE
========================================================= */

function renderAttMembers() {

  const q =
    (
      document.getElementById(
        'att-search'
      )?.value || ''
    ).trim().toLowerCase();

  const list =
    members.filter(
      m =>
        !q ||
        String(m.name || '')
          .toLowerCase()
          .includes(q)
    );

  const table =
    document.getElementById(
      'att-members-table'
    );

  if (!table) return;


  table.innerHTML =
    list.length

      ? list.map(m => {

          const idx =
            members.indexOf(m);

          return `
            <tr>

              <td>
                <b>${escapeHtml(m.name)}</b>
              </td>

              <td>
                <span class="badge badge-info">
                  ${escapeHtml(
                    SUB_LABELS[m.sub] || m.sub
                  )}
                </span>
              </td>

              <td>

                <span class="badge ${
                  m.present
                    ? 'badge-success'
                    : 'badge-gray'
                }">

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

        }).join('')

      : `
        <tr>
          <td colspan="6">
            <div class="empty">
              لا توجد أعضاء
            </div>
          </td>
        </tr>
      `;

}


function memberCheckIn(idx) {

  const m =
    members[idx];

  if (!m) return;

  if (daysLeft(m.end) < 0) {

    if (
      !confirm(
        '⚠️ اشتراك العضو منتهي. هل تريد تسجيل الدخول على أي حال؟'
      )
    ) {
      return;
    }

  }

  const time =
    nowTime();

  m.present = true;
  m.checkIn = time;
  m.checkOut = null;


  const existing =
    attLog.find(
      x =>
        x.date === today() &&
        x.memberId === m.id
    );

  if (existing) {

    existing.checkIn = time;
    existing.checkOut = null;

  } else {

    attLog.push({

      id:
        Date.now() +
        Math.random(),

      memberId:
        m.id,

      name:
        m.name,

      type:
        'عضو',

      date:
        today(),

      checkIn:
        time,

      checkOut:
        null

    });

  }


  save();

  renderAttMembers();
  renderAttLog();
  renderDashboard();

}


function memberCheckOut(idx) {

  const m =
    members[idx];

  if (!m) return;

  const time =
    nowTime();

  m.present = false;
  m.checkOut = time;


  const log =
    attLog.find(
      x =>
        x.date === today() &&
        x.memberId === m.id &&
        !x.checkOut
    );

  if (log) {

    log.checkOut = time;

  }


  save();

  renderAttMembers();
  renderAttLog();
  renderDashboard();

}


function renderAttStaff() {

  const table =
    document.getElementById(
      'att-staff-table'
    );

  if (!table) return;

  table.innerHTML =
    staff.length

      ? staff.map((s, i) => `

          <tr>

            <td>
              <b>${escapeHtml(s.name)}</b>
            </td>

            <td>
              ${escapeHtml(s.role || '—')}
            </td>

            <td>

              <span class="badge ${
                s.present
                  ? 'badge-success'
                  : 'badge-gray'
              }">

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

        `).join('')

      : `
        <tr>
          <td colspan="6">
            <div class="empty">
              لا يوجد موظفون
            </div>
          </td>
        </tr>
      `;

}


function staffCheckIn(idx) {

  const s =
    staff[idx];

  if (!s) return;

  const time =
    nowTime();

  s.present = true;
  s.checkIn = time;
  s.checkOut = null;


  const existing =
    attLog.find(
      x =>
        x.date === today() &&
        x.staffId === s.id
    );

  if (existing) {

    existing.checkIn = time;
    existing.checkOut = null;

  } else {

    attLog.push({

      id:
        Date.now() +
        Math.random(),

      staffId:
        s.id,

      name:
        s.name,

      type:
        'موظف',

      date:
        today(),

      checkIn:
        time,

      checkOut:
        null

    });

  }


  save();

  renderAttStaff();
  renderAttLog();

}


function staffCheckOut(idx) {

  const s =
    staff[idx];

  if (!s) return;

  const time =
    nowTime();

  s.present = false;
  s.checkOut = time;


  const log =
    attLog.find(
      x =>
        x.date === today() &&
        x.staffId === s.id &&
        !x.checkOut
    );

  if (log) {
    log.checkOut = time;
  }

  save();

  renderAttStaff();
  renderAttLog();

}


function renderAttLog() {

  const table =
    document.getElementById(
      'att-log-table'
    );

  if (!table) return;

  const list =
    attLog.filter(
      x => x.date === today()
    );


  table.innerHTML =
    list.length

      ? list.map((x, i) => `

          <tr>

            <td>${i + 1}</td>

            <td>
              <b>${escapeHtml(x.name)}</b>
            </td>

            <td>
              ${escapeHtml(x.type)}
            </td>

            <td>
              ${x.checkIn || '—'}
            </td>

            <td>
              ${x.checkOut || '—'}
            </td>

            <td>
              ${calcDuration(
                x.checkIn,
                x.checkOut
              )}
            </td>

          </tr>

        `).join('')

      : `
        <tr>
          <td colspan="6">
            <div class="empty">
              لا يوجد سجل دخول اليوم
            </div>
          </td>
        </tr>
      `;

}


function switchAttTab(tab, btn) {

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

}


/* =========================================================
   FINISH DAY
========================================================= */

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
    منع إنهاء نفس اليوم مرتين.
    هذا مهم جداً حتى لا يتم تكرار
    نفس الإيرادات في سجل الأيام.
  */

  if (
    daysLog.some(
      day => day.date === todayDate
    )
  ) {

    alert(
      `⚠️ اليوم (${todayDate}) تم إنهاؤه بالفعل ولا يمكن تسجيله مرة ثانية.`
    );

    return;

  }


  /*
    نأخذ فقط المدفوعات الخاصة باليوم الحالي.
  */

  const todayPaymentsList =
    payments.filter(
      p => p.date === todayDate
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
      (total, item) =>
        total + item.amount,
      0
    );


  const todayExpensesList =
    expenses
      .filter(
        e => e.date === todayDate
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
      (total, item) =>
        total + item.amount,
      0
    );


  const todayAttList =
    attLog.filter(
      l => l.date === todayDate
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
    بعد أرشفة اليوم:
    نمسح فقط العمليات اليومية.
    بيانات العضو نفسه تظل موجودة.
  */

  payments =
    payments.filter(
      p => p.date !== todayDate
    );


  attLog =
    attLog.filter(
      l => l.date !== todayDate
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

}


/* =========================================================
   DAYS LOG
========================================================= */

function renderDaysLog() {

  const searchDate =
    document.getElementById(
      'days-log-date-search'
    )?.value || '';

  const list =
    daysLog
      .filter(
        d =>
          !searchDate ||
          d.date === searchDate
      )
      .slice()
      .reverse();


  const table =
    document.getElementById(
      'days-log-table'
    );

  if (!table) return;


  table.innerHTML =
    list.length

      ? list.map(d => {

          const idx =
            daysLog.indexOf(d);

          return `
            <tr>

              <td>
                <b>${escapeHtml(d.date)}</b>
              </td>

              <td>
                ${fmt(d.attCount)}
              </td>

              <td style="color:var(--success);font-weight:700">
                ${fmt(d.income)} ج.م
              </td>

              <td style="color:var(--danger);font-weight:700">
                ${fmt(d.expenses)} ج.م
              </td>

              <td style="font-weight:700">
                ${fmt(d.net)} ج.م
              </td>

              <td>

                <button
                  class="btn btn-sm btn-primary"
                  onclick="viewDayDetails(${idx})"
                >
                  📋 التفاصيل
                </button>

              </td>

            </tr>
          `;

        }).join('')

      : `
        <tr>
          <td colspan="6">
            <div class="empty">
              لا توجد أيام مؤرشفة
            </div>
          </td>
        </tr>
      `;

}


function viewDayDetails(idx) {

  const d =
    daysLog[idx];

  if (!d) return;

  document.getElementById(
    'day-view-title'
  ).textContent =
    `📅 تفاصيل يوم ${d.date}`;


  const incomes =
    d.incomesList || [];

  const expensesList =
    d.expensesList || [];

  const logs =
    d.logDetails || [];


  document.getElementById(
    'day-view-body'
  ).innerHTML = `

    <div class="stats-grid">

      <div class="stat-card success">
        <div class="stat-num">
          ${fmt(d.income)} ج.م
        </div>

        <div class="stat-lbl">
          إجمالي الإيرادات
        </div>
      </div>

      <div class="stat-card danger">
        <div class="stat-num">
          ${fmt(d.expenses)} ج.م
        </div>

        <div class="stat-lbl">
          إجمالي المصروفات
        </div>
      </div>

      <div class="stat-card info">
        <div class="stat-num">
          ${fmt(d.net)} ج.م
        </div>

        <div class="stat-lbl">
          صافي اليوم
        </div>
      </div>

    </div>


    <div class="card">

      <div class="card-title">
        💵 الإيرادات
      </div>

      ${
        incomes.length

          ? incomes.map(x => `

              <div class="att-row">

                <div>
                  <div class="att-name">
                    ${escapeHtml(x.name)}
                  </div>

                  <div class="att-sub">
                    ${escapeHtml(x.sub || '')}
                  </div>
                </div>

                <b style="color:var(--success)">
                  ${fmt(x.amount)} ج.م
                </b>

              </div>

            `).join('')

          : '<div class="empty">لا توجد إيرادات</div>'
      }

    </div>


    <div class="card">

      <div class="card-title">
        💸 المصروفات
      </div>

      ${
        expensesList.length

          ? expensesList.map(x => `

              <div class="att-row">

                <div>
                  <div class="att-name">
                    ${escapeHtml(x.desc)}
                  </div>

                  <div class="att-sub">
                    ${escapeHtml(x.cat || 'عام')}
                  </div>
                </div>

                <b style="color:var(--danger)">
                  ${fmt(x.amount)} ج.م
                </b>

              </div>

            `).join('')

          : '<div class="empty">لا توجد مصروفات</div>'
      }

    </div>


    <div class="card">

      <div class="card-title">
        🚪 سجل الحضور
      </div>

      ${
        logs.length

          ? `
            <div class="table-wrap">

              <table>

                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>النوع</th>
                    <th>الدخول</th>
                    <th>الخروج</th>
                    <th>المدة</th>
                  </tr>
                </thead>

                <tbody>

                  ${logs.map(x => `

                    <tr>

                      <td>
                        ${escapeHtml(x.name)}
                      </td>

                      <td>
                        ${escapeHtml(x.type)}
                      </td>

                      <td>
                        ${x.checkIn || '—'}
                      </td>

                      <td>
                        ${x.checkOut || '—'}
                      </td>

                      <td>
                        ${calcDuration(
                          x.checkIn,
                          x.checkOut
                        )}
                      </td>

                    </tr>

                  `).join('')}

                </tbody>

              </table>

            </div>
          `

          : '<div class="empty">لا يوجد سجل حضور</div>'
      }

    </div>

  `;


  document
    .getElementById('modal-day-view')
    .classList.add('open');

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
        a + Number(p.amount || 0),
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
        a + Number(e.amount || 0),
      0
    );

  const net =
    todayIncome - totalExp;


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

    <div class="stat-card ${net >= 0 ? 'success' : 'danger'}">
      <div class="stat-num">
        ${fmt(net)} ج.م
      </div>

      <div class="stat-lbl">
        الصافي اليومي
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

      ? todayPaymentsList.map(p => `

          <div class="att-row">

            <div>
              <div class="att-name">
                ${escapeHtml(p.memberName)}
              </div>

              <div class="att-sub">
                ${escapeHtml(p.sub || '')}
              </div>
            </div>

            <span style="color:var(--success);font-weight:700">
              ${fmt(p.amount)} ج.م
            </span>

          </div>

        `).join('')

      : '<div class="empty">لا توجد إيرادات مسجلة اليوم</div>';


  document.getElementById(
    'finance-expense'
  ).innerHTML =

    todayExpensesList.length

      ? todayExpensesList.map(e => `

          <div class="att-row">

            <div>

              <div class="att-name">
                ${escapeHtml(e.desc)}
              </div>

              <div class="att-sub">
                ${escapeHtml(e.cat || 'عام')}
              </div>

            </div>

            <span style="color:var(--danger);font-weight:700">
              ${fmt(e.amount)} ج.م
            </span>

          </div>

        `).join('')

      : '<div class="empty">لا توجد مصروفات مسجلة اليوم</div>';


  const debtQuery =
    (
      document.getElementById(
        'debt-search'
      )?.value || ''
    ).trim().toLowerCase();


  const debtMembers =
    members.filter(m => {

      const remaining =
        Number(m.price || 0) -
        Number(m.paid || 0);

      if (remaining <= 0) {
        return false;
      }

      if (!debtQuery) {
        return true;
      }

      return (
        String(m.name || '')
          .toLowerCase()
          .includes(debtQuery) ||

        String(m.phone || '')
          .includes(debtQuery)
      );

    });


  const debtTable =
    document.getElementById(
      'debt-table'
    );

  if (!debtTable) return;


  debtTable.innerHTML =
    debtMembers.length

      ? debtMembers.map(m => {

          const idx =
            members.indexOf(m);

          const remaining =
            Math.max(
              0,
              Number(m.price || 0) -
              Number(m.paid || 0)
            );

          return `

            <tr>

              <td>
                <b>${escapeHtml(m.name)}</b>
              </td>

              <td>
                ${escapeHtml(m.phone || '—')}
              </td>

              <td>
                ${fmt(m.price)} ج.م
              </td>

              <td>
                ${fmt(m.paid)} ج.م
              </td>

              <td style="color:var(--danger);font-weight:700">
                ${fmt(remaining)} ج.م
              </td>

              <td>

                <button
                  class="btn btn-sm btn-success"
                  onclick="openPay(${idx})"
                >
                  💳 تحصيل
                </button>

              </td>

            </tr>

          `;

        }).join('')

      : `

        <tr>

          <td colspan="6">

            <div class="empty">
              لا توجد ديون مطابقة للبحث
            </div>

          </td>

        </tr>

      `;

}


/* =========================================================
   EXPENSES
========================================================= */

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


function openAddYoussefExpense() {

  openAddExpense();

}


function saveExpense() {

  const desc =
    document.getElementById(
      'exp-desc'
    ).value.trim();

  const cat =
    document.getElementById(
      'exp-cat'
    ).value;

  const amount =
    Number(
      document.getElementById(
        'exp-amount'
      ).value
    ) || 0;

  const date =
    document.getElementById(
      'exp-date'
    ).value || today();


  if (!desc) {

    alert('❌ اكتب وصف المصروف');

    return;

  }

  if (amount <= 0) {

    alert('❌ أدخل مبلغ صحيح');

    return;

  }


  expenses.push({

    id:
      Date.now() +
      Math.random(),

    desc,
    cat,
    amount,
    date

  });


  save();

  closeModal('modal-expense');

  renderFinance();
  renderYoussefSection();

}


function deleteExpense(idx) {

  const e =
    expenses[idx];

  if (!e) return;

  if (
    !confirm(
      `هل تريد حذف المصروف "${e.desc}"؟`
    )
  ) {
    return;
  }


  trashBin.push({

    id:
      Date.now() +
      Math.random(),

    type:
      'مصروف',

    data:
      JSON.parse(
        JSON.stringify(e)
      ),

    title:
      e.desc,

    deletedAt:
      today()

  });


  expenses.splice(
    idx,
    1
  );


  save();

  renderFinance();
  renderYoussefSection();

}


/* =========================================================
   YOUSSEF SECTION
========================================================= */

function switchYoussefTab(tab, btn) {

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


  document
    .querySelectorAll(
      '#page-youssef .tab-btn'
    )
    .forEach(
      b => b.classList.remove('active')
    );


  if (btn) {
    btn.classList.add('active');
  }


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
      (a, p) =>
        a + Number(p.amount || 0),
      0
    );

  const totalIncome =
    manualFixedIncome !== null
      ? Number(manualFixedIncome)
      : autoIncome;


  const totalExp =
    expenses.reduce(
      (a, e) =>
        a + Number(e.amount || 0),
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
    totalExp + paidSalaries;


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

  if (!table) return;


  let rows = '';


  staff
    .filter(s => s.salaryPaid)
    .forEach(s => {

      const net =
        Number(s.salary || 0) -
        Number(s.deductions || 0);

      rows += `

        <tr>

          <td>#</td>

          <td>
            مرتب الكابتن/الموظف:
            <b>${escapeHtml(s.name)}</b>
          </td>

          <td>
            <span class="badge badge-purple">
              مرتبات
            </span>
          </td>

          <td style="color:var(--danger);font-weight:700">
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


  expenses.forEach((e, i) => {

    rows += `

      <tr>

        <td>
          ${i + 1}
        </td>

        <td>
          <b>
            ${escapeHtml(e.desc)}
          </b>
        </td>

        <td>
          <span class="badge badge-warn">
            ${escapeHtml(
              e.cat || 'مستهلكات'
            )}
          </span>
        </td>

        <td style="color:var(--danger);font-weight:700">
          ${fmt(e.amount)} ج.م
        </td>

        <td>
          ${escapeHtml(e.date)}
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

  });


  table.innerHTML =
    rows ||
    `
      <tr>
        <td colspan="6">
          <div class="empty">
            لا توجد مصروفات أو رواتب مسجلة
          </div>
        </td>
      </tr>
    `;

}


function setFixedMonthlyIncome() {

  const current =
    manualFixedIncome !== null
      ? manualFixedIncome
      : payments.reduce(
          (a, p) =>
            a + Number(p.amount || 0),
          0
        );


  const value =
    prompt(
      'أدخل إجمالي دخل الشهر:',
      current
    );

  if (value === null) {
    return;
  }

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {

    alert('❌ أدخل مبلغ صحيح');

    return;

  }

  manualFixedIncome =
    amount;

  save();

  renderYoussefSection();

}


/* =========================================================
   STAFF
========================================================= */

function openAddStaff() {

  editStaffIdx = -1;

  document.getElementById(
    's-name'
  ).value = '';

  document.getElementById(
    's-phone'
  ).value = '';

  document.getElementById(
    's-salary'
  ).value = 0;

  document.getElementById(
    's-hire'
  ).value = today();

  document.getElementById(
    's-status'
  ).value = 'نشط';

  document.getElementById(
    'modal-staff'
  ).classList.add('open');

}


function renderStaff() {

  const q =
    (
      document.getElementById(
        'staff-search'
      )?.value || ''
    ).trim().toLowerCase();


  const list =
    staff.filter(s => {

      if (!q) return true;

      return (
        String(s.name || '')
          .toLowerCase()
          .includes(q) ||

        String(s.phone || '')
          .includes(q)
      );

    });


  const table =
    document.getElementById(
      'staff-table'
    );

  if (!table) return;


  table.innerHTML =
    list.length

      ? list.map(s => {

          const idx =
            staff.indexOf(s);

          return `

            <tr>

              <td>${idx + 1}</td>

              <td>
                <b>${escapeHtml(s.name)}</b>
              </td>

              <td>
                ${escapeHtml(s.role || '—')}
              </td>

              <td>
                ${escapeHtml(s.phone || '—')}
              </td>

              <td>
                ${fmt(s.salary)} ج.م
              </td>

              <td>
                ${escapeHtml(s.hire || '—')}
              </td>

              <td>
                <span class="badge badge-success">
                  ${escapeHtml(s.status || 'نشط')}
                </span>
              </td>

              <td>

                <div style="display:flex;gap:5px">

                  <button
                    class="btn btn-sm btn-ghost"
                    onclick="editStaff(${idx})"
                  >
                    ✏️
                  </button>

                  <button
                    class="btn btn-sm btn-danger"
                    onclick="deleteStaff(${idx})"
                  >
                    🗑️
                  </button>

                </div>

              </td>

            </tr>

          `;

        }).join('')

      : `
        <tr>
          <td colspan="8">
            <div class="empty">
              لا يوجد موظفون
            </div>
          </td>
        </tr>
      `;

}


function saveStaff() {

  const name =
    document.getElementById(
      's-name'
    ).value.trim();

  if (!name) {

    alert('❌ اكتب اسم الموظف');

    return;

  }


  const data = {

    id:
      editStaffIdx >= 0
        ? staff[editStaffIdx].id
        : Date.now() + Math.random(),

    name,

    role:
      document.getElementById(
        's-role'
      ).value,

    phone:
      document.getElementById(
        's-phone'
      ).value.trim(),

    salary:
      Number(
        document.getElementById(
          's-salary'
        ).value
      ) || 0,

    hire:
      document.getElementById(
        's-hire'
      ).value || today(),

    status:
      document.getElementById(
        's-status'
      ).value,

    present:
      editStaffIdx >= 0
        ? staff[editStaffIdx].present || false
        : false,

    checkIn:
      editStaffIdx >= 0
        ? staff[editStaffIdx].checkIn || null
        : null,

    checkOut:
      editStaffIdx >= 0
        ? staff[editStaffIdx].checkOut || null
        : null,

    salaryPaid:
      editStaffIdx >= 0
        ? staff[editStaffIdx].salaryPaid || false
        : false,

    deductions:
      editStaffIdx >= 0
        ? staff[editStaffIdx].deductions || 0
        : 0

  };


  if (editStaffIdx >= 0) {

    staff[editStaffIdx] =
      data;

  } else {

    staff.push(data);

  }


  save();

  closeModal('modal-staff');

  renderStaff();
  renderSalary();
  renderAttStaff();

}


function editStaff(idx) {

  const s =
    staff[idx];

  if (!s) return;

  editStaffIdx = idx;

  document.getElementById(
    's-name'
  ).value = s.name || '';

  document.getElementById(
    's-role'
  ).value = s.role || 'كابتن';

  document.getElementById(
    's-phone'
  ).value = s.phone || '';

  document.getElementById(
    's-salary'
  ).value = s.salary || 0;

  document.getElementById(
    's-hire'
  ).value = s.hire || today();

  document.getElementById(
    's-status'
  ).value = s.status || 'نشط';

  document.getElementById(
    'modal-staff'
  ).classList.add('open');

}


function deleteStaff(idx) {

  const s =
    staff[idx];

  if (!s) return;

  if (
    !confirm(
      `هل تريد حذف الموظف "${s.name}"؟`
    )
  ) {
    return;
  }


  trashBin.push({

    id:
      Date.now() +
      Math.random(),

    type:
      'موظف',

    data:
      JSON.parse(
        JSON.stringify(s)
      ),

    title:
      s.name,

    deletedAt:
      today()

  });


  staff.splice(
    idx,
    1
  );

  save();

  renderStaff();
  renderSalary();
  renderAttStaff();

}


/* =========================================================
   SALARY
========================================================= */

function renderSalary() {

  const summary =
    document.getElementById(
      'salary-summary'
    );

  const table =
    document.getElementById(
      'salary-table'
    );

  if (!summary || !table) {
    return;
  }


  const total =
    staff.reduce(
      (a, s) =>
        a + Number(s.salary || 0),
      0
    );

  const paid =
    staff
      .filter(s => s.salaryPaid)
      .reduce(
        (a, s) =>
          a +
          Number(s.salary || 0) -
          Number(s.deductions || 0),
        0
      );


  const remaining =
    total - paid;


  summary.innerHTML = `

    <div class="stats-grid">

      <div class="stat-card info">
        <div class="stat-num">
          ${fmt(total)} ج.م
        </div>
        <div class="stat-lbl">
          إجمالي الرواتب
        </div>
      </div>

      <div class="stat-card success">
        <div class="stat-num">
          ${fmt(paid)} ج.م
        </div>
        <div class="stat-lbl">
          تم صرفه
        </div>
      </div>

      <div class="stat-card warn">
        <div class="stat-num">
          ${fmt(remaining)} ج.م
        </div>
        <div class="stat-lbl">
          متبقي
        </div>
      </div>

    </div>

  `;


  table.innerHTML =
    staff.length

      ? staff.map((s, i) => {

          const net =
            Number(s.salary || 0) -
            Number(s.deductions || 0);

          return `

            <tr>

              <td>
                <b>${escapeHtml(s.name)}</b>
              </td>

              <td>
                ${escapeHtml(s.role || '—')}
              </td>

              <td>
                ${fmt(s.salary)} ج.م
              </td>

              <td>

                <input
                  class="inline-input"
                  type="number"
                  value="${s.deductions || 0}"
                  placeholder="خصم/سلفة"
                  onchange="
                    staff[${i}].deductions=+this.value || 0;
                    save();
                    renderSalary();
                    renderYoussefSection();
                  "
                />

              </td>

              <td style="font-weight:700;color:var(--accent)">
                ${fmt(net)} ج.م
              </td>

              <td>

                <span class="badge ${
                  s.salaryPaid
                    ? 'badge-success'
                    : 'badge-warn'
                }">

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

        }).join('')

      : `
        <tr>
          <td colspan="7">
            <div class="empty">
              لا يوجد موظفون
            </div>
          </td>
        </tr>
      `;

}


function toggleSalary(i) {

  if (!staff[i]) return;

  staff[i].salaryPaid =
    !staff[i].salaryPaid;

  save();

  renderSalary();
  renderYoussefSection();

}


/* =========================================================
   YOUSSEF ARCHIVE
========================================================= */

function closeAndArchiveMonth() {

  if (
    !confirm(
      '⚠️ هل أنت متأكد من إنهاء الشهر وترحيل البيانات للأرشيف؟'
    )
  ) {
    return;
  }


  const monthName =
    prompt(
      'أدخل اسم/عنوان الشهر لترحيله (مثال: أغسطس 2026):',
      new Date().toLocaleDateString(
        'ar-EG',
        {
          month: 'long',
          year: 'numeric'
        }
      )
    );


  if (!monthName) return;


  const autoIncome =
    payments.reduce(
      (a, p) =>
        a + Number(p.amount || 0),
      0
    );

  const totalIncome =
    manualFixedIncome !== null
      ? Number(manualFixedIncome)
      : autoIncome;


  const totalExp =
    expenses.reduce(
      (a, e) =>
        a + Number(e.amount || 0),
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
    totalExp + paidSalaries;


  const monthIncomes =
    payments.map(
      p => ({
        name:
          p.memberName,
        sub:
          p.sub,
        amount:
          p.amount
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

    s.salaryPaid = false;
    s.deductions = 0;

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
    (
      document.getElementById(
        'archive-search'
      )?.value || ''
    ).trim().toLowerCase();


  const list =
    archives.filter(a => {

      if (!q) return true;

      return (
        String(a.title || '')
          .toLowerCase()
          .includes(q) ||

        String(a.archivedAt || '')
          .includes(q)
      );

    });


  const table =
    document.getElementById(
      'youssef-archive-table'
    );

  if (!table) return;


  table.innerHTML =
    list.length

      ? list
          .slice()
          .reverse()
          .map(a => {

            const realIdx =
              archives.indexOf(a);

            return `

              <tr>

                <td>
                  <b>${escapeHtml(a.title)}</b>
                </td>

                <td style="color:var(--success);font-weight:700">
                  ${fmt(a.income)} ج.م
                </td>

                <td style="color:var(--danger);font-weight:700">
                  ${fmt(a.expenses)} ج.م
                </td>

                <td style="color:var(--accent);font-weight:700">
                  ${fmt(a.net)} ج.م
                </td>

                <td>
                  ${escapeHtml(a.archivedAt)}
                </td>

                <td>

                  <button
                    class="btn btn-sm btn-primary"
                    onclick="viewArchiveDetails(${realIdx})"
                  >
                    📋 التفاصيل
                  </button>

                </td>

              </tr>

            `;

          })
          .join('')

      : `
        <tr>
          <td colspan="6">
            <div class="empty">
              لا يوجد أرشيف مطابق للبحث
            </div>
          </td>
        </tr>
      `;

}


function viewArchiveDetails(idx) {

  const a =
    archives[idx];

  if (!a) return;

  document.getElementById(
    'details-modal-title'
  ).textContent =
    `📦 تفاصيل أرشيف ${a.title}`;


  const incomes =
    a.incomes || [];

  const salaries =
    a.salaries || [];

  const details =
    a.details || [];


  document.getElementById(
    'details-modal-body'
  ).innerHTML = `

    <div class="stats-grid">

      <div class="stat-card success">
        <div class="stat-num">
          ${fmt(a.income)} ج.م
        </div>

        <div class="stat-lbl">
          إجمالي الدخل
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
          الصافي
        </div>
      </div>

    </div>


    <div class="card">

      <div class="card-title">
        💵 الإيرادات
      </div>

      ${
        incomes.length

          ? incomes.map(x => `

              <div class="att-row">

                <div>
                  <div class="att-name">
                    ${escapeHtml(x.name)}
                  </div>

                  <div class="att-sub">
                    ${escapeHtml(x.sub || '')}
                  </div>
                </div>

                <b style="color:var(--success)">
                  ${fmt(x.amount)} ج.م
                </b>

              </div>

            `).join('')

          : '<div class="empty">لا توجد إيرادات</div>'
      }

    </div>


    <div class="card">

      <div class="card-title">
        💸 المصروفات
      </div>

      ${
        details.length

          ? details.map(x => `

              <div class="att-row">

                <div>
                  <div class="att-name">
                    ${escapeHtml(x.desc)}
                  </div>

                  <div class="att-sub">
                    ${escapeHtml(x.cat || 'عام')}
                  </div>
                </div>

                <b style="color:var(--danger)">
                  ${fmt(x.amount)} ج.م
                </b>

              </div>

            `).join('')

          : '<div class="empty">لا توجد مصروفات</div>'
      }

    </div>


    <div class="card">

      <div class="card-title">
        💰 الرواتب
      </div>

      ${
        salaries.length

          ? salaries.map(x => `

              <div class="att-row">

                <div>
                  <div class="att-name">
                    ${escapeHtml(x.name)}
                  </div>

                  <div class="att-sub">
                    ${escapeHtml(x.role || '')}
                  </div>
                </div>

                <b style="color:var(--danger)">
                  ${fmt(x.amount)} ج.م
                </b>

              </div>

            `).join('')

          : '<div class="empty">لا توجد رواتب مصروفة</div>'
      }

    </div>

  `;


  document
    .getElementById(
      'modal-details'
    )
    .classList.add('open');

}


/* =========================================================
   TRASH
========================================================= */

function renderTrashBin() {

  const table =
    document.getElementById(
      'trash-table-body'
    );

  if (!table) return;


  table.innerHTML =
    trashBin.length

      ? trashBin
          .slice()
          .reverse()
          .map((x, reverseIdx) => {

            const idx =
              trashBin.length -
              1 -
              reverseIdx;

            return `

              <tr>

                <td>
                  ${reverseIdx + 1}
                </td>

                <td>
                  <span class="badge badge-danger">
                    ${escapeHtml(x.type)}
                  </span>
                </td>

                <td>
                  ${escapeHtml(
                    x.title || ''
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    x.deletedAt || ''
                  )}
                </td>

                <td>

                  <button
                    class="btn btn-sm btn-success"
                    onclick="restoreTrash(${idx})"
                  >
                    ♻️ استعادة
                  </button>

                  <button
                    class="btn btn-sm btn-danger"
                    onclick="deleteTrashForever(${idx})"
                  >
                    🗑️ حذف نهائي
                  </button>

                </td>

              </tr>

            `;

          })
          .join('')

      : `
        <tr>
          <td colspan="5">
            <div class="empty">
              سلة المهملات فارغة
            </div>
          </td>
        </tr>
      `;

}


function restoreTrash(idx) {

  const item =
    trashBin[idx];

  if (!item) return;


  if (
    item.type === 'عضو'
  ) {

    members.push(
      item.data
    );

  }

  else if (
    item.type === 'موظف'
  ) {

    staff.push(
      item.data
    );

  }

  else if (
    item.type === 'مصروف'
  ) {

    expenses.push(
      item.data
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

}


function deleteTrashForever(idx) {

  if (
    !confirm(
      '⚠️ سيتم حذف العنصر نهائياً ولن يمكن استعادته. هل أنت متأكد؟'
    )
  ) {
    return;
  }

  trashBin.splice(
    idx,
    1
  );

  save();

  renderTrashBin();

}


/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {

  document.getElementById(
    'new-user'
  ).value =
    ADMIN.user;

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


  for (
    let key in SUB_PRICES
  ) {

    html += `

      <div class="form-group" style="margin-bottom:10px">

        <label>
          سعر ${escapeHtml(
            SUB_LABELS[key]
          )}
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
  ).innerHTML =
    html;

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

  document.getElementById(
    'top-admin'
  ).textContent =
    '👤 ' + ADMIN.user;

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


  ADMIN.youssefPass =
    yp;

  save();

  alert(
    '✅ تم حفظ كلمة المرور المخصصة لقسم كابتن يوسف بنجاح!'
  );

  renderSettings();

}


function savePrices() {

  for (
    let key in SUB_PRICES
  ) {

    const input =
      document.getElementById(
        `price-${key}`
      );

    if (!input) continue;

    const val =
      Number(input.value);

    if (
      Number.isFinite(val) &&
      val >= 0
    ) {

      SUB_PRICES[key] =
        val;

    }

  }

  save();

  alert(
    '✅ تم حفظ تعديلات الأسعار بنجاح!'
  );

  renderSettings();

}


/* =========================================================
   CLEAR / RESET
========================================================= */

function clearAttendance() {

  if (
    !confirm(
      '⚠️ هل تريد مسح سجل الحضور اليومي الحالي؟'
    )
  ) {
    return;
  }


  const d =
    today();


  attLog =
    attLog.filter(
      x => x.date !== d
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

  renderAttMembers();
  renderAttStaff();
  renderAttLog();
  renderDashboard();

}


function resetAll() {

  const confirmText =
    prompt(
      '⚠️ سيتم حذف جميع بيانات النظام نهائياً.\n\nاكتب DELETE للتأكيد:'
    );

  if (
    confirmText !== 'DELETE'
  ) {
    return;
  }


  members = [];
  staff = [];
  attLog = [];
  expenses = [];
  archives = [];
  daysLog = [];
  trashBin = [];
  payments = [];

  manualFixedIncome =
    null;


  save();


  alert(
    '✅ تم إعادة ضبط بيانات النظام بالكامل.'
  );


  location.reload();

}


/* =========================================================
   CLOSE MODALS BY CLICKING OUTSIDE
========================================================= */

document.addEventListener(
  'click',
  function (e) {

    if (
      e.target.classList.contains(
        'modal-overlay'
      )
    ) {

      e.target.classList.remove(
        'open'
      );

    }

  }
);