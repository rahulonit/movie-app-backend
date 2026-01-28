import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Movie } from '../models/Movie';
import { Series } from '../models/Series';
import cloudinary, { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../config/cloudinary';
import { getCloudflareStreamClient } from '../config/cloudflareStream';
import { searchMovies, getMovieDetails, parseMovieDetails } from '../config/omdb';

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

// Get Cloudflare Stream upload URL for direct video uploads
export const getCloudflareUploadUrl = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cfClient = getCloudflareStreamClient();
    const result = await cfClient.requestUploadURL();

    res.status(200).json({
      success: true,
      message: 'Upload URL created',
      data: {
        uploadURL: result.uploadURL,
        videoId: result.videoId
      }
    });
  } catch (error: any) {
    console.error('Get Cloudflare upload URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting upload URL',
      error: error?.message || 'Unknown error'
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

// Verify Cloudinary and Cloudflare connectivity for admins
export const checkMediaIntegrations = async (_req: Request, res: Response): Promise<void> => {
  const cloudinaryStatus: { ok: boolean; message: string } = { ok: false, message: '' };
  const cloudflareStatus: { ok: boolean; message: string } = { ok: false, message: '' };

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
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      throw new Error('Missing Cloudflare environment variables');
    }

    const cfClient = getCloudflareStreamClient();
    await cfClient.listVideos(1);
    cloudflareStatus.ok = true;
    cloudflareStatus.message = 'Cloudflare Stream authenticated';
  } catch (error: any) {
    cloudflareStatus.message = error?.message || 'Cloudflare check failed';
  }

  res.status(cloudinaryStatus.ok && cloudflareStatus.ok ? 200 : 503).json({
    success: cloudinaryStatus.ok && cloudflareStatus.ok,
    data: {
      cloudinary: cloudinaryStatus,
      cloudflare: cloudflareStatus
    }
  });
};

