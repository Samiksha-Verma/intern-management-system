import app from "./app";
import { env } from "./config/env";
import { startDemoResetScheduler } from "./utils/demo-reset-scheduler";

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
  startDemoResetScheduler();
});
