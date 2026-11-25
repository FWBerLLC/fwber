describe('Onboarding skip flow', () => {
  const user = {
    id: 1,
    name: 'Skip Test User',
    email: 'skip@example.com',
    emailVerifiedAt: new Date().toISOString(),
    onboarding_completed_at: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Skip Test User',
      dateOfBirth: '1990-01-01',
      gender: 'non-binary',
      pronouns: 'they/them',
      sexualOrientation: 'pansexual',
      relationshipStyle: 'polyamorous',
      bio: '',
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
    // Fallback beneath the specifics (see friends-full.cy.js). It also
    // absorbs the wizard's per-step auto-save PUTs.
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');
    // Current shape: GET /profile returns the UserProfile directly
    // ({ profile: {...} }), not wrapped in { data }.
    cy.intercept('GET', '**/api/profile', {
      statusCode: 200,
      body: {
        id: 1,
        email: 'skip@example.com',
        profile: {
          display_name: '',
          gender: '',
          looking_for: [],
          location: { city: '', state: '', latitude: 0, longitude: 0 },
          preferences: { age_range_min: 18, age_range_max: 50 }
        }
      }
    }).as('getProfile');
  });

  it('lets users skip optional onboarding steps without entering data', () => {
    seedVisit('/onboarding');
    cy.wait('@getProfile');

    // Current wizard: Welcome -> Basic Info -> Photos -> Physical ->
    // Lifestyle, with no hard validation gates between steps.
    cy.contains('Welcome to').should('be.visible');
    cy.contains('button', 'Next').click();

    cy.contains('Basic Info').should('be.visible');
    cy.contains('button', 'Next').click();

    cy.contains('Upload now or skip and add photos later').should('be.visible');
    cy.contains('button', 'Next').click();

    cy.contains('Physical').should('be.visible');
    cy.contains('button', 'Next').click();

    cy.contains('Lifestyle').should('be.visible');
  });
});