// Search movie on IMDB and fetch enriched data
export const searchImdb = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Search query required'
      });
      return;
    }

    console.log('[searchImdb] Searching for:', query);

    const results = await searchMovies(query, 'movie');
    
    if (results.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No results found',
        data: []
      });
      return;
    }

    // Fetch detailed info for top 3 results
    const detailedResults = await Promise.all(
      results.slice(0, 3).map(async (result) => {
        try {
          const details = await getMovieDetails(result.imdbID, true);
          if (!details) return null;

          const parsed = parseMovieDetails(details);
          return {
            imdbId: result.imdbID,
            title: result.Title,
            year: result.Year,
            poster: result.Poster,
            ...parsed
          };
        } catch (error: any) {
          console.warn('[searchImdb] Failed to fetch details for', result.imdbID, error?.message);
          return null;
        }
      })
    );

    const filtered = detailedResults.filter(r => r !== null);

    res.status(200).json({
      success: true,
      message: `Found ${filtered.length} result(s)`,
      data: filtered
    });
  } catch (error: any) {
    console.error('[searchImdb] Error:', error?.message);
    res.status(500).json({
      success: false,
      message: 'Error searching IMDB',
      error: error?.message || 'Unknown error'
    });
  }
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
      cloudflareVideoId,
      maturityRating,
      isPremium,
      // Optional IMDB enrichment fields
      imdbId,
      director,
      writer,
      stars,
      imdbRating,
      imdbLink
    } = req.body;

    // Verify Cloudflare video exists
    try {
      const cfClient = getCloudflareStreamClient();
      await cfClient.getVideoDetails(cloudflareVideoId);
    } catch (videoErr: any) {
      console.error('Cloudflare video lookup error:', videoErr);
      res.status(400).json({
        success: false,
        message: 'Invalid Cloudflare video ID',
        error: videoErr?.message || 'Video not found'
      });
      return;
    }

    const movieData: any = {
      title,
      description,
      genres,
      language,
      releaseYear,
      duration,
      rating: rating || 0,
      poster,
      trailerUrl,
      cloudflareVideoId,
      maturityRating,
      isPremium: isPremium || false,
      isPublished: true
    };

    // Add IMDB enrichment fields if provided
    if (imdbId) movieData.imdbId = imdbId;
    if (director) movieData.director = director;
    if (writer) movieData.writer = writer;
    if (stars && Array.isArray(stars)) movieData.stars = stars;
    if (imdbRating) movieData.imdbRating = imdbRating;
    if (imdbLink) movieData.imdbLink = imdbLink;

    const movie = await Movie.create(movieData);

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

    // Delete from Cloudflare Stream
    try {
      const cfClient = getCloudflareStreamClient();
      await cfClient.deleteVideo(movie.cloudflareVideoId);
    } catch (cfError) {
      console.error('Cloudflare deletion error:', cfError);
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

    // Delete all episode videos from Cloudflare Stream
    const cfClient = getCloudflareStreamClient();
    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        try {
          await cfClient.deleteVideo(episode.cloudflareVideoId);
        } catch (cfError) {
          console.error(`Error deleting episode ${episode._id}:`, cfError);
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
      cloudflareVideoId,
      thumbnail
    } = req.body;

    console.log('[addEpisode] Received:', { seriesId, seasonNumber, episodeNumber, cloudflareVideoId });

    const series = await Series.findById(seriesId);
    if (!series) {
      console.log('[addEpisode] Series not found:', seriesId);
      res.status(404).json({
        success: false,
        message: 'Series not found'
      });
      return;
    }

    const season = series.seasons.find(s => s.seasonNumber === parseInt(seasonNumber));
    if (!season) {
      console.log('[addEpisode] Season not found:', seasonNumber);
      res.status(404).json({
        success: false,
        message: 'Season not found'
      });
      return;
    }

    // Verify Cloudflare video exists
    try {
      const cfClient = getCloudflareStreamClient();
      const videoDetails = await cfClient.getVideoDetails(cloudflareVideoId);
      console.log('[addEpisode] Video verified:', { cloudflareVideoId, status: videoDetails?.status });
    } catch (cfError: any) {
      console.warn('[addEpisode] Cloudflare video verification failed:', cfError?.message);
      // Continue anyway - video might be valid but API call failed
    }

    // Create episode object with required fields
    const newEpisode = {
      episodeNumber: parseInt(episodeNumber),
      title: title.trim(),
      description: description.trim(),
      duration: parseInt(duration),
      cloudflareVideoId: cloudflareVideoId.trim(),
      thumbnail: thumbnail.trim(),
      views: 0
    };

    console.log('[addEpisode] Adding episode:', newEpisode);
    season.episodes.push(newEpisode);
    
    console.log('[addEpisode] Saving series...');
    await series.save();
    
    console.log('[addEpisode] Episode added successfully');

    res.status(201).json({
      success: true,
      message: 'Episode added',
      data: { episode: season.episodes[season.episodes.length - 1] }
    });
  } catch (error: any) {
    console.error('[addEpisode] ERROR:', error?.message || error);
    console.error('[addEpisode] Stack:', error?.stack);
    res.status(500).json({
      success: false,
      message: 'Error adding episode',
      error: error?.message || 'Unknown error'
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

    // Delete from Cloudflare Stream
    try {
      const cfClient = getCloudflareStreamClient();
      await cfClient.deleteVideo(episode.cloudflareVideoId);
    } catch (cfError) {
      console.error('Cloudflare deletion error:', cfError);
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

export const rebuildTextIndex = async (_req: Request, res: Response): Promise<void> => {
  try {
    const Movie = mongoose.model('Movie');
    await Movie.collection.dropIndex('title_text_description_text');
    await Movie.collection.createIndex(
      { title: 'text', description: 'text' },
      { language_override: 'searchLanguage' }
    );
    res.json({ success: true, message: 'Text index rebuilt successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error rebuilding text index', error: error.message });
  }
};
