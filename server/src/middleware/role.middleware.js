import ApiError from "../utils/ApiError.js";

/*
USAGE IN ROUTES:
  router.get("/admin/users", verifyJWT, authorizeRoles("admin"), getUsers)
  
  verifyJWT runs first → sets req.user
  authorizeRoles runs second → checks req.user.role
  
  This is a higher-order function (factory pattern):
  authorizeRoles("admin") returns a middleware function
  This lets us pass dynamic roles
*/

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Role '${req.user.role}' is not authorized to access this resource`
      );
    }

    next();
  };
};