import { Request, Response } from 'express';
import { Movie } from '../models/Movie';
import { Series } from '../models/Series';
import cloudinary, { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../config/cloudinary';
import { createMuxUploadUrl, deleteMuxAsset, getMuxAsset, getMuxClient } from '../config/mux';

// Upload image to Cloudinary
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const { folder } = req.body;
    const result = await uploadToCloudinary(req.file, folder || 'general');

    res.status(200).json({
      success: true,
      message: 'Image uploaded',
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image'
    });
  }
};

// Get Mux upload URL for direct video uploads
// Updated to include debug error details
export const getMuxUploadUrl = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await createMuxUploadUrl();

    res.status(200).json({
      success: true,
      message: 'Upload URL created',
      data: {
        uploadUrl: result.uploadUrl,
        assetId: result.assetId
      }
    });
  } catch (error: any) {
    console.error('Get Mux upload URL error:', JSON.stringify(error, null, 2));
    let errorMessage = 'Unknown error';
    let errorDetails: any = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    } else if (typeof error === 'object') {
      errorMessage = error.message || error.toString();
      errorDetails = {
        type: typeof error,
        keys: Object.keys(error),
        response: error.response || error.data,
        ...error
      };
    } else {
      errorMessage = error.toString();
    }

    res.status(500).json({
      success: false,
      message: 'Error creating upload URL',
      debug: {
        error: errorMessage,
        details: errorDetails
      }
    });
  }
};

// Admin maintenance: sync MongoDB indexes to match schema
export const syncIndexes = async (_req: Request, res: Response): Promise<void> => {
  try {
    await Movie.syncIndexes();
    await Series.syncIndexes();
    res.status(200).json({ success: true, message: 'Indexes synced' });
  } catch (error: any) {
    console.error('Sync indexes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing indexes',
      debug: { error: error?.message || error?.toString() }
    });
  }
};

// Verify Cloudinary and Mux connectivity for admins
export const checkMediaIntegrations = async (_req: Request, res: Response): Promise<void> => {
  const cloudinaryStatus: { ok: boolean; message: string } = { ok: false, message: '' };
  const muxStatus: { ok: boolean; message: string } = { ok: false, message: '' };

  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Missing Cloudinary environment variables');
    }

    const ping = await cloudinary.api.ping();
    cloudinaryStatus.ok = ping?.status === 'ok';
    cloudinaryStatus.message = cloudinaryStatus.ok ? 'Cloudinary reachable' : 'Cloudinary ping failed';
  } catch (error: any) {
    cloudinaryStatus.message = error?.message || 'Cloudinary check failed';
  }

  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      throw new Error('Missing Mux environment variables');
    }

    const mux = getMuxClient();
    const assets = await mux.Video.Assets.list({ limit: 1 });
    muxStatus.ok = true;
    muxStatus.message = Array.isArray((assets as any).data)
      ? 'Mux authenticated'
      : 'Mux reachable';
  } catch (error: any) {
    const detail = Array.isArray(error?.messages)
      ? error.messages.join(', ')
      : error?.message;
    muxStatus.message = detail || 'Mux check failed';
  }

  res.status(cloudinaryStatus.ok && muxStatus.ok ? 200 : 503).json({
    success: cloudinaryStatus.ok && muxStatus.ok,
    data: {
      cloudinary: cloudinaryStatus,
      mux: muxStatus
    }
  });
};

