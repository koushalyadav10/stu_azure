// public/js/app.js

// ─── Application State ──────────────────────────────────────────────
let currentPage = 'dashboard';
let currentUser = null;
let currentFilters = {
  search: '',
  minMarks: 0,
  maxMarks: 100,
  page: 1,
  limit: 10,
  sortBy: 'id',
  sortOrder: 'ASC'
};

let studentsCache = {
  data: [],
  pagination: null,
  loading: false
};

let statsCache = null;

// ─── Router & Navigation ───────────────────────────────────────────
function navigateTo(page, replace = false) {
  const hash = page === 'dashboard' ? '#dashboard' : `#${page}`;
  
  if (replace) {
    window.location.replace(hash);
  } else {
    window.location.hash = hash;
  }
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  const allowedPages = ['dashboard', 'students', 'login', 'signup'];
  const page = allowedPages.includes(hash) ? hash : 'dashboard';
  
  // Redirect to login if not authenticated
  if (!Auth.isLoggedIn() && (page === 'dashboard' || page === 'students')) {
    navigateTo('login', true);
    return;
  }
  
  // Redirect to dashboard if already logged in on auth pages
  if (Auth.isLoggedIn() && (page === 'login' || page === 'signup')) {
    navigateTo('dashboard', true);
    return;
  }
  
  currentPage = page;
  renderPage();
}

// ─── Render Main UI ────────────────────────────────────────────────
function renderPage() {
  const app = document.getElementById('app');
  
  if (!Auth.isLoggedIn() && currentPage !== 'login' && currentPage !== 'signup') {
    renderAuthPage('login');
    return;
  }
  
  if (Auth.isLoggedIn() && (currentPage === 'login' || currentPage === 'signup')) {
    renderDashboard();
    return;
  }
  
  switch (currentPage) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'students':
      renderStudentsPage();
      break;
    case 'login':
      renderAuthPage('login');
      break;
    case 'signup':
      renderAuthPage('signup');
      break;
    default:
      renderDashboard();
  }
}

