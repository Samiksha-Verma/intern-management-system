import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  assignTask,
  checkIn,
  checkOut,
  downloadTaskAttachment,
  getAttendance,
  getStats,
  giveEvaluation,
  listAssignedTasks,
  listGivenEvaluations,
  listMyInterns,
} from "../controllers/mentor.controller";

const router = Router();

router.use(authenticate, authorize("mentor"));

router.get("/stats", asyncHandler(getStats));
router.get("/interns", asyncHandler(listMyInterns));
router.get("/tasks", asyncHandler(listAssignedTasks));
router.post("/tasks", asyncHandler(assignTask));
router.get("/tasks/:id/attachment", asyncHandler(downloadTaskAttachment));
router.get("/evaluations", asyncHandler(listGivenEvaluations));
router.post("/evaluations", asyncHandler(giveEvaluation));
router.get("/attendance", asyncHandler(getAttendance));
router.post("/attendance/check-in", asyncHandler(checkIn));
router.post("/attendance/check-out", asyncHandler(checkOut));

export default router;
