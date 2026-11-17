describe('Profile Boosts', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    emailVerifiedAt: new Date().toISOString(),
    onboarding_completed_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    token_balance: 1000,
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

  function seedSession() {
    // Middleware cookie before navigation (see notifications.cy.js).
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/boosts', {
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

    cy.intercept('GET', '**/api/wallet', {
      statusCode: 200,
      body: { balance: 1000, tokens: 1000, currency: 'FWB', transactions: [] }
    }).as('getWallet');

    cy.intercept('GET', '**/api/boosts/active', {
      statusCode: 200,
      body: { data: null }
    }).as('getBoostStatus');

    cy.intercept('GET', '**/api/boosts/history', {
      statusCode: 200,
      body: []
    }).as('getBoostHistory');
  });

  it('allows purchasing a profile boost', () => {
    seedSession();

    cy.contains('No active boost right now.').should('be.visible');
    cy.contains('button', 'Buy a Boost').click();
    cy.contains('Boost Your Profile').should('be.visible');

    cy.intercept('POST', '**/api/boosts/purchase', {
      statusCode: 200,
      body: { success: true, boost: { id: 9, boost_type: 'standard', status: 'active' } }
    }).as('purchaseBoost');

    cy.intercept('GET', '**/api/boosts/active', {
      statusCode: 200,
      body: {
        data: {
          id: 9,
          user_id: 1,
          boost_type: 'standard',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60000).toISOString()
        }
      }
    }).as('getBoostStatusActive');

    cy.contains('button', 'Standard Boost').click();

    // The v2.3.103 contract: camelCase paymentMethod, canonical type.
    cy.wait('@purchaseBoost').its('request.body').should('deep.equal', {
      type: 'standard',
      paymentMethod: 'token'
    });

    // Durable proof over the transient toast: the Active Boost card flips.
    // (DOM text is 'Standard Boost'; the uppercase look is CSS transform.)
    cy.contains('Standard Boost').should('be.visible');
    cy.contains('Status: active').should('be.visible');
  });
});
