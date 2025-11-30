// =========================
// EVENTS & REGISTRATIONS MANAGEMENT (clean single-file)
// =========================

const SAMPLE_EVENTS = [
  {"id":"E1001","title":"AI & Society Conference","date":"2025-11-10","location":"Cairo Convention Center","category":"conference","description":"A conference about AI impacts.","numberOfSeats":200},
  {"id":"E1002","title":"Web Dev Workshop","date":"2025-10-28","location":"Giza Tech Hub","category":"workshop","description":"Hands-on workshop on modern web.","numberOfSeats":40},
  {"id":"E1003","title":"Campus Meetup","date":"2025-12-02","location":"AUC Campus","category":"meetup","description":"Student meetup for networking.","numberOfSeats":100}
];

// --- Storage helpers (single canonical place for events + regs)
const EVENTS_KEY = 'events_v1';
const REGS_KEY = 'regs_v1';

// Return array of events (seed from SAMPLE_EVENTS if missing)
function getEvents(){
  const stored = localStorage.getItem(EVENTS_KEY);
  if(stored){
    try { return JSON.parse(stored); } catch(e){ /* fallthrough */ }
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(SAMPLE_EVENTS));
  return SAMPLE_EVENTS.slice();
}
function saveEvents(arr){
  localStorage.setItem(EVENTS_KEY, JSON.stringify(arr));
}

// regs helpers
function getRegistrations(){
  const stored = localStorage.getItem(REGS_KEY);
  return stored ? JSON.parse(stored) : [];
}
function saveRegistrations(arr){
  localStorage.setItem(REGS_KEY, JSON.stringify(arr));
}

// Shorthand query
function qs(q){ return document.querySelector(q); }
function qsa(q){ return document.querySelectorAll(q); }

// Auth helper (provided by auth.js)
function getCurrentUser(){
  try { return JSON.parse(sessionStorage.getItem('currentUser')); } catch(e){ return null; }
}

/* -------------------------
   Render events list (events.html)
   ------------------------- */
function renderEventsList(list){
  const container = document.getElementById('events-list');
  if(!container) return;
  container.innerHTML = list.map(ev=>`
    <article class="event">
      <h3>${ev.title} <small>(${ev.id})</small></h3>
      <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
      <p>${ev.description}</p>
      <!-- use URL param (consistent with your HTML) -->
      <a class="card" href="event-detail.html?id=${encodeURIComponent(ev.id)}">Details</a>
    </article>
  `).join('');
}

/* -------------------------
   Search / filter logic
   ------------------------- */
function applyFilters(){
  // guard if inputs missing
  const qEl = document.getElementById('q');
  if(!qEl) return;

  const q = qEl.value.trim().toLowerCase();
  const date = document.getElementById('date').value;
  const location = document.getElementById('location').value.trim().toLowerCase();
  const category = document.getElementById('category').value;
  const minSeats = parseInt(document.getElementById('minSeats').value || '0',10);

  const all = getEvents();
  const filtered = all.filter(ev=>{
    if(q && !(ev.id.toLowerCase().includes(q) || ev.title.toLowerCase().includes(q))) return false;
    if(date && ev.date !== date) return false;
    if(location && !ev.location.toLowerCase().includes(location)) return false;
    if(category && ev.category !== category) return false;
    if(ev.numberOfSeats < minSeats) return false;
    return true;
  });

  renderEventsList(filtered);
}

/* -------------------------
   Event detail page (event-detail.html)
   - uses ?id=E1001 URL param
   - register requires logged-in user (auth.js's session)
   - if user registers again for same event we combine seats into single pending reg (so admin sees combined request)
   ------------------------- */
