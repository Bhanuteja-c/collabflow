// scripts/backfill-order-keys.ts
// Migration script to backfill orderKey from existing integer order values
// Run with: npx tsx scripts/backfill-order-keys.ts
//
// This generates unique fractional index keys for all existing Column, Card,
// and ChecklistItem records based on their current integer `order` field.

import { PrismaClient } from "@prisma/client";
import { generateNKeysBetween } from "fractional-indexing";

const prisma = new PrismaClient();

async function backfillOrderKeys() {
    console.log("🔄 Backfilling orderKey for existing records...\n");

    // 1. Backfill Columns — group by board, order by `order`
    const boards = await prisma.board.findMany({ include: { columns: { orderBy: { order: "asc" } } } });
    let columnCount = 0;
    for (const board of boards) {
        if (board.columns.length === 0) continue;
        const keys = generateNKeysBetween(null, null, board.columns.length);
        for (let i = 0; i < board.columns.length; i++) {
            await prisma.column.update({
                where: { id: board.columns[i].id },
                data: { orderKey: keys[i] },
            });
            columnCount++;
        }
    }
    console.log(`  ✅ Columns: ${columnCount} records updated across ${boards.length} boards`);

    // 2. Backfill Cards — group by column, order by `order`
    const columns = await prisma.column.findMany({ include: { cards: { orderBy: { order: "asc" } } } });
    let cardCount = 0;
    for (const column of columns) {
        if (column.cards.length === 0) continue;
        const keys = generateNKeysBetween(null, null, column.cards.length);
        for (let i = 0; i < column.cards.length; i++) {
            await prisma.card.update({
                where: { id: column.cards[i].id },
                data: { orderKey: keys[i] },
            });
            cardCount++;
        }
    }
    console.log(`  ✅ Cards: ${cardCount} records updated across ${columns.length} columns`);

    // 3. Backfill ChecklistItems — group by card, order by `order`
    const cards = await prisma.card.findMany({ include: { checklist: { orderBy: { order: "asc" } } } });
    let checklistCount = 0;
    for (const card of cards) {
        if (card.checklist.length === 0) continue;
        const keys = generateNKeysBetween(null, null, card.checklist.length);
        for (let i = 0; i < card.checklist.length; i++) {
            await prisma.checklistItem.update({
                where: { id: card.checklist[i].id },
                data: { orderKey: keys[i] },
            });
            checklistCount++;
        }
    }
    console.log(`  ✅ ChecklistItems: ${checklistCount} records updated across ${cards.length} cards`);

    console.log("\n🎉 Backfill complete!");
}

backfillOrderKeys()
    .catch((e) => {
        console.error("❌ Backfill failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
