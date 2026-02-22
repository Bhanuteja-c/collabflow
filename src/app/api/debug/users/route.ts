import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const content = "@teja asadadasdadasdadassdadsad";
  const mentionRegex = /@(\w+)/g;
  const matches = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());

  const channelInfo = await prisma.channel.findFirst({
      include: {
          workspace: {
              include: { members: { include: { user: true } } }
          }
      }
  });

  const debugOutput: any = {
      matches,
      workspaceFound: !!channelInfo?.workspace,
      evaluations: []
  };

  if (channelInfo?.workspace) {
      const workspaceMembers = channelInfo.workspace.members;
      
      for (const match of matches) {
          for (const m of workspaceMembers) {
              const nameParts = (m.user.name || "").toLowerCase().split(" ");
              const fullNameNoSpaces = (m.user.name || "").toLowerCase().replace(/\s+/g, '');
              const isMatch = nameParts.includes(match) || fullNameNoSpaces === match;
              debugOutput.evaluations.push({
                  match,
                  userName: m.user.name,
                  nameParts,
                  fullNameNoSpaces,
                  isMatch
              });
          }
      }
  }

  return NextResponse.json(debugOutput);
}
