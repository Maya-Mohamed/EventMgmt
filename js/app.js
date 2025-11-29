// =========================
// EVENTS & REGISTRATIONS MANAGEMENT
// =========================

const SAMPLE_EVENTS = [
  {"id":"E1001","title":"AI & Society Conference","date":"2025-11-10","location":"Cairo Convention Center","category":"conference","description":"A conference about AI impacts.","numberOfSeats":200},
  {"id":"E1002","title":"Web Dev Workshop","date":"2025-10-28","location":"Giza Tech Hub","category":"workshop","description":"Hands-on workshop on modern web.","numberOfSeats":40},
  {"id":"E1003","title":"Campus Meetup","date":"2025-12-02","location":"AUC Campus","category":"meetup","description":"Student meetup for networking.","numberOfSeats":100}
];

// UTILITIES
function getEvents(){ 
  const stored = localStorage.getItem('events_v1'); 
  if(stored) try { return JSON.parse(stored); } catch(e){} 
  localStorage.setItem('events_v1', JSON.stringify(SAMPLE_EVENTS)); 
  return SAMPLE_EVENTS.slice(); 
}
function saveEvents(arr){ localStorage.setItem('events_v1', JSON.stringify(arr)); }

function qs(q){ return document.querySelector(q); }
function qsa(q){ return document.querySelectorAll(q); }

document.addEventListener('DOMContentLoaded', ()=>{
  
  // --- EVENTS LIST PAGE ---
  const eventsList = qs('#events-list');
  if(eventsList){
    const render = (list)=>{
      eventsList.innerHTML = list.map(ev=>`
        <article class="event">
          <h3>${ev.title} <small>(${ev.id})</small></h3>
          <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
          <p>${ev.description}</p>
          <a class="card" href="event-detail.html?id=${encodeURIComponent(ev.id)}">Details</a>
        </article>
      `).join('');
    };
    render(getEvents());

    // SEARCH & FILTER
    qs('#searchBtn').addEventListener('click', ()=>{
      const q = qs('#q').value.trim().toLowerCase();
      const date = qs('#date').value;
      const location = qs('#location').value.trim().toLowerCase();
      const category = qs('#category').value;
      const minSeats = parseInt(qs('#minSeats').value || '0',10);
      const filtered = getEvents().filter(ev=>{
        if(q && !(ev.id.toLowerCase().includes(q)||ev.title.toLowerCase().includes(q))) return false;
        if(date && ev.date !== date) return false;
        if(location && !ev.location.toLowerCase().includes(location)) return false;
        if(category && ev.category !== category) return false;
        if(ev.numberOfSeats < minSeats) return false;
        return true;
      });
      render(filtered);
    });

    qs('#clearBtn').addEventListener('click', ()=>{
      qs('#q').value=''; qs('#date').value=''; qs('#location').value=''; qs('#category').value=''; qs('#minSeats').value='';
      render(getEvents());
    });
  }

  // --- EVENT DETAIL PAGE ---
  const detailEl = qs('#event-detail');
  if(detailEl){
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '';
    const ev = getEvents().find(e=>e.id===id) || getEvents()[0];
    detailEl.innerHTML = `<h2>${ev.title} <small>(${ev.id})</small></h2>
      <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
      <p>${ev.description}</p>`;

    // REGISTER FORM
    const regForm = qs('#register-form');
    if(regForm){
      regForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const fd = new FormData(regForm);
        const fullname = fd.get('fullname'), email = fd.get('email'), seats = parseInt(fd.get('seats'),10);
        if(!fullname || !email || seats<=0){ qs('#register-message').textContent='Please fill valid details.'; return; }
        const regs = JSON.parse(localStorage.getItem('regs_v1')||'[]');
        regs.push({eventId: ev.id, fullname, email, seats, status:'pending'});
        localStorage.setItem('regs_v1', JSON.stringify(regs));
        qs('#register-message').textContent = 'Registration submitted (status: pending).';
        regForm.reset();
      });
    }
  }

  // --- ADMIN PAGE: ADD EVENTS & MANAGE ---
  const eventForm = qs('#event-form');
  const adminEvents = qs('#admin-events');

  if(eventForm){
    eventForm.addEventListener('submit', e=>{
      e.preventDefault();
      const fd = new FormData(eventForm);
      const title = fd.get('title'), date = fd.get('date'), location = fd.get('location'), category = fd.get('category'), description = fd.get('description')||'';
      const seats = parseInt(fd.get('numberOfSeats')||'0',10);
      if(!title||!date||!location||!category){ qs('#admin-message').textContent='Please fill required fields.'; return; }

      const events = getEvents();
      const maxId = events.reduce((m,it)=>{ const n=parseInt(it.id.replace(/[^0-9]/g,''))||0; return Math.max(m,n); },0);
      const newId = 'E'+(maxId+1);
      events.push({id:newId,title,date,location,category,description,numberOfSeats:seats});
      saveEvents(events);
      qs('#admin-message').textContent = 'Event added successfully.';
      eventForm.reset();
      renderAdminEvents();
    });
  }

  function renderAdminEvents(){
    if(!adminEvents) return;
    const events = getEvents();
    adminEvents.innerHTML = events.map(ev=>`
      <article class="event"><h4>${ev.title} <small>(${ev.id})</small></h4>
      <div class="meta">${ev.date} • ${ev.location} • ${ev.category} • Seats: ${ev.numberOfSeats}</div>
      <p>${ev.description}</p>
      <button data-id="${ev.id}" class="delete-btn">Delete</button></article>
    `).join('');
    adminEvents.querySelectorAll('.delete-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const arr = getEvents().filter(x=>x.id!==id);
        saveEvents(arr);
        renderAdminEvents();
      });
    });
  }
  renderAdminEvents();

  // --- USER REGISTRATIONS PAGE ---
  const myRegs = qs('#my-registrations');
  if(myRegs){
    const regs = JSON.parse(localStorage.getItem('regs_v1')||'[]');
    const events = getEvents();
    const currentUser = getCurrentUser();
    const filteredRegs = currentUser ? regs.filter(r=>r.email===currentUser.email) : regs;
    if(filteredRegs.length===0){ myRegs.innerHTML='<p>No registrations yet.</p>'; return; }
    myRegs.innerHTML = filteredRegs.map(r=>{
      const ev = events.find(e=>e.id===r.eventId) || {title:'Unknown'};
      return `<article class="event"><h4>${ev.title} <small>(${r.eventId})</small></h4>
        <div class="meta">Name: ${r.fullname} • Seats: ${r.seats} • Status: ${r.status}</div></article>`;
    }).join('');
  }

});
// ************ Bido Work **********//
// ===============================
// Load from LocalStorage
// ===============================
let events = JSON.parse(localStorage.getItem("events")) || [];
let registrations = JSON.parse(localStorage.getItem("registrations")) || [];

