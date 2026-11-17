describe('Matching Flow', () => {
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

  function seedSession() {
    // Middleware gates protected routes on the fwber_auth cookie, which
    // must exist BEFORE the navigation request (see notifications.cy.js).
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/matches', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));
        win.EventSource = MockEventSource;
      }
    });
  }

  beforeEach(() => {
    cy.window().then((win) => {
      win.EventSource = MockEventSource;
    });

    // Fallback beneath the specifics (see friends-full.cy.js).
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');

    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'fake-token',
        token_type: 'Bearer',
        user: { id: 1, name: 'Test User', profile_complete: true }
      }
    }).as('login');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: user
    }).as('getMe');

    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: {
        data: { id: 1, name: 'Test User', profile_complete: true }
      }
    }).as('getUser');

    // Matches page reads a bare array or { matches } (both normalized).
    cy.intercept('GET', '**/api/matches*', {
      statusCode: 200,
      body: {
        matches: [
          {
            id: 2,
            name: 'Potential Match',
            bio: 'I like hiking',
            age: 25,
            locationDescription: 'New York, NY',
            avatarUrl: '/images/test-avatar.svg',
            compatibilityScore: 0.9,
            distance: 5
          },
          {
            id: 3,
            name: 'Another Match',
            bio: 'Coffee lover',
            age: 28,
            locationDescription: 'Brooklyn, NY',
            avatarUrl: '/images/test-avatar.svg',
            compatibilityScore: 0.85,
            distance: 10
          }
        ]
      }
    }).as('getMatches');

    cy.intercept('POST', '**/api/matches/action', {
      statusCode: 200,
      body: {
        action: 'like',
        is_match: false,
        message: 'Action recorded'
      }
    }).as('matchAction');

    // Mock WebSocket token endpoint to avoid 404s
    cy.intercept('GET', '**/api/websocket/token', {
      statusCode: 200,
      body: {
        token: 'mock-mercure-token',
        hub_url: 'http://localhost:3000/.well-known/mercure'
      }
    }).as('getWebsocketToken');
  });

  it('displays matches and allows swiping', () => {
    seedSession();

    cy.url().should('include', '/matches');
    cy.contains('Loading matches...').should('not.exist');

    cy.get('body').then($body => {
      if ($body.text().includes('No more matches')) {
        throw new Error('Matches list is empty, mock failed?');
      }
    });

    cy.contains('Potential Match', { timeout: 30000 }).should('be.visible');
    cy.contains('25').should('be.visible');
    cy.contains('I like hiking').should('be.visible');

    // Like button carries text-green-500 on the button itself now.
    cy.get('button.text-green-500').click({ force: true });

    cy.wait('@matchAction').its('request.body').should('deep.equal', {
      target_user_id: 2,
      action: 'like'
    });

    // Verify next card appears
    cy.contains('Another Match').should('be.visible');
  });

  it('shows match toast on mutual like', () => {
    cy.intercept('POST', '**/api/matches/action', {
      statusCode: 200,
      body: {
        action: 'like',
        is_match: true,
        message: "It's a match!"
      }
    }).as('mutualMatch');

    seedSession();

    cy.contains('Potential Match', { timeout: 30000 }).should('be.visible');
    cy.get('button.text-green-500').click({ force: true });

    cy.wait('@mutualMatch');

    // Verify toast appears
    cy.contains('You matched with Potential Match!', { timeout: 10000 }).should('be.visible');
  });
});
