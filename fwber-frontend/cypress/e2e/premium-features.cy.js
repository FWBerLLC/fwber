describe('Premium Features', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    emailVerifiedAt: new Date().toISOString(),
    onboarding_completed_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    token_balance: 1000,
    tier: 'free',
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

  function seedSession(path) {
    // Middleware cookie must precede navigation (see notifications.cy.js).
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
    // Fallback beneath the specifics (see friends-full.cy.js).
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');

    // Modal reads the token balance from /wallet.
    cy.intercept('GET', '**/api/wallet', {
      statusCode: 200,
      body: { balance: 1000, tokens: 1000, currency: 'FWB', transactions: [] }
    }).as('getWallet');

    // Mock premium status (default: free)
    cy.intercept('GET', '**/api/premium/status', {
      statusCode: 200,
      body: { is_premium: false, tier: 'free', plan: 'free' }
    }).as('getPremiumStatus');
  });

  it('prompts upgrade and unlocks features upon purchase', () => {
    // Mock who-likes-you (locked)
    cy.intercept('GET', '**/api/premium/who-likes-you', {
      statusCode: 403,
      body: { message: 'Premium required' }
    }).as('getWhoLikesYouLocked');

    seedSession('/premium');

    cy.contains('Upgrade to Gold').should('be.visible');

    // Mock purchase + post-purchase status (later definitions win)
    cy.intercept('POST', '**/api/premium/purchase', {
      statusCode: 200,
      body: { success: true, plan: 'gold' }
    }).as('purchasePremium');

    cy.intercept('GET', '**/api/premium/status', {
      statusCode: 200,
      body: { is_premium: true, tier: 'gold', plan: 'gold' }
    }).as('getPremiumStatusGold');

    // Mock who-likes-you (unlocked)
    cy.intercept('GET', '**/api/premium/who-likes-you', {
      statusCode: 200,
      body: { users: [{ id: 2, name: 'Admirer', avatarUrl: '/images/test-avatar.svg' }] }
    }).as('getWhoLikesYouUnlocked');

    // Open the upgrade modal and pay with FWB tokens (token tab is default)
    cy.contains('button', 'Upgrade to Gold').click();
    cy.contains('button', 'Upgrade for 500 Tokens').click();
    cy.wait('@purchasePremium');

    // Verify UI update (status refetch flips to premium)
    cy.contains('Premium Active', { timeout: 10000 }).should('be.visible');

    // Navigate to Who Likes You
    seedSession('/who-likes-you');
    cy.wait('@getWhoLikesYouUnlocked');
    cy.contains('Admirer').should('be.visible');
  });
});
