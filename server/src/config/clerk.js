const { requireAuth: clerkRequireAuth, getAuth } = require("@clerk/express");

// Validate required environment variables
const requiredEnvVars = ["CLERK_SECRET_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Clerk middleware for protected routes
const requireAuth = clerkRequireAuth();

// Clerk middleware for optional authentication
const withAuth = (req, res, next) => {
  // Try to get auth data, but don't fail if not present
  try {
    const auth = getAuth(req);
    
    if (auth?.userId) {
      // User is authenticated, continue
      next();
    } else {
      // No authentication, continue without user
      next();
    }
  } catch (error) {
    // Authentication failed, but continue without user
    next();
  }
};

// Helper function to get user ID from request
const getUserId = (req) => {
  const auth = getAuth(req);
  return auth?.userId || null;
};

// Helper function to get user data from request
const getUserData = (req) => {
  const auth = getAuth(req);
  if (auth?.userId) {
    return {
      id: auth.userId,
      email: auth.sessionClaims?.email || null,
      username: auth.sessionClaims?.username || null,
      firstName: auth.sessionClaims?.firstName || null,
      lastName: auth.sessionClaims?.lastName || null,
    };
  }
  return null;
};

module.exports = {
  requireAuth,
  withAuth,
  getUserId,
  getUserData,
  getAuth,
};
