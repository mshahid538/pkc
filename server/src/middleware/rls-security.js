/**
 * RLS Security Middleware
 * 
 * This middleware ensures that even when using the admin client,
 * users can only access their own data through the API endpoints.
 */

const { getUserId } = require('../config/clerk');

/**
 * Middleware to enforce user data isolation
 * This ensures users can only access their own data
 */
const enforceUserIsolation = (req, res, next) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Add user ID to request for use in route handlers
    req.userId = userId;
    
    next();
  } catch (error) {
    console.error('RLS Security Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to filter data by user ID
 * This ensures users only see their own data
 */
const filterByUserId = (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found'
      });
    }

    // Add user filter to request
    req.userFilter = { user_id: userId };
    
    next();
  } catch (error) {
    console.error('User Filter Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to ensure user can only access their own data
 * This is a safety check for admin client operations
 */
const ensureUserOwnership = (req, res, next) => {
  try {
    const userId = req.userId;
    const resourceUserId = req.params.userId || req.body.user_id || req.query.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // If a specific user ID is requested, ensure it matches the authenticated user
    if (resourceUserId && resourceUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own data'
      });
    }

    next();
  } catch (error) {
    console.error('User Ownership Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  enforceUserIsolation,
  filterByUserId,
  ensureUserOwnership
};
