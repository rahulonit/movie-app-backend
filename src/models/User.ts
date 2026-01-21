import mongoose, { Document, Schema } from 'mongoose';

// Enums
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum ContentType {
  MOVIE = 'Movie',
  SERIES = 'Series'
}

// Interfaces
export interface IWatchHistory {
  contentId: mongoose.Types.ObjectId;
  contentType: ContentType;
  episodeId?: mongoose.Types.ObjectId;
  progress: number; // in seconds
  duration: number; // total duration in seconds
  updatedAt: Date;
}

export interface IProfile {
  _id?: mongoose.Types.ObjectId;
  name: string;
  avatar: string;
  isKids: boolean;
  watchHistory: IWatchHistory[];
  myList: mongoose.Types.ObjectId[];
  toObject?: () => any;
}

export interface ISubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: Date;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  subscription: ISubscription;
  profiles: IProfile[];
  refreshToken?: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Watch History Schema
const watchHistorySchema = new Schema<IWatchHistory>({
  contentId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'profiles.watchHistory.contentType'
  },
  contentType: {
    type: String,
    enum: Object.values(ContentType),
    required: true
  },
  episodeId: {
    type: Schema.Types.ObjectId,
    ref: 'Series'
  },
  progress: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Profile Schema
const profileSchema = new Schema<IProfile>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: 'https://pics.craiyon.com/2023-09-25/4c0c632eaebf4beb90ee1c0858969e15.webp'
  },
  isKids: {
    type: Boolean,
    default: false
  },
  watchHistory: [watchHistorySchema],
  myList: [{
    type: Schema.Types.ObjectId,
    refPath: 'contentType'
  }]
}, { _id: true });

// Subscription Schema
const subscriptionSchema = new Schema<ISubscription>({
  plan: {
    type: String,
    enum: Object.values(SubscriptionPlan),
    default: SubscriptionPlan.FREE
  },
  status: {
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE
  },
  expiresAt: {
    type: Date
  }
}, { _id: false });

// User Schema
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  subscription: {
    type: subscriptionSchema,
    default: () => ({
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE
    })
  },
  profiles: {
    type: [profileSchema],
    validate: [
      {
        validator: function(profiles: IProfile[]) {
          return profiles.length <= 5;
        },
        message: 'Maximum 5 profiles allowed per account'
      }
    ],
    default: []
  },
  refreshToken: {
    type: String
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ 'profiles.myList': 1 });

export const User = mongoose.model<IUser>('User', userSchema);
