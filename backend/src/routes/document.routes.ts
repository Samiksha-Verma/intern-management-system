import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { generateDocument, sendGeneratedDocument } from "../controllers/document.controller";

const router = Router();

router.use(authenticate, authorize("admin"));

router.post("/generate", asyncHandler(generateDocument));
router.post("/:id/send", asyncHandler(sendGeneratedDocument));

export default router;
