import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace and billing.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle>Workspace Profile</CardTitle>
            <CardDescription>Update your brand information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input id="brand-name" defaultValue="Acme Corp" className="bg-background border-input" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" defaultValue="https://acme.co" className="bg-background border-input" disabled />
            </div>
            <Button disabled>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle>Billing & Invoices</CardTitle>
            <CardDescription>Manage payment methods and view history.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between mb-4">
              <div>
                <div className="font-medium">Pro Plan</div>
                <div className="text-sm text-muted-foreground">$299/mo</div>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">Active</Badge>
            </div>
            <Button variant="outline" disabled>Manage Subscription</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inline badge since it wasn't imported
function Badge({ children, className, variant = "default" }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}