// ─── Render Dashboard ──────────────────────────────────────────────
async function renderDashboard() {
  const app = document.getElementById('app');
  currentUser = Auth.getUser();
  
  // Build app shell
  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main-content">
        <div class="topbar">
          <div class="page-title-wrap">
            <h2>Dashboard</h2>
            <p>Overview and analytics</p>
          </div>
          <div class="topbar-actions">
            <button class="btn btn-secondary btn-sm" id="refreshStatsBtn">
              <span class="btn-text">↻ Refresh</span>
              <div class="spinner"></div>
            </button>
          </div>
        </div>
        <div class="content-pad">
          <div class="stats-grid" id="statsGrid">
            <div class="skeleton" style="height: 120px;"></div>
            <div class="skeleton" style="height: 120px;"></div>
            <div class="skeleton" style="height: 120px;"></div>
            <div class="skeleton" style="height: 120px;"></div>
          </div>
          <div class="grade-bar-section" id="gradeSection">
            <div class="skeleton" style="height: 200px;"></div>
          </div>
          <div class="table-section">
            <div class="section-header" style="padding: 20px 24px;">
              <div class="section-title">Recent Students</div>
            </div>
            <div class="table-wrap">
              <div class="skeleton" style="height: 400px;"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderToastContainer()}
  `;
  
  attachSidebarEvents();
  document.getElementById('refreshStatsBtn')?.addEventListener('click', () => loadDashboardData(true));
  
  await loadDashboardData();
}

async function loadDashboardData(forceRefresh = false) {
  if (forceRefresh) {
    statsCache = null;
    studentsCache = { data: [], pagination: null, loading: false };
  }
  
  await Promise.all([loadStats(), loadRecentStudents()]);
}

async function loadStats() {
  if (statsCache) {
    renderStats(statsCache);
    return;
  }
  
  try {
    const result = await studentsApi.stats();
    statsCache = result.data;
    renderStats(statsCache);
  } catch (error) {
    console.error('Failed to load stats:', error);
    showToast('Failed to load dashboard statistics', 'error');
  }
}

function renderStats(stats) {
  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;
  
  const statColors = {
    total: { color: 'var(--accent)', dim: 'var(--accent-dim)' },
    avgMarks: { color: 'var(--green)', dim: 'var(--green-dim)' },
    topMarks: { color: 'var(--blue)', dim: 'var(--blue-dim)' },
    lowestMarks: { color: 'var(--red)', dim: 'var(--red-dim)' }
  };
  
  statsGrid.innerHTML = `
    <div class="stat-card" style="--stat-color: ${statColors.total.color}; --stat-color-dim: ${statColors.total.dim}">
      <div class="stat-icon">👥</div>
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">Total Students</div>
    </div>
    <div class="stat-card" style="--stat-color: ${statColors.avgMarks.color}; --stat-color-dim: ${statColors.avgMarks.dim}">
      <div class="stat-icon">📊</div>
      <div class="stat-value">${stats.avgMarks}</div>
      <div class="stat-label">Average Marks</div>
    </div>
    <div class="stat-card" style="--stat-color: ${statColors.topMarks.color}; --stat-color-dim: ${statColors.topMarks.dim}">
      <div class="stat-icon">🏆</div>
      <div class="stat-value">${stats.topMarks}</div>
      <div class="stat-label">Highest Marks</div>
    </div>
    <div class="stat-card" style="--stat-color: ${statColors.lowestMarks.color}; --stat-color-dim: ${statColors.lowestMarks.dim}">
      <div class="stat-icon">📉</div>
      <div class="stat-value">${stats.lowestMarks}</div>
      <div class="stat-label">Lowest Marks</div>
    </div>
  `;
  
  renderGradeDistribution(stats);
}

function renderGradeDistribution(stats) {
  const gradeSection = document.getElementById('gradeSection');
  if (!gradeSection) return;
  
  const grades = [
    { label: 'A+', count: stats.gradeAPlus, color: 'var(--grade-a-plus)' },
    { label: 'A', count: stats.gradeA, color: 'var(--grade-a)' },
    { label: 'B', count: stats.gradeB, color: 'var(--grade-b)' },
    { label: 'C', count: stats.gradeC, color: 'var(--grade-c)' },
    { label: 'D', count: stats.gradeD, color: 'var(--grade-d)' },
    { label: 'F', count: stats.gradeF, color: 'var(--grade-f)' }
  ];
  
  const total = stats.total;
  
  gradeSection.innerHTML = `
    <div class="section-header">
      <div class="section-title">Grade Distribution</div>
    </div>
    <div class="grade-bars">
      ${grades.map(grade => `
        <div class="grade-row">
          <div class="grade-label" style="color: ${grade.color}">${grade.label}</div>
          <div class="grade-track">
            <div class="grade-fill" style="width: ${total ? (grade.count / total * 100) : 0}%; background: ${grade.color}"></div>
          </div>
          <div class="grade-count">${grade.count}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadRecentStudents() {
  try {
    const result = await studentsApi.getAll({ page: 1, limit: 5 });
    renderRecentStudents(result.data);
  } catch (error) {
    console.error('Failed to load recent students:', error);
    const tableWrap = document.querySelector('.table-section .table-wrap');
    if (tableWrap) {
      tableWrap.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load students</h3><p>Please try refreshing the page.</p></div>';
    }
  }
}

function renderRecentStudents(students) {
  const tableWrap = document.querySelector('.table-section .table-wrap');
  if (!tableWrap) return;
  
  if (!students || students.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>No students yet</h3>
        <p>Add your first student to get started.</p>
      </div>
    `;
    return;
  }
  
  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Marks</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${students.map(student => `
          <tr>
            <td class="td-id">#${student.id}</td>
            <td>
              <div class="student-name-cell">
                <div class="student-avatar">${getInitials(student.name)}</div>
                <div>
                  <div class="student-name">${escapeHtml(student.name)}</div>
                </div>
              </div>
            </td>
            <td class="student-email">${escapeHtml(student.email || '—')}</td>
            <td>
              <div class="marks-cell">
                <div class="marks-bar-wrap">
                  <div class="marks-bar" style="width: ${student.marks}%; background: ${gradeColor(student.marks)}"></div>
                </div>
                <span class="marks-val">${student.marks}</span>
              </div>
            </td>
            <td><span class="grade-badge grade-${student.grade.replace('+', '\\+')}">${student.grade}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="pagination-wrap">
      <div class="pagination-info">
        <a href="#students" class="btn btn-ghost btn-sm">View All Students →</a>
      </div>
    </div>
  `;
}

// ─── Render Students Page ─────────────────────────────────────────
async function renderStudentsPage() {
  const app = document.getElementById('app');
  currentUser = Auth.getUser();
  
  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main-content">
        <div class="topbar">
          <div class="page-title-wrap">
            <h2>Students</h2>
            <p>Manage and filter student records</p>
          </div>
          <div class="topbar-actions">
            ${Auth.isAdmin() ? '<button class="btn btn-primary btn-sm" id="addStudentBtn">+ Add Student</button>' : ''}
          </div>
        </div>
        <div class="content-pad">
          <div class="table-section">
            <div class="table-header">
              <div class="search-wrap">
                <i class="search-icon">🔍</i>
                <input type="text" id="searchInput" placeholder="Search by name or email..." value="${escapeHtml(currentFilters.search)}">
              </div>
              <div class="filter-group">
                <div class="range-filter">
                  <span>Marks:</span>
                  <input type="number" id="minMarks" placeholder="Min" value="${currentFilters.minMarks}" min="0" max="100" step="1">
                  <span>-</span>
                  <input type="number" id="maxMarks" placeholder="Max" value="${currentFilters.maxMarks}" min="0" max="100" step="1">
                </div>
                <select id="sortBy">
                  <option value="id" ${currentFilters.sortBy === 'id' ? 'selected' : ''}>Sort by ID</option>
                  <option value="name" ${currentFilters.sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
                  <option value="marks" ${currentFilters.sortBy === 'marks' ? 'selected' : ''}>Sort by Marks</option>
                  <option value="grade" ${currentFilters.sortBy === 'grade' ? 'selected' : ''}>Sort by Grade</option>
                </select>
                <select id="sortOrder">
                  <option value="ASC" ${currentFilters.sortOrder === 'ASC' ? 'selected' : ''}>↑ Ascending</option>
                  <option value="DESC" ${currentFilters.sortOrder === 'DESC' ? 'selected' : ''}>↓ Descending</option>
                </select>
              </div>
            </div>
            <div class="table-wrap" id="studentsTableWrap">
              <div class="skeleton" style="height: 400px;"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderToastContainer()}
  `;
  
  attachSidebarEvents();
  
  // Attach event listeners
  const searchInput = document.getElementById('searchInput');
  const minMarks = document.getElementById('minMarks');
  const maxMarks = document.getElementById('maxMarks');
  const sortBy = document.getElementById('sortBy');
  const sortOrder = document.getElementById('sortOrder');
  const addBtn = document.getElementById('addStudentBtn');
  
  const debouncedSearch = debounce(() => {
    currentFilters.search = searchInput.value;
    currentFilters.minMarks = parseInt(minMarks.value) || 0;
    currentFilters.maxMarks = parseInt(maxMarks.value) || 100;
    currentFilters.page = 1;
    loadStudents();
  }, 300);
  
  searchInput?.addEventListener('input', debouncedSearch);
  minMarks?.addEventListener('change', debouncedSearch);
  maxMarks?.addEventListener('change', debouncedSearch);
  sortBy?.addEventListener('change', () => {
    currentFilters.sortBy = sortBy.value;
    currentFilters.page = 1;
    loadStudents();
  });
  sortOrder?.addEventListener('change', () => {
    currentFilters.sortOrder = sortOrder.value;
    currentFilters.page = 1;
    loadStudents();
  });
  addBtn?.addEventListener('click', () => openStudentModal());
  
  await loadStudents();
}

async function loadStudents() {
  const tableWrap = document.getElementById('studentsTableWrap');
  if (!tableWrap) return;
  
  studentsCache.loading = true;
  tableWrap.innerHTML = '<div class="skeleton" style="height: 400px;"></div>';
  
  try {
    const result = await studentsApi.getAll(currentFilters);
    studentsCache.data = result.data;
    studentsCache.pagination = result.pagination;
    renderStudentsTable();
  } catch (error) {
    console.error('Failed to load students:', error);
    tableWrap.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load students</h3><p>Please try again.</p></div>';
  } finally {
    studentsCache.loading = false;
  }
}

function renderStudentsTable() {
  const tableWrap = document.getElementById('studentsTableWrap');
  if (!tableWrap) return;
  
  const { data, pagination } = studentsCache;
  
  if (!data || data.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>No students found</h3>
        <p>Try adjusting your filters or add a new student.</p>
      </div>
    `;
    return;
  }
  
  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="sortable" data-sort="id">ID <span class="sort-icon">↕</span></th>
          <th class="sortable" data-sort="name">Name <span class="sort-icon">↕</span></th>
          <th>Email</th>
          <th class="sortable" data-sort="marks">Marks <span class="sort-icon">↕</span></th>
          <th class="sortable" data-sort="grade">Grade <span class="sort-icon">↕</span></th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(student => `
          <tr>
            <td class="td-id">#${student.id}</td>
            <td>
              <div class="student-name-cell">
                <div class="student-avatar">${getInitials(student.name)}</div>
                <div>
                  <div class="student-name">${escapeHtml(student.name)}</div>
                </div>
              </div>
            </td>
            <td class="student-email">${escapeHtml(student.email || '—')}</td>
            <td>
              <div class="marks-cell">
                <div class="marks-bar-wrap">
                  <div class="marks-bar" style="width: ${student.marks}%; background: ${gradeColor(student.marks)}"></div>
                </div>
                <span class="marks-val">${student.marks}</span>
              </div>
            </td>
            <td><span class="grade-badge grade-${student.grade.replace('+', '\\+')}">${student.grade}</span></td>
            <td class="action-btns">
              <button class="btn btn-ghost btn-sm btn-icon edit-student" data-id="${student.id}" title="Edit">✏️</button>
              ${Auth.isAdmin() ? `<button class="btn btn-danger btn-sm btn-icon delete-student" data-id="${student.id}" data-name="${escapeHtml(student.name)}" title="Delete">🗑️</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${renderPagination(pagination)}
  `;
  
  // Add sort event listeners
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortField = th.dataset.sort;
      if (currentFilters.sortBy === sortField) {
        currentFilters.sortOrder = currentFilters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        currentFilters.sortBy = sortField;
        currentFilters.sortOrder = 'ASC';
      }
      currentFilters.page = 1;
      document.getElementById('sortBy').value = currentFilters.sortBy;
      document.getElementById('sortOrder').value = currentFilters.sortOrder;
      loadStudents();
    });
  });
  
  // Add edit/delete handlers
  document.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', () => openStudentModal(parseInt(btn.dataset.id)));
  });
  
  document.querySelectorAll('.delete-student').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteStudent(parseInt(btn.dataset.id), btn.dataset.name));
  });
}

function renderPagination(pagination) {
  if (!pagination || pagination.totalPages <= 1) return '';
  
  const { page, totalPages, total } = pagination;
  const start = (page - 1) * currentFilters.limit + 1;
  const end = Math.min(page * currentFilters.limit, total);
  
  let buttons = '';
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  buttons += `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹ Prev</button>`;
  
  for (let i = startPage; i <= endPage; i++) {
    buttons += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  
  buttons += `<button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next ›</button>`;
  
  return `
    <div class="pagination-wrap">
      <div class="pagination-info">Showing ${start}–${end} of <strong>${total}</strong> students</div>
      <div class="pagination-btns">${buttons}</div>
    </div>
  `;
}

// ─── Student Modal ───────────────────────────────────────────────
function openStudentModal(studentId = null) {
  const isEdit = !!studentId;
  const student = isEdit ? studentsCache.data.find(s => s.id === studentId) : null;
  
  const modalHTML = `
    <div class="modal-overlay" id="studentModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? 'Edit Student' : 'Add New Student'}</div>
          <button class="modal-close" onclick="closeModal('studentModal')">✕</button>
        </div>
        <form id="studentForm">
          <div class="modal-body">
            <div class="form-group">
              <label>Name *</label>
              <input type="text" name="name" value="${escapeHtml(student?.name || '')}" required minlength="2" maxlength="100">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" value="${escapeHtml(student?.email || '')}">
            </div>
            <div class="form-group">
              <label>Marks * (0-100)</label>
              <input type="number" name="marks" value="${student?.marks || ''}" step="0.01" min="0" max="100" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('studentModal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submitStudentBtn">${isEdit ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  openModal('studentModal');
  
  const form = document.getElementById('studentForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email') || null,
      marks: parseFloat(formData.get('marks'))
    };
    
    const submitBtn = document.getElementById('submitStudentBtn');
    setLoading(submitBtn, true);
    
    try {
      if (isEdit) {
        await studentsApi.update(studentId, data);
        showToast('Student updated successfully', 'success');
      } else {
        await studentsApi.create(data);
        showToast('Student added successfully', 'success');
      }
      closeModal('studentModal');
      await loadStudents();
      loadDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Failed to save student', 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function confirmDeleteStudent(id, name) {
  const modalHTML = `
    <div class="modal-overlay" id="confirmModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Confirm Delete</div>
          <button class="modal-close" onclick="closeModal('confirmModal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="confirm-icon">⚠️</div>
          <div class="confirm-text">
            <p>Are you sure you want to delete <strong>${escapeHtml(name)}</strong>?</p>
            <p class="text-muted mt-2">This action cannot be undone.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('confirmModal')">Cancel</button>
          <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  openModal('confirmModal');
  
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    try {
      await studentsApi.delete(id);
      showToast('Student deleted successfully', 'success');
      closeModal('confirmModal');
      await loadStudents();
      loadDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Failed to delete student', 'error');
    }
  });
}

// ─── Render Auth Pages ───────────────────────────────────────────
function renderAuthPage(type) {
  const app = document.getElementById('app');
  const isLogin = type === 'login';
  
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-panel">
        <div class="auth-box">
          <div class="auth-logo">
            <div class="auth-logo-mark">S</div>
            <div class="auth-logo-text">Student<span>MS</span></div>
          </div>
          <h2>${isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p class="subtitle">
            ${isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
            <a href="#${isLogin ? 'signup' : 'login'}">${isLogin ? 'Sign up' : 'Log in'}</a>
          </p>
          <form id="authForm">
            <div class="form-group">
              <label>Username</label>
              <div class="input-wrap">
                <i class="input-icon">👤</i>
                <input type="text" name="username" placeholder="Enter your username" required>
              </div>
              <div class="field-error" id="usernameError"></div>
            </div>
            ${!isLogin ? `
              <div class="form-group">
                <label>Email</label>
                <div class="input-wrap">
                  <i class="input-icon">📧</i>
                  <input type="email" name="email" placeholder="Enter your email" required>
                </div>
                <div class="field-error" id="emailError"></div>
              </div>
            ` : ''}
            <div class="form-group">
              <label>Password</label>
              <div class="input-wrap">
                <i class="input-icon">🔒</i>
                <input type="password" name="password" placeholder="Enter your password" required>
                <button type="button" class="input-toggle" onclick="togglePassword(this)">👁️</button>
              </div>
              <div class="field-error" id="passwordError"></div>
            </div>
            <button type="submit" class="btn btn-primary" id="authSubmitBtn">
              <span class="btn-text">${isLogin ? 'Log in' : 'Sign up'}</span>
              <div class="spinner"></div>
            </button>
          </form>
        </div>
      </div>
      <div class="auth-hero">
        <div class="auth-hero-grid"></div>
        <div class="auth-hero-content">
          <div class="auth-hero-eyebrow">Smart Education</div>
          <h1>Manage <span>students</span><br>with precision</h1>
          <p>Complete student management solution with analytics, grading, and real-time insights.</p>
          <div class="hero-stats">
            <div class="hero-stat">
              <div class="hero-stat-num">10K+</div>
              <div class="hero-stat-label">Students Managed</div>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-num">98%</div>
              <div class="hero-stat-label">Satisfaction</div>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-num">24/7</div>
              <div class="hero-stat-label">Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderToastContainer()}
  `;
  
  const form = document.getElementById('authForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      username: formData.get('username'),
      password: formData.get('password')
    };
    if (!isLogin) data.email = formData.get('email');
    
    const submitBtn = document.getElementById('authSubmitBtn');
    setLoading(submitBtn, true);
    
    try {
      const result = isLogin ? await authApi.login(data) : await authApi.signup(data);
      Auth.save(result.data.user, result.data.token);
      showToast(result.message, 'success');
      navigateTo('dashboard', true);
    } catch (error) {
      if (error.errors) {
        error.errors.forEach(err => {
          const errorDiv = document.getElementById(`${err.field}Error`);
          if (errorDiv) {
            errorDiv.textContent = err.message;
            errorDiv.classList.add('visible');
          }
        });
      } else {
        showToast(error.message, 'error');
      }
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

// ─── Sidebar ─────────────────────────────────────────────────────
function renderSidebar() {
  const user = Auth.getUser();
  const isAdmin = Auth.isAdmin();
  
  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">S</div>
        <div class="logo-text">
          Student<span>MS</span>
          <small>v2.0</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-label">Main</div>
        <button class="nav-link" data-page="dashboard">
          <i>📊</i> Dashboard
        </button>
        <button class="nav-link" data-page="students">
          <i>👥</i> Students
          <span class="badge" id="studentCount">—</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">${getInitials(user?.username || 'User')}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(user?.username || 'User')}</div>
            <div class="user-role ${user?.role === 'admin' ? 'admin' : ''}">${user?.role || 'user'}</div>
          </div>
          <button class="logout-btn" id="logoutBtn" title="Logout">🚪</button>
        </div>
      </div>
    </aside>
  `;
}

function attachSidebarEvents() {
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      navigateTo(page);
    });
  });
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clear();
      showToast('Logged out successfully', 'info');
      navigateTo('login', true);
    });
  }
}

// ─── Toast Container ────────────────────────────────────────────
function renderToastContainer() {
  return '<div id="toastContainer" class="toast-container"></div>';
}

// ─── Utilities ──────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
    return c;
  });
}

window.togglePassword = function(btn) {
  const input = btn.parentElement.querySelector('input');
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
};

// Make modal functions global
window.closeModal = closeModal;
window.openModal = openModal;

// ─── Initialize App ─────────────────────────────────────────────
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
  handleRoute();
});

// Expose APIs globally for console debugging
window.api = { authApi, studentsApi, Auth };