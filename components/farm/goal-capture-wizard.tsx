"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { FarmerGoal } from "@/lib/db/schema";

interface GoalCaptureWizardProps {
  farmId: string;
  onComplete?: (goals: FarmerGoal[]) => void;
  onCancel?: () => void;
  initialGoals?: FarmerGoal[];
}

interface GoalForm {
  category: string;
  description: string;
  priority: number;
  targets: string | string[];
  timeline: string;
}

const GOAL_CATEGORIES = [
  { id: "income", label: "Income Generation", icon: "$" },
  { id: "food", label: "Food Production", icon: "🍎" },
  { id: "biodiversity", label: "Biodiversity", icon: "🌿" },
  { id: "soil", label: "Soil Health", icon: "🌱" },
  { id: "water", label: "Water Management", icon: "💧" },
  { id: "shelter", label: "Shelter/Privacy", icon: "🏠" },
  { id: "learning", label: "Learning/Education", icon: "🎓" },
  { id: "other", label: "Other", icon: "❓" },
];

const TIMELINE_OPTIONS = [
  { id: "short", label: "Short-term (1 year)", description: "Quick wins and immediate needs" },
  { id: "medium", label: "Medium-term (2-3 years)", description: "Major improvements and developments" },
  { id: "long", label: "Long-term (4+ years)", description: "Vision and legacy goals" },
];