// Create movie
export const createMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      genres,
      language,
      releaseYear,
      duration,
      rating,
      poster,
      trailerUrl,
      muxPlaybackId,
      muxAssetId,
      maturityRating,
      isPremium
    } = req.body;

    let muxAsset;
    try {
      muxAsset = await getMuxAsset(muxAssetId);
    } catch (assetErr: any) {
      console.error('Mux asset lookup error:', JSON.stringify(assetErr, null, 2));
      res.status(400).json({
        success: false,
        message: 'Invalid Mux asset ID',
        debug: {
          error: assetErr?.message || assetErr?.toString(),
          details: assetErr?.response?.data || assetErr
        }
      });
      return;
    }

    if (!muxAsset || muxAsset.status !== 'ready') {
      res.status(400).json({
        success: false,
        message: 'Mux asset not ready or not found',
        debug: {
          status: muxAsset?.status,
          assetId: muxAssetId
        }
      });
      return;
    }

    const movie = await Movie.create({
      title,
      description,
      genres,
      language,
      releaseYear,
      duration,
      rating: rating || 0,
      poster,
      trailerUrl,
      muxPlaybackId,
      muxAssetId,
      maturityRating,
      isPremium: isPremium || false,
      isPublished: true
    });

    res.status(201).json({
      success: true,
      message: 'Movie created',
      data: { movie }
    });
  } catch (error: any) {
    console.error('Create movie error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: 'Error creating movie',
      debug: {
        error: error?.message || error?.toString(),
        details: error?.response?.data || error
      }
    });
  }
};

// Get all movies (admin)
export const getAllMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { search, isPremium, isPublished } = req.query;

    let query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (isPremium !== undefined) {
      query.isPremium = isPremium === 'true';
    }

    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    const movies = await Movie.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Movie.countDocuments(query);

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
    console.error('Get all movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies'
    });
  }
};

// Update movie
export const updateMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const movie = await Movie.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!movie) {
      res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Movie updated',
      data: { movie }
    });
  } catch (error: any) {
    console.error('Update movie error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: 'Error updating movie',
      debug: {
        error: error?.message || error?.toString(),
        details: error?.response?.data || error
      }
    });
  }
};

// Delete movie
export const deleteMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const movie = await Movie.findById(id);
    if (!movie) {
      res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
      return;
    }

    // Delete from Cloudinary
    try {
      if (movie.poster.vertical) {
        const publicId = extractPublicId(movie.poster.vertical);
        await deleteFromCloudinary(publicId);
      }
      if (movie.poster.horizontal) {
        const publicId = extractPublicId(movie.poster.horizontal);
        await deleteFromCloudinary(publicId);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
    }

    // Delete from Mux
    try {
      await deleteMuxAsset(movie.muxAssetId);
    } catch (muxError) {
      console.error('Mux deletion error:', muxError);
    }

    // Delete from database
    await Movie.findByIdAndDelete(id);

    // Clean up from user lists and watch history
    // This would be handled by a background job in production
    // For now, we'll just remove references
    const { User } = await import('../models/User');
    await User.updateMany(
      { 'profiles.myList': id },
      { $pull: { 'profiles.$.myList': id } }
    );
    await User.updateMany(
      { 'profiles.watchHistory.contentId': id },
      { $pull: { 'profiles.$.watchHistory': { contentId: id } } }
    );

    res.status(200).json({
      success: true,
      message: 'Movie deleted successfully'
    });
  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting movie'
    });
  }
};

// Create series
export const createSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      genres,
      language,
      releaseYear,
      poster,
      trailerUrl,
      maturityRating,
      isPremium
    } = req.body;

    const series = await Series.create({
      title,
      description,
      genres,
      language,
      releaseYear,
      poster,
      trailerUrl,
      maturityRating,
      isPremium: isPremium || false,
      isPublished: true,
      seasons: []
    });

    res.status(201).json({
      success: true,
      message: 'Series created',
      data: { series }
    });
  } catch (error) {
    console.error('Create series error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating series'
    });
  }
};

// Get all series (admin)
export const getAllSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { search, isPremium, isPublished } = req.query;

    let query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (isPremium !== undefined) {
      query.isPremium = isPremium === 'true';
    }

    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    const series = await Series.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Series.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        series,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all series error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching series'
    });
  }
};

// Update series
export const updateSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const series = await Series.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!series) {
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Series updated',
      data: { series }
    });
  } catch (error) {
    console.error('Update series error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating series'
    });
  }
};

