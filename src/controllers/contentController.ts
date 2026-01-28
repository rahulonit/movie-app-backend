import { Request, Response } from 'express';
import { Movie } from '../models/Movie';
import { Series } from '../models/Series';
import { User } from '../models/User';

// Get home feed with dynamic rows
export const getHomeFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = 10;

    // Get user for profile check
    const user = await User.findById(userId);
    const isPremium = user?.subscription.plan === 'PREMIUM' &&
                     user?.subscription.status === 'ACTIVE';

    // Trending movies (most viewed recently)
    const trendingMovies = await Movie.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(limit)
      ;

    // New releases
    const newReleases = await Movie.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      ;

    // Trending series
    const trendingSeries = await Series.find({ isPublished: true })
      .sort({ totalViews: -1 })
      .limit(limit)
      .select('-muxAssetId');

    // Continue watching (if user has watch history)
    let continueWatching: any[] = [];
    if (user && user.profiles.length > 0) {
      const activeProfile = user.profiles[0];
      const recentHistory = activeProfile.watchHistory
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);

      for (const history of recentHistory) {
        if (history.contentType === 'Movie') {
          const movie = await Movie.findById(history.contentId);
          if (movie) {
            continueWatching.push({
              ...movie.toObject(),
              progress: history.progress,
              duration: history.duration
            });
          }
        } else {
          const series = await Series.findById(history.contentId)
            ;
          if (series) {
            continueWatching.push({
              ...series.toObject(),
              progress: history.progress,
              duration: history.duration,
              episodeId: history.episodeId
            });
          }
        }
      }
    }

    // Action movies
    const actionMovies = await Movie.find({
      isPublished: true,
      genres: 'Action'
    })
      .sort({ views: -1 })
      .limit(limit)
      ;

    // Comedy movies
    const comedyMovies = await Movie.find({
      isPublished: true,
      genres: 'Comedy'
    })
      .sort({ views: -1 })
      .limit(limit)
      ;

    res.status(200).json({
      success: true,
      data: {
        trending: trendingMovies,
        newReleases,
        trendingSeries,
        continueWatching,
        actionMovies,
        comedyMovies,
        isPremium
      }
    });
  } catch (error) {
    console.error('Home feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching home feed'
    });
  }
};

// Get movie by ID
export const getMovieById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const movie = await Movie.findById(id);
    if (!movie || !movie.isPublished) {
      res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
      return;
    }

    // Check premium access
    if (movie.isPremium) {
      const user = await User.findById(userId);
      const isPremium = user?.subscription.plan === 'PREMIUM' &&
                       user?.subscription.status === 'ACTIVE';
      
      if (!isPremium) {
        res.status(403).json({
          success: false,
          message: 'Premium subscription required',
          data: {
            movie: {
              ...movie.toObject(),
              cloudflareVideoId: null
            }
          }
        });
        return;
      }
    }

    // Increment views
    movie.views += 1;
    await movie.save();

    res.status(200).json({
      success: true,
      data: { movie }
    });
  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movie'
    });
  }
};

// Get series by ID
export const getSeriesById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const series = await Series.findById(id);
    if (!series || !series.isPublished) {
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    // Check premium access
    if (series.isPremium) {
      const user = await User.findById(userId);
      const isPremium = user?.subscription.plan === 'PREMIUM' &&
                       user?.subscription.status === 'ACTIVE';
      
      if (!isPremium) {
        res.status(403).json({
          success: false,
          message: 'Premium subscription required',
          data: {
            series: {
              ...series.toObject(),
              seasons: series.seasons.map(s => {
                const seasonObj = s.toObject ? s.toObject() : s;
                return {
                  ...seasonObj,
                  episodes: seasonObj.episodes.map((e: any) => ({
                    ...(e.toObject ? e.toObject() : e),
                    cloudflareVideoId: null
                  }))
                };
              })
            }
          }
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: { series }
    });
  } catch (error) {
    console.error('Get series error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching series'
    });
  }
};

// Search content
export const searchContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, type, genre, language } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    let query: any = { isPublished: true };

    // Text search
    if (q) {
      query.$text = { $search: q as string };
    }

    // Genre filter
    if (genre) {
      query.genres = genre;
    }

    // Language filter
    if (language) {
      query.language = language;
    }

    let results: any[] = [];
    let total = 0;

    // Search movies
    if (!type || type === 'movie') {
      const movies = await Movie.find(query)
        
        .skip(skip)
        .limit(limit)
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 });
      
      results = [...results, ...movies.map(m => ({ ...m.toObject(), type: 'movie' }))];
      total += await Movie.countDocuments(query);
    }

    // Search series
    if (!type || type === 'series') {
      const series = await Series.find(query)
        
        .skip(skip)
        .limit(limit)
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 });
      
      results = [...results, ...series.map(s => ({ ...s.toObject(), type: 'series' }))];
      total += await Series.countDocuments(query);
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching content'
    });
  }
};

// Get movies by genre
export const getMoviesByGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const movies = await Movie.find({
      isPublished: true,
      genres: genre
    })
      
      .skip(skip)
      .limit(limit)
      .sort({ views: -1 });

    const total = await Movie.countDocuments({
      isPublished: true,
      genres: genre
    });

    res.status(200).json({
      success: true,
      data: {
        movies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get movies by genre error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies'
    });
  }
};
