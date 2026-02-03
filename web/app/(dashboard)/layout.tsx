import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect('/login');

  return (
    <AppShell
      user={{
        email: user.email,
        name: user.name,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
