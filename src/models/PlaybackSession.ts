import mongoose, { Document, Schema } from 'mongoose';

export interface IPlaybackError {
  code: string;
  message: string;
  timestamp: Date;
}

export interface IPlaybackSession extends Document {
  sessionId: string;
  profileId: mongoose.Types.ObjectId;
  titleId: mongoose.Types.ObjectId;
  episodeId?: mongoose.Types.ObjectId;
  deviceId?: mongoose.Types.ObjectId;
  startedAt: Date;
  lastPositionMs: number;
  durationMs: number;
  currentCdn: string;
  currentBitrate: number;
  playbackErrors: IPlaybackError[];
  playbackToken?: string;
  manifestUrl?: string;
  licenseUrl?: string;
  resumeAt: number;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const playbackErrorSchema = new Schema<IPlaybackError>({
  code: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const playbackSessionSchema = new Schema<IPlaybackSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  profileId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  titleId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  episodeId: {
    type: Schema.Types.ObjectId
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    default: () => new mongoose.Types.ObjectId()
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastPositionMs: {
    type: Number,
    default: 0,
    min: 0
  },
  durationMs: {
    type: Number,
    required: true,
    min: 0
  },
  currentCdn: {
    type: String,
    default: 'cloudflare'
  },
  currentBitrate: {
    type: Number,
    default: 0
  },
  playbackErrors: [playbackErrorSchema],
  playbackToken: {
    type: String,
    default: ''
  },
  manifestUrl: {
    type: String,
    default: ''
  },
  licenseUrl: {
    type: String,
    default: ''
  },
  resumeAt: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
playbackSessionSchema.index({ profileId: 1, titleId: 1 });
playbackSessionSchema.index({ createdAt: -1 });
playbackSessionSchema.index({ isCompleted: 1 });

export const PlaybackSession = mongoose.model<IPlaybackSession>('PlaybackSession', playbackSessionSchema);
