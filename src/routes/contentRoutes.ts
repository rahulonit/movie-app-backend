import { Router } from 'express';
import {
  getHomeFeed,
  getMovieById,
  getSeriesById,
  searchContent,
  getMoviesByGenre
} from '../controllers/contentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All content routes require authentication
router.use(authenticate);

// Routes
router.get('/home', getHomeFeed);
router.get('/movies/:id', getMovieById);
router.get('/series/:id', getSeriesById);
router.get('/search', searchContent);
router.get('/movies/genre/:genre', getMoviesByGenre);

export default router;
