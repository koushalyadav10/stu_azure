# 🎓 Student Management System

A production-ready full-stack web application built with **Node.js**, **Express**, and **Azure SQL Database**. Features JWT authentication, role-based access control, and a sleek dark-themed UI.

---

## 📁 Project Structure

```
student-management-system/
├── config/
│   ├── db.js          # Azure SQL connection pool
│   └── setup.sql      # SQL to create tables + seed data
├── controllers/
│   ├── authController.js
│   └── studentController.js
├── middleware/
│   ├── auth.js        # JWT verification + admin guard
│   └── validate.js    # express-validator error handler
├── routes/
│   ├── auth.js
│   └── students.js
├── public/
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js     # HTTP helpers + Auth token management
│   │   └── app.js     # SPA router + page renderers
│   └── index.html
├── server.js          # Express app entry point
├── .env.example       # Environment variable template
├── web.config         # Azure App Service IISNode config
└── package.json
```

---

## 🚀 Quick Start (Local)

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd student-management-system
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
NODE_ENV=development

DB_SERVER=your-server.database.windows.net
DB_DATABASE=StudentManagementDB
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_PORT=1433

JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Create the Azure SQL database tables

Open the **Azure Portal → SQL databases → Query editor** (or use Azure Data Studio / SSMS), then run the contents of `config/setup.sql`:

```sql
-- Creates Users and Students tables + seeds demo data
-- See config/setup.sql for full script
```

### 4. Start the server

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** in your browser.

---

## 🔐 Authentication

| Role  | Permissions                          |
|-------|--------------------------------------|
| Admin | View, Add, Edit, Delete students     |
| User  | View students only (read-only)       |

**Demo login (seeded in setup.sql):**
- Username: `admin`
- Password: `Admin@123`

New accounts created via Signup are always `user` role. To promote to admin, update the DB directly:
```sql
UPDATE Users SET role = 'admin' WHERE username = 'yourusername';
```

---

## 📡 REST API Reference

All student endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint         | Access | Description            |
|--------|-----------------|--------|------------------------|
| POST   | /api/auth/signup | Public | Register new account   |
| POST   | /api/auth/login  | Public | Login, receive JWT     |
| GET    | /api/auth/me     | Auth   | Get current user info  |

### Students

| Method | Endpoint               | Access | Description              |
|--------|------------------------|--------|--------------------------|
| GET    | /api/students          | Auth   | List students (paginated)|
| GET    | /api/students/stats    | Auth   | Grade distribution stats |
| GET    | /api/students/:id      | Auth   | Get single student       |
| POST   | /api/students          | Admin  | Create student           |
| PUT    | /api/students/:id      | Admin  | Update student           |
| DELETE | /api/students/:id      | Admin  | Delete student           |

#### GET /api/students — Query Parameters

| Param     | Default | Description                          |
|-----------|---------|--------------------------------------|
| page      | 1       | Page number                          |
| limit     | 10      | Records per page (max 100)           |
| search    | ""      | Search by name or email              |
| minMarks  | 0       | Filter: minimum marks                |
| maxMarks  | 100     | Filter: maximum marks                |
| sortBy    | id      | Sort column: id, name, marks, grade  |
| sortOrder | ASC     | ASC or DESC                          |

---

## ☁️ Deploy to Azure App Service

### Prerequisites
- Azure account
- Azure CLI installed (`az login`)

### Steps

**1. Create resources**
```bash
az group create --name StudentMSRG --location eastus

az appservice plan create \
  --name StudentMSPlan \
  --resource-group StudentMSRG \
  --sku B1 --is-linux

az webapp create \
  --name your-app-name \
  --resource-group StudentMSRG \
  --plan StudentMSPlan \
  --runtime "NODE:20-lts"
```

**2. Set environment variables in Azure**
```bash
az webapp config appsettings set \
  --name your-app-name \
  --resource-group StudentMSRG \
  --settings \
    DB_SERVER="your-server.database.windows.net" \
    DB_DATABASE="StudentManagementDB" \
    DB_USER="your-db-user" \
    DB_PASSWORD="your-db-password" \
    JWT_SECRET="your-long-secret-key" \
    NODE_ENV="production" \
    ALLOWED_ORIGINS="https://your-app-name.azurewebsites.net"
```

**3. Deploy via ZIP**
```bash
zip -r app.zip . --exclude "node_modules/*" --exclude ".git/*" --exclude ".env"

az webapp deployment source config-zip \
  --name your-app-name \
  --resource-group StudentMSRG \
  --src app.zip
```

**4. Azure SQL firewall**
Allow your App Service's outbound IPs in the Azure SQL firewall rules.

---

## 🔒 Security Features

- **SQL Injection Prevention** — All queries use parameterized inputs via `mssql` typed parameters
- **Password Hashing** — bcrypt with cost factor 12
- **JWT Authentication** — Signed tokens with configurable expiry
- **Rate Limiting** — 200 req/15min globally; 20 req/15min on auth endpoints
- **Helmet.js** — Sets 12+ security HTTP headers
- **Input Validation** — express-validator on all endpoints
- **CORS** — Configurable allowed origins
- **Role-Based Access** — Enforced at middleware level, not just UI

---

## 🎨 UI Features

- Dark industrial design with amber-gold accent
- Responsive sidebar navigation
- Live search with debounce
- Marks range filter
- Sortable table columns
- Skeleton loading states
- Toast notifications
- Animated grade distribution chart
- Pagination with dynamic page buttons
- Add/Edit modal with inline validation
- Delete confirmation modal

---

## 🧪 Tech Stack

| Layer      | Technology                      |
|------------|---------------------------------|
| Runtime    | Node.js 20+                     |
| Framework  | Express 4                       |
| Database   | Azure SQL (mssql driver)        |
| Auth       | JWT + bcryptjs                  |
| Validation | express-validator               |
| Security   | Helmet, express-rate-limit, CORS|
| Frontend   | Vanilla JS SPA (no framework)   |
| Fonts      | Clash Display, Syne, DM Sans    |
| Hosting    | Azure App Service               |