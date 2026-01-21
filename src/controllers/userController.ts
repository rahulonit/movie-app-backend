import { Request, Response } from 'express';
import { User } from '../models/User';
import mongoose from 'mongoose';

const getProfileById = (user: any, profileId: string) => {
  const profiles = user.profiles as mongoose.Types.DocumentArray<any>;
  return profiles.id(profileId as any);
};

// Create profile
export const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { name, avatar, isKids } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user.profiles.length >= 5) {
      res.status(400).json({
        success: false,
        message: 'Maximum 5 profiles allowed'
      });
      return;
    }

    user.profiles.push({
      name,
      avatar: avatar || 'https://res.cloudinary.com/demo/image/upload/avatar-default.png',
      isKids: isKids || false,
      watchHistory: [],
      myList: []
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Profile created',
      data: { profile: user.profiles[user.profiles.length - 1] }
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating profile'
    });
  }
};

// Get all profiles
export const getProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const user = await User.findById(userId).select('profiles');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { profiles: user.profiles }
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles'
    });
  }
};

// Update profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId } = req.params;
    const { name, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profile = getProfileById(user, profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    if (name) profile.name = name;
    if (avatar) profile.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: { profile }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// Delete profile
export const deleteProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profileIndex = user.profiles.findIndex(
      p => p._id?.toString() === profileId
    );

    if (profileIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    user.profiles.splice(profileIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile deleted'
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile'
    });
  }
};

// Add to My List
export const addToMyList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId, contentId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profile = getProfileById(user, profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    const contentObjectId = new mongoose.Types.ObjectId(contentId);
    
    if (profile.myList.some((id: mongoose.Types.ObjectId) => id.toString() === contentId)) {
      res.status(400).json({
        success: false,
        message: 'Already in list'
      });
      return;
    }

    profile.myList.push(contentObjectId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Added to My List'
    });
  } catch (error) {
    console.error('Add to list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding to list'
    });
  }
};

// Remove from My List
export const removeFromMyList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId, contentId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profile = getProfileById(user, profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    profile.myList = profile.myList.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== contentId
    );
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Removed from My List'
    });
  } catch (error) {
    console.error('Remove from list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from list'
    });
  }
};

// Get My List
export const getMyList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profile = getProfileById(user, profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    // Populate content details
    await user.populate({
      path: 'profiles.myList',
      select: '-muxAssetId'
    });

    res.status(200).json({
      success: true,
      data: { myList: profile.myList }
    });
  } catch (error) {
    console.error('Get my list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching list'
    });
  }
};

// Update watch progress
export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId, contentId, contentType, episodeId, progress, duration } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profile = getProfileById(user, profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    // Find existing history entry
    const historyIndex = profile.watchHistory.findIndex(
      (h: any) => h.contentId.toString() === contentId && 
           (!episodeId || h.episodeId?.toString() === episodeId)
    );

    if (historyIndex >= 0) {
      // Update existing
      profile.watchHistory[historyIndex].progress = progress;
      profile.watchHistory[historyIndex].duration = duration;
      profile.watchHistory[historyIndex].updatedAt = new Date();
    } else {
      // Add new
      profile.watchHistory.push({
        contentId: new mongoose.Types.ObjectId(contentId),
        contentType,
        episodeId: episodeId ? new mongoose.Types.ObjectId(episodeId) : undefined,
        progress,
        duration,
        updatedAt: new Date()
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Progress updated'
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress'
    });
  }
};

// Get watch history
export const getWatchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { profileId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const profile = getProfileById(user, profileId);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { watchHistory: profile.watchHistory }
    });
  } catch (error) {
    console.error('Get watch history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching history'
    });
  }
};
