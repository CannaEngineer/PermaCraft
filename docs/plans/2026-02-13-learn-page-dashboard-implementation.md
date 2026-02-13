# Learn Page Dashboard Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform `/learn` into a state-based experience: wizard for path selection, focused dashboard for active paths, celebration for completed paths.

**Architecture:** Single-page state machine that renders Wizard, Dashboard, or Celebration based on server-side user progress data. No URL changes between states—all transitions via `router.refresh()`.

**Tech Stack:** Next.js 14 App Router (Server Components + Client Components), Turso, shadcn/ui, Tailwind, TypeScript

---

## Task 1: Create Wizard Recommendations API Route

**Files:**
- Create: `app/api/learning/wizard-recommendations/route.ts`

**Step 1: Create API route with recommendation logic**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LearningPath } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const landSize = searchParams.get('land_size');
    const experience = searchParams.get('experience');

    if (!landSize || !experience) {
      return NextResponse.json(
        { error: 'Missing required parameters: land_size and experience' },
        { status: 400 }
      );
    }

    // Get all learning paths
    const result = await db.execute('SELECT * FROM learning_paths ORDER BY name');
    const paths = result.rows as unknown as LearningPath[];

    // Calculate match scores for each path
    const scoredPaths = paths.map(path => ({
      path,
      matchScore: calculateMatch(path, { land_size: landSize, experience }),
      reasons: getMatchReasons(path, { land_size: landSize, experience })
    }));

    // Sort by match score descending
    scoredPaths.sort((a, b) => b.matchScore - a.matchScore);

    const recommended = scoredPaths[0];
    const alternatives = scoredPaths.slice(1);

    return NextResponse.json({
      recommended,
      alternatives
    });
  } catch (error) {
    console.error('Wizard recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

function calculateMatch(path: LearningPath, answers: { land_size: string; experience: string }): number {
  let score = 0;

  // Land size matching (40 points max)
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') score += 40;
  if (answers.land_size === 'small_yard' && path.slug === 'urban-food-producer') score += 35;
  if (answers.land_size === 'suburban' && path.slug === 'suburban-homesteader') score += 40;
  if (answers.land_size === 'rural' && path.slug === 'rural-regenerator') score += 40;
  if (answers.land_size === 'farm' && path.slug === 'small-farm-operator') score += 40;

  // Experience matching (30 points max)
  if (answers.experience === path.difficulty) score += 30;
  if (answers.experience === 'beginner' && path.difficulty === 'beginner') score += 20;

  // Default comprehensive path bonus (10 points)
  if (path.slug === 'permaculture-student') score += 10;

  return score;
}

function getMatchReasons(path: LearningPath, answers: { land_size: string; experience: string }): string[] {
  const reasons: string[] = [];

  // Land size reasons
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') {
    reasons.push('Perfect for small spaces like balconies and patios');
  }
  if (answers.land_size === 'suburban' && path.slug === 'suburban-homesteader') {
    reasons.push('Designed for suburban lots (0.5-2 acres)');
  }
  if (answers.land_size === 'rural' && path.slug === 'rural-regenerator') {
    reasons.push('Ideal for rural properties focused on restoration');
  }
  if (answers.land_size === 'farm' && path.slug === 'small-farm-operator') {
    reasons.push('Tailored for production farming (5-50 acres)');
  }

  // Experience reasons
  if (answers.experience === path.difficulty) {
    reasons.push(`Matches your ${path.difficulty} experience level`);
  }

  // Path-specific reasons
  if (path.slug === 'permaculture-student') {
    reasons.push('Most comprehensive path covering all topics');
  }

  return reasons;
}
```

**Step 2: Test the API endpoint**

Test with curl:
```bash
curl "http://localhost:3000/api/learning/wizard-recommendations?land_size=suburban&experience=beginner"
```

Expected: JSON response with `recommended` object (highest matchScore) and `alternatives` array

**Step 3: Commit**

```bash
git add app/api/learning/wizard-recommendations/route.ts
git commit -m "feat: add wizard recommendations API endpoint

Calculates match scores based on land size and experience level to
personalize learning path suggestions."
```

---

## Task 2: Update Set Path API for Path Switching

**Files:**
- Modify: `app/api/learning/set-path/route.ts`

**Step 1: Read current implementation**

```bash
cat app/api/learning/set-path/route.ts
```

**Step 2: Update to allow null learning_path_id**

Add handling for `null` learning_path_id to enable path switching (returns user to wizard):

```typescript
// In the POST handler, update the logic to handle null:
const { learning_path_id } = await request.json();

// Allow null to reset path (for "Switch Path" action)
if (learning_path_id !== null && learning_path_id !== undefined) {
  // Validate path exists
  const pathResult = await db.execute({
    sql: 'SELECT id FROM learning_paths WHERE id = ?',
    args: [learning_path_id]
  });

  if (pathResult.rows.length === 0) {
    return NextResponse.json(
      { error: 'Invalid learning path' },
      { status: 400 }
    );
  }
}

// Update or create user_progress (allowing null)
const updateResult = await db.execute({
  sql: `INSERT INTO user_progress (id, user_id, learning_path_id, current_level, total_xp)
        VALUES (?, ?, ?, 0, 0)
        ON CONFLICT(user_id) DO UPDATE SET
          learning_path_id = excluded.learning_path_id,
          updated_at = unixepoch()`,
  args: [crypto.randomUUID(), session.user.id, learning_path_id]
});
```

**Step 3: Test path switching**

Test setting path to null:
```bash
curl -X POST http://localhost:3000/api/learning/set-path \
  -H "Content-Type: application/json" \
  -d '{"learning_path_id": null}' \
  -H "Cookie: session=..."
```

Expected: Success response, user_progress.learning_path_id set to null

**Step 4: Commit**

```bash
git add app/api/learning/set-path/route.ts
git commit -m "feat: support null learning_path_id for path switching

Allows users to reset their learning path to return to wizard."
```

---

## Task 3: Create LearnPageHeader Component

**Files:**
- Create: `components/learning/learn-page-header.tsx`

**Step 1: Create header component with settings menu**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, BookOpen, Trophy, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LearnPageHeaderProps {
  hasActivePath: boolean;
  pathName: string | null;
}

export function LearnPageHeader({ hasActivePath, pathName }: LearnPageHeaderProps) {
  const router = useRouter();
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchPath = async () => {
    setIsSwitching(true);
    try {
      const response = await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch path');
      }

      router.refresh();
    } catch (error) {
      console.error('Error switching path:', error);
      alert('Failed to switch path. Please try again.');
    } finally {
      setIsSwitching(false);
      setShowSwitchDialog(false);
    }
  };

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold">
              {hasActivePath && pathName ? pathName : 'Choose Your Path'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActivePath ? 'Your learning journey' : 'Select a personalized learning path'}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {hasActivePath && (
                <>
                  <DropdownMenuItem onClick={() => setShowSwitchDialog(true)}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Switch Path
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/learn/topics">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View All Topics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/learn/badges">
                  <Trophy className="mr-2 h-4 w-4" />
                  View All Badges
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Learning Path?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress in {pathName} will be saved, and you can return to it anytime.
              You'll be able to choose a new learning path.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSwitching}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitchPath} disabled={isSwitching}>
              {isSwitching ? 'Switching...' : 'Switch Path'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**Step 2: Visual test in development**

Add to a test page temporarily or view in Storybook. Verify:
- Header renders with correct title
- Settings menu opens and closes
- Confirmation dialog appears when clicking "Switch Path"

**Step 3: Commit**

```bash
git add components/learning/learn-page-header.tsx
git commit -m "feat: add learn page header with settings menu

Includes title, settings dropdown with path switching, and confirmation
dialog for intentional path changes."
```

---

## Task 4: Create PathSelectionWizard Component - Part 1 (Wizard Shell)

**Files:**
- Create: `components/learning/path-selection-wizard.tsx`

**Step 1: Create wizard shell with step navigation**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LearningPath } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Home, TreePine, Tractor, Users, GraduationCap, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';

interface PathSelectionWizardProps {
  paths: LearningPath[];
}

type LandSize = 'balcony' | 'small_yard' | 'suburban' | 'rural' | 'farm';
type Experience = 'beginner' | 'intermediate' | 'advanced';

interface WizardAnswers {
  landSize: LandSize | null;
  experience: Experience | null;
}

export function PathSelectionWizard({ paths }: PathSelectionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>({
    landSize: null,
    experience: null,
  });
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [showAllPaths, setShowAllPaths] = useState(false);
  const [isSelectingPath, setIsSelectingPath] = useState(false);

  const handleLandSizeSelect = (landSize: LandSize) => {
    setAnswers({ ...answers, landSize });
    setStep(2);
  };

  const handleExperienceSelect = async (experience: Experience) => {
    setAnswers({ ...answers, experience });
    setIsLoadingRecommendations(true);

    try {
      const response = await fetch(
        `/api/learning/wizard-recommendations?land_size=${answers.landSize}&experience=${experience}`
      );
      if (!response.ok) throw new Error('Failed to get recommendations');

      const data = await response.json();
      setRecommendations(data);
      setStep(3);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handlePathSelect = async (pathId: string) => {
    setIsSelectingPath(true);
    try {
      const response = await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: pathId }),
      });

      if (!response.ok) throw new Error('Failed to set path');

      router.refresh();
    } catch (error) {
      console.error('Error setting path:', error);
      alert('Failed to set learning path. Please try again.');
      setIsSelectingPath(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        {step < 3 && (
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
            <div className="flex gap-2 justify-center mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-16 rounded-full ${
                    s <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Land Size */}
        {step === 1 && (
          <WizardStepOne onSelect={handleLandSizeSelect} />
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {isLoadingRecommendations ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Finding the perfect path for you...</p>
              </div>
            ) : (
              <WizardStepTwo onSelect={handleExperienceSelect} />
            )}
          </>
        )}

        {/* Step 3: Recommendation */}
        {step === 3 && recommendations && (
          <WizardStepThree
            recommendations={recommendations}
            allPaths={paths}
            showAllPaths={showAllPaths}
            onToggleShowAll={() => setShowAllPaths(!showAllPaths)}
            onSelectPath={handlePathSelect}
            isSelecting={isSelectingPath}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit wizard shell**

```bash
git add components/learning/path-selection-wizard.tsx
git commit -m "feat: add wizard shell with step navigation

Multi-step wizard structure with progress indicator and state management
for path selection flow."
```

---

## Task 5: Create PathSelectionWizard Component - Part 2 (Step Components)

**Files:**
- Modify: `components/learning/path-selection-wizard.tsx`

**Step 1: Add WizardStepOne component at bottom of file**

```typescript
// Add after PathSelectionWizard component

function WizardStepOne({ onSelect }: { onSelect: (landSize: LandSize) => void }) {
  const options = [
    {
      value: 'balcony' as LandSize,
      icon: Building2,
      label: 'Balcony/Patio',
      description: 'Container gardens and small spaces'
    },
    {
      value: 'small_yard' as LandSize,
      icon: Home,
      label: 'Small Yard',
      description: 'Under 0.5 acres'
    },
    {
      value: 'suburban' as LandSize,
      icon: Home,
      label: 'Suburban Lot',
      description: '0.5 - 2 acres'
    },
    {
      value: 'rural' as LandSize,
      icon: TreePine,
      label: 'Rural Property',
      description: '2 - 20 acres'
    },
    {
      value: 'farm' as LandSize,
      icon: Tractor,
      label: 'Farm',
      description: '20+ acres'
    },
  ];

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
        How much land do you have?
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        This helps us recommend the right learning path for your situation
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.value}
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
              onClick={() => onSelect(option.value)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{option.label}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function WizardStepTwo({ onSelect }: { onSelect: (experience: Experience) => void }) {
  const options = [
    {
      value: 'beginner' as Experience,
      label: 'New to Permaculture',
      description: 'Just starting my learning journey'
    },
    {
      value: 'intermediate' as Experience,
      label: 'Some Knowledge',
      description: 'Familiar with basic concepts'
    },
    {
      value: 'advanced' as Experience,
      label: 'Experienced Practitioner',
      description: 'Ready for advanced topics'
    },
  ];

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
        What's your experience level?
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        We'll match you with content at the right difficulty
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {options.map((option) => (
          <Card
            key={option.value}
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
            onClick={() => onSelect(option.value)}
          >
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">{option.label}</h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WizardStepThree({
  recommendations,
  allPaths,
  showAllPaths,
  onToggleShowAll,
  onSelectPath,
  isSelecting,
}: {
  recommendations: any;
  allPaths: LearningPath[];
  showAllPaths: boolean;
  onToggleShowAll: () => void;
  onSelectPath: (pathId: string) => void;
  isSelecting: boolean;
}) {
  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const recommendedPath = recommendations.recommended.path;
  const RecommendedIcon = getIconComponent(recommendedPath.icon_name);

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
        We Recommend This Path
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        Based on your answers, here's the best path for you
      </p>

      {/* Recommended Path Card */}
      <Card className="max-w-2xl mx-auto mb-8 border-2 border-primary">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <RecommendedIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-1">{recommendedPath.name}</CardTitle>
              <CardDescription>{recommendedPath.description}</CardDescription>
              <div className="flex gap-2 mt-3">
                <Badge variant="secondary">{recommendedPath.difficulty}</Badge>
                <Badge variant="outline">{recommendedPath.estimated_lessons} lessons</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium mb-2">Why this path?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {recommendations.recommended.reasons.map((reason: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => onSelectPath(recommendedPath.id)}
            disabled={isSelecting}
          >
            {isSelecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting Path...
              </>
            ) : (
              'Start This Path'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Browse All Paths */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={onToggleShowAll}
        >
          {showAllPaths ? 'Hide Other Paths' : 'Browse All Paths'}
        </Button>
      </div>

      {showAllPaths && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {allPaths.map((path) => {
            const Icon = getIconComponent(path.icon_name);
            return (
              <Card
                key={path.id}
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                onClick={() => onSelectPath(path.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{path.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {path.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{path.difficulty}</Badge>
                    <Badge variant="outline" className="text-xs">{path.estimated_lessons} lessons</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test wizard flow in browser**

Visit http://localhost:3000/learn (will need to wire up main page first, so mark for later testing)

**Step 3: Commit wizard steps**

```bash
git add components/learning/path-selection-wizard.tsx
git commit -m "feat: add wizard step components with path selection

Includes property size selection, experience level, and personalized
recommendations with browse all option."
```

---

## Task 6: Create PathDashboard Component - Part 1 (Data Fetching)

**Files:**
- Create: `components/learning/path-dashboard.tsx`

**Step 1: Create server component with data fetching logic**

```typescript
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Sparkles, Play, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';

interface PathDashboardProps {
  data: PathDashboardData;
}

interface PathDashboardData {
  path: any;
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  nextLesson: any;
  curriculumByTopic: Array<{
    topic: any;
    lessons: Array<any & { isCompleted: boolean }>;
  }>;
  earnedBadges: any[];
  userProgress: any;
}

function getLevelName(level: number) {
  const levels = ['Seedling 🌱', 'Sprout 🌿', 'Sapling 🌲', 'Tree 🌳', 'Grove 🌲🌳', 'Forest 🌲🌳🌲'];
  return levels[Math.min(level, levels.length - 1)];
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

export async function PathDashboard({ data }: PathDashboardProps) {
  const {
    path,
    totalLessons,
    completedLessons,
    percentComplete,
    nextLesson,
    curriculumByTopic,
    earnedBadges,
    userProgress,
  } = data;

  const PathIcon = getIconComponent(path.icon_name);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Path Name */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <PathIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold">{path.name}</h2>
                <p className="text-muted-foreground">{path.description}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-muted-foreground mb-1">Level</p>
                  <p className="font-bold">{getLevelName(userProgress?.current_level || 0)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-muted-foreground mb-1">Total XP</p>
                  <p className="text-2xl font-bold">{userProgress?.total_xp || 0}</p>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
                <CardContent className="p-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground mb-1">Progress</p>
                  <p className="text-2xl font-bold">{completedLessons}/{totalLessons}</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Path Completion</span>
                <span className="text-sm text-muted-foreground">{Math.round(percentComplete)}%</span>
              </div>
              <Progress value={percentComplete} className="h-3" />
            </div>

            {/* Continue Button */}
            {nextLesson && (
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href={`/learn/lessons/${nextLesson.slug}`}>
                  <Play className="mr-2 h-5 w-5" />
                  Continue Learning: {nextLesson.title}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Curriculum Section - placeholder for now */}
          <div>
            <h3 className="text-xl font-bold mb-4">Your Learning Path</h3>
            <p className="text-muted-foreground">Curriculum will be rendered here</p>
          </div>

          {/* Badges Section - placeholder for now */}
          {earnedBadges.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4">Your Badges</h3>
              <p className="text-muted-foreground">{earnedBadges.length} badges earned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit dashboard shell**

```bash
git add components/learning/path-dashboard.tsx
git commit -m "feat: add path dashboard hero section

Displays progress stats, level, XP, and continue learning button."
```

---

## Task 7: Create PathDashboard Component - Part 2 (Curriculum Section)

**Files:**
- Modify: `components/learning/path-dashboard.tsx`

**Step 1: Replace curriculum placeholder with full implementation**

Replace the curriculum placeholder section with:

```typescript
          {/* Curriculum Section */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icons.BookOpen className="w-5 h-5 text-primary" />
              Your Learning Path
            </h3>

            <div className="space-y-4">
              {curriculumByTopic.map((topicGroup) => {
                const TopicIcon = getIconComponent(topicGroup.topic.icon_name);
                const topicCompleted = topicGroup.lessons.filter(l => l.isCompleted).length;
                const topicTotal = topicGroup.lessons.length;
                const topicProgress = (topicCompleted / topicTotal) * 100;

                return (
                  <Card key={topicGroup.topic.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TopicIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{topicGroup.topic.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {topicCompleted} of {topicTotal} lessons
                            </p>
                          </div>
                        </div>
                        <Badge variant={topicCompleted === topicTotal ? 'default' : 'secondary'}>
                          {Math.round(topicProgress)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={topicProgress} className="h-2 mb-4" />

                      <div className="space-y-2">
                        {topicGroup.lessons.map((lesson, index) => {
                          const isNext = !lesson.isCompleted &&
                            (index === 0 || topicGroup.lessons[index - 1].isCompleted);

                          return (
                            <Link
                              key={lesson.id}
                              href={`/learn/lessons/${lesson.slug}`}
                              className={`block p-3 rounded-lg border transition-all group ${
                                isNext
                                  ? 'border-2 border-primary bg-primary/5 hover:bg-primary/10'
                                  : lesson.isCompleted
                                  ? 'bg-muted/30 hover:bg-muted/50'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {lesson.isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : isNext ? (
                                    <Play className="w-5 h-5 text-primary" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium ${isNext ? 'group-hover:text-primary' : ''} transition-colors`}>
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <span>{lesson.estimated_minutes} min</span>
                                    <span>•</span>
                                    <span className="text-green-600">+{lesson.xp_reward} XP</span>
                                  </div>
                                </div>
                                {isNext && (
                                  <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
```

**Step 2: Add badge carousel**

Replace badges placeholder with:

```typescript
          {/* Badges Section */}
          {earnedBadges.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Your Badges
              </h3>

              <div className="flex gap-4 overflow-x-auto pb-4">
                {earnedBadges.map((badge) => {
                  const BadgeIcon = getIconComponent(badge.icon_name);
                  return (
                    <Card key={badge.id} className="flex-shrink-0 w-40">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                          <BadgeIcon className="w-6 h-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{badge.name}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
```

**Step 3: Commit curriculum and badges**

```bash
git add components/learning/path-dashboard.tsx
git commit -m "feat: add curriculum and badges to path dashboard

Displays lessons grouped by topic with completion status and earned
badge carousel."
```

---

## Task 8: Create PathCelebration Component

**Files:**
- Create: `components/learning/path-celebration.tsx`

**Step 1: Create celebration component with auto-transition**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';

interface PathCelebrationProps {
  data: {
    path: any;
    totalLessons: number;
    completedLessons: number;
    userProgress: any;
  };
}

export function PathCelebration({ data }: PathCelebrationProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const handleContinue = async () => {
    // Reset learning path to null to show wizard
    try {
      await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: null }),
      });
      router.refresh();
    } catch (error) {
      console.error('Error resetting path:', error);
      // Fallback: just refresh
      router.refresh();
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const PathIcon = getIconComponent(data.path.icon_name);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Confetti effect - Simple CSS version */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <Card className="max-w-2xl w-full relative animate-in zoom-in-95 duration-500">
        <CardContent className="p-8 md:p-12 text-center">
          {/* Badge Icon */}
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-700 delay-500">
            <PathIcon className="w-12 h-12 text-primary" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
            Path Complete! 🎉
          </h1>
          <p className="text-xl text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
            {data.path.name}
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{data.totalLessons}</p>
              <p className="text-sm text-muted-foreground">Lessons Completed</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1100">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{data.userProgress?.total_xp || 0}</p>
              <p className="text-sm text-muted-foreground">XP Earned</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1200">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">Mastered</p>
              <p className="text-sm text-muted-foreground">Path Status</p>
            </div>
          </div>

          {/* CTA */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1300">
            <p className="text-sm text-muted-foreground mb-4">
              Ready for your next challenge? {countdown > 0 && `(${countdown}s)`}
            </p>
            <Button size="lg" onClick={handleContinue} className="w-full md:w-auto">
              Choose Next Path
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Add confetti animation to globals.css**

Add to `app/globals.css`:

```css
@keyframes confetti {
  0% {
    transform: translateY(-10px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-confetti {
  animation: confetti linear forwards;
}
```

**Step 3: Commit celebration component**

```bash
git add components/learning/path-celebration.tsx app/globals.css
git commit -m "feat: add path celebration with confetti animation

Full-screen celebration on path completion with stats, countdown, and
auto-transition to wizard for next path selection."
```

---

## Task 9: Rewrite Main Learn Page with State Machine

**Files:**
- Modify: `app/(app)/learn/page.tsx`

**Step 1: Back up existing file**

```bash
cp app/\(app\)/learn/page.tsx app/\(app\)/learn/page.tsx.backup
```

**Step 2: Rewrite with state machine logic**

```typescript
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { Skeleton } from '@/components/ui/skeleton';
import { LearnPageHeader } from '@/components/learning/learn-page-header';
import { PathSelectionWizard } from '@/components/learning/path-selection-wizard';
import { PathDashboard } from '@/components/learning/path-dashboard';
import { PathCelebration } from '@/components/learning/path-celebration';

type PageState = 'wizard' | 'dashboard' | 'celebration';

interface LearnPageState {
  state: PageState;
  data: any;
}

async function getLearnPageState(userId: string): Promise<LearnPageState> {
  // Get user progress
  const progressResult = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId]
  });
  const progress = progressResult.rows[0] as any;

  // State: No path → wizard
  if (!progress?.learning_path_id) {
    const pathsResult = await db.execute('SELECT * FROM learning_paths ORDER BY difficulty, name');
    return { state: 'wizard', data: { paths: pathsResult.rows } };
  }

  // State: Has path → fetch complete dashboard data
  const pathDetails = await getActivePathDetails(userId, progress.learning_path_id);

  // Check completion
  const isComplete = pathDetails.completedLessons === pathDetails.totalLessons && pathDetails.totalLessons > 0;

  return isComplete
    ? { state: 'celebration', data: pathDetails }
    : { state: 'dashboard', data: pathDetails };
}

async function getActivePathDetails(userId: string, pathId: string) {
  // Get path info
  const pathResult = await db.execute({
    sql: 'SELECT * FROM learning_paths WHERE id = ?',
    args: [pathId]
  });
  const path = pathResult.rows[0];

  // Get user progress
  const progressResult = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId]
  });
  const userProgress = progressResult.rows[0];

  // Get all lessons in path with completion status
  const lessonsResult = await db.execute({
    sql: `
      SELECT
        l.*,
        t.id as topic_id,
        t.name as topic_name,
        t.slug as topic_slug,
        t.icon_name as topic_icon,
        pl.order_index,
        CASE WHEN lc.lesson_id IS NOT NULL THEN 1 ELSE 0 END as is_completed
      FROM path_lessons pl
      JOIN lessons l ON pl.lesson_id = l.id
      JOIN topics t ON l.topic_id = t.id
      LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
      WHERE pl.learning_path_id = ?
      ORDER BY pl.order_index ASC
    `,
    args: [userId, pathId]
  });

  const lessons = lessonsResult.rows as any[];

  // Calculate progress
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => l.is_completed === 1).length;
  const percentComplete = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Find next incomplete lesson
  const nextLesson = lessons.find(l => l.is_completed !== 1);

  // Group lessons by topic
  const topicsMap = new Map();
  for (const lesson of lessons) {
    if (!topicsMap.has(lesson.topic_id)) {
      topicsMap.set(lesson.topic_id, {
        topic: {
          id: lesson.topic_id,
          name: lesson.topic_name,
          slug: lesson.topic_slug,
          icon_name: lesson.topic_icon,
        },
        lessons: []
      });
    }
    topicsMap.get(lesson.topic_id).lessons.push({
      ...lesson,
      isCompleted: lesson.is_completed === 1
    });
  }
  const curriculumByTopic = Array.from(topicsMap.values());

  // Get earned badges
  const badgesResult = await db.execute({
    sql: `
      SELECT b.*, ub.earned_at
      FROM badges b
      JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `,
    args: [userId]
  });

  return {
    path,
    totalLessons,
    completedLessons,
    percentComplete,
    nextLesson,
    curriculumByTopic,
    earnedBadges: badgesResult.rows,
    userProgress,
  };
}

async function LearnContent() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const pageState = await getLearnPageState(session.user.id);

  return (
    <div className="min-h-screen">
      <LearnPageHeader
        hasActivePath={pageState.state === 'dashboard'}
        pathName={pageState.state === 'dashboard' ? pageState.data.path.name : null}
      />

      {pageState.state === 'wizard' && <PathSelectionWizard paths={pageState.data.paths} />}
      {pageState.state === 'dashboard' && <PathDashboard data={pageState.data} />}
      {pageState.state === 'celebration' && <PathCelebration data={pageState.data} />}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<LearnPageSkeleton />}>
      <LearnContent />
    </Suspense>
  );
}

function LearnPageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
      </div>
    </div>
  );
}
```

**Step 3: Test the page in browser**

```bash
npm run dev
```

Visit http://localhost:3000/learn and verify:
- Without path: Wizard appears
- With path: Dashboard appears
- After completing all lessons: Celebration appears

**Step 4: Commit main page rewrite**

```bash
git add app/\(app\)/learn/page.tsx
git commit -m "feat: rewrite learn page with state machine

Implements wizard/dashboard/celebration states based on user progress.
Single page with no route changes between states."
```

---

## Task 10: Manual Testing & Verification

**Files:**
- None (testing only)

**Step 1: Test wizard flow**

Manual testing checklist:

```markdown
## Wizard Flow
- [ ] Visit /learn with no active path → wizard appears
- [ ] Click property size option → advances to step 2
- [ ] Click Back button → returns to step 1
- [ ] Select experience level → fetches recommendations
- [ ] Recommendation matches selections
- [ ] Click "Start This Path" → sets path and shows dashboard
- [ ] Click "Browse All Paths" → expands grid
- [ ] Click alternate path → sets path and shows dashboard
```

**Step 2: Test dashboard state**

```markdown
## Dashboard State
- [ ] Progress stats display correctly (level, XP, X/Y lessons)
- [ ] Progress bar shows correct percentage
- [ ] "Continue Learning" button links to next incomplete lesson
- [ ] Curriculum grouped by topics
- [ ] Completed lessons show checkmark
- [ ] Next lesson shows play icon
- [ ] Upcoming lessons show circle
- [ ] Click lesson → navigates to lesson page
- [ ] Earned badges display in carousel
```

**Step 3: Test path switching**

```markdown
## Path Switching
- [ ] Click settings menu (three dots) → menu opens
- [ ] Click "Switch Path" → confirmation dialog appears
- [ ] Click "Cancel" → dialog closes, no change
- [ ] Click "Switch Path" in dialog → returns to wizard
- [ ] Select new path → dashboard updates to new path
- [ ] Previous path progress preserved (check database)
```

**Step 4: Test celebration (simulate completion)**

To test celebration, manually update database:

```sql
-- Complete all lessons for a test user
UPDATE lesson_completions SET user_id = 'your-test-user-id' WHERE lesson_id IN (
  SELECT lesson_id FROM path_lessons WHERE learning_path_id = 'your-test-path-id'
);
```

Then:
```markdown
## Celebration Flow
- [ ] Visit /learn after completing all lessons → celebration appears
- [ ] Confetti animation plays
- [ ] Stats display correctly (lessons, XP)
- [ ] Countdown starts from 3
- [ ] After 3 seconds → automatically returns to wizard
- [ ] Click "Choose Next Path" early → immediately returns to wizard
```

**Step 5: Test responsive design**

```markdown
## Responsive Design
- [ ] Wizard works on mobile (320px width)
- [ ] Dashboard stats collapse to 2x2 grid on mobile
- [ ] Settings menu accessible on mobile
- [ ] All touch targets adequate size (min 44px)
- [ ] Curriculum topics readable on mobile
- [ ] Badge carousel scrollable on mobile
```

**Step 6: Document test results**

Create test report:

```bash
echo "# Learn Page Dashboard Testing Report

Date: $(date)

## Test Results

### Wizard Flow: PASS/FAIL
- Notes:

### Dashboard State: PASS/FAIL
- Notes:

### Path Switching: PASS/FAIL
- Notes:

### Celebration: PASS/FAIL
- Notes:

### Responsive: PASS/FAIL
- Notes:

## Issues Found
1.
2.

## Next Steps
-
" > docs/learn-dashboard-test-results.md
```

**Step 7: Commit test results**

```bash
git add docs/learn-dashboard-test-results.md
git commit -m "docs: add learn dashboard test results"
```

---

## Task 11: Final Cleanup & Documentation

**Files:**
- Modify: `docs/plans/2026-02-13-learn-page-dashboard-redesign.md`

**Step 1: Update design doc status**

Update the status in the design doc:

```markdown
**Status:** ✅ Implemented - In Testing
```

**Step 2: Remove backup file if tests pass**

```bash
rm app/\(app\)/learn/page.tsx.backup
```

**Step 3: Optional - Clean up old components**

If tests pass and new implementation is stable:

```bash
# Archive old path selector component
mkdir -p components/learning/_archive
git mv components/learning/path-selector.tsx components/learning/_archive/
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: finalize learn page dashboard implementation

All tests passing. Old components archived. Ready for production."
```

---

## Implementation Complete!

**Summary:**
- ✅ Wizard recommendations API
- ✅ Path switching API support
- ✅ LearnPageHeader with settings menu
- ✅ PathSelectionWizard with 3-step flow
- ✅ PathDashboard with curriculum and badges
- ✅ PathCelebration with confetti
- ✅ Main page state machine
- ✅ Manual testing checklist
- ✅ Documentation updates

**Files Changed:**
- Created: 5 new components
- Created: 1 new API route
- Modified: 1 API route (set-path)
- Modified: 1 page (learn/page.tsx)
- Modified: 1 CSS file (globals.css)

**Next Steps:**
1. Deploy to staging environment
2. Gather user feedback
3. Monitor engagement metrics
4. Iterate based on feedback

---

Plan saved to: `docs/plans/2026-02-13-learn-page-dashboard-implementation.md`
