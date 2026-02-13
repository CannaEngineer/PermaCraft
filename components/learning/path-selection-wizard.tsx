'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LearningPath } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Home, TreePine, Wheat, Users, GraduationCap, Loader2 } from 'lucide-react';
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

interface PathRecommendation {
  path: LearningPath;
  matchScore: number;
  reasons: string[];
}

interface WizardRecommendations {
  recommended: PathRecommendation;
  alternatives: PathRecommendation[];
}

export function PathSelectionWizard({ paths }: PathSelectionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>({
    landSize: null,
    experience: null,
  });
  const [recommendations, setRecommendations] = useState<WizardRecommendations | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [showAllPaths, setShowAllPaths] = useState(false);
  const [isSelectingPath, setIsSelectingPath] = useState(false);

  const handleLandSizeSelect = (landSize: LandSize) => {
    setAnswers(prev => ({ ...prev, landSize }));
    setRecommendations(null);
    setStep(2);
  };

  const handleExperienceSelect = async (experience: Experience) => {
    setAnswers(prev => ({ ...prev, experience }));
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
      icon: Wheat,
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
  recommendations: WizardRecommendations;
  allPaths: LearningPath[];
  showAllPaths: boolean;
  onToggleShowAll: () => void;
  onSelectPath: (pathId: string) => void;
  isSelecting: boolean;
}) {
  const recommendedPath = recommendations.recommended.path;
  const RecommendedIcon = (Icons as any)[recommendedPath.icon_name] || Icons.BookOpen;

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
            const Icon = (Icons as any)[path.icon_name] || Icons.BookOpen;
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
