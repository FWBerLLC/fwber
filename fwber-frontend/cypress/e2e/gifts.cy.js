describe('Gifting Flow', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    email_verified_at: '2026-01-01T00:00:00.000Z',
    token_balance: 100,
    profile: {
      displayName: 'Test User',
      avatarUrl: '/images/test-avatar.svg'
    }
  };

  const partner = {
    id: 2,
    name: 'Recipient User',
    profile: {
      displayName: 'Recipient User',
      avatarUrl: '/images/test-avatar.svg'
    }
  };

  const gifts = [
    { id: 1, name: 'Rose', cost: 10, icon_url: '/images/gifts/rose.svg' },
    { id: 2, name: 'Diamond', cost: 50, icon_url: '/images/gifts/diamond.svg' }
  ];

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

    // Mock login
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { access_token: 'fake-token', token_type: 'Bearer', user }
    }).as('login');

    // Mock user profile
    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: { data: user }
    }).as('getUser');

    // Mock available gifts + wallet (modal reads balance from /wallet)
    cy.intercept('GET', '**/api/gifts', {
      statusCode: 200,
      body: { data: gifts }
    }).as('getGifts');
    cy.intercept('GET', '**/api/wallet', {
      statusCode: 200,
      body: { balance: 100, tokens: 100, currency: 'FWB', transactions: [] }
    }).as('getWallet');

    // Mock partner profile (public-profile shape: fields at top level,
    // profile nested — a bare { data } wrapper leaves the page loading)
    cy.intercept('GET', '**/api/users/2', {
      statusCode: 200,
      body: {
        id: 2,
        name: 'Recipient User',
        email_verified: true,
        created_at: new Date().toISOString(),
        last_online: new Date().toISOString(),
        profile: {
          display_name: 'Recipient User',
          bio: 'Hello world',
          age: 25,
          gender: 'female',
          location: { latitude: null, longitude: null, max_distance: 25, city: 'New York', state: 'NY' },
          photos: [],
          preferences: {}
        },
        photos: []
      }
    }).as('getPartner');
    
    // Mock public profile (for /profile/2)
    cy.intercept('GET', '**/api/public-profile/2', {
      statusCode: 200,
      body: { 
        id: 2,
        profile: {
          display_name: 'Recipient User',
          age: 25,
          location: { city: 'New York', state: 'NY' },
          bio: 'Hello world',
          photos: []
        }
      }
    }).as('getPublicProfile');
  });

  it('allows sending a gift from profile', () => {
    seedVisit('/profile/2');

    // 1. Click Gift Button
    cy.contains('Send Gift').should('be.visible').click();

    // 2. Verify Gift Modal
    cy.contains('Send a Gift to Recipient User').should('be.visible');
    cy.contains('Rose').should('be.visible');
    
    // 3. Select Gift
    cy.contains('Rose').click();
    
    // 4. Enter Message
    cy.get('textarea[placeholder="Add a personal note..."]').type('A rose for you!');

    // 5. Mock Send API
    cy.intercept('POST', '**/api/gifts/send', {
      statusCode: 200,
      body: { success: true }
    }).as('sendGift');

    // 6. Send (modal submit carries the price; the profile pill behind
    // the overlay is also labelled Send Gift, so scope by full text)
    cy.contains('button', 'Send Gift (10 Tokens)').should('be.enabled').click();

    // 7. Verify Success: request shape + modal closes (toast is transient)
    cy.wait('@sendGift').its('request.body').should('deep.include', {
      receiver_id: 2,
      gift_id: 1,
      message: 'A rose for you!'
    });
    cy.contains('Send a Gift to Recipient User').should('not.exist');
  });

  it('shows error when insufficient tokens', () => {
    const poorUser = { ...user, token_balance: 5 };
    cy.intercept('GET', '**/api/wallet', {
      statusCode: 200,
      body: { balance: 5, tokens: 5, currency: 'FWB', transactions: [] }
    }).as('getPoorWallet');

    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/profile/2', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(poorUser));
      }
    });

    cy.contains('Send Gift').click();
    cy.contains('Rose').click();

    // With 5 tokens against a 10-token gift, Send stays disabled.
    cy.contains('button', 'Send Gift (10 Tokens)').should('be.disabled');
  });

  it('shows the notification bell on the dashboard', () => {
    // The old test simulated a Mercure EventSource gift event; realtime
    // moved to socket.io, so the durable surface is the header bell and
    // its panel. Live gift-toast behavior is covered by API batteries.
    cy.intercept('GET', '**/api/notifications*', {
      statusCode: 200,
      body: {
        notifications: [{
          id: 1,
          type: 'gift_received',
          title: 'Secret Admirer sent you a Rose!',
          message: 'Thinking of you!',
          is_read: false,
          created_at: new Date().toISOString()
        }]
      }
    }).as('getNotifications');

    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/dashboard', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));
      }
    });

    cy.get('svg.lucide-bell').should('exist');
  });
});