function saveEvents() {
  localStorage.setItem("events", JSON.stringify(events));
}
function saveRegistrations() {
  localStorage.setItem("registrations", JSON.stringify(registrations));
}


// ===============================
// AUTO ID
// ===============================
function generateID() {
  return events.length ? events[events.length - 1].id + 1 : 1;
}


// ===================================================
// 1️⃣ ADMIN → ADD EVENT (admin-dashboard.html)
// ===================================================
let eventForm = document.getElementById("event-form");

if (eventForm) {
  eventForm.addEventListener("submit", () => {
    const fd = new FormData(eventForm);

    const newEvent = {
      id: generateID(),
      title: fd.get("title"),
      date: fd.get("date"),
      location: fd.get("location"),
      category: fd.get("category"),
      description: fd.get("description"),
      numberOfSeats: Number(fd.get("numberOfSeats"))
    };

    events.push(newEvent);
    saveEvents();

    document.getElementById("admin-message").textContent =
      "Event added successfully!";
    eventForm.reset();
    loadAdminEvents();
  });
}


// ===================================================
// 2️⃣ ADMIN → SHOW EVENTS LIST FOR EDIT/DELETE
// ===================================================
function loadAdminEvents() {
  const container = document.getElementById("admin-events");
  if (!container) return;

  container.innerHTML = "";

  events.forEach(ev => {
    container.innerHTML += `
      <div class="event-card">
        <h3>${ev.title}</h3>
        <p>ID: ${ev.id}</p>
        <p>${ev.date} - ${ev.location}</p>

        <button onclick="editEvent(${ev.id})">Edit</button>
        <button onclick="deleteEvent(${ev.id})" class="danger">Delete</button>
      </div>
    `;
  });
}

