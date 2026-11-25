describe('Achievements (gamification v2)', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    emailVerifiedAt: new Date().toISOString(),
    onboarding_completed_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Test User',
      dateOfBirth: '1990-01-01',
      gender: 'non-binary',
      pronouns: 'they/them',
      sexualOrientation: 'pansexual',
      relationshipStyle: 'polyamorous',
      bio: 'Test bio',
      locationLatitude: 40.7128,
      locationLongitude: -74.0060,
      locationDescription: 'New York, NY',
      stiStatus: 'negative',
      preferences: {},
      avatarUrl: '/images/test-avatar.svg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  const payload = {
    achievements: [
      { id: 1, slug: 'profile_verified', name: 'Verified Human', description: 'Verify your email address', icon: '✅', category: 'Profile', token_reward: 50, earned: true, earned_at: new Date().toISOString(), progress: { current: 1, target: 1, pct: 100 } },
      { id: 6, slug: 'first_message', name: 'Icebreaker', description: 'Send your first message', icon: '💬', category: 'Conversation', token_reward: 10, earned: true, earned_at: new Date().toISOString(), progress: { current: 1, target: 1, pct: 100 } },
      { id: 8, slug: 'chatter_100', name: 'Centurion of Chat', description: 'Send 100 messages', icon: '💯', category: 'Conversation', token_reward: 75, earned: false, earned_at: null, progress: { current: 40, target: 100, pct: 40 } },
    ],
    total: 30,
    earned: 2,
    xp: 60,
    level: { level: 2, title: 'Explorer', xp: 60, floor_xp: 40, next_level_xp: 100, progress_pct: 33 },
  };

  function seedVisit(path) {
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit(path, {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));
      }
    });
  }

  beforeEach(() => {
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/achievements', { statusCode: 200, body: payload }).as('getAchievements');
  });

  it('shows level, XP, earned state and progress toward locked achievements', () => {
    seedVisit('/achievements');
    cy.wait('@getAchievements');

    // Level card
    cy.contains('Level 2 · Explorer').should('be.visible');
    cy.contains('60 XP').should('be.visible');
    cy.contains('40 XP to level 3').should('be.visible');

    // Unlocked summary count comes from `earned`, not the legacy alias.
    cy.contains('2/30').should('be.visible');

    // Earned badge + locked progress bar with current/target.
    cy.contains('Verified Human').should('be.visible');
    cy.contains('Centurion of Chat').should('be.visible');
    cy.contains('40/100').should('be.visible');
    cy.get('[role="progressbar"][aria-label="Progress toward Centurion of Chat"]')
      .should('have.attr', 'aria-valuenow', '40');
  });
});
