import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMentions() {
    const content = "@teja asadadasdadasdadassdadsad";
    const senderName = "radha";
    
    // 6. Parse Mentions and Create Notifications
    const mentionRegex = /@(\w+)/g;
    const matches = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
    console.log("Regex Matches:", matches);

    if (matches.length > 0) {
        // Just fetch the first channel to simulate finding workspace 
        const channelInfo = await prisma.channel.findFirst({
            include: {
                workspace: {
                    include: { members: { include: { user: true } } }
                }
            }
        });

        if (channelInfo?.workspace) {
            console.log(`Found Workspace: ${channelInfo.workspace.name}`);
            const workspaceMembers = channelInfo.workspace.members;
            console.log("Workspace Members:");
            workspaceMembers.forEach(m => console.log(` - ID: ${m.user.id}, Name: ${m.user.name}`));
            
            const mentionedUserIds = new Set<string>();

            for (const match of matches) {
                console.log(`Looking for match: "${match}"`);
                const member = workspaceMembers.find(m => {
                    const nameParts = (m.user.name || "").toLowerCase().split(" ");
                    const fullNameNoSpaces = (m.user.name || "").toLowerCase().replace(/\s+/g, '');
                    const isMatch = nameParts.includes(match) || fullNameNoSpaces === match;
                    console.log(`  Comparing with "${m.user.name}" -> parts: ${JSON.stringify(nameParts)}, noSpaces: ${fullNameNoSpaces} => ${isMatch}`);
                    return isMatch;
                });

                if (member) {
                    console.log(`  => Found member! ID: ${member.user.id}`);
                    mentionedUserIds.add(member.user.id);
                } else {
                    console.log(`  => No member found for "${match}"`);
                }
            }

            console.log("Final mentionedUserIds:", Array.from(mentionedUserIds));
        } else {
            console.log("No workspace found.");
        }
    }
}

testMentions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
