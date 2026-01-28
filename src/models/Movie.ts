import mongoose, { Document, Schema } from 'mongoose';

// Enums
export enum MaturityRating {
  U = 'U',     // Universal
  UA = 'UA',   // Parental Guidance
  A = 'A'      // Adults Only
}

export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  TAMIL = 'Tamil',
  TELUGU = 'Telugu',
  KANNADA = 'Kannada',
  MALAYALAM = 'Malayalam',
  BENGALI = 'Bengali',
  MARATHI = 'Marathi',
  GUJARATI = 'Gujarati',
  PUNJABI = 'Punjabi'
}

export enum Genre {
  ACTION = 'Action',
  COMEDY = 'Comedy',
  DRAMA = 'Drama',
  HORROR = 'Horror',
  THRILLER = 'Thriller',
  ROMANCE = 'Romance',
  SCI_FI = 'Sci-Fi',
  FANTASY = 'Fantasy',
  DOCUMENTARY = 'Documentary',
  ANIMATION = 'Animation',
  CRIME = 'Crime',
  MYSTERY = 'Mystery',
  ADVENTURE = 'Adventure',
  FAMILY = 'Family',
  MUSICAL = 'Musical',
  WAR = 'War',
  WESTERN = 'Western',
  BIOGRAPHY = 'Biography',
  SPORTS = 'Sports',
  ADULT18_PLUS = 'Adult 18+'
}

// Interfaces
export interface IPoster {
  vertical: string;   // Cloudinary URL
  horizontal: string; // Cloudinary URL
}

export interface IMovie extends Document {
  title: string;
  description: string;
  genres: Genre[];
  language: Language;
  releaseYear: number;
  duration: number; // in minutes
  rating: number;
  poster: IPoster;
  trailerUrl?: string;
  cloudflareVideoId: string; // Cloudflare Stream video ID
  maturityRating: MaturityRating;
  isPremium: boolean;
  isPublished: boolean;
  views: number;
  // IMDB enrichment fields
  imdbId?: string;
  director?: string;
  writer?: string;
  stars?: string[]; // Top cast members
  imdbRating?: number;
  imdbLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Poster Schema
const posterSchema = new Schema<IPoster>({
  vertical: {
    type: String,
    required: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    }
  },
  horizontal: {
    type: String,
    required: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    }
  }
}, { _id: false });

// Movie Schema
const movieSchema = new Schema<IMovie>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  genres: {
    type: [String],
    enum: Object.values(Genre),
    required: true,
    validate: {
      validator: function(genres: Genre[]) {
        return genres.length > 0 && genres.length <= 5;
      },
      message: 'Please select 1-5 genres'
    }
  },
  language: {
    type: String,
    enum: Object.values(Language),
    required: true
  },
  releaseYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 2
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  poster: {
    type: posterSchema,
    required: true
  },
  trailerUrl: {
    type: String,
    validate: {
      validator: function(url: string) {
        return !url || /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid trailer URL format'
    }
  },
  cloudflareVideoId: {
    type: String,
    required: true,
    unique: true
  },
  maturityRating: {
    type: String,
    enum: Object.values(MaturityRating),
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  // IMDB enrichment fields
  imdbId: {
    type: String,
    sparse: true,
    unique: true
  },
  director: {
    type: String
  },
  writer: {
    type: String
  },
  stars: {
    type: [String],
    default: []
  },
  imdbRating: {
    type: Number,
    min: 0,
    max: 10
  },
  imdbLink: {
    type: String,
    validate: {
      validator: function(url: string) {
        return !url || /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid IMDB URL format'
    }
  }
}, {
  timestamps: true,
});

// Indexes for performance
movieSchema.index({ title: 'text', description: 'text' }, { default_language: 'english', language_override: 'searchLanguage' });
movieSchema.index({ genres: 1 });
movieSchema.index({ language: 1 });
movieSchema.index({ releaseYear: -1 });
movieSchema.index({ views: -1 });
movieSchema.index({ isPremium: 1 });
movieSchema.index({ isPublished: 1 });
movieSchema.index({ maturityRating: 1 });
movieSchema.index({ createdAt: -1 });

export const Movie = mongoose.model<IMovie>('Movie', movieSchema);
