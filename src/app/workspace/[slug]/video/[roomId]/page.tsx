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
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Joining video room...</p>
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


