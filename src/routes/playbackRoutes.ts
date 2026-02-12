import { Router } from 'express';
import { body, param } from 'express-validator';
import { startPlayback, updatePlayback, completePlayback } from '../controllers/playbackController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

router.use(authenticate);

router.post(
  '/playback/start',
  [
    body('profileId').notEmpty().withMessage('Profile ID required'),
    body('titleId').notEmpty().withMessage('Title ID required'),
    body('durationMs').isNumeric().withMessage('Duration required')
  ],
  validate,
  startPlayback
);

router.patch(
  '/playback/:sessionId',
  [
    param('sessionId').notEmpty().withMessage('Session ID required'),
    body('lastPositionMs').optional().isNumeric(),
    body('durationMs').optional().isNumeric(),
    body('resumeAt').optional().isNumeric(),
    body('currentBitrate').optional().isNumeric(),
    body('currentCdn').optional().isString(),
    body('playbackError').optional().isObject()
  ],
  validate,
  updatePlayback
);

router.post(
  '/playback/:sessionId/complete',
  [param('sessionId').notEmpty().withMessage('Session ID required')],
  validate,
  completePlayback
);

export default router;
