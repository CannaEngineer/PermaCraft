'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface LessonQuizProps {
  quiz: QuizQuestion[];
}

export function LessonQuiz({ quiz }: LessonQuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(quiz.length).fill(null)
  );
  const [showAnswers, setShowAnswers] = useState(false);

  const handleSelectAnswer = (questionIdx: number, optionIdx: number) => {
    if (showAnswers) return; // Don't allow changes after checking answers

    const newAnswers = [...selectedAnswers];
    newAnswers[questionIdx] = optionIdx;
    setSelectedAnswers(newAnswers);
  };

  const handleCheckAnswers = () => {
    setShowAnswers(true);
  };

  const handleReset = () => {
    setSelectedAnswers(new Array(quiz.length).fill(null));
    setShowAnswers(false);
  };

  const allAnswered = selectedAnswers.every((answer) => answer !== null);
  const correctCount = selectedAnswers.filter(
    (answer, idx) => answer === quiz[idx].correct
  ).length;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Knowledge Check</CardTitle>
          {showAnswers && (
            <div className="text-sm font-medium">
              Score: {correctCount}/{quiz.length}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {quiz.map((q, qIdx) => {
            const selectedAnswer = selectedAnswers[qIdx];
            const isCorrect = selectedAnswer === q.correct;
            const showFeedback = showAnswers && selectedAnswer !== null;

            return (
              <div key={qIdx} className="border-b last:border-0 pb-4 last:pb-0">
                <p className="font-medium mb-3">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedAnswer === optIdx;
                    const isCorrectAnswer = optIdx === q.correct;
                    const shouldHighlightCorrect = showAnswers && isCorrectAnswer;
                    const shouldShowWrong = showAnswers && isSelected && !isCorrect;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(qIdx, optIdx)}
                        disabled={showAnswers}
                        className={cn(
                          'w-full text-left p-3 rounded border transition-colors',
                          showAnswers ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/80',
                          isSelected && !showAnswers && 'bg-primary/10 border-primary',
                          shouldHighlightCorrect &&
                            'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
                          shouldShowWrong &&
                            'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
                          !isSelected && !shouldHighlightCorrect && 'bg-muted/50'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                              isSelected && !showAnswers && 'border-primary bg-primary',
                              shouldHighlightCorrect && 'border-green-600 bg-green-600',
                              shouldShowWrong && 'border-red-600 bg-red-600'
                            )}
                          >
                            {(isSelected || shouldHighlightCorrect) && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="flex-1">{option}</span>
                        </div>
                        {shouldHighlightCorrect && (
                          <p className="text-sm text-green-700 dark:text-green-300 mt-2 ml-7 italic">
                            ✓ {q.explanation}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          {!showAnswers ? (
            <Button
              onClick={handleCheckAnswers}
              disabled={!allAnswered}
              className="w-full"
            >
              {allAnswered ? 'Check Answers' : `Select all answers (${selectedAnswers.filter(a => a !== null).length}/${quiz.length})`}
            </Button>
          ) : (
            <>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Try Again
              </Button>
              {correctCount === quiz.length && (
                <div className="flex-1 flex items-center justify-center bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md px-4 py-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    🎉 Perfect score!
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