// Delete series
export const deleteSeries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const series = await Series.findById(id);
    if (!series) {
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    // Delete all episode videos from Mux
    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        try {
          await deleteMuxAsset(episode.muxAssetId);
        } catch (muxError) {
          console.error(`Error deleting episode ${episode._id}:`, muxError);
        }

        // Delete episode thumbnail
        try {
          const publicId = extractPublicId(episode.thumbnail);
          await deleteFromCloudinary(publicId);
        } catch (cloudinaryError) {
          console.error('Cloudinary deletion error:', cloudinaryError);
        }
      }
    }

    // Delete series posters
    try {
      if (series.poster.vertical) {
        const publicId = extractPublicId(series.poster.vertical);
        await deleteFromCloudinary(publicId);
      }
      if (series.poster.horizontal) {
        const publicId = extractPublicId(series.poster.horizontal);
        await deleteFromCloudinary(publicId);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
    }

    // Delete from database
    await Series.findByIdAndDelete(id);

    // Clean up from user lists and watch history
    const { User } = await import('../models/User');
    await User.updateMany(
      { 'profiles.myList': id },
      { $pull: { 'profiles.$.myList': id } }
    );
    await User.updateMany(
      { 'profiles.watchHistory.contentId': id },
      { $pull: { 'profiles.$.watchHistory': { contentId: id } } }
    );

    res.status(200).json({
      success: true,
      message: 'Series deleted successfully'
    });
  } catch (error) {
    console.error('Delete series error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting series'
    });
  }
};

// Add season to series
export const addSeason = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId } = req.params;
    const { seasonNumber } = req.body;

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    // Check if season already exists
    if (series.seasons.some(s => s.seasonNumber === seasonNumber)) {
      res.status(400).json({
        success: false,
        message: 'Season already exists'
      });
      return;
    }

    series.seasons.push({
      seasonNumber,
      episodes: []
    });

    await series.save();

    res.status(201).json({
      success: true,
      message: 'Season added',
      data: { season: series.seasons[series.seasons.length - 1] }
    });
  } catch (error) {
    console.error('Add season error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding season'
    });
  }
};

// Add episode to season
export const addEpisode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, seasonNumber } = req.params;
    const {
      episodeNumber,
      title,
      description,
      duration,
      muxPlaybackId,
      muxAssetId,
      thumbnail
    } = req.body;

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    const season = series.seasons.find(s => s.seasonNumber === parseInt(seasonNumber));
    if (!season) {
      res.status(404).json({
        success: false,
        message: 'Season not found'
      });
      return;
    }

    // Verify Mux asset
    const muxAsset = await getMuxAsset(muxAssetId);
    if (!muxAsset || muxAsset.status !== 'ready') {
      res.status(400).json({
        success: false,
        message: 'Mux asset not ready or not found'
      });
      return;
    }

    season.episodes.push({
      episodeNumber,
      title,
      description,
      duration,
      muxPlaybackId,
      muxAssetId,
      thumbnail,
      views: 0
    });

    await series.save();

    res.status(201).json({
      success: true,
      message: 'Episode added',
      data: { episode: season.episodes[season.episodes.length - 1] }
    });
  } catch (error) {
    console.error('Add episode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding episode'
    });
  }
};

// Delete episode
export const deleteEpisode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, seasonNumber, episodeId } = req.params;

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    const season = series.seasons.find(s => s.seasonNumber === parseInt(seasonNumber));
    if (!season) {
      res.status(404).json({
        success: false,
        message: 'Season not found'
      });
      return;
    }

    const episodeIndex = season.episodes.findIndex(
      e => e._id?.toString() === episodeId
    );

    if (episodeIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
      return;
    }

    const episode = season.episodes[episodeIndex];

    // Delete from Mux
    try {
      await deleteMuxAsset(episode.muxAssetId);
    } catch (muxError) {
      console.error('Mux deletion error:', muxError);
    }

    // Delete thumbnail from Cloudinary
    try {
      const publicId = extractPublicId(episode.thumbnail);
      await deleteFromCloudinary(publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
    }

    // Remove episode
    season.episodes.splice(episodeIndex, 1);
    await series.save();

    res.status(200).json({
      success: true,
      message: 'Episode deleted'
    });
  } catch (error) {
    console.error('Delete episode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting episode'
    });
  }
};
