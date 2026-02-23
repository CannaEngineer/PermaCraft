import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { CheckoutClient } from './checkout-client';

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return <CheckoutClient userId={session.user.id} userName={session.user.name} />;
}
