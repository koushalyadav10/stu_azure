// config/db.js

const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT) || 1433,

  options: {
    encrypt: true,
    trustServerCertificate: false
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(dbConfig);
      console.log('✅ Database Connected');
    }
    return pool;
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
    throw err;
  }
}

// ✅ CORRECTED executeQuery function
async function executeQuery(query, params = {}) {
  try {
    const connection = await getPool();
    const request = connection.request();

    // 🔥 FIX: Properly handle parameters with type and value
    for (const key in params) {
      const param = params[key];
      
      // Check if param has type and value properties (structured parameter)
      if (param && typeof param === 'object' && param.type && param.value !== undefined) {
        request.input(key, param.type, param.value);
      } 
      // If it's a simple value (for backward compatibility)
      else {
        request.input(key, param);
      }
    }

    const result = await request.query(query);
    return result;
  } catch (err) {
    console.error('❌ Query Error:', err.message);
    console.error('Query:', query);
    console.error('Params:', JSON.stringify(params, null, 2));
    throw err;
  }
}

module.exports = {
  sql,
  getPool,
  executeQuery
};