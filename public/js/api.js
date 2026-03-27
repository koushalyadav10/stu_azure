// public/js/api.js
const API_BASE = '/api';

// ─── Token helpers ────────────────────────────────────────────
const Auth = {
  getToken:  () => localStorage.getItem('sms_token'),
  getUser:   () => JSON.parse(localStorage.getItem('sms_user') || 'null'),
  isAdmin:   () => Auth.getUser()?.role === 'admin',
  isLoggedIn:() => !!Auth.getToken(),
  save(user, token) {
    localStorage.setItem('sms_token', token);
    localStorage.setItem('sms_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
  },
};

// ─── HTTP helper ──────────────────────────────────────────────
async function http(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  // Force logout on expired/invalid token
  if (res.status === 401 && Auth.isLoggedIn()) {
    Auth.clear();
    window.location.hash = '#login';
    showToast('Session expired. Please log in again.', 'error');
    return;
  }

  if (!data.success) {
    throw new ApiError(data.message || 'An error occurred.', res.status, data.errors);
  }

  return data;
}

class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || [];
  }
}

// ─── Auth API ─────────────────────────────────────────────────
const authApi = {
  login:  (body) => http('POST', '/auth/login', body),
  signup: (body) => http('POST', '/auth/signup', body),
  me:     ()     => http('GET',  '/auth/me'),
};

// ─── Students API ─────────────────────────────────────────────
const studentsApi = {
  getAll:  (params = {}) => http('GET',    `/students?${new URLSearchParams(params)}`),
  getById: (id)          => http('GET',    `/students/${id}`),
  stats:   ()            => http('GET',    '/students/stats'),
  create:  (body)        => http('POST',   '/students', body),
  update:  (id, body)    => http('PUT',    `/students/${id}`, body),
  delete:  (id)          => http('DELETE', `/students/${id}`),
};

// ─── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info', title = '') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const titles = { success: 'Success', error: 'Error', info: 'Info', ...{ title } };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title || titles[type]}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ─── Modal helpers ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('visible');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('visible');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('visible');
  }
});

// ─── Misc utils ───────────────────────────────────────────────
function gradeColor(marks) {
  if (marks >= 90) return 'var(--grade-a-plus)';
  if (marks >= 80) return 'var(--grade-a)';
  if (marks >= 70) return 'var(--grade-b)';
  if (marks >= 60) return 'var(--grade-c)';
  if (marks >= 50) return 'var(--grade-d)';
  return 'var(--grade-f)';
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function setLoading(btn, loading) {
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}