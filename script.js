let tasks = [];
const API_URL = 'http://127.0.0.1:5000/api/tasks';
let selectedId = null;

const taskList = document.getElementById('task-list');
const editBtn = document.getElementById('edit-btn');
const deleteBtn = document.getElementById('delete-btn');
const createModal = document.getElementById('create-modal');
const editModal = document.getElementById('edit-modal');

async function loadTasks() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error('Could not load tasks');
    }

    const apiTasks = await response.json();

    tasks = apiTasks.map(task => ({
      id: task.id,
      title: task.title,
      assigned: task.name,
      status: task.status,
      desc: task.description
    }));

    render();
  } catch (error) {
    console.error(error);
    taskList.innerHTML = '<p>Unable to load tasks. Is Flask running?</p>';
  }
}

function render() {
  taskList.innerHTML = '';
  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card' + (t.id === selectedId ? ' selected' : '');
    card.innerHTML = `<h4>${t.title}</h4><p>${t.assigned ? 'Assigned to ' + t.assigned : 'Unassigned'}</p><span class="badge">${t.status}</span>`;
    card.onclick = () => { selectedId = t.id; render(); };
    taskList.appendChild(card);
  });
  const has = selectedId !== null;
  editBtn.disabled = !has;
  deleteBtn.disabled = !has;
}

document.getElementById('create-btn').onclick = () => createModal.classList.add('open');
document.getElementById('cancel-btn').onclick = () => createModal.classList.remove('open');
document.getElementById('task-form').onsubmit = (e) => {
  e.preventDefault();
  tasks.push({
    id: Date.now(),
    title: document.getElementById('task-title').value,
    assigned: document.getElementById('task-assigned').value,
    status: document.getElementById('task-status').value,
    desc: document.getElementById('task-desc').value
  });
  e.target.reset();
  createModal.classList.remove('open');
  render();
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
document.getElementById('edit-form').onsubmit = (e) => {
  e.preventDefault();
  const t = tasks.find(x => x.id === selectedId);
  t.title = document.getElementById('edit-title').value;
  t.assigned = document.getElementById('edit-assigned').value;
  t.status = document.getElementById('edit-status').value;
  t.desc = document.getElementById('edit-desc').value;
  editModal.classList.remove('open');
  render();
};

deleteBtn.onclick = () => {
  tasks = tasks.filter(t => t.id !== selectedId);
  selectedId = null;
  render();
};

loadTasks();