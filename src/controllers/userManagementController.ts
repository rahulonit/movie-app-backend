import { Request, Response } from 'express';
import { User } from '../models/User';

// Get all users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { search, role, subscriptionPlan } = req.query;

    let query: any = {};

    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    if (role) {
      query.role = role;
    }

    if (subscriptionPlan) {
      query['subscription.plan'] = subscriptionPlan;
    }

    const users = await User.find(query)
      .select('-passwordHash -refreshToken')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash -refreshToken');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

// Update user subscription
export const updateUserSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { plan, status, expiresAt } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (plan) user.subscription.plan = plan;
    if (status) user.subscription.status = status;
    if (expiresAt) user.subscription.expiresAt = new Date(expiresAt);

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription updated',
      data: { user: { id: user._id, subscription: user.subscription } }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription'
    });
  }
};

// Block/Unblock user
export const toggleBlockUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBlocked ? 'User blocked' : 'User unblocked',
      data: { user: { id: user._id, isBlocked: user.isBlocked } }
    });
  } catch (error) {
    console.error('Toggle block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
};

// Get user watch statistics
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Calculate total watch time across all profiles
    let totalWatchTime = 0;
    let totalContent = 0;

    for (const profile of user.profiles) {
      totalContent += profile.watchHistory.length;
      
      for (const history of profile.watchHistory) {
        totalWatchTime += history.progress;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        totalProfiles: user.profiles.length,
        totalWatchTime: Math.floor(totalWatchTime / 60), // minutes
        totalContent,
        myListCount: user.profiles.reduce((acc, p) => acc + p.myList.length, 0),
        subscription: user.subscription,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
};

// Delete user (with cascade)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};
