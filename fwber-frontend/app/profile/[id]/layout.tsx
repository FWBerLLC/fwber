import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile | fwber',
  description: 'View a user profile.',
}

export default function ProfileIdLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
