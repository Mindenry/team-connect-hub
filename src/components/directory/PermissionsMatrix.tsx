import { motion } from "framer-motion";
import { Shield, Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLES_LIST, RESOURCES, roleColors, type PermissionRecord } from "./types";

interface PermissionsMatrixProps {
  permissionsData: PermissionRecord[];
  permissionsDirty: boolean;
  permSaving: boolean;
  usersByRole: Record<string, number>;
  onTogglePerm: (role: string, resource: string, action: string) => void;
  onSave: () => void;
  onSeedDefaults: () => void;
}

export function PermissionsMatrix({
  permissionsData,
  permissionsDirty,
  permSaving,
  usersByRole,
  onTogglePerm,
  onSave,
  onSeedDefaults,
}: PermissionsMatrixProps) {
  const getPermValue = (role: string, resource: string, action: string): boolean => {
    if (role === "org_owner") return true;
    const found = permissionsData.find(
      (p) => p.role === role && p.resource === resource && p.action === action
    );
    return found ? found.allowed : false;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Roles & Permissions</CardTitle>
              <CardDescription className="text-xs">
                Configure what each role can access. Owner permissions are always enabled.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onSeedDefaults}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset Defaults
              </Button>
              <Button size="sm" onClick={onSave} disabled={!permissionsDirty || permSaving}>
                <Save className="w-4 h-4 mr-1" />
                {permSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Role summary badges */}
          <div className="flex flex-wrap gap-3 mb-5">
            {ROLES_LIST.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs font-medium shadow-sm", roleColors[r] || "bg-muted/60 text-muted-foreground")}>
                  {ROLE_LABELS[r]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {usersByRole[r] || 0} users
                </span>
              </div>
            ))}
          </div>

          {/* Permission Matrix Table */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 min-w-[160px]">Resource</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 min-w-[80px]">Action</th>
                    {ROLES_LIST.map((r) => (
                      <th key={r} className="text-center text-xs font-medium text-muted-foreground px-3 py-3 min-w-[80px]">
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((res) =>
                    res.actions.map((act, actIdx) => (
                      <tr
                        key={`${res.key}-${act}`}
                        className={cn(
                          "border-t hover:bg-muted/30 transition-colors",
                          actIdx === 0 && "border-t-2 border-t-border/60"
                        )}
                      >
                        {actIdx === 0 ? (
                          <td className="px-4 py-2.5 text-sm font-medium text-foreground align-top" rowSpan={res.actions.length}>
                            {res.label}
                          </td>
                        ) : null}
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {act}
                          </Badge>
                        </td>
                        {ROLES_LIST.map((role) => {
                          const isOwner = role === "org_owner";
                          const checked = getPermValue(role, res.key, act);
                          return (
                            <td key={role} className="px-3 py-2.5 text-center">
                              <Switch
                                checked={checked}
                                disabled={isOwner}
                                onCheckedChange={() => onTogglePerm(role, res.key, act)}
                                className="scale-75"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {permissionsDirty && (
            <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              You have unsaved changes
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
