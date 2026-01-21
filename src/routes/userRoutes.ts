import { Router } from 'express';
import { body } from 'express-validator';
import {
  createProfile,
  getProfiles,
  updateProfile,
  deleteProfile,
  addToMyList,
  removeFromMyList,
  getMyList,
  updateProgress,
  getWatchHistory
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile management
router.post(
  '/profiles',
  [
    body('name').trim().notEmpty().withMessage('Profile name required'),
    body('isKids').optional().isBoolean()
  ],
  validate,
  createProfile
);
router.get('/profiles', getProfiles);
router.put('/profiles/:profileId', updateProfile);
router.delete('/profiles/:profileId', deleteProfile);

// My List
router.post(
  '/my-list/add',
  [
    body('profileId').notEmpty().withMessage('Profile ID required'),
    body('contentId').notEmpty().withMessage('Content ID required')
  ],
  validate,
  addToMyList
);
router.post(
  '/my-list/remove',
  [
    body('profileId').notEmpty().withMessage('Profile ID required'),
    body('contentId').notEmpty().withMessage('Content ID required')
  ],
  validate,
  removeFromMyList
);
router.get('/my-list/:profileId', getMyList);

// Watch progress
router.post(
  '/progress/update',
  [
    body('profileId').notEmpty().withMessage('Profile ID required'),
    body('contentId').notEmpty().withMessage('Content ID required'),
    body('contentType').isIn(['Movie', 'Series']).withMessage('Invalid content type'),
    body('progress').isNumeric().withMessage('Progress must be a number'),
    body('duration').isNumeric().withMessage('Duration must be a number')
  ],
  validate,
  updateProgress
);
router.get('/watch-history/:profileId', getWatchHistory);

export default router;
