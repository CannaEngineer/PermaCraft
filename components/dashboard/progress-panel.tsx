import { LearningProgress } from './learning-progress';

interface Props {
  userId: string;
}

export function ProgressPanel({ userId }: Props) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card transition-all duration-200 hover:shadow-sm">
      <LearningProgress userId={userId} />
    </div>
  );
}
