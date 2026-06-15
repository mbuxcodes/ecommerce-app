import jwt from "jsonwebtoken";

/*
ACCESS TOKEN:
  - Short-lived (15 minutes)
  - Sent in Authorization header: "Bearer <token>"
  - Used to authenticate every API request
  - Stored in memory (Redux state) on frontend

REFRESH TOKEN:
  - Long-lived (7 days)
  - Stored in httpOnly cookie (cannot be accessed by JavaScript)
  - Used ONLY to generate a new Access Token when it expires
  - Also stored in DB to enable logout / token invalidation
*/

export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },                          // Payload - what we embed in token
    process.env.JWT_ACCESS_SECRET,             // Secret key
    { expiresIn: process.env.JWT_ACCESS_EXPIRY } // Options
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY }
  );
};

export const generateTokenPair = (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);
  return { accessToken, refreshToken };
};