function renderEventDetailFromURL(){
  const detailBox = document.getElementById('event-detail');
  if(!detailBox) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if(!id){
    detailBox.textContent = 'No event ID provided.';
    return;
  }

  const events = getEvents();
  const ev = events.find(e=>e.id === id);
  if(!ev){
    detailBox.textContent = 'Event not found.';
    return;
  }

  detailBox.innerHTML = `
    <h2>${ev.title} <small>(${ev.id})</small></h2>
    <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
    <p>${ev.description}</p>
  `;

  // Register form behaviour (if present)
  const regForm = document.getElementById('register-form');
  if(regForm){
    regForm.addEventListener('submit', (e)=>{
      e.preventDefault();

      const currentUser = getCurrentUser();
      if(!currentUser){
        alert('You must be logged in to register.');
        window.location.href = 'login.html';
        return;
      }

      const fd = new FormData(regForm);
      const fullname = (fd.get('fullname') || '').trim();
      const email = (fd.get('email') || '').trim();
      const seats = parseInt(fd.get('seats') || '0', 10);
      const msgEl = document.getElementById('register-message');

      if(!fullname || !email || seats <= 0){
        if(msgEl) msgEl.textContent = 'Please fill valid details.';
        return;
      }

      // ensure registering under logged-in email
      if(email.toLowerCase() !== currentUser.email.toLowerCase()){
        if(msgEl) msgEl.textContent = 'Email must match your logged-in account.';
        return;
      }

      // Load regs
      const regs = getRegistrations();
      // find existing reg for same event + email
      const existingIndex = regs.findIndex(r => r.eventId === ev.id && r.email.toLowerCase() === email.toLowerCase());
      if(existingIndex !== -1){
        // combine seats into existing registration (keeps status pending/previous status)
        regs[existingIndex].seats = Number(regs[existingIndex].seats) + seats;
        regs[existingIndex].date = new Date().toISOString().split('T')[0];
      } else {
        regs.push({
          eventId: ev.id,
          fullname,
          email,
          seats,
          status: 'pending',
          date: new Date().toISOString().split('T')[0]
        });
      }

      saveRegistrations(regs);
      if(msgEl) msgEl.textContent = 'Registration submitted (status: pending).';
      regForm.reset();

      // Refresh admin table if present
      renderRegistrations();
    });
  }
}

/* -------------------------
   Admin: events listing & deletion (admin.html)
   - adds events to EVENTS_KEY and re-renders
   ------------------------- */
function renderAdminEvents(){
  const container = document.getElementById('admin-events');
  if(!container) return;
  const events = getEvents();
  container.innerHTML = events.map(ev=>`
    <article class="event">
      <h4>${ev.title} <small>(${ev.id})</small></h4>
      <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
      <p>${ev.description}</p>
      <button data-id="${ev.id}" class="delete-btn">Delete</button>
    </article>
  `).join('');

  container.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const arr = getEvents().filter(x=>x.id !== id);
      saveEvents(arr);
      renderAdminEvents();
      renderEventsList(getEvents()); // update events list UI as well
    });
  });
}

/* -------------------------
   Admin: registrations management (approve/reject)
   - Approve checks seat availability and decreases seats
   - Reject just sets status 'rejected'
   ------------------------- */
function renderRegistrations(){
  const tbody = document.querySelector('#registrations-table tbody');
  if(!tbody) return;

  const regs = getRegistrations();
  const events = getEvents();
  const pending = regs.filter(r => r.status === 'pending');

  tbody.innerHTML = pending.map(r=>{
    const ev = events.find(e => e.id === r.eventId) || {title: 'Unknown'};
    return `
      <tr data-email="${r.email}" data-eventid="${r.eventId}">
        <td>${ev.title}</td>
        <td>${r.email}</td>
        <td>${r.date || 'N/A'}</td>
        <td>${r.seats}</td>
        <td>
          <button class="approve-btn">Approve</button>
          <button class="reject-btn">Reject</button>
        </td>
      </tr>
    `;
  }).join('');

  // wire buttons
  tbody.querySelectorAll('.approve-btn').forEach(btn=>{
    btn.onclick = function(){
      const tr = btn.closest('tr');
      const email = tr.dataset.email;
      const eventId = tr.dataset.eventid;
      tryApproveRegistration(email, eventId);
    };
  });
  tbody.querySelectorAll('.reject-btn').forEach(btn=>{
    btn.onclick = function(){
      const tr = btn.closest('tr');
      const email = tr.dataset.email;
      const eventId = tr.dataset.eventid;
      updateRegistrationStatus(email, eventId, 'rejected');
    };
  });
}

