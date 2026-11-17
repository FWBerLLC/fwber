describe('Notification Settings', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    email_verified_at: '2026-01-01T00:00:00.000Z',
    profile: { displayName: 'Test User' }
  };

  const preferences = [
    {
      type: 'match_new',
      label: 'New Matches',
      mail: true,
      push: false,
      database: true
    },
    {
      type: 'message_new',
      label: 'New Messages',
      mail: false,
      push: true,
      database: true
    }
  ];

  beforeEach(() => {
    // Fallback beneath the specifics (see friends-full.cy.js): unmocked
    // calls must not reach the real API with the mock token.
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');
    cy.intercept('GET', '**/api/notification-preferences', { statusCode: 200, body: preferences }).as('getPreferences');

    // Middleware gates /settings/* on the fwber_auth cookie, which must
    // exist BEFORE the navigation request — setting it in onBeforeLoad is
    // too late for the document request itself. Visit a cheap page first,
    // plant the cookie, then navigate with storage seeded.
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/settings/notifications', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));
      }
    });
  });

  it('displays current preferences', () => {
    cy.wait('@getPreferences');

    // CardTitle is not an h3 in the current shadcn Card — scope by text.
    cy.contains('New Matches').parents('.border').first().within(() => {
      // Email should be checked
      cy.contains('p', 'Email Notifications').parents('.justify-between').find('button[role="switch"]').should('have.attr', 'aria-checked', 'true');
      // Push should be unchecked
      cy.contains('p', 'Push Notifications').parents('.justify-between').find('button[role="switch"]').should('have.attr', 'aria-checked', 'false');
    });
  });

  it('allows updating preferences', () => {
    cy.intercept('PUT', '**/api/notification-preferences/match_new', {
      statusCode: 200,
      body: {
        type: 'match_new',
        label: 'New Matches',
        mail: true,
        push: true, // Toggled to true
        database: true
      }
    }).as('updatePreference');

    // Toggle Push for New Matches
    cy.contains('New Matches').parents('.border').first().within(() => {
      cy.contains('p', 'Push Notifications').parents('.justify-between').find('button[role="switch"]').click();
    });

    cy.wait('@updatePreference').its('request.body').should('deep.equal', {
      push: true
    });
  });
});
