import { getSession } from '@/lib/auth/session';
import { PlantsClient } from './plants-client';

export default async function PlantsPage() {
  const session = await getSession();
  return <PlantsClient isAuthenticated={!!session} />;
}
