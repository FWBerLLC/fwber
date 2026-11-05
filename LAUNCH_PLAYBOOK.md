# fwber Launch Playbook
## Dating Platform — Go-to-Market Checklist

**Pricing (Robert's Decision):**
- Founding: $200 (lifetime early adopter)
- Trial: $1.99 (7-day)
- Subscription: $5/month
- Target: 1,000 users in 90 days

---

## Pre-Launch (Week 1-2)

### Technical
- [ ] Production deployment on Hetzner (hypernexus.site infra)
- [ ] SSL + CDN setup (Cloudflare)
- [ ] Payment integration (Stripe: $200 founding / $1.99 trial / $5 sub)
- [ ] User registration + onboarding flow
- [ ] Profile creation + photo upload
- [ ] Matching algorithm validation
- [ ] Real-time messaging (WebSocket)
- [ ] Push notifications (mobile + web)
- [ ] Email verification + password reset
- [ ] Admin dashboard + moderation tools
- [ ] Analytics integration (Mixpanel/PostHog)

### Legal
- [ ] Terms of Service
- [ ] Privacy Policy (GDPR/CCPA)
- [ ] Community Guidelines
- [ ] Age verification (18+)
- [ ] DMCA / content policy

### Brand
- [ ] Landing page + hero messaging
- [ ] App store screenshots (iOS/Android)
- [ ] Press kit + founder story
- [ ] Social accounts (@fwber)
- [ ] Launch video (1-2 min)

---

## Launch (Week 3-4)

### Marketing Channels
1. **Product Hunt** — launch day #1
2. **Hacker News** — Show HN post
3. **Reddit** — r/dating, r/technology, r/startups
4. **Twitter/X** — founder build-in-public thread
5. **TikTok** — Bob & Lum personality content
6. **Instagram** — dating tips + product shots
7. **YouTube** — demo + testimonial videos

### Launch Sequence
1. Teaser posts (2 weeks before)
2. Waitlist landing page (target: 500 signups)
3. Product Hunt launch (Tuesday 12:01am PT)
4. HN Show HN (Wednesday)
5. Reddit posts (Thursday)
6. Social media blitz (all week)
7. Influencer outreach (dating coaches)

---

## Post-Launch (Week 5-12)

### Growth Tactics
- Referral program: invite 3 friends = 1 month free
- Founding member badge ($200 tier)
- Success story features
- Local events (city-based)
- Partnership with dating coaches

### Metrics to Track
- DAU/MAU ratio
- Match rate
- Message response rate
- Trial → paid conversion (target: 25%)
- Churn rate (target: <10%/mo)
- NPS score
- Revenue MRR

### Revenue Projection
| Month | Users | MRR | Notes |
|-------|-------|-----|-------|
| 1 | 200 | $1,000 | Founding + trials |
| 2 | 500 | $2,500 | Word of mouth |
| 3 | 1,000 | $5,000 | Product Hunt wave |
| 6 | 5,000 | $25,000 | Growth engine |
| 12 | 15,000 | $75,000 | Established |

---

## Technical Stack
- **Frontend:** React Native (iOS + Android) + Next.js (web)
- **Backend:** Node.js + PostgreSQL + Redis
- **Real-time:** Socket.io / WebSocket
- **Storage:** S3-compatible (Hetzner Object Storage)
- **CDN:** Cloudflare
- **Payments:** Stripe
- **Analytics:** PostHog (self-hosted)
- **Email:** Resend / SendGrid
- **Push:** Firebase Cloud Messaging

---

*fwber v2.3.39 — ready for launch preparation*
