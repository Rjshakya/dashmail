
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Dashboard } from "./_components/dashboard";



export default function DashboardPage() {


  // useEffect(() => {
  //   if (!userId) return;
  //   (async () => {
  //     await apiClient.post("/schedule", { userId, time: '' })
  //   })()
  // }, [userId])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        </header>

        <div>
          <Dashboard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
