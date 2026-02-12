import mongoose, { Document, Schema } from 'mongoose';

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  WEB = 'web',
  TV = 'tv',
  SMART_TV = 'smart-tv'
}

export interface IDevice extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  deviceToken: string;
  type: DeviceType;
  name: string;
  os: string;
  osVersion: string;
  appVersion: string;
  lastSeen: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceToken: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(DeviceType),
    required: true
  },
  name: {
    type: String,
    required: true
  },
  os: {
    type: String,
    required: true
  },
  osVersion: {
    type: String,
    required: true
  },
  appVersion: {
    type: String,
    required: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
deviceSchema.index({ userId: 1, isActive: 1 });
deviceSchema.index({ lastSeen: -1 });

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
