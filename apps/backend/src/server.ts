import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { ensureSkinCatalog } from "./services/skinCatalogService.js";

async function main() {
  await prisma.$connect();
  await ensureSkinCatalog();

  const app = createApp();
  app.listen(env.PORT, () => {
    if (env.NODE_ENV === "production") {
      if (env.TRUST_PROXY_HOPS < 1) {
        console.warn("Production warning: TRUST_PROXY_HOPS is 0, so proxy IP forwarding and edge rate limiting will be unreliable.");
      } else {
        console.log(`Rate limiting is proxy-aware with TRUST_PROXY_HOPS=${env.TRUST_PROXY_HOPS}.`);
      }
      console.warn("Production note: in-memory rate limits protect a single backend instance. Put Cloudflare or Redis-backed edge limits in front of the API before scaling out.");
    }
    console.log(`Waves API listening on http://localhost:${env.PORT}/api`);
  });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
