import { motion } from "framer-motion";
import { Mail, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { cn } from "@/lib/utils";
import { containerVariants, itemVariants, cardHoverVariants, getInitials } from "./utils";
import { roleColors, ROLE_LABELS } from "./types";
import type { UserRecord } from "./types";

interface DirectoryGridProps {
  users: UserRecord[];
}

export function DirectoryGrid({ users }: DirectoryGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {users.map((u) => (
        <motion.div key={u.id} variants={itemVariants}>
          <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover">
            <Card className="border border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 overflow-hidden group hover:shadow-lg hover:shadow-black/8 ring-0 hover:ring-1 hover:ring-primary/10">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-blue-500/40 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-primary/15 to-blue-500/10 text-primary font-semibold">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <StatusIndicator status={u.status as any} className="absolute bottom-0 right-0 h-5 w-5 border-2 border-background" />
                </div>
                <h3 className="font-semibold text-[15px] truncate w-full text-foreground">{u.name}</h3>
                <div className="flex flex-col items-center gap-1.5 mb-3 w-full mt-1">
                  {u.position && (
                    <p className="text-[13px] font-medium text-muted-foreground truncate w-full text-center">
                      {u.position}
                    </p>
                  )}
                  <Badge variant="outline" className={cn("font-medium capitalize h-6 px-3 text-[11px] shadow-sm", roleColors[u.role] || roleColors.employee)}>
                    {u.role === 'org_owner' ? 'Owner' : ROLE_LABELS[u.role] || u.role || 'Member'}
                  </Badge>
                </div>
                <Separator className="my-2 opacity-50" />
                <div className="w-full space-y-1.5 text-xs mt-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.department && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Building className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{u.department}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ))}
      {users.length === 0 && (
        <div className="col-span-full py-24 text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl opacity-30">👥</span>
          </div>
          <p className="text-sm font-medium">No members found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search query</p>
        </div>
      )}
    </motion.div>
  );
}
