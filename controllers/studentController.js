// controllers/studentController.js
const { sql, executeQuery } = require('../config/db');

/** GET /api/students
 *  Query params: search, minMarks, maxMarks, page, limit, sortBy, sortOrder
 */
async function getAllStudents(req, res) {
  try {
    const {
      search = '',
      minMarks = 0,
      maxMarks = 100,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    // Whitelist sort columns to prevent injection
    const allowedSortCols = ['id', 'name', 'marks', 'grade', 'created_at'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    const minM = parseFloat(minMarks);
    const maxM = parseFloat(maxMarks);

    // Count total for pagination metadata
    const countResult = await executeQuery(
      `SELECT COUNT(*) AS total FROM Students
       WHERE (@search = '' OR name LIKE @searchLike OR email LIKE @searchLike)
         AND marks >= @minMarks AND marks <= @maxMarks`,
      {
        search:     { type: sql.NVarChar(100), value: search },
        searchLike: { type: sql.NVarChar(100), value: `%${search}%` },
        minMarks:   { type: sql.Decimal(5,2),  value: minM },
        maxMarks:   { type: sql.Decimal(5,2),  value: maxM },
      }
    );

    const total = countResult.recordset[0].total;

    // Fetch page of students
    const dataResult = await executeQuery(
      `SELECT id, name, email, marks, grade, created_at, updated_at
       FROM Students
       WHERE (@search = '' OR name LIKE @searchLike OR email LIKE @searchLike)
         AND marks >= @minMarks AND marks <= @maxMarks
       ORDER BY ${safeSortBy} ${safeSortOrder}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      {
        search:     { type: sql.NVarChar(100), value: search },
        searchLike: { type: sql.NVarChar(100), value: `%${search}%` },
        minMarks:   { type: sql.Decimal(5,2),  value: minM },
        maxMarks:   { type: sql.Decimal(5,2),  value: maxM },
        offset:     { type: sql.Int,           value: offset },
        limit:      { type: sql.Int,           value: pageSize },
      }
    );

    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('GetAllStudents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
}

/** GET /api/students/:id */
async function getStudentById(req, res) {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT id, name, email, marks, grade, created_at, updated_at
       FROM Students WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('GetStudentById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student.' });
  }
}

/** POST /api/students  (admin only) */
async function createStudent(req, res) {
  try {
    const { name, email, marks } = req.body;

    const result = await executeQuery(
      `INSERT INTO Students (name, email, marks)
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.marks, INSERTED.grade, INSERTED.created_at
       VALUES (@name, @email, @marks)`,
      {
        name:  { type: sql.NVarChar(100), value: name },
        email: { type: sql.NVarChar(100), value: email || null },
        marks: { type: sql.Decimal(5,2),  value: parseFloat(marks) },
      }
    );

    res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      data: result.recordset[0],
    });
  } catch (err) {
    console.error('CreateStudent error:', err);
    res.status(500).json({ success: false, message: 'Failed to create student.' });
  }
}

/** PUT /api/students/:id  (admin only) */
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const { name, email, marks } = req.body;

    // Check exists
    const existing = await executeQuery(
      `SELECT id FROM Students WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const result = await executeQuery(
      `UPDATE Students
       SET name = @name, email = @email, marks = @marks, updated_at = GETDATE()
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.marks, INSERTED.grade, INSERTED.updated_at
       WHERE id = @id`,
      {
        id:    { type: sql.Int,           value: parseInt(id) },
        name:  { type: sql.NVarChar(100), value: name },
        email: { type: sql.NVarChar(100), value: email || null },
        marks: { type: sql.Decimal(5,2),  value: parseFloat(marks) },
      }
    );

    res.json({
      success: true,
      message: 'Student updated successfully.',
      data: result.recordset[0],
    });
  } catch (err) {
    console.error('UpdateStudent error:', err);
    res.status(500).json({ success: false, message: 'Failed to update student.' });
  }
}

/** DELETE /api/students/:id  (admin only) */
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `DELETE FROM Students OUTPUT DELETED.id, DELETED.name WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.json({
      success: true,
      message: `Student "${result.recordset[0].name}" deleted successfully.`,
    });
  } catch (err) {
    console.error('DeleteStudent error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete student.' });
  }
}

/** GET /api/students/stats  — dashboard summary */
async function getStats(req, res) {
  try {
    const result = await executeQuery(
      `SELECT
         COUNT(*)                                         AS total,
         ROUND(AVG(marks), 2)                            AS avgMarks,
         MAX(marks)                                       AS topMarks,
         MIN(marks)                                       AS lowestMarks,
         SUM(CASE WHEN marks >= 90 THEN 1 ELSE 0 END)   AS gradeAPlus,
         SUM(CASE WHEN marks >= 80 AND marks < 90 THEN 1 ELSE 0 END) AS gradeA,
         SUM(CASE WHEN marks >= 70 AND marks < 80 THEN 1 ELSE 0 END) AS gradeB,
         SUM(CASE WHEN marks >= 60 AND marks < 70 THEN 1 ELSE 0 END) AS gradeC,
         SUM(CASE WHEN marks >= 50 AND marks < 60 THEN 1 ELSE 0 END) AS gradeD,
         SUM(CASE WHEN marks <  50 THEN 1 ELSE 0 END)   AS gradeF
       FROM Students`
    );

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('GetStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
}

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent, getStats };