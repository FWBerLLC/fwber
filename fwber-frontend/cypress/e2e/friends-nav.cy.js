describe('Navigation', () => {
  const testUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    email_verified_at: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    // Fallback beneath the specifics: unmocked calls must not reach the
    // real API with the mock token (client 401 -> session_expired).
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');

    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'mock-jwt-token',
        token_type: 'Bearer',
        user: testUser
      }
    }).as('login');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: testUser
    }).as('getMe');

    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: testUser
    }).as('getUser');

    cy.intercept('GET', '**/api/matches*', {
      statusCode: 200,
      body: {
        matches: [
          {
            id: 2,
            compatibilityScore: 0.9,
            profile: {
              display_name: 'Match User',
              photos: [{ url: '/placeholder.jpg' }],
              age: 25,
              location: { city: 'New York', state: 'NY' }
            }
          }
        ],
        total: 1
      }
    }).as('getMatches');

    // Friends page data (Pillar 5: connections + private interests).
    cy.intercept('GET', '**/api/friends', { statusCode: 200, body: [] }).as('getFriends');
    cy.intercept('GET', '**/api/friends/interests', { statusCode: 200, body: [] }).as('getInterests');
    cy.intercept('GET', '**/api/relationship-links', { statusCode: 200, body: { links: [] } }).as('getLinks');
    cy.intercept('GET', '**/api/relationship-links/requests', { statusCode: 200, body: { requests: [] } }).as('getLinkRequests');
  });

  it('should navigate to the friends page', () => {
    // Login flow
    cy.visit('/login');
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait('@login');

    // Wait for redirect to dashboard to ensure auth state is processed and saved
    cy.url().should('include', '/dashboard');

    // Now visit matches
    cy.visit('/matches');
    cy.wait('@getMatches');

    // Ensure loading is done
    cy.get('.animate-spin').should('not.exist');

    // Check for the link
    cy.get('a[href*="friends"]').should('be.visible').click();
    cy.url().should('include', '/friends');
    cy.get('h1').should('contain', 'Friends');
  });
});
