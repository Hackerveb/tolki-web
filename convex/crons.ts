import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily job: reset free minute balances for eligible private users.
// Runs at midnight UTC. Only resets users whose last reset was > 30 days ago,
// and skips users with active subscriptions or org memberships.
crons.daily(
  "resetFreeMinutes",
  { hourUTC: 0, minuteUTC: 0 },
  internal.users.resetFreeMinutes,
);

export default crons;
