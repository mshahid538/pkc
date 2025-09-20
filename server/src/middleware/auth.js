const { requireAuth, withAuth, getUserId, getUserData, getAuth } = require("../config/clerk");
const { supabaseAdmin, setUserContext } = require("../config/database");

const authenticateToken = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    
    if (!auth?.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userData = getUserData(req);
    if (!userData) {
      return res.status(401).json({
        success: false,
        message: "User data not found"
      });
    }

    let { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, username, created_at")
      .eq("id", userData.id)
      .single();

    if (error && error.code === "PGRST116") {
      const email = userData.email || `${userData.id}@clerk.local`;
      const username = userData.username || userData.email?.split('@')[0] || `user_${userData.id.slice(-8)}`;
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert([{
          id: userData.id,
          email: email,
          username: username,
          created_at: new Date().toISOString(),
        }])
        .select("id, email, username, created_at")
        .single();

      if (createError) {
        console.error("User creation error:", createError);
        return res.status(500).json({
          success: false,
          message: "Failed to create user"
        });
      }
      user = newUser;
    } else if (error) {
      console.error("User fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    req.user = user;
    
    req.userContext = user.id;
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error"
    });
  }
};

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  try {
    return withAuth(req, res, async (err) => {
      if (err) {
        // Authentication failed, but continue without user
        return next();
      }

      const userData = getUserData(req);
      
      if (userData) {
        // Check if user exists in our database
        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id, email, username, created_at")
          .eq("id", userData.id)
          .single();

        if (!error && user) {
          req.user = user;
        }
      }

      next();
    });
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
