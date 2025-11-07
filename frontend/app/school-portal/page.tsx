import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SchoolPortalHome() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome to School Sports Portal</h2>
        <p className="text-muted-foreground mt-2">
          Manage teams, coaches, and players for your sports organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/school-portal/team">
          <Card className="hover:bg-accent cursor-pointer">
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Manage team rosters and schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage your sports teams, rosters, and game schedules.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/school-portal/coach">
          <Card className="hover:bg-accent cursor-pointer">
            <CardHeader>
              <CardTitle>Coaches</CardTitle>
              <CardDescription>Coach management and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage coaches, their teams, and responsibilities.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/school-portal/player">
          <Card className="hover:bg-accent cursor-pointer">
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>Player profiles and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View player rosters, statistics, and performance tracking.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
