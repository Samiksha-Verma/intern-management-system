import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { resetDemoData, DEMO_ADMIN_EMAIL, DEMO_MENTOR_EMAIL, DEMO_INTERN_EMAIL, DEMO_PASSWORD } from "../src/utils/demo-reset";

async function main() {
  await resetDemoData();
  console.log(
    `Demo accounts ready:\n` +
      `  Admin:  ${DEMO_ADMIN_EMAIL}\n` +
      `  Mentor: ${DEMO_MENTOR_EMAIL}\n` +
      `  Intern: ${DEMO_INTERN_EMAIL}\n` +
      `  Password (all three): ${DEMO_PASSWORD}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
