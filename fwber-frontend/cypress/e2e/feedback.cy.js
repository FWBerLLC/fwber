describe('Feedback Loop', () => {
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
    cy.intercept('POST', '**/api/feedback', {
      statusCode: 201,
      body: { success: true, message: 'Thank you for your feedback!' }
    }).as('submitFeedback');
    seedVisit('/dashboard');
    cy.get('button[title="Send Feedback"]').should('be.visible');
  });

  it('allows submitting feedback', () => {
    cy.get('button[title="Send Feedback"]').click();
    cy.contains('h2', 'Send Feedback').should('be.visible');

    // Category options are slug-valued in the current modal.
    cy.get('select').select('feature');
    cy.get('textarea').type('This is a test feedback message from Cypress.');
    cy.contains('button', 'Submit').click();

    cy.wait('@submitFeedback').its('request.body').should('include', {
      category: 'feature',
      message: 'This is a test feedback message from Cypress.'
    });
    cy.contains('Thank you for your feedback!').should('be.visible');

    // Modal auto-closes after the success state.
    cy.contains('h2', 'Send Feedback', { timeout: 6000 }).should('not.exist');
    cy.get('button[title="Send Feedback"]').should('exist');
  });

  it('validates required fields', () => {
    cy.get('button[title="Send Feedback"]').click();
    cy.contains('button', 'Submit').should('be.disabled');
    cy.get('textarea').type('Test');
    cy.contains('button', 'Submit').should('not.be.disabled');
  });
});
