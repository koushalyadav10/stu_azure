// routes/students.js
const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStats,
} = require('../controllers/studentController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// All student routes require authentication
router.use(authenticate);

// GET /api/students/stats  — must come before /:id
router.get('/stats', getStats);

// GET /api/students
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
    query('minMarks').optional().isFloat({ min: 0, max: 100 }).withMessage('minMarks must be 0–100.'),
    query('maxMarks').optional().isFloat({ min: 0, max: 100 }).withMessage('maxMarks must be 0–100.'),
  ],
  validate,
  getAllStudents
);

// GET /api/students/:id
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid student ID.')],
  validate,
  getStudentById
);

// POST /api/students  (admin only)
router.post(
  '/',
  adminOnly,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2–100 characters.'),
    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address.')
      .normalizeEmail(),
    body('marks')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Marks must be between 0 and 100.'),
  ],
  validate,
  createStudent
);

// PUT /api/students/:id  (admin only)
router.put(
  '/:id',
  adminOnly,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid student ID.'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2–100 characters.'),
    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address.')
      .normalizeEmail(),
    body('marks')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Marks must be between 0 and 100.'),
  ],
  validate,
  updateStudent
);

// DELETE /api/students/:id  (admin only)
router.delete(
  '/:id',
  adminOnly,
  [param('id').isInt({ min: 1 }).withMessage('Invalid student ID.')],
  validate,
  deleteStudent
);

module.exports = router;