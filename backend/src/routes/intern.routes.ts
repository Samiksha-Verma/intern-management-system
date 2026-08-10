import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { singleTaskFileUpload } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  checkIn,
  checkOut,
  completeTask,
  deleteAttachment,
  downloadAttachment,
  getAttendance,
  getStats,
  listMyEvaluations,
  listMyTasks,
  updateTaskStatus,
} from "../controllers/intern.controller";

const router = Router();

router.use(authenticate, authorize("intern"));

router.get("/stats", asyncHandler(getStats));
router.get("/tasks", asyncHandler(listMyTasks));
router.patch("/tasks/:id/status", asyncHandler(updateTaskStatus));
router.post("/tasks/:id/complete", singleTaskFileUpload, asyncHandler(completeTask));
router.get("/tasks/:id/attachment", asyncHandler(downloadAttachment));
router.delete("/tasks/:id/attachment", asyncHandler(deleteAttachment));
router.get("/attendance", asyncHandler(getAttendance));
router.post("/attendance/check-in", asyncHandler(checkIn));
router.post("/attendance/check-out", asyncHandler(checkOut));
router.get("/evaluations", asyncHandler(listMyEvaluations));

export default router;
