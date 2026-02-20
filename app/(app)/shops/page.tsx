import { getSession } from '@/lib/auth/session';
import { ShopsClient } from './shops-client';

export default async function ShopsPage() {
  const session = await getSession();
  return <ShopsClient isAuthenticated={!!session} />;
}
