import { Router } from 'express';
import {
  getHomeFeed,
  getMovieById,
  getSeriesById,
  searchContent,
  getMoviesByGenre,
  getRelatedContent
} from '../controllers/contentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All content routes require authentication
router.use(authenticate);

// Routes - order matters! Specific routes before generic ID routes
router.get('/home', getHomeFeed);
router.get('/search', searchContent);
router.get('/movies/genre/:genre', getMoviesByGenre);
// Related content route - uses /content/:id/related path
router.get('/content/:id/related', getRelatedContent);
router.get('/movies/:id', getMovieById);
router.get('/series/:id', getSeriesById);

export default router;
