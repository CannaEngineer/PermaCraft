import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage users and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}