loadAdminEvents();


// ===================================================
// 3️⃣ ADMIN → EDIT EVENT
// ===================================================
function editEvent(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return alert("Event not found");

  // Fill form with values
  eventForm.title.value = ev.title;
  eventForm.date.value = ev.date;
  eventForm.location.value = ev.location;
  eventForm.category.value = ev.category;
  eventForm.description.value = ev.description;
  eventForm.numberOfSeats.value = ev.numberOfSeats;

  eventForm.querySelector("button").textContent = "Save Changes";

  eventForm.onsubmit = () => {
    ev.title = eventForm.title.value;
    ev.date = eventForm.date.value;
    ev.location = eventForm.location.value;
    ev.category = eventForm.category.value;
    ev.description = eventForm.description.value;
    ev.numberOfSeats = Number(eventForm.numberOfSeats.value);

    saveEvents();
    loadAdminEvents();

    document.getElementById("admin-message").textContent =
      "Event updated successfully!";

    eventForm.reset();
    eventForm.querySelector("button").textContent = "Add Event";

    eventForm.onsubmit = () => false;
    return false;
  };
}


// ===================================================
// 4️⃣ ADMIN → DELETE EVENT
// ===================================================
function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveEvents();
  loadAdminEvents();
  alert("Event deleted!");
}
// ===============================
// AUTO DISPLAY EVENTS WHEN LOGGING IN
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  // If we are on the admin dashboard, load events automatically
  if (document.getElementById("admin-events")) {
    loadAdminEvents();
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
// SEARCH & FILTER EVENTS (Menna's part )
// =========================

// Render event cards dynamically inside #events-list
function renderEvents(list) {
  const container = document.getElementById("events-list");
  if (!container) return; // Skip if element not found

  container.innerHTML = list.map(ev => `
    <article class="event-card">
      <h3>${ev.title} <small>(${ev.id})</small></h3>
      <p>${ev.date} – ${ev.location}</p>
      <p>Category: ${ev.category}</p>
      <p>Seats: ${ev.numberOfSeats}</p>
      <button class="details-btn" data-id="${ev.id}">Details</button>
    </article>
  `).join('');
}

// Implement filters
function applyFilters() {
  // Get filter values from events.html inputs
  const q = document.getElementById("q").value.toLowerCase(); 
  const date = document.getElementById("date").value;
  const location = document.getElementById("location").value.toLowerCase();
  const category = document.getElementById("category").value;
  const minSeats = Number(document.getElementById("minSeats").value || 0);

  // Filter events array based on all inputs 
  let filtered = getEvents().filter(ev => {
    if (q && !(ev.id.toLowerCase().includes(q) || ev.title.toLowerCase().includes(q))) return false;
    if (date && ev.date !== date) return false;
    if (location && !ev.location.toLowerCase().includes(location)) return false;
    if (category && ev.category !== category) return false;
    if (minSeats > 0 && ev.numberOfSeats < minSeats) return false;
    
    return true;
  });

  // Render filtered events
  renderEvents(filtered);
}

// =========================
// EVENT HANDLERS 
// =========================

// This listener handles the initial render and attaches Search/Clear handlers.
document.addEventListener("DOMContentLoaded", () => {
    // Initial load of all events if on the events list page
    if (document.getElementById("events-list")) {
        renderEvents(getEvents());
    }

    // Handle Search Button click 
    const searchBtn = document.getElementById("searchBtn");
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
    }

    // Handle Clear Button click 
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Clear all input fields
            document.getElementById('q').value = '';
            document.getElementById('date').value = '';
            document.getElementById('location').value = '';
            document.getElementById('category').value = '';
            document.getElementById('minSeats').value = '';
            
            // Re-render all events
            renderEvents(getEvents());
        });
    }
});

// Handle "Details" button (save selected event to sessionStorage)
document.addEventListener("click", e => {
  if (e.target.classList.contains("details-btn")) {
    const id = e.target.dataset.id;

    // Save ID in sessionStorage 
    sessionStorage.setItem("selectedEventID", id);

    // Redirect to event-detail page
    window.location.href = "event-detail.html";
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








