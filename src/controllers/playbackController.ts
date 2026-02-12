import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { PlaybackSession } from '../models/PlaybackSession';

const generateSessionId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const startPlayback = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      profileId,
      titleId,
      episodeId,
      durationMs,
      playbackToken = '',
      manifestUrl = '',
      licenseUrl = '',
      currentCdn = 'cloudflare',
      currentBitrate = 0,
      resumeAt = 0
    } = req.body;

    const sessionId = generateSessionId();

    const session = await PlaybackSession.create({
      sessionId,
      profileId: new mongoose.Types.ObjectId(profileId),
      titleId: new mongoose.Types.ObjectId(titleId),
      episodeId: episodeId ? new mongoose.Types.ObjectId(episodeId) : undefined,
      durationMs,
      playbackToken,
      manifestUrl,
      licenseUrl,
      currentCdn,
      currentBitrate,
      resumeAt,
      lastPositionMs: resumeAt,
      isCompleted: false,
      playbackErrors: [],
      startedAt: new Date(),
    });

    res.status(201).json({ success: true, data: { sessionId: session.sessionId } });
  } catch (error) {
    console.error('startPlayback error:', error);
    res.status(500).json({ success: false, message: 'Error starting playback session' });
  }
};

export const updatePlayback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const {
      lastPositionMs,
      durationMs,
      currentCdn,
      currentBitrate,
      resumeAt,
      playbackError
    } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (typeof lastPositionMs === 'number') updates.lastPositionMs = lastPositionMs;
    if (typeof durationMs === 'number') updates.durationMs = durationMs;
    if (typeof resumeAt === 'number') updates.resumeAt = resumeAt;
    if (typeof currentCdn === 'string') updates.currentCdn = currentCdn;
    if (typeof currentBitrate === 'number') updates.currentBitrate = currentBitrate;
    if (playbackError?.code && playbackError?.message) {
      updates.$push = {
        playbackErrors: {
          code: playbackError.code,
          message: playbackError.message,
          timestamp: new Date()
        }
      };
    }

    const session = await PlaybackSession.findOneAndUpdate({ sessionId }, updates, { new: true });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('updatePlayback error:', error);
    res.status(500).json({ success: false, message: 'Error updating playback session' });
  }
};

export const completePlayback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await PlaybackSession.findOneAndUpdate(
      { sessionId },
      { isCompleted: true, completedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('completePlayback error:', error);
    res.status(500).json({ success: false, message: 'Error completing playback session' });
  }
};
