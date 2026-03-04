// Video room standalone layout — NO workspace shell (sidebar/header)
// This ensures the video call runs fullscreen in its own tab
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SocketProvider } from "@/components/providers/SocketProvider";

interface VideoRoomLayoutProps {
    children: React.ReactNode;
    params: Promise<{ slug: string; roomId: string }>;
}

export default async function VideoRoomLayout({ children, params }: VideoRoomLayoutProps) {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in");
    }

    return (
        <SocketProvider>
            <div className="h-screen w-screen bg-[#202124] overflow-hidden">
                {children}
            </div>
        </SocketProvider>
    );
}
