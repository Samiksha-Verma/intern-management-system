import { Router } from "express";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import adminRoutes from "./admin.routes";
import documentRoutes from "./document.routes";
import mentorRoutes from "./mentor.routes";
import internRoutes from "./intern.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/documents", documentRoutes);
router.use("/mentor", mentorRoutes);
router.use("/intern", internRoutes);
router.use("/", dashboardRoutes);

export default router;
