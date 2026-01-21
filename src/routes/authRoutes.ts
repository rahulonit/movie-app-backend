import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('profileName')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Profile name must be at most 50 characters'),
  body('role')
    .optional()
    .isIn(['USER', 'ADMIN'])
    .withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
];

const refreshValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token required')
];

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refreshValidation, validate, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
