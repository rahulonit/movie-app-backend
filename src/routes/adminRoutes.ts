import { Router } from 'express';
import { body } from 'express-validator';
import {
  uploadImage,
  getCloudflareUploadUrl,
  checkMediaIntegrations,
  searchImdb,
  syncIndexes,
  rebuildTextIndex,
  createMovie,
  getAllMovies,
  updateMovie,
  deleteMovie,
  createSeries,
  getAllSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  addSeason,
  addEpisode,
  updateEpisode,
  deleteEpisode
} from '../controllers/adminController';
import {
  getDashboardAnalytics,
  getViewsPerDay,
  getTopContent,
  getContentDistribution,
  getGenreDistribution,
  getUserGrowth,
  getContentPerformance
} from '../controllers/analyticsController';
import {
  getAllUsers,
  getUserById,
  updateUserSubscription,
  toggleBlockUser,
  getUserStats,
  deleteUser
} from '../controllers/userManagementController';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { uploadImage as uploadImageMiddleware } from '../middleware/upload';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorizeAdmin);

// ===== Media Upload =====
router.post('/upload-image', uploadImageMiddleware.single('image'), uploadImage);
router.get('/cloudflare-upload-url', getCloudflareUploadUrl);
router.get('/integrations/health', checkMediaIntegrations);

// ===== IMDB Integration =====
router.get('/search-imdb', searchImdb);

// ===== Maintenance =====
router.post('/maintenance/sync-indexes', syncIndexes);

// ===== Movie Management =====
router.post(
  '/movies',
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('genres').isArray({ min: 1, max: 5 }).withMessage('1-5 genres required'),
    body('language').notEmpty().withMessage('Language required'),
    body('releaseYear').isInt({ min: 1900 }).withMessage('Valid release year required'),
    body('duration').isInt({ min: 1 }).withMessage('Valid duration required'),
    body('poster.vertical').isURL().withMessage('Valid poster URL required'),
    body('poster.horizontal').isURL().withMessage('Valid poster URL required'),
    body('cloudflareVideoId').notEmpty().withMessage('Cloudflare video ID required'),
    body('maturityRating').isIn(['U', 'UA', 'A']).withMessage('Valid maturity rating required')
  ],
  validate,
  createMovie
);
router.get('/movies', getAllMovies);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// ===== Series Management =====
router.post(
  '/series',
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('genres').isArray({ min: 1, max: 5 }).withMessage('1-5 genres required'),
    body('language').notEmpty().withMessage('Language required'),
    body('releaseYear').isInt({ min: 1900 }).withMessage('Valid release year required'),
    body('poster.vertical').isURL().withMessage('Valid poster URL required'),
    body('poster.horizontal').isURL().withMessage('Valid poster URL required'),
    body('maturityRating').isIn(['U', 'UA', 'A']).withMessage('Valid maturity rating required')
  ],
  validate,
  createSeries
);
router.get('/series', getAllSeries);
router.get('/series/:id', getSeriesById);
router.put('/series/:id', updateSeries);
router.delete('/series/:id', deleteSeries);

// ===== Season & Episode Management =====
router.post(
  '/series/:seriesId/seasons',
  [
    body('seasonNumber').isInt({ min: 1 }).withMessage('Valid season number required')
  ],
  validate,
  addSeason
);
router.post(
  '/series/:seriesId/seasons/:seasonNumber/episodes',
  [
    body('episodeNumber').isInt({ min: 1 }).withMessage('Valid episode number required'),
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('duration').isInt({ min: 1 }).withMessage('Valid duration required'),
    body('cloudflareVideoId').notEmpty().withMessage('Cloudflare video ID required'),
    body('thumbnail').isURL().withMessage('Valid thumbnail URL required')
  ],
  validate,
  addEpisode
);
router.put(
  '/series/:seriesId/seasons/:seasonNumber/episodes/:episodeId',
  updateEpisode
);
router.delete('/series/:seriesId/seasons/:seasonNumber/episodes/:episodeId', deleteEpisode);

// ===== Analytics =====
router.get('/analytics/dashboard', getDashboardAnalytics);
router.get('/analytics/views-per-day', getViewsPerDay);
router.get('/analytics/top-content', getTopContent);
router.get('/analytics/content-distribution', getContentDistribution);
router.get('/analytics/genre-distribution', getGenreDistribution);
router.get('/analytics/user-growth', getUserGrowth);
router.get('/analytics/content/:contentType/:contentId', getContentPerformance);

// ===== User Management =====
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.get('/users/:id/stats', getUserStats);
router.put('/users/:id/subscription', updateUserSubscription);
router.put('/users/:id/block', toggleBlockUser);
router.delete('/users/:id', deleteUser);

// ===== Maintenance =====
router.post('/maintenance/rebuild-text-index', rebuildTextIndex);

export default router;
