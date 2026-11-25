describe('Venue Check-in System', () => {
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
      preferences: {},
      avatarUrl: '/images/test-avatar.svg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  const venues = [
    { id: 1, name: 'The Golden Bar', description: 'A fancy bar downtown', address: '123 Main St', city: 'New York', state: 'NY', zip: '10001', latitude: 40.7128, longitude: -74.0060 },
    { id: 2, name: 'Club Neon', description: 'Late night dance club', address: '456 Broadway', city: 'New York', state: 'NY', zip: '10002', latitude: 40.7138, longitude: -74.0070 }
  ];

  const activeCheckin = {
    id: 101,
    user_id: 1,
    venue_id: 1,
    venue: venues[0],
    message: 'Hanging out!',
    checked_out_at: null,
    created_at: new Date().toISOString()
  };

  function seedVisit(path) {
    // Middleware cookie before navigation (see notifications.cy.js).
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit(path, {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));
        // The venues page only loads after browser geolocation resolves.
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) =>
          cb({ coords: { latitude: 40.7128, longitude: -74.0060 } })
        );
      }
    });
  }

  // The page refetches current-checkin immediately after each mutation,
  // so the stub must answer from live test state, not a static body.
  let checkinState = null;

  beforeEach(() => {
    checkinState = null;
    // Fallback beneath the specifics (see friends-full.cy.js).
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');
    cy.intercept('GET', '**/api/venues/current-checkin', (req) => {
      req.reply({ statusCode: 200, body: { checkin: checkinState } });
    }).as('getCheckin');
    cy.intercept('GET', '**/api/venues*', { statusCode: 200, body: { data: venues } }).as('getVenues');
    cy.intercept('POST', '**/api/venues/1/checkin', {
      statusCode: 200,
      body: { message: 'Checked in successfully', checkin: activeCheckin }
    }).as('checkIn');
    cy.intercept('POST', '**/api/venues/1/checkout', {
      statusCode: 200,
      body: { message: 'Checked out successfully' }
    }).as('checkOut');
  });

  it('displays venues and allows check-in/check-out', () => {
    seedVisit('/venues');
    cy.wait('@getVenues');
    cy.contains('The Golden Bar').should('be.visible');
    cy.contains('Club Neon').should('be.visible');
    cy.contains('New York, NY').should('be.visible');

    // Check-in now happens through a modal (no window.prompt).
    cy.contains('h2', 'The Golden Bar').parents('.bg-card, .bg-white').first().contains('button', 'Check In').click();
    cy.contains('Check In at The Golden Bar').should('be.visible');
    cy.get('input[placeholder*="Sitting near the patio"]').type('Hanging out!');
    cy.then(() => { checkinState = activeCheckin; });
    cy.contains('button', 'Confirm Check-In').click();

    cy.wait('@checkIn').its('request.body').should('include', { message: 'Hanging out!' });

    cy.contains('Checked in at:').should('be.visible');
    cy.contains('Hanging out!').should('be.visible');
    cy.contains('h2', 'The Golden Bar').parents('.bg-card, .bg-white').first().contains('Checked In').should('be.visible');

    // Check out: current-checkin flips back to null on refetch.
    cy.then(() => { checkinState = null; });
    cy.contains('button', 'Check Out').click();
    cy.wait('@checkOut');
    cy.contains('Checked in at:').should('not.exist');
  });
});
