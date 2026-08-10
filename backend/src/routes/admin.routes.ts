import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { singleCsvUpload } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  acceptIntern,
  createMentor,
  deleteIntern,
  deleteMentor,
  getAttendanceOverview,
  getStats,
  importInterns,
  listInterns,
  listMentors,
  reassignIntern,
} from "../controllers/admin.controller";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/stats", asyncHandler(getStats));
router.get("/attendance-overview", asyncHandler(getAttendanceOverview));
router.get("/interns", asyncHandler(listInterns));
router.post("/interns/import", singleCsvUpload, asyncHandler(importInterns));
router.patch("/interns/:id/accept", asyncHandler(acceptIntern));
router.patch("/interns/:id/reassign", asyncHandler(reassignIntern));
router.delete("/interns/:id", asyncHandler(deleteIntern));
router.get("/mentors", asyncHandler(listMentors));
router.post("/mentors", asyncHandler(createMentor));
router.delete("/mentors/:id", asyncHandler(deleteMentor));

export default router;