function tryApproveRegistration(email, eventId){
  let regs = getRegistrations();
  const idx = regs.findIndex(r => r.email === email && r.eventId === eventId && r.status === 'pending');
  if(idx === -1) return alert('Registration not found.');

  const reg = regs[idx];
  const events = getEvents();
  const evIndex = events.findIndex(e => e.id === eventId);
  if(evIndex === -1) return alert('Event not found.');

  // check seats
  const available = Number(events[evIndex].numberOfSeats || 0);
  const requested = Number(reg.seats || 0);

  if(available < requested){
    return alert(`Not enough seats available (${available} left) to approve ${requested} seats.`);
  }

  // subtract seats and mark reg approved
  events[evIndex].numberOfSeats = available - requested;
  saveEvents(events);

  regs[idx].status = 'approved';
  saveRegistrations(regs);

  // refresh UI
  renderRegistrations();
  renderAdminEvents();
  renderEventsList(getEvents());
  alert('Registration approved and seats updated.');
}

function updateRegistrationStatus(email, eventId, newStatus){
  let regs = getRegistrations();
  regs = regs.map(r=>{
    if(r.email === email && r.eventId === eventId && r.status === 'pending'){
      r.status = newStatus;
    }
    return r;
  });
  saveRegistrations(regs);
  renderRegistrations();
}

/* -------------------------
   User registrations page (registered.html)
   - shows registrations for logged in user
   ------------------------- */
function renderMyRegistrations(){
  const container = document.getElementById('my-registrations');
  if(!container) return;

  const regs = getRegistrations();
  const events = getEvents();
  const currentUser = getCurrentUser();

  const filtered = currentUser ? regs.filter(r => r.email.toLowerCase() === currentUser.email.toLowerCase()) : regs;
  if(!filtered || filtered.length === 0){
    container.innerHTML = '<p>No registrations yet.</p>';
    return;
  }

  container.innerHTML = filtered.map(r=>{
    const ev = events.find(e=>e.id === r.eventId) || {title:'Unknown'};
    return `<article class="event">
      <h4>${ev.title} <small>(${r.eventId})</small></h4>
      <div class="meta">Name: ${r.fullname} • Seats: ${r.seats} • Status: ${r.status}</div>
    </article>`;
  }).join('');
}

/* -------------------------
   Admin add-event form (admin.html)
   - Keep ID format E<next>
   ------------------------- */
function handleAdminAddEvent(){
  const form = document.getElementById('event-form');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const title = fd.get('title'), date = fd.get('date'), location = fd.get('location'), category = fd.get('category');
    const description = fd.get('description') || '';
    const seats = parseInt(fd.get('numberOfSeats') || '0', 10);
    if(!title || !date || !location || !category){
      const msg = document.getElementById('admin-message');
      if(msg) msg.textContent = 'Please fill required fields.';
      return;
    }

    const events = getEvents();
    // max numeric suffix
    const maxId = events.reduce((m,it)=> {
      const n = parseInt((it.id||'').replace(/[^0-9]/g,'')) || 0;
      return Math.max(m,n);
    }, 0);
    const newId = 'E' + (maxId + 1);
    events.push({id:newId, title, date, location, category, description, numberOfSeats: seats});
    saveEvents(events);

    const msg = document.getElementById('admin-message');
    if(msg) msg.textContent = 'Event added successfully.';
    form.reset();

    renderAdminEvents();
    renderEventsList(getEvents());
  });
}

