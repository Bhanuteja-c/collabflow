import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        console.log("Checking workspace using direct URL");
        const workspace = await prisma.workspace.findUnique({
            where: { slug: "test" }
        });
        console.log("Workspace found:", workspace);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
