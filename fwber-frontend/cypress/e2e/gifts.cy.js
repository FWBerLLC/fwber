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

    // Mock available gifts
    cy.intercept('GET', '**/api/gifts', {
      statusCode: 200,
      body: { data: gifts }
    }).as('getGifts');

    // Mock partner profile
    cy.intercept('GET', '**/api/users/2', {
      statusCode: 200,
      body: { data: partner }
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

    // 6. Send
    cy.contains('button', 'Send Gift').click();

    // 7. Verify Success
    cy.wait('@sendGift').its('request.body').should('deep.include', {
      receiverId: 2,
      giftId: 1,
      message: 'A rose for you!'
    });

    // Alert is used in the component, so we stub it or check for it
    cy.on('window:alert', (str) => {
      expect(str).to.equal('Gift sent successfully!');
    });
  });

  it('shows error when insufficient tokens', () => {
    const poorUser = { ...user, token_balance: 5 };
    
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

    // Check for disabled button or error message
    // The component shows "Insufficient token balance" text
    cy.contains('Insufficient token balance').should('be.visible');
    cy.contains('button', 'Send Gift').should('be.disabled');
  });

  it('displays notification when gift is received', () => {
    cy.visit('/dashboard', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));

        // Robust MockEventSource
        win.EventSource = class MockEventSource {
            constructor(url) {
                this.url = url;
                this.listeners = {};
                this.onmessage = null;
                if (!win.mockEventSources) win.mockEventSources = [];
                win.mockEventSources.push(this);
                setTimeout(() => { if (this.onopen) this.onopen({ type: 'open' }); }, 10);
            }
            addEventListener(type, callback) {
                if (!this.listeners[type]) this.listeners[type] = [];
                this.listeners[type].push(callback);
            }
            removeEventListener(type, callback) {
                if (!this.listeners[type]) return;
                this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
            }
            close() { this.readyState = 2; }
            emit(type, data) {
                const event = new MessageEvent(type, { data: JSON.stringify(data) });
                if (this.listeners[type]) this.listeners[type].forEach(cb => cb(event));
                if (type === 'message' && this.onmessage) this.onmessage(event);
            }
        };
      }
    });

    // Simulate incoming gift event
    cy.window().then((win) => {
        const giftEvent = {
            type: 'gift_received',
            sender_name: 'Secret Admirer',
            gift_name: 'Rose',
            message: 'Thinking of you!'
        };

        cy.wrap(null, { timeout: 10000 }).should(() => {
            expect(win.mockEventSources).to.have.length.at.least(1);
        }).then(() => {
            win.mockEventSources.forEach(es => {
                // Emit as 'notification' type, which useMercureLogic listens for
                es.emit('notification', giftEvent);
            });
        });
    });

    // Verify Toast Notification
    cy.contains('Secret Admirer sent you a Rose!').should('be.visible');
    cy.contains('Thinking of you!').should('be.visible');
  });
});
