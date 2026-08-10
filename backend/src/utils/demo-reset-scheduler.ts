import { resetDemoData } from "./demo-reset";

const RESET_HOUR_UTC = 3; // 3am UTC — low-traffic hour, arbitrary otherwise
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 30 * 1000;

async function runReset(reason: string) {
  try {
    await resetDemoData();
    console.log(`[demo-reset] Reset demo accounts to a clean state (${reason}).`);
  } catch (err) {
    console.error(`[demo-reset] Failed to reset demo accounts (${reason}):`, err);
  }
}

function msUntilNextResetHour(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_HOUR_UTC, 0, 0, 0)
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

// Keeps the public demo self-healing without any extra infrastructure (a
// Render Cron Job service, an external scheduler pinging an endpoint, etc.)
// — this single web process resets the demo sandbox once shortly after
// every boot/deploy, then again every 24h at a fixed UTC hour. Runs
// entirely against isDemo-flagged rows (see demo-reset.ts), so this never
// touches real data.
export function startDemoResetScheduler() {
  setTimeout(() => runReset("on boot"), BOOT_DELAY_MS);

  setTimeout(() => {
    runReset("daily schedule");
    setInterval(() => runReset("daily schedule"), ONE_DAY_MS);
  }, msUntilNextResetHour());
}
