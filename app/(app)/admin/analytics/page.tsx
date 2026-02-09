import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics & Insights</CardTitle>
        <CardDescription>Platform usage and learning metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}
