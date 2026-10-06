import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://fwber.site'
  const now = new Date()

  // ── High-priority public pages ──
  const publicPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/roast`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/roast-date`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    {
      url: `${baseUrl}/rate-my-pussy`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: `${baseUrl}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/nearby`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${baseUrl}/recommendations`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    { url: `${baseUrl}/premium`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/events`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/venues`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/groups`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/topics`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/local-pulse`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/achievements`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/date-ideas`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/date-planner`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/deals`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/referrals`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/places`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]

  // ── Auth / account pages (lower priority, still crawlable) ──
  const authPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/reset-password`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // ── Static / legal / info pages ──
  const infoPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/feedback`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/safety`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  return [...publicPages, ...authPages, ...infoPages]
}
