import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Mobile sheet sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-72 border-r-0">
            <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col overflow-auto">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-12 sm:h-14 border-b bg-background sticky top-0 z-30 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">CollabHub</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Acme Corp</p>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <div key={location.pathname} className="h-full">
              <Outlet />
            </div>
        </main>
      </div>
    </div>
  );
}
