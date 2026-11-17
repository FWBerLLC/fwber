describe('Physical Profile Editor', () => {
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
      avatarUrl: '/images/test-avatar.svg',
    }
  };

  function seedSession() {
    // Middleware gates /settings/* on the fwber_auth cookie (planted
    // before navigation — see notifications.cy.js).
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit('/settings/physical-profile', {
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

    cy.intercept('GET', '**/api/physical-profile', {
      statusCode: 200,
      body: {
        data: {
          height_cm: 175,
          body_type: 'Average'
        }
      }
    }).as('getPhysicalProfile');

    cy.intercept('PUT', '**/api/physical-profile', {
      statusCode: 200,
      body: {
        data: {
          height_cm: 185,
          body_type: 'Athletic'
        }
      }
    }).as('updatePhysicalProfile');
  });

  it('loads existing data and updates profile', () => {
    seedSession();

    cy.wait('@getPhysicalProfile');
    cy.contains('Failed to load your physical attributes.').should('not.exist');
    cy.contains('h1', 'Physical Attributes').should('be.visible');

    // Height is a select of 2cm steps starting at 145 (175 is an option).
    cy.get('select').first().should('have.value', '175');

    // Update: height to 185, body type via the SelectGrid buttons.
    cy.get('select').first().select('185');
    cy.contains('button', 'Athletic').click();

    cy.contains('button', 'Save').click();

    // The page posts lowercase slugs for grid selections.
    cy.wait('@updatePhysicalProfile').its('request.body').should('include', {
      height_cm: 185,
      body_type: 'athletic'
    });

    cy.contains('Physical attributes saved!').should('be.visible');
  });

  it('shows the saved values on reload', () => {
    cy.intercept('GET', '**/api/physical-profile', {
      statusCode: 200,
      body: { data: { height_cm: 185, body_type: 'Athletic' } }
    }).as('getUpdatedProfile');

    seedSession();

    cy.wait('@getUpdatedProfile');
    cy.get('select').first().should('have.value', '185');
  });
});
