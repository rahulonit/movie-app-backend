import mongoose, { Document, Schema } from 'mongoose';
import { Genre, Language, MaturityRating, IPoster } from './Movie';

// Interfaces
export interface IEpisode {
  _id?: mongoose.Types.ObjectId;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number; // in minutes
  muxPlaybackId: string;
  muxAssetId: string;
  thumbnail: string; // Cloudinary URL
  views: number;
  toObject?: () => any;
}

export interface ISeason {
  _id?: mongoose.Types.ObjectId;
  seasonNumber: number;
  episodes: IEpisode[];
  toObject?: () => any;
}

export interface ISeries extends Document {
  title: string;
  description: string;
  genres: Genre[];
  language: Language;
  releaseYear: number;
  poster: IPoster;
  trailerUrl?: string;
  seasons: ISeason[];
  maturityRating: MaturityRating;
  isPremium: boolean;
  isPublished: boolean;
  totalViews: number;
  createdAt: Date;
  updatedAt: Date;
}

// Episode Schema
const episodeSchema = new Schema<IEpisode>({
  episodeNumber: {
    type: Number,
    required: true,
    min: 1
  },
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
    maxlength: 500
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  muxPlaybackId: {
    type: String,
    required: true
  },
  muxAssetId: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid thumbnail URL format'
    }
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: true });

// Season Schema
const seasonSchema = new Schema<ISeason>({
  seasonNumber: {
    type: Number,
    required: true,
    min: 1
  },
  episodes: {
    type: [episodeSchema],
    default: []
  }
}, { _id: true });

// Poster Schema (reused from Movie)
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

// Series Schema
const seriesSchema = new Schema<ISeries>({
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
  seasons: {
    type: [seasonSchema],
    default: []
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
  totalViews: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  languageOverride: 'searchLanguage'
});

// Indexes for performance
seriesSchema.index({ title: 'text', description: 'text' }, { default_language: 'english', language_override: 'searchLanguage' });
seriesSchema.index({ genres: 1 });
seriesSchema.index({ language: 1 });
seriesSchema.index({ releaseYear: -1 });
seriesSchema.index({ totalViews: -1 });
seriesSchema.index({ isPremium: 1 });
seriesSchema.index({ isPublished: 1 });
seriesSchema.index({ maturityRating: 1 });
seriesSchema.index({ createdAt: -1 });

export const Series = mongoose.model<ISeries>('Series', seriesSchema);
