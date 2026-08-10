import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getInvite,
  login,
  me,
  setPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.post("/login", asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));
router.get("/invite/:token", asyncHandler(getInvite));
router.post("/set-password", asyncHandler(setPassword));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.patch("/password", authenticate, asyncHandler(changePassword));

export default router;
