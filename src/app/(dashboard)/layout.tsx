// src/app/(dashboard)/layout.tsx — Dashboard Layout with Sidebar
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <SidebarInset className="flex flex-col">
                    {/* Top Header Bar */}
                    <DashboardHeader />
                    {/* Main Content */}
                    <main className="flex-1 overflow-auto bg-muted/30">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