export function GoalCaptureWizard({ 
  farmId, 
  onComplete, 
  onCancel, 
  initialGoals = [] 
}: GoalCaptureWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [goals, setGoals] = useState<GoalForm[]>([]);
  const [currentGoal, setCurrentGoal] = useState<GoalForm>({
    category: "",
    description: "",
    priority: 3,
    targets: "",
    timeline: "medium"
  });

  // Initialize with existing goals if provided
  useEffect(() => {
    if (initialGoals.length > 0) {
      const convertedGoals = initialGoals.map(goal => {
        // Convert targets from database format (JSON string or array) to UI format (comma-separated string)
        let targetsString = "";
        if (goal.targets) {
          try {
            const parsed = typeof goal.targets === 'string' ? JSON.parse(goal.targets) : goal.targets;
            targetsString = Array.isArray(parsed) ? parsed.join(', ') : "";
          } catch (e) {
            targetsString = typeof goal.targets === 'string' ? goal.targets : "";
          }
        }

        return {
          category: goal.goal_category,
          description: goal.description,
          priority: goal.priority || 3,
          targets: targetsString,
          timeline: goal.timeline || "medium"
        };
      });
      setGoals(convertedGoals);
    }
  }, [initialGoals]);

  const addGoal = () => {
    if (!currentGoal.category || !currentGoal.description.trim()) {
      toast.error("Please select a category and enter a description");
      return;
    }

    setGoals([...goals, { ...currentGoal }]);
    setCurrentGoal({
      category: "",
      description: "",
      priority: 3,
      targets: "",
      timeline: "medium"
    });
    toast.success("Goal added successfully");
  };

  const removeGoal = (index: number) => {
    const newGoals = [...goals];
    newGoals.splice(index, 1);
    setGoals(newGoals);
  };

  const handleSave = async () => {
    try {
      // Save goals to database
      const response = await fetch(`/api/farms/${farmId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: goals.map(goal => {
            // Handle targets - convert to array if it's a string, or use as-is if already an array
            let targetsArray: string[] = [];
            if (goal.targets) {
              if (typeof goal.targets === 'string') {
                targetsArray = goal.targets.split(',').map(t => t.trim()).filter(t => t.length > 0);
              } else if (Array.isArray(goal.targets)) {
                targetsArray = goal.targets;
              }
            }

            return {
              goal_category: goal.category,
              description: goal.description,
              priority: goal.priority,
              targets: targetsArray,
              timeline: goal.timeline
            };
          })
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to save goals");
      }

      toast.success("Goals saved successfully!");
      if (onComplete) {
        const savedGoals = await response.json();
        onComplete(savedGoals.goals);
      }
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save goals");
    }
  };

  const currentCategory = GOAL_CATEGORIES.find(c => c.id === currentGoal.category);

  return (
    <Card className="w-full max-w-4xl mx-auto border-0 shadow-none">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center text-sm font-semibold">
            {currentStep + 1}
          </div>
          <CardTitle className="text-2xl">
            {currentStep === 0
              ? "Define Your Permaculture Goals"
              : "Review & Save Your Goals"}
          </CardTitle>
        </div>
        <CardDescription className="text-base">
          Tell us what you want to achieve with your permaculture design. This will help the AI provide more relevant, personalized recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentStep === 0 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="category" className="text-base font-semibold">Goal Category</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {GOAL_CATEGORIES.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={currentGoal.category === category.id ? "default" : "outline"}
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 min-h-[80px]"
                    onClick={() => setCurrentGoal({...currentGoal, category: category.id})}
                  >
                    <span className="text-2xl leading-none">{category.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight break-words max-w-full">{category.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {currentCategory && (
              <div className="space-y-6 p-6 bg-accent/50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Goal Description
                  </Label>
                  <Textarea
                    id="description"
                    value={currentGoal.description}
                    onChange={(e) => setCurrentGoal({...currentGoal, description: e.target.value})}
                    placeholder={`Describe your ${currentCategory.label.toLowerCase()} goal in detail...`}
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about what you want to achieve
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targets" className="text-base font-semibold">
                    Specific Targets <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="targets"
                    value={currentGoal.targets}
                    onChange={(e) => setCurrentGoal({...currentGoal, targets: e.target.value})}
                    placeholder="Example: Produce 500 lbs of fruit annually, Generate $5000 in income, Create habitat for 10 bird species"
                    className="min-h-[90px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple targets with commas
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Priority Level</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-muted-foreground min-w-[40px]">Low</span>
                      <Slider
                        value={[currentGoal.priority]}
                        onValueChange={([value]) => setCurrentGoal({...currentGoal, priority: value})}
                        min={1}
                        max={5}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground min-w-[40px]">High</span>
                      <Badge variant="secondary" className="w-12 text-center font-semibold">
                        {currentGoal.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How important is this goal to you?
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="timeline" className="text-base font-semibold">Timeline</Label>
                    <Select
                      value={currentGoal.timeline}
                      onValueChange={(value) => setCurrentGoal({...currentGoal, timeline: value})}
                    >
                      <SelectTrigger id="timeline" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            <div className="py-1">
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      When do you want to achieve this?
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={addGoal}
                  className="w-full h-11 text-sm sm:text-base font-semibold"
                  disabled={!currentGoal.category || !currentGoal.description.trim()}
                >
                  <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">Add Goal to List</span>
                </Button>
              </div>
            )}

            {goals.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Goals</h3>
                  <Badge variant="secondary" className="text-sm">
                    {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {goals.map((goal, index) => {
                    const category = GOAL_CATEGORIES.find(c => c.id === goal.category);
                    return (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        <span className="text-2xl mt-0.5">{category?.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base">{category?.label}</div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              Priority {goal.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {TIMELINE_OPTIONS.find(t => t.id === goal.timeline)?.label?.split(' ')[0]}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGoal(index)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {goals.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={goals.length === 0}
                  className="sm:w-auto bg-primary"
                >
                  <span className="truncate">Review & Save Goals</span>
                  <CheckCircle2 className="ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-accent/30 p-6 rounded-lg border-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Summary of Your Goals
              </h3>
              <div className="space-y-4">
                {goals.map((goal, index) => {
                  const category = GOAL_CATEGORIES.find(c => c.id === goal.category);
                  return (
                    <div key={index} className="flex items-start gap-4 p-4 bg-background rounded-lg border shadow-sm">
                      <span className="text-2xl mt-0.5">{category?.icon}</span>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="font-semibold text-base">{category?.label}</span>
                          <Badge variant="secondary" className="font-semibold">
                            Priority {goal.priority}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{goal.description}</p>
                        {goal.targets && (
                          <div className="text-sm bg-accent/50 p-3 rounded border">
                            <span className="font-semibold text-muted-foreground">Specific Targets:</span>
                            <p className="mt-1">
                              {Array.isArray(goal.targets) ? goal.targets.join(', ') : goal.targets}
                            </p>
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {TIMELINE_OPTIONS.find(t => t.id === goal.timeline)?.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <p className="text-sm text-foreground flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>
                  These goals will help the AI assistant provide more personalized recommendations tailored to your specific objectives.
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(0)}
                className="sm:w-auto"
              >
                <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">Back to Edit</span>
              </Button>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="sm:w-auto bg-primary h-11 text-sm sm:text-base font-semibold"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">Save Goals</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}