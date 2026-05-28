import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle2 } from "lucide-react";

export default function Team() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground mt-1">Manage team members and roles.</p>
      </div>

      <Card className="bg-card border-card-border max-w-2xl">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-4">
                <UserCircle2 className="h-10 w-10 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">Admin User</div>
                  <div className="text-sm text-muted-foreground">admin@brandops.co</div>
                </div>
              </div>
              <div className="text-sm font-medium text-primary">Owner</div>
            </div>
            
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <p className="text-sm">Team invites are disabled in this demo.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}