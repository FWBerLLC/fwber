import { Metadata } from 'next'
import { VouchClient } from './vouch-client'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const code = params.code

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site/api'
    const res = await fetch(`${apiUrl}/auth/referral/${code}`, { next: { revalidate: 60 } })

    if (res.ok) {
        const data = await res.json()
        if (data.valid) {
            return {
                title: `Do you trust ${data.referrer_name}? - fwber`,
                description: `Vouch for ${data.referrer_name} on fwber. Is this person Safe, Fun, or Hot? Verify their reputation now.`,
                openGraph: {
                    title: `Do you trust ${data.referrer_name}?`,
                    description: `Vouch for ${data.referrer_name} on fwber. Verify their reputation now.`,
                    images: data.referrer_avatar ? [data.referrer_avatar] : [],
                },
                twitter: {
                    card: 'summary_large_image',
                    title: `Do you trust ${data.referrer_name}?`,
                    description: `Vouch for ${data.referrer_name} on fwber.`,
                    images: data.referrer_avatar ? [data.referrer_avatar] : [],
                }
            }
        }
    }
  } catch (e) {
    console.error('Metadata fetch error', e)
  }

  return {
    title: 'Vouch for a Friend - fwber',
    description: 'Help your friends build their reputation on fwber.',
  }
}

export default async function VouchPage(props: Props) {
  const params = await props.params;
  return <VouchClient code={params.code} />
}
