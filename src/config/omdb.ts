import axios from 'axios';

const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

export interface OMDbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: 'movie' | 'series' | 'episode';
  Poster: string;
}

export interface OMDbMovieDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  imdbRating: string;
  imdbID: string;
  Type: 'movie' | 'series';
}

/**
 * Search movies on OMDb
 * Returns array of search results
 */
export const searchMovies = async (
  query: string,
  type: 'movie' | 'series' = 'movie'
): Promise<OMDbSearchResult[]> => {
  if (!OMDB_API_KEY) {
    console.error('[OMDb] OMDB_API_KEY not configured');
    throw new Error('OMDB_API_KEY not configured in environment variables');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  try {
    console.log('[OMDb] Searching for:', query, 'with key:', OMDB_API_KEY.substring(0, 4) + '...');
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        s: query.trim(),
        type,
        page: 1
      },
      timeout: 5000
    });

    console.log('[OMDb] Response received:', { Response: response.data.Response, count: response.data.Search?.length });

    if (response.data.Response === 'False') {
      console.log('[OMDb] No results found:', response.data.Error);
      return [];
    }

    console.log('[OMDb] Returning', response.data.Search?.length || 0, 'results');
    return response.data.Search || [];
  } catch (error: any) {
    console.error('[OMDb] Search error:', error?.message);
    throw new Error(`Failed to search movies: ${error?.message}`);
  }
};

/**
 * Get detailed movie information from OMDb
 * Can fetch by title or IMDb ID
 */
export const getMovieDetails = async (
  identifier: string,
  byId: boolean = false
): Promise<OMDbMovieDetails | null> => {
  if (!OMDB_API_KEY) {
    throw new Error('OMDB_API_KEY not configured in environment variables');
  }

  try {
    const params: any = {
      apikey: OMDB_API_KEY,
      type: 'movie'
    };

    if (byId) {
      params.i = identifier; // Search by IMDb ID
    } else {
      params.t = identifier; // Search by title
    }

    const response = await axios.get(OMDB_BASE_URL, {
      params,
      timeout: 5000
    });

    if (response.data.Response === 'False') {
      return null;
    }

    return response.data;
  } catch (error: any) {
    console.error('[OMDb] Get details error:', error?.message);
    throw new Error(`Failed to fetch movie details: ${error?.message}`);
  }
};

/**
 * Parse OMDb response into structured format
 * Returns enriched movie metadata for storing in database
 */
export const parseMovieDetails = (omdbData: OMDbMovieDetails) => {
  const parseRating = (ratingStr: string): number => {
    const num = parseFloat(ratingStr);
    return isNaN(num) ? 0 : Math.min(10, Math.max(0, num));
  };

  const parseGenres = (genreStr: string): string[] => {
    return genreStr
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);
  };

  const parseActors = (actorStr: string): string[] => {
    return actorStr
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0)
      .slice(0, 5); // Top 5 cast members
  };

  const parseLanguages = (langStr: string): string[] => {
    return langStr
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0);
  };

  const parseYear = (yearStr: string): number => {
    const year = parseInt(yearStr);
    return isNaN(year) ? new Date().getFullYear() : year;
  };

  const parseDuration = (runtimeStr: string): number => {
    const match = runtimeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 120; // Default 120 minutes
  };

  return {
    imdbId: omdbData.imdbID,
    title: omdbData.Title,
    description: omdbData.Plot || '',
    director: omdbData.Director || 'Unknown',
    writer: omdbData.Writer || 'Unknown',
    stars: parseActors(omdbData.Actors),
    genres: parseGenres(omdbData.Genre),
    languages: parseLanguages(omdbData.Language),
    releaseYear: parseYear(omdbData.Year),
    imdbRating: parseRating(omdbData.imdbRating),
    duration: parseDuration(omdbData.Runtime),
    imdbLink: `https://www.imdb.com/title/${omdbData.imdbID}/`,
    posterUrl: omdbData.Poster && omdbData.Poster !== 'N/A' ? omdbData.Poster : null
  };
};

/**
 * Complete workflow: search and fetch movie details
 */
export const searchAndFetchMovie = async (query: string) => {
  const results = await searchMovies(query, 'movie');
  if (results.length === 0) {
    return null;
  }

  // Get detailed info for the first result
  const details = await getMovieDetails(results[0].imdbID, true);
  if (!details) {
    return null;
  }

  return {
    searchResult: results[0],
    details: parseMovieDetails(details)
  };
};
