import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateProfile,
  changePassword,
  uploadAvatar,
  updateUserRole,
  deleteUser,
  toggleUserStatus,
} from "../controllers/user.controller.js";

import {
  updateProfileValidator,
  changePasswordValidator,
  updateRoleValidator,
  mongoIdValidator,
} from "../validators/user.validator.js";

import validate             from "../middleware/validate.middleware.js";
import { verifyJWT }        from "../middleware/auth.middleware.js";
import { authorizeRoles }   from "../middleware/role.middleware.js";
import upload               from "../middleware/upload.middleware.js";

const router = Router();

/*
ALL routes require login (verifyJWT).
We apply it once at router level instead of
repeating it on every single route.
*/
router.use(verifyJWT);

// ─── User Routes (Any logged-in user) ────────────────────────
router.put(
  "/profile",
  updateProfileValidator,
  validate,
  updateProfile
);

router.put(
  "/password",
  changePasswordValidator,
  validate,
  changePassword
);

router.post(
  "/avatar",
  upload.single("avatar"),
  /*
  upload.single("avatar") means:
  - Accept ONE file
  - The form field name must be "avatar"
  - Multer saves it to /tmp folder
  - Available as req.file in controller
  */
  uploadAvatar
);

// ─── Admin Routes ─────────────────────────────────────────────
router.get(
  "/",
  authorizeRoles("admin"),
  getAllUsers
);

router.get(
  "/:id",
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  getUserById
);

router.put(
  "/:id/role",
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  updateRoleValidator,
  validate,
  updateUserRole
);

router.put(
  "/:id/status",
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  toggleUserStatus
);

router.delete(
  "/:id",
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  deleteUser
);

export default router;