describe('User Reporting Flow', () => {
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
    },
    token_balance: 100
  };

  const match = {
    id: 2,
    name: 'Potential Match',
    bio: 'I like hiking',
    age: 25,
    locationDescription: 'New York, NY',
    avatarUrl: '/images/test-avatar.svg',
    compatibilityScore: 0.9,
    distance: 5,
    is_verified: true,
    photos: [{ id: 2, url: '/images/test-avatar.svg', is_private: false, is_primary: true }]
  };

  function seedVisit(path) {
    // Middleware cookie before navigation (see notifications.cy.js).
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
    cy.intercept('GET', '**/api/share-unlock/*', { statusCode: 200, body: { unlocked: false } }).as('getShareUnlock');
    cy.intercept('GET', '**/api/subscriptions/creator/*', { statusCode: 200, body: { is_subscribed: false } }).as('checkSubscription');
    cy.intercept('GET', '**/api/matches*', { statusCode: 200, body: { matches: [match] } }).as('getMatches');
    cy.intercept('GET', `**/api/matches/${match.id}/insights`, {
      statusCode: 200,
      body: { data: { total_score: 85, is_locked: true, cost: 10, preview_message: 'Unlock for 10 tokens.' } }
    }).as('getInsights');
  });

  it('allows reporting a user from their profile modal', () => {
    cy.intercept('POST', '**/api/reports', {
      statusCode: 201,
      body: { data: { id: 9, reporter_id: 1, accused_id: match.id, reason: 'Harassment', status: 'pending' } }
    }).as('submitReport');

    seedVisit('/matches');
    cy.contains('Potential Match').should('be.visible');
    cy.get('button:has(svg.lucide-info)').click();
    cy.contains('AI Compatibility Report').should('be.visible');

    // Report entry point inside the profile modal.
    cy.contains('button', 'Report').click();
    cy.contains('Report Potential Match').should('be.visible');

    cy.get('#report-reason').select('Harassment');
    cy.get('#report-details').type('This user sent mean messages.');
    cy.contains('button', 'Submit Report').click();

    // Current contract: POST /reports { accused_id, reason, details }.
    cy.wait('@submitReport').its('request.body').should('deep.include', {
      accused_id: match.id,
      reason: 'Harassment',
      details: 'This user sent mean messages.'
    });
    cy.contains('Thanks, our team will review this profile.').should('be.visible');
  });

  it('allows blocking a user from their profile modal', () => {
    cy.intercept('POST', '**/api/blocks', {
      statusCode: 201,
      body: { data: { id: 5, blocker_id: 1, blocked_id: match.id } }
    }).as('blockUser');

    seedVisit('/matches');
    cy.contains('Potential Match').should('be.visible');
    cy.get('button:has(svg.lucide-info)').click();
    cy.contains('AI Compatibility Report').should('be.visible');

    cy.contains('button', 'Block').click();
    // Confirm dialog from the shared confirm hook (title "Block User").
    cy.contains('Block User').should('be.visible');
    cy.get('[role="dialog"]').last().within(() => {
      cy.contains('button', 'Block').click();
    });

    cy.wait('@blockUser').its('request.body').should('include', {
      blocked_id: match.id
    });
    cy.contains('User has been blocked.').should('be.visible');
  });
});
