describe('Account Settings', () => {
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
    seedVisit('/settings/account');
    cy.contains('h1', 'Account Settings').should('be.visible');
  });

  it('allows updating email address', () => {
    cy.intercept('PUT', '**/api/profile', {
      statusCode: 200,
      body: { message: 'Email updated successfully' }
    }).as('updateEmail');

    cy.contains('h2', 'Email Address').should('be.visible');
    cy.get('input[name="email"]').clear().type('newemail@example.com');
    cy.contains('button', 'Save Changes').click();

    cy.wait('@updateEmail').its('request.body').should('deep.equal', {
      email: 'newemail@example.com'
    });
    cy.contains('Email updated successfully').should('be.visible');
  });

  it('allows changing password', () => {
    cy.intercept('PUT', '**/api/profile/password', {
      statusCode: 200,
      body: { message: 'Password updated successfully' }
    }).as('updatePassword');

    cy.contains('h2', 'Change Password').scrollIntoView().should('be.visible');
    cy.get('input[name="current_password"]').type('oldpassword');
    cy.get('input[name="password"]').type('newpassword123');
    cy.get('input[name="password_confirmation"]').type('newpassword123');
    cy.contains('button', 'Update Password').click();

    cy.wait('@updatePassword').its('request.body').should('include', {
      current_password: 'oldpassword',
      password: 'newpassword123',
      password_confirmation: 'newpassword123'
    });
    cy.contains('Password updated successfully').should('be.visible');
  });

  it('allows deleting account', () => {
    // Current contract: POST /profile/delete { password } (not DELETE).
    cy.intercept('POST', '**/api/profile/delete', {
      statusCode: 200,
      body: { message: 'Account deleted successfully' }
    }).as('deleteAccount');

    cy.contains('h2', 'Delete Account').scrollIntoView().should('be.visible');
    cy.contains('button', 'Delete Account').click();

    cy.contains('Are you sure?').should('be.visible');
    cy.contains('This action cannot be undone').should('be.visible');
    cy.get('input[name="confirm_password"]').type('password123');
    cy.contains('button', 'Delete My Account').click();

    cy.wait('@deleteAccount').its('request.body').should('deep.equal', {
      password: 'password123'
    });
    cy.url().should('include', '/login');
  });
});
