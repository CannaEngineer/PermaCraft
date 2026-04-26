import { LearningProgress } from './learning-progress';

interface Props {
  userId: string;
}

export function ProgressPanel({ userId }: Props) {
  return <LearningProgress userId={userId} />;
}
