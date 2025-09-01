const jwt = require("jsonwebtoken");
const { supabase, supabaseAdmin, setUserContext } = require("../config/database");

const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from Authorization header or cookie
    let token = null;
    const authHeader = req.headers["authorization"];
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      if (cookies.token) {
        token = cookies.token;
      }
    }



    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required"
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, username, created_at")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      console.error("User fetch error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = user;
    
    try {
      await setUserContext(user.id);
    } catch (contextError) {
      console.error('Failed to set user context:', contextError);
    }
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error"
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    // Try to get token from Authorization header or cookie
    let token = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, username, created_at")
      .eq("id", decoded.userId)
      .single();

    if (!error && user) {
      req.user = user;
    }

    next();
  } catch (error) {
    next();
  }
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
};
