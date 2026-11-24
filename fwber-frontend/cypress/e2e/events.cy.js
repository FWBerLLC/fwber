describe('Events', () => {
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

  const events = [
    {
      id: 1,
      title: 'Community Meetup',
      description: 'A casual meetup for the community.',
      location_name: 'Central Park',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      organizer_id: 2,
      attendees_count: 5,
      is_attending: false
    }
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
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');
    cy.intercept('GET', '**/api/events/invitations', { statusCode: 200, body: [] }).as('getInvitations');
    cy.intercept('GET', '**/api/events*', { statusCode: 200, body: { data: events, meta: {} } }).as('getEvents');
  });

  it('displays a list of events', () => {
    seedVisit('/events');

    cy.wait('@getEvents');
    cy.contains('Community Meetup').should('be.visible');
    cy.contains('Central Park').should('be.visible');
  });

  it('allows RSVPing to an event', () => {
    seedVisit('/events');
    cy.wait('@getEvents');

    cy.intercept('GET', '**/api/events/1', {
      statusCode: 200,
      body: { ...events[0], status: 'upcoming', attendees: [] }
    }).as('getEventDetails');

    cy.intercept('POST', '**/api/events/1/rsvp', {
      statusCode: 200,
      body: { success: true, status: 'attending' }
    }).as('rsvpEvent');

    // Click event title to go to details
    cy.contains('Community Meetup').click();

    cy.wait('@getEventDetails');

    // Click Attend
    cy.contains('button', 'Attend').click();

    cy.wait('@rsvpEvent').its('request.body').should('include', { status: 'attending' });
  });

  it('allows creating a new event', () => {
    seedVisit('/events/create');

    // Fill immediately on mount, then prove nothing is wiped: the root
    // layout's realtime provider used to swap its wrapper element when
    // auth resolved, remounting the page and discarding early input.
    cy.get('input[name="title"]').type('New Test Event');
    cy.get('textarea[name="description"]').type('Description for the new test event.');
    cy.get('input[name="location_name"]').type('Virtual');
    cy.get('input[name="latitude"]').type('40.7128');
    cy.get('input[name="longitude"]').type('-74.0060');
    cy.get('input[name="starts_at"]').type('2027-12-01T18:00');
    cy.get('input[name="ends_at"]').type('2027-12-01T20:00');
    cy.wait(2500);
    cy.get('input[name="title"]').should('have.value', 'New Test Event');
    cy.get('textarea[name="description"]').should('have.value', 'Description for the new test event.');
    cy.get('input[name="location_name"]').should('have.value', 'Virtual');

    cy.intercept('POST', '**/api/events', {
      statusCode: 201,
      body: {
        id: 2,
        title: 'New Test Event',
        description: 'Description for the new test event.',
        location_name: 'Virtual',
        starts_at: '2027-12-01T18:00:00Z',
        organizer_id: 1
      }
    }).as('createEvent');

    cy.contains('button', 'Create Event').click();
    cy.wait('@createEvent');

    // Should redirect to events list or the new event page
    cy.url().should('include', '/events');
  });
});
