describe('Friends Feature (Pillar 5: No Rejection State)', () => {
  const testUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    // Returning, fully onboarded user — otherwise the app gates to /onboarding.
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    email_verified_at: '2026-01-01T00:00:00.000Z'
  };

  const friendUser = {
    id: 2,
    name: 'Friend User',
    email: 'friend@example.com',
    profile_photo_url: '/placeholder.jpg'
  };

  const interestUser = {
    id: 3,
    name: 'Interest User',
    email: 'interest@example.com',
    profile_photo_url: '/placeholder.jpg'
  };

  const searchUser = {
    id: 4,
    name: 'Search User',
    email: 'search@example.com',
    profile_photo_url: '/placeholder.jpg'
  };

  // Mock EventSource to prevent real connection attempts
  class MockEventSource {
    constructor(url) {
      this.url = url;
      this.readyState = 0; // CONNECTING
      setTimeout(() => {
        this.readyState = 1; // OPEN
        if (this.onopen) this.onopen({ type: 'open' });
      }, 10);
    }
    close() {
      this.readyState = 2; // CLOSED
    }
    addEventListener() {}
    removeEventListener() {}
  }

  beforeEach(() => {
    // Inject MockEventSource
    cy.window().then((win) => {
      win.EventSource = MockEventSource;
    });

    // Fallback for every other API call the app fires on dashboard/friends
    // mount (stats, matches, notifications...). Without it, unmocked calls
    // reach the real API with the mock token, and the client's 401
    // interceptor redirects to /login?reason=session_expired. Cypress
    // matches intercepts in reverse definition order, so the specific
    // routes below still win over this fallback.
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');

    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'mock-jwt-token',
        token_type: 'Bearer',
        user: testUser
      }
    }).as('login');

    // Session restore validates against /auth/me (not /api/user); without
    // this intercept the mock token hits the real API and the app
    // redirects to /login?reason=session_expired.
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: testUser
    }).as('getMe');

    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: testUser
    }).as('getUser');

    // Pillar 5: connections are grandfathered/mutual only; there is no
    // incoming request list to accept or decline.
    cy.intercept('GET', '**/api/friends', {
      statusCode: 200,
      body: [friendUser]
    }).as('getFriends');

    cy.intercept('GET', '**/api/friends/interests', {
      statusCode: 200,
      body: [interestUser]
    }).as('getInterests');

    cy.intercept('GET', '**/api/relationship-links', {
      statusCode: 200,
      body: { links: [] }
    }).as('getRelationshipLinks');

    cy.intercept('GET', '**/api/relationship-links/requests', {
      statusCode: 200,
      body: { requests: [] }
    }).as('getRelationshipLinkRequests');

    cy.intercept('GET', '**/api/friends/search*', {
      statusCode: 200,
      body: [searchUser]
    }).as('searchFriends');

    // Interest is unilateral and private: no mutual match yet.
    cy.intercept('POST', '**/api/friends/interest', {
      statusCode: 200,
      body: { mutual: false, connected: false }
    }).as('expressInterest');

    cy.intercept('DELETE', '**/api/friends/interest/*', {
      statusCode: 200,
      body: { ok: true }
    }).as('withdrawInterest');

    // Mock WebSocket token endpoint to avoid 404s
    cy.intercept('GET', '**/api/websocket/token', {
      statusCode: 200,
      body: {
        token: 'mock-mercure-token',
        hub_url: 'http://localhost:3000/.well-known/mercure'
      }
    }).as('getWebsocketToken');
  });

  function loginAndVisitFriends() {
    cy.visit('/login');
    cy.window().then((win) => {
      win.EventSource = MockEventSource;
    });

    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait('@login');

    cy.url().should('include', '/dashboard');

    cy.visit('/friends');
    cy.window().then((win) => {
      win.EventSource = MockEventSource;
    });

    cy.wait('@getFriends');
    cy.wait('@getInterests');
  }

  it('should list connections and private interests, with no request inbox', () => {
    loginAndVisitFriends();

    // Connections tab is the default view.
    cy.contains('Connections (1)').should('be.visible');
    cy.contains(friendUser.name).should('be.visible');

    // Interested tab holds only the viewer's own private interests.
    cy.contains('button', 'Interested (1)').click();
    cy.contains(interestUser.name).should('be.visible');
    cy.contains('only told if the interest becomes mutual').should('be.visible');

    // Pillar 5: no Accept/Decline friend-request UI exists anymore.
    cy.contains('button', 'Accept').should('not.exist');
    cy.contains('button', 'Decline').should('not.exist');
  });

  it('should search and express private interest', () => {
    loginAndVisitFriends();

    cy.get('input[placeholder="Search users..."]').type('Search{enter}');
    cy.wait('@searchFriends');

    cy.contains(searchUser.name).should('be.visible');

    // Exact match: the tabs above also contain an "Interested (n)" button.
    cy.contains('button', /^Interested$/).click();
    cy.wait('@expressInterest')
      .its('request.body')
      .should('deep.equal', { friend_id: searchUser.id });

    cy.contains('Interest saved privately').should('be.visible');
  });

  it('should withdraw an expressed interest silently', () => {
    loginAndVisitFriends();

    cy.contains('button', 'Interested (1)').click();
    cy.contains(interestUser.name).should('be.visible');

    cy.contains('button', 'Withdraw').click();
    cy.wait('@withdrawInterest');

    cy.contains(interestUser.name).should('not.exist');
  });
});
