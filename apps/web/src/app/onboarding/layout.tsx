import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

type SessionMetadata = {
  onboardingComplete?: boolean;
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Move the auth() call inside the component function
  const { sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata as SessionMetadata) || {};

  if (metadata.onboardingComplete === true) {
    redirect('/dashboard')
  }

  return <>{children}</>
}