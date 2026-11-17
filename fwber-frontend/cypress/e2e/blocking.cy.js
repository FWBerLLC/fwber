describe('User Blocking', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    email_verified_at: '2026-01-01T00:00:00.000Z',
    profile: { displayName: 'Test User' }
  };

  // Backend shape: block records carry blocked_id; the page maps them.
  const blockedUsers = [
    { id: 10, blocked_id: 2, name: 'Blocked User 1', avatar_url: '/images/test-avatar.svg', created_at: new Date().toISOString() },
    { id: 11, blocked_id: 3, name: 'Blocked User 2', avatar_url: '/images/test-avatar.svg', created_at: new Date().toISOString() }
  ];

  function seedSession() {
    // Middleware cookie before navigation (see notifications.cy.js).
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/settings/blocked', {
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
    cy.intercept('GET', '**/api/blocks', { statusCode: 200, body: { data: blockedUsers } }).as('getBlockedUsers');
  });

  it('displays list of blocked users', () => {
    seedSession();
    cy.wait('@getBlockedUsers');
    cy.contains('Blocked User 1').should('be.visible');
    cy.contains('Blocked User 2').should('be.visible');
  });

  it('allows unblocking a user', () => {
    cy.intercept('DELETE', '**/api/blocks/2', {
      statusCode: 200,
      body: { message: 'User unblocked successfully' }
    }).as('unblockUser');

    seedSession();
    cy.wait('@getBlockedUsers');

    cy.contains('Blocked User 1')
      .parents('li')
      .find('button')
      .contains('Unblock')
      .click();

    cy.contains('Are you sure you want to unblock this user?').should('be.visible');
    cy.contains('button', 'Confirm').click();

    cy.wait('@unblockUser');
    cy.contains('Blocked User 1').should('not.exist');
    cy.contains('Blocked User 2').should('be.visible');
  });
});
