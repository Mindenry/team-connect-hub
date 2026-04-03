import { motion } from "framer-motion";
import { Send, Clock, CheckCircle, AlertCircle, Mail, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { roleColors, ROLE_LABELS, type InviteRecord } from "./types";

interface InvitesTableProps {
  invites: InviteRecord[];
  inviteCounts: { total: number; pending: number; accepted: number; expired: number };
  onCancelInvite: (token: string) => void;
}

export function InvitesTable({ invites, inviteCounts, onCancelInvite }: InvitesTableProps) {
  const kpiCards = [
    { label: "Total Invites", value: inviteCounts.total, icon: Send, gradient: "from-blue-500/20 via-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500/10", iconColor: "text-blue-600", borderColor: "border-blue-500/20" },
    { label: "Pending", value: inviteCounts.pending, icon: Clock, gradient: "from-amber-500/20 via-amber-500/10 to-amber-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
    { label: "Accepted", value: inviteCounts.accepted, icon: CheckCircle, gradient: "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
    { label: "Expired", value: inviteCounts.expired, icon: AlertCircle, gradient: "from-red-500/20 via-red-500/10 to-red-500/5", iconBg: "bg-red-500/10", iconColor: "text-red-600", borderColor: "border-red-500/20" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Invitation History</CardTitle>
              <CardDescription className="text-xs">Track all invitations sent to new members.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className={cn("group relative border-2 overflow-hidden hover:shadow-lg transition-all duration-300", kpi.borderColor)}>
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", kpi.gradient)} />
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.iconBg)}>
                        <Icon className={cn("h-4 w-4", kpi.iconColor)} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Invites Table */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invited</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expires</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <Send className="h-6 w-6 opacity-30" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No invites sent yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Click "Invite User" to send your first invitation</p>
                    </td>
                  </tr>
                ) : (
                  invites.map((inv) => {
                    const now = new Date();
                    const isUsed = !!inv.usedAt;
                    const isExpired = !isUsed && new Date(inv.expiresAt) <= now;
                    const isPending = !isUsed && !isExpired;
                    const statusLabel = isUsed ? "Accepted" : isExpired ? "Expired" : "Pending";
                    const statusColor = isUsed
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : isExpired
                        ? "bg-red-500/10 text-red-600 border-red-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20";
                    const StatusIcon = isUsed ? CheckCircle : isExpired ? XCircle : Clock;

                    return (
                      <tr key={inv.id || inv.token} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Mail className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{inv.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs font-medium", roleColors[inv.role] || roleColors.employee)}>
                            {ROLE_LABELS[inv.role] || inv.role || "Member"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs font-medium gap-1", statusColor)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs", isExpired ? "text-red-500" : "text-muted-foreground")}>
                            {new Date(inv.expiresAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onCancelInvite(inv.token)}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancel invite</TooltipContent>
                            </Tooltip>
                          )}
                          {isUsed && (
                            <span className="text-xs text-emerald-500">
                              {new Date(inv.usedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