/* -------------------------
   Wire everything on DOMContentLoaded
   ------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // EVENTS list page
  if(document.getElementById('events-list')){
    renderEventsList(getEvents());
    const searchBtn = document.getElementById('searchBtn');
    if(searchBtn) searchBtn.addEventListener('click', applyFilters);
    const clearBtn = document.getElementById('clearBtn');
    if(clearBtn) clearBtn.addEventListener('click', ()=>{
      ['q','date','location','category','minSeats'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.value = '';
      });
      renderEventsList(getEvents());
    });
  }

  // Event detail page
  renderEventDetailFromURL();

  // Admin page
  renderAdminEvents();
  handleAdminAddEvent();

  // Registrations (admin) table
  renderRegistrations();

  // My registrations (user page)
  renderMyRegistrations();
});



// --- Manage Users Section ---

function getUsers() {
  const stored = localStorage.getItem('users_v1') || localStorage.getItem('users');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

function saveUsers(users) {
  localStorage.setItem('users_v1', JSON.stringify(users));
}

const userForm = document.getElementById('user-form');
const adminUsers = document.getElementById('admin-users');

function renderUsers() {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;

  const users = getUsers();

  if(users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr data-id="${user.id}">
      <td>${user.id}</td>
      <td class="name-cell">${escapeHtml(user.fullname || '')}</td>
      <td class="email-cell">${escapeHtml(user.email)}</td>
      <td class="role-cell">${escapeHtml(user.role)}</td>
      <td>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </td>
    </tr>
  `).join('');

  // زرار Edit / Save
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => {
      const tr = btn.closest('tr');
      const isEditing = btn.textContent === 'Save';

      if (!isEditing) {
        // التحويل لوضع التعديل (inputs)
        const nameCell = tr.querySelector('.name-cell');
        const emailCell = tr.querySelector('.email-cell');
        const roleCell = tr.querySelector('.role-cell');

        nameCell.innerHTML = `<input type="text" class="edit-name" value="${escapeHtml(nameCell.textContent)}">`;
        emailCell.innerHTML = `<input type="email" class="edit-email" value="${escapeHtml(emailCell.textContent)}">`;
        roleCell.innerHTML = `
          <select class="edit-role">
            <option value="user" ${roleCell.textContent === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${roleCell.textContent === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        `;

        btn.textContent = 'Save';
      } else {
        // حفظ التعديلات
        const id = tr.dataset.id;
        const nameInput = tr.querySelector('.edit-name');
        const emailInput = tr.querySelector('.edit-email');
        const roleSelect = tr.querySelector('.edit-role');

        const newName = nameInput.value.trim();
        const newEmail = emailInput.value.trim();
        const newRole = roleSelect.value;

        if (!newName || !newEmail) {
          alert('Name and Email cannot be empty');
          return;
        }

        let users = getUsers();
        const userIndex = users.findIndex(u => String(u.id) === String(id));
        if (userIndex === -1) {
          alert('User not found');
          return;
        }

        users[userIndex].fullname = newName;
        users[userIndex].email = newEmail;
        users[userIndex].role = newRole;

        saveUsers(users);

        // تحويل العرض للقراءة فقط مرة تانية
        tr.querySelector('.name-cell').textContent = newName;
        tr.querySelector('.email-cell').textContent = newEmail;
        tr.querySelector('.role-cell').textContent = newRole;

        btn.textContent = 'Edit';
        alert('User updated successfully');
      }
    };
  });

  // زرار الحذف مع تأكيد
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      const tr = btn.closest('tr');
      const id = tr.dataset.id;

      let users = getUsers();
      users = users.filter(u => String(u.id) !== String(id));
      saveUsers(users);
      alert('User deleted');
      renderUsers();
    };
  });
}

// دالة مساعدة للهروب من الأحرف الخاصة (لمنع مشاكل XSS)
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}


function editUser(id){
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(id));
  if(!user) return alert('User not found');
  
  userForm.id.value = user.id;
  userForm.fullname.value = user.fullname || user.name || '';
  userForm.email.value = user.email || '';
  userForm.role.value = user.role || 'user';

  userForm.querySelector('button[type="submit"]').textContent = 'Save Changes';
  document.getElementById('user-form-cancel').style.display = 'inline-block';
}

function deleteUser(id){
  if(!confirm('Are you sure you want to delete this user?')) return;
  let users = getUsers();
  users = users.filter(u => String(u.id) !== String(id));
  saveUsers(users);
  renderAdminUsers();
  alert('User deleted');
}

if(userForm) {
  userForm.addEventListener('submit', e => {
    e.preventDefault();

    const fd = new FormData(userForm);
    const id = fd.get('id');
    const fullname = fd.get('fullname').trim();
    const email = fd.get('email').trim();
    const role = fd.get('role');

    if (!fullname || !email || !role) {
      alert('Please fill all fields');
      return;
    }

    let users = getUsers();

    if (id) {
      // Edit user
      const idx = users.findIndex(u => String(u.id) === String(id));
      if (idx >= 0) {
        users[idx].fullname = fullname;
        users[idx].email = email;
        users[idx].role = role;
        alert('User updated successfully');
      }
    } else {
      // Add user
      const newId = Date.now().toString();
      users.push({ id: newId, fullname, email, role });
      alert('User added successfully');
    }

    saveUsers(users);
    renderUsers();

    userForm.reset();
    userForm.querySelector('button[type="submit"]').textContent = 'Add User';
    document.getElementById('user-form-cancel').style.display = 'none';
  });

  document.getElementById('user-form-cancel').addEventListener('click', () => {
    userForm.reset();
    userForm.querySelector('button[type="submit"]').textContent = 'Add User';
    document.getElementById('user-form-cancel').style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('users-table')) {
    renderUsers();
  }
});



// ===================================================
// USER → DISPLAY ALL EVENTS (users-events.html)
// ===================================================
function loadUserEvents() {
  const container = document.getElementById("user-events");
  if (!container) return; // not on user page

  container.innerHTML = "";

  if (events.length === 0) {
    container.innerHTML = "<p>No events available at the moment.</p>";
    return;
  }

  events.forEach(ev => {
    container.innerHTML += `
      <div class="event-card">
        <h3>${ev.title}</h3>
        <p><strong>Date:</strong> ${ev.date}</p>
        <p><strong>Location:</strong> ${ev.location}</p>
        <p><strong>Category:</strong> ${ev.category}</p>
        <p><strong>Description:</strong> ${ev.description}</p>
        <p><strong>Seats:</strong> ${ev.numberOfSeats}</p>
      </div>
    `;
  });
}
// =========================
// Manage Users functionality
// =========================

// جلب المستخدمين من localStorage
function getUsers() {
  return JSON.parse(localStorage.getItem('users')) || [];
}

// حفظ المستخدمين في localStorage
function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// عرض المستخدمين في الجدول
function renderUsers() {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;

  const users = getUsers();
  tbody.innerHTML = users.map(user => `
    <tr data-id="${user.id}">
      <td>${user.id}</td>
      <td><input type="text" class="edit-name" value="${user.name}"></td>
      <td><input type="email" class="edit-email" value="${user.email}"></td>
      <td>
        <select class="edit-role">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <button class="save-btn">Save</button>
        <button class="delete-btn">Delete</button>
      </td>
    </tr>
  `).join('');

  // ربط أزرار الحفظ والحذف
  tbody.querySelectorAll('.save-btn').forEach(btn => {
    btn.onclick = () => {
      const tr = btn.closest('tr');
      const id = tr.dataset.id;
      const name = tr.querySelector('.edit-name').value.trim();
      const email = tr.querySelector('.edit-email').value.trim();
      const role = tr.querySelector('.edit-role').value;

      if (!name || !email) {
        alert('Name and Email cannot be empty');
        return;
      }

      let users = getUsers();
      const userIndex = users.findIndex(u => u.id == id);
      if (userIndex === -1) {
        alert('User not found');
        return;
      }

      users[userIndex].name = name;
      users[userIndex].email = email;
      users[userIndex].role = role;

      saveUsers(users);
      alert('User updated successfully');
      renderUsers(); // إعادة عرض بعد التعديل
    };
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      const tr = btn.closest('tr');
      const id = tr.dataset.id;

      let users = getUsers();
      users = users.filter(u => u.id != id);
      saveUsers(users);
      alert('User deleted');
      renderUsers();
    };
  });
}

// تفعيل الوظائف بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('users-table')) {
    renderUsers();
  }
});



window.addEventListener("DOMContentLoaded", () => {
  const detailBox = document.getElementById("event-detail");
  if (!detailBox) return; // Skip if not detail page

  // Fetch ID from sessionStorage
  const id = sessionStorage.getItem("selectedEventID"); 
  const ev = getEvents().find(e => e.id === id); 

  if (!ev) return detailBox.textContent = "Event not found."; 

  // Render event details 
  detailBox.innerHTML = `
    <h2>${ev.title} <small>(${ev.id})</small></h2>
    <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
    <p>${ev.description}</p>`;

  
  const regForm = document.getElementById('register-form');
  if(regForm){
    regForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fd = new FormData(regForm);
      const fullname = fd.get('fullname'), email = fd.get('email'), seats = parseInt(fd.get('seats'),10);
      const messageEl = document.getElementById('register-message');
      
      if(!fullname || !email || seats<=0){ messageEl.textContent='Please fill valid details.'; return; }
      
      const regs = JSON.parse(localStorage.getItem('regs_v1')||'[]');
      regs.push({eventId: ev.id, fullname, email, seats, status:'pending'});
      localStorage.setItem('regs_v1', JSON.stringify(regs));
      messageEl.textContent = 'Registration submitted (status: pending).';
      regForm.reset();
    });
  }
});
// AUTO LOAD EVENTS FOR BOTH ADMIN & USERS
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("admin-events")) {
    loadAdminEvents();  // admin page auto-load
  }

  if (document.getElementById("user-events")) {
    loadUserEvents();   // user page auto-load
  }
});








