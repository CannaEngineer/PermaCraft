import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContentLibraryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Library</CardTitle>
        <CardDescription>Browse and manage all published lessons</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Coming soon - view and edit all published lessons</p>
      </CardContent>
    </Card>
  );
}
