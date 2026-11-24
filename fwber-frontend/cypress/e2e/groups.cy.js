describe('Groups', () => {
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

  const groups = [
    {
      id: 1,
      name: 'Hiking Enthusiasts',
      description: 'A group for people who love hiking.',
      member_count: 120,
      is_member: false
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
    cy.intercept('GET', '**/api/groups', { statusCode: 200, body: { data: groups } }).as('getGroups');
    cy.intercept('GET', '**/api/groups/my-groups', { statusCode: 200, body: { data: [] } }).as('getMyGroups');
  });

  it('displays a list of groups', () => {
    seedVisit('/groups');

    cy.wait('@getGroups');
    cy.contains('Hiking Enthusiasts').should('be.visible');
    cy.contains('120 members').should('be.visible');
  });

  it('allows joining a group', () => {
    seedVisit('/groups');

    cy.wait('@getGroups');

    cy.intercept('POST', '**/api/groups/1/join', {
      statusCode: 200,
      body: { success: true, status: 'joined' }
    }).as('joinGroup');

    cy.intercept('GET', '**/api/groups', {
        statusCode: 200,
        body: {
            data: [{
                ...groups[0],
                is_member: true
            }]
        }
    }).as('getGroupsUpdated');

    cy.intercept('GET', '**/api/groups/my-groups', {
        statusCode: 200,
        body: {
            data: [{
                ...groups[0],
                is_member: true
            }]
        }
    }).as('getMyGroupsUpdated');

    cy.contains('Hiking Enthusiasts').parent().find('button').contains('Join').click();

    cy.wait('@joinGroup');
    // Current card renders a Joined label + Leave Group button for members.
    cy.contains('Joined').should('be.visible');
    cy.contains('button', 'Leave Group').should('be.visible');
  });

  it('allows creating a new group', () => {
    seedVisit('/groups/create');

    // Type immediately on mount, then prove nothing is wiped: the root
    // layout's realtime provider used to swap its wrapper element when
    // auth resolved, remounting the page and discarding early input.
    cy.get('#name').type('New Test Group');
    cy.get('#description').type('Description for the new test group.');
    cy.wait(2500);
    cy.get('#name').should('have.value', 'New Test Group');
    cy.get('#description').should('have.value', 'Description for the new test group.');

    cy.intercept('POST', '**/api/groups', {
      statusCode: 201,
      body: {
        data: {
          id: 2,
          name: 'New Test Group',
          description: 'Description for the new test group.',
          member_count: 1,
          is_member: true
        }
      }
    }).as('createGroup');

    cy.contains('button', 'Create Group').click();
    cy.wait('@createGroup');

    // Should redirect to groups list or the new group page
    cy.url().should('include', '/groups');
  });
});
