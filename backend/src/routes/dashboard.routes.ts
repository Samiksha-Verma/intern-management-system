import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// Minimal role-gated endpoints proving the auth middleware works end-to-end.
// Phase 2 will replace these with real dashboard data.
router.get("/admin/ping", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: `Hello admin ${req.user!.name}` });
});

router.get("/mentor/ping", authenticate, authorize("mentor"), (req, res) => {
  res.json({ message: `Hello mentor ${req.user!.name}` });
});

router.get("/intern/ping", authenticate, authorize("intern"), (req, res) => {
  res.json({ message: `Hello intern ${req.user!.name}` });
});

export default router;
