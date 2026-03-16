import { LearningProgress } from './learning-progress';

interface Props {
  userId: string;
}

export function ProgressPanel({ userId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-xs font-bold text-foreground">Your Progress</h3>
      </div>
      <div className="p-3">
        <LearningProgress userId={userId} />
      </div>
    </div>
  );
}
