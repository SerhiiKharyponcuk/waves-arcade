import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { ensureSkinCatalog } from "./services/skinCatalogService.js";

async function main() {
  await prisma.$connect();
  await ensureSkinCatalog();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Waves API listening on http://localhost:${env.PORT}/api`);
  });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
