import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farm Tour - Permaculture.Studio',
  description: 'Self-guided AI-powered farm tour experience',
};

export default function TourLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
