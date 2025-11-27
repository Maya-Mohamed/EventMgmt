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
