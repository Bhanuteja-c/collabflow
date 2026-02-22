"use client";

import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WorkspaceVideoRoomPage({
  params,
}: {
  params: Promise<{ slug: string; roomId: string }>;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    // Unwrap params
    params.then((unwrappedParams) => {
      setRoom(unwrappedParams.roomId);
      if (session?.user?.name) {
        setName(session.user.name);
      }
    });
  }, [params, session]);

  useEffect(() => {
    if (!room || !name) return;

    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit/token?room=${room}&username=${
            name || "Guest"
          }`
        );
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [room, name]);

  if (token === "") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[100px] rounded-full" />
        <div className="z-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-card border border-border/50 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 animate-pulse-glow" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Connecting to Huddle...</h2>
            <p className="text-muted-foreground animate-pulse">Establishing encrypted peer connections</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onDisconnected={() => {
        // Redirect back to chat or dashboard on leave
        // If we have slug, go to chat, otherwise dashboard
        params.then((p) => {
           router.push(`/workspace/${p.slug}/chat`); 
        });
      }}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}


