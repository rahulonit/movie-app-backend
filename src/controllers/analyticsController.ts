import { Request, Response } from 'express';
import { Movie } from '../models/Movie';
import { Series } from '../models/Series';
import { User } from '../models/User';
import mongoose from 'mongoose';

// Get dashboard analytics
export const getDashboardAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // Active subscriptions
    const activeSubscriptions = await User.countDocuments({
      'subscription.status': 'ACTIVE',
      'subscription.plan': 'PREMIUM'
    });

    // Total movies and series
    const totalMovies = await Movie.countDocuments({ isPublished: true });
    const totalSeries = await Series.countDocuments({ isPublished: true });

    // Total watch time (sum of all progress in watch history)
    const watchTimeResult = await User.aggregate([
      { $unwind: '$profiles' },
      { $unwind: '$profiles.watchHistory' },
      {
        $group: {
          _id: null,
          totalWatchTime: { $sum: '$profiles.watchHistory.progress' }
        }
      }
    ]);
    const totalWatchTime = watchTimeResult.length > 0 ? 
      Math.floor(watchTimeResult[0].totalWatchTime / 60) : 0; // Convert to minutes

    // Most watched movie
    const mostWatchedMovie = await Movie.findOne({ isPublished: true })
      .sort({ views: -1 })
      .select('title views poster');

    // Most watched series
    const mostWatchedSeries = await Series.findOne({ isPublished: true })
      .sort({ totalViews: -1 })
      .select('title totalViews poster');

    // Daily active users (users with watch activity in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const dailyActiveUsers = await User.countDocuments({
      'profiles.watchHistory.updatedAt': { $gte: oneDayAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeSubscriptions,
        totalMovies,
        totalSeries,
        totalWatchTime,
        mostWatchedMovie,
        mostWatchedSeries,
        dailyActiveUsers
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    });
  }
};

// Get views per day (last 30 days)
export const getViewsPerDay = async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate watch history by day
    const viewsData = await User.aggregate([
      { $unwind: '$profiles' },
      { $unwind: '$profiles.watchHistory' },
      {
        $match: {
          'profiles.watchHistory.updatedAt': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$profiles.watchHistory.updatedAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { viewsPerDay: viewsData }
    });
  } catch (error) {
    console.error('Views per day error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching views data'
    });
  }
};

// Get top 10 content
export const getTopContent = async (_req: Request, res: Response): Promise<void> => {
  try {
    const topMovies = await Movie.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(10)
      .select('title views poster');

    const topSeries = await Series.find({ isPublished: true })
      .sort({ totalViews: -1 })
      .limit(10)
      .select('title totalViews poster');

    res.status(200).json({
      success: true,
      data: {
        topMovies,
        topSeries
      }
    });
  } catch (error) {
    console.error('Top content error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top content'
    });
  }
};

// Get content distribution (movies vs series)
export const getContentDistribution = async (_req: Request, res: Response): Promise<void> => {
  try {
    const movieCount = await Movie.countDocuments({ isPublished: true });
    const seriesCount = await Series.countDocuments({ isPublished: true });

    res.status(200).json({
      success: true,
      data: {
        movies: movieCount,
        series: seriesCount
      }
    });
  } catch (error) {
    console.error('Content distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content distribution'
    });
  }
};

// Get genre distribution
export const getGenreDistribution = async (_req: Request, res: Response): Promise<void> => {
  try {
    const genreData = await Movie.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$genres' },
      {
        $group: {
          _id: '$genres',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { genreDistribution: genreData }
    });
  } catch (error) {
    console.error('Genre distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching genre distribution'
    });
  }
};

// Get user growth (new users per day, last 30 days)
export const getUserGrowth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { userGrowth: userData }
    });
  } catch (error) {
    console.error('User growth error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user growth data'
    });
  }
};

// Get content performance
export const getContentPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { contentId, contentType } = req.params;

    if (contentType === 'movie') {
      const movie = await Movie.findById(contentId);
      if (!movie) {
        res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
        return;
      }

      // Calculate completion rate
      const completionData = await User.aggregate([
        { $unwind: '$profiles' },
        { $unwind: '$profiles.watchHistory' },
        {
          $match: {
            'profiles.watchHistory.contentId': new mongoose.Types.ObjectId(contentId),
            'profiles.watchHistory.contentType': 'Movie'
          }
        },
        {
          $project: {
            completionPercentage: {
              $multiply: [
                { $divide: ['$profiles.watchHistory.progress', '$profiles.watchHistory.duration'] },
                100
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgCompletion: { $avg: '$completionPercentage' },
            totalViews: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: {
          content: movie,
          performance: completionData.length > 0 ? completionData[0] : {
            avgCompletion: 0,
            totalViews: 0
          }
        }
      });
    } else if (contentType === 'series') {
      const series = await Series.findById(contentId);
      if (!series) {
        res.status(404).json({
          success: false,
          message: 'Series not found'
        });
        return;
      }

      // Episode popularity
      const episodeData = await User.aggregate([
        { $unwind: '$profiles' },
        { $unwind: '$profiles.watchHistory' },
        {
          $match: {
            'profiles.watchHistory.contentId': new mongoose.Types.ObjectId(contentId),
            'profiles.watchHistory.contentType': 'Series'
          }
        },
        {
          $group: {
            _id: '$profiles.watchHistory.episodeId',
            views: { $sum: 1 }
          }
        },
        { $sort: { views: -1 } }
      ]);

      res.status(200).json({
        success: true,
        data: {
          content: series,
          episodePopularity: episodeData
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }
  } catch (error) {
    console.error('Content performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content performance'
    });
  }
};
