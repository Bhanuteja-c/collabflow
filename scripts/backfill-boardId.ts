// Backfill script: populate boardId for existing cards and set isBacklog = false
// Run with: npx tsx scripts/backfill-boardId.ts

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Step 1: Set all existing cards to isBacklog = false
  const updated = await prisma.card.updateMany({
    data: { isBacklog: false },
  });
  console.log(`Set isBacklog=false on ${updated.count} cards`);

  // Step 2: Backfill boardId from column → board
  const cards = await prisma.card.findMany({
    where: { boardId: null, columnId: { not: null } },
    include: {
      column: {
        select: { boardId: true },
      },
    },
  });

  let backfilled = 0;
  for (const card of cards) {
    if (card.column?.boardId) {
      await prisma.card.update({
        where: { id: card.id },
        data: { boardId: card.column.boardId },
      });
      backfilled++;
    }
  }
  console.log(`Backfilled boardId on ${backfilled} cards`);
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
