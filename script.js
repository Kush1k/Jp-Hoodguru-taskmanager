let tasks = [];
let authMode = 'login';
const API_URL = '/api/tasks';
let selectedId = null;

const taskList = document.getElementById('task-list');
const editBtn = document.getElementById('edit-btn');
const deleteBtn = document.getElementById('delete-btn');
const createModal = document.getElementById('create-modal');
const editModal = document.getElementById('edit-modal');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const authScreen = document.getElementById('auth-screen');
const appShell = document.getElementById('app-shell');

function toUiTask(task) {
  return {
    id: task.id,
    title: task.title,
    assigned: task.name,
    status: task.status === 'Incomplete' ? 'Pending' : task.status,
    desc: task.description || ''
  };
}

function getTaskPayload(prefix = 'task') {
  const assigned = document.getElementById(`${prefix}-assigned`).value.trim();
  return {
    title: document.getElementById(`${prefix}-title`).value.trim(),
    name: assigned || 'Unassigned',
    status: document.getElementById(`${prefix}-status`).value,
    description: document.getElementById(`${prefix}-desc`).value.trim()
  };
}

async function apiRequest(url = API_URL, options = {}) {
  options.credentials = 'same-origin';
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

async function loadTasks() {
  try {
    const apiTasks = await apiRequest();
    tasks = apiTasks.map(toUiTask);
    if (!tasks.some(task => task.id === selectedId)) {
      selectedId = null;
    }

    render();
  } catch (error) {
    console.error(error);
    taskList.innerHTML = '<div class="empty-state"><strong>Could not reach workspace</strong><span>Check that the Flask server is running.</span></div>';
  }
}

function render() {
  taskList.innerHTML = '';
  const searchTerm = searchInput.value.trim().toLowerCase();
  const visibleTasks = tasks.filter(task =>
    (statusFilter.value === 'all' || task.status === statusFilter.value) &&
    [task.title, task.assigned, task.status, task.desc]
      .some(value => value.toLowerCase().includes(searchTerm))
  );

  if (visibleTasks.length === 0) {
    taskList.innerHTML = '<div class="empty-state"><strong>Your queue is clear</strong><span>Create a task to give your next win a place to land.</span></div>';
  }

  visibleTasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card' + (t.id === selectedId ? ' selected' : '');
    card.innerHTML = `<div class="task-card-top"><span class="task-index">${String(t.id).padStart(2, '0')}</span><span class="badge ${t.status.toLowerCase().replaceAll(' ', '-')}">${t.status}</span></div><h4>${escapeHtml(t.title)}</h4><p>${escapeHtml(t.desc || (t.assigned ? 'Assigned to ' + t.assigned : 'Unassigned'))}</p><div class="task-card-footer"><span>${escapeHtml(t.assigned || 'Unassigned')}</span><button class="quick-status" title="Advance status" type="button">${t.status === 'Completed' ? '↻ Reopen' : 'Move forward →'}</button></div>`;
    card.onclick = () => { selectedId = t.id; render(); };
    card.querySelector('.quick-status').onclick = (event) => { event.stopPropagation(); advanceStatus(t); };
    card.onpointermove = (event) => { const box = card.getBoundingClientRect(); card.style.setProperty('--rx', `${(event.clientY - box.top - box.height / 2) / 18}deg`); card.style.setProperty('--ry', `${(box.width / 2 - (event.clientX - box.left)) / 18}deg`); };
    card.onpointerleave = () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); };
    taskList.appendChild(card);
  });
  const has = selectedId !== null;
  editBtn.disabled = !has;
  deleteBtn.disabled = !has;
  document.getElementById('total-count').textContent = tasks.length;
  document.getElementById('progress-count').textContent = tasks.filter(t => t.status === 'In Progress').length;
  document.getElementById('done-count').textContent = tasks.filter(t => t.status === 'Completed').length;
  document.getElementById('nav-count').textContent = tasks.length;
}
function escapeHtml(value) { return value.replace(/[&<>'\"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[character])); }
async function advanceStatus(task) { const next = {Pending: 'In Progress', 'In Progress': 'Completed', Completed: 'Pending'}[task.status]; await apiRequest(`${API_URL}/${task.id}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: next})}); await loadTasks(); }

document.getElementById('create-btn').onclick = () => createModal.classList.add('open');
document.getElementById('cancel-btn').onclick = () => createModal.classList.remove('open');
document.getElementById('task-form').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const titles = document.getElementById('task-title').value.split('\n').map(title => title.trim()).filter(Boolean);
    if (!titles.length) throw new Error('Add at least one task title');
    for (const title of titles) await apiRequest(API_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...getTaskPayload(), title})});
    e.target.reset();
    createModal.classList.remove('open');
    await loadTasks();
  } catch (error) {
    alert(`Could not create task: ${error.message}`);
  }
};

editBtn.onclick = () => {
  const t = tasks.find(x => x.id === selectedId);
  if (!t) return;
  document.getElementById('edit-title').value = t.title;
  document.getElementById('edit-assigned').value = t.assigned;
  document.getElementById('edit-status').value = t.status;
  document.getElementById('edit-desc').value = t.desc;
  editModal.classList.add('open');
};
document.getElementById('edit-cancel-btn').onclick = () => editModal.classList.remove('open');
document.getElementById('edit-form').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await apiRequest(`${API_URL}/${selectedId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(getTaskPayload('edit'))
    });
    editModal.classList.remove('open');
    await loadTasks();
  } catch (error) {
    alert(`Could not update task: ${error.message}`);
  }
};

deleteBtn.onclick = async () => {
  if (selectedId === null || !confirm('Delete this task?')) return;
  try {
    await apiRequest(`${API_URL}/${selectedId}`, {method: 'DELETE'});
    selectedId = null;
    await loadTasks();
  } catch (error) {
    alert(`Could not delete task: ${error.message}`);
  }
};

searchInput.addEventListener('input', render);
statusFilter.addEventListener('change', render);
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => document.getElementById(button.dataset.close).classList.remove('open'));
document.getElementById('toggle-auth').onclick = () => { authMode = authMode === 'login' ? 'signup' : 'login'; document.getElementById('auth-submit-label').textContent = authMode === 'login' ? 'Enter workspace' : 'Create my ID'; document.getElementById('toggle-auth').textContent = authMode === 'login' ? 'New here? Create an ID' : 'Already have an ID? Log in'; document.getElementById('auth-error').textContent = ''; };
document.getElementById('auth-form').onsubmit = async (event) => { event.preventDefault(); const error = document.getElementById('auth-error'); try { const data = await apiRequest(`/api/auth/${authMode === 'login' ? 'login' : 'signup'}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: document.getElementById('auth-username').value, password: document.getElementById('auth-password').value})}); showWorkspace(data.username); } catch (requestError) { error.textContent = requestError.message; } };
document.getElementById('logout-btn').onclick = async () => { await apiRequest('/api/auth/logout', {method: 'POST'}); appShell.classList.add('hidden'); authScreen.classList.remove('hidden'); };
function showWorkspace(username) { authScreen.classList.add('hidden'); appShell.classList.remove('hidden'); document.getElementById('user-name').textContent = username; document.getElementById('welcome-name').textContent = username; loadTasks(); }
apiRequest('/api/auth/me').then(data => { if (data.authenticated) showWorkspace(data.username); });
