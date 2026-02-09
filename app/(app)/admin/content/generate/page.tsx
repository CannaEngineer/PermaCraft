import { Suspense } from 'react';
import { db } from '@/lib/db';
import { LessonGeneratorForm } from '@/components/admin/lesson-generator-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function getTopics() {
  const result = await db.execute('SELECT * FROM topics ORDER BY name');
  return result.rows;
}

async function GeneratorPage() {
  const topics = await getTopics();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>AI Lesson Generator</CardTitle>
          <CardDescription>
            Generate high-quality permaculture lesson content using AI. Review and edit before publishing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LessonGeneratorForm topics={topics as any} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Generation Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Learning Objectives:</strong> Be specific about what students should learn.
            Example: "Understand Zone 3 characteristics, select appropriate plants, plan maintenance schedule"
          </p>
          <p>
            <strong>Key Concepts:</strong> List 3-5 main ideas to cover.
            Example: "Zone 3 definition, access patterns, plant selection criteria, maintenance needs"
          </p>
          <p>
            <strong>Difficulty:</strong> Beginner = foundational concepts, Intermediate = practical application, Advanced = complex systems
          </p>
          <p>
            <strong>Length:</strong> 10min = ~800 words, 15min = ~1200 words, 20min = ~1500 words
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GeneratorPage />
    </Suspense>
  );
}
