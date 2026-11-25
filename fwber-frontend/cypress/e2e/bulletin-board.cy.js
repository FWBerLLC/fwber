describe('fwber.online Bulletin Board System', () => {
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

  // Current hub contract: slug-keyed boards with follower/post counts;
  // detail carries posts inline (no separate /messages endpoint).
  const mockBoards = {
    boards: [
      {
        id: 1,
        slug: 'times-square-local',
        name: 'Times Square Local',
        label: 'Times Square Local',
        emoji: '📌',
        category: 'community',
        description: 'Local updates for Times Square area',
        follower_count: 5,
        post_count: 10,
        is_followed: false
      }
    ]
  };

  const mockDetail = {
    ...mockBoards.boards[0],
    posts: [
      { id: 101, content: 'Hello Times Square!', created_at: new Date().toISOString(), author: { id: 2, name: 'Tourist', avatar_url: null } }
    ]
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
    cy.intercept('GET', '**/api/bulletin-boards/times-square-local', { statusCode: 200, body: mockDetail }).as('getBoardDetail');
    cy.intercept('GET', '**/api/bulletin-boards', { statusCode: 200, body: mockBoards }).as('getBoards');
    cy.intercept('POST', '**/api/bulletin-boards/boards', {
      statusCode: 201,
      body: { board: { id: 2, slug: 'new-board', name: 'New Board', label: 'New Board', emoji: '📌', category: 'community', description: '', follower_count: 1, post_count: 0, is_followed: true } }
    }).as('createBoard');
    cy.intercept('POST', '**/api/bulletin-boards', { statusCode: 201, body: { post: { id: 102 } } }).as('postMessage');
  });

  it('displays the bulletin board interface', () => {
    seedVisit('/bulletin-boards');
    cy.wait('@getBoards');
    cy.contains('Local Bulletin Boards').should('be.visible');
    cy.contains('Times Square Local').should('be.visible');
  });

  it('creates a new bulletin board', () => {
    seedVisit('/bulletin-boards');
    cy.wait('@getBoards');
    cy.contains('button', 'Start Board').click();
    cy.get('input[placeholder*="Midtown Detroit"]').type('New Board');
    cy.contains('button', 'Create Board').click();
    cy.wait('@createBoard').its('request.body').should('include', { name: 'New Board' });
    // Durable state over the transient sonner toast: the new board card
    // is prepended to the grid.
    cy.contains('h3', 'New Board').should('be.visible');
  });

  it('opens a board and posts a note to it', () => {
    seedVisit('/bulletin-boards');
    cy.wait('@getBoards');
    cy.contains('Times Square Local').click();
    cy.wait('@getBoardDetail');
    cy.contains('Hello Times Square!').should('be.visible');

    // Composer is an <Input> with an icon-only submit in the detail dialog.
    cy.get('input[placeholder*="Post a note to"]').type('Test message from Cypress!');
    cy.get('input[placeholder*="Post a note to"]').closest('form').find('button[type="submit"]').click();

    cy.wait('@postMessage').its('request.body').should('include', {
      topic_slug: 'times-square-local',
      content: 'Test message from Cypress!'
    });
    // Composer clears after a successful reply.
    cy.get('input[placeholder*="Post a note to"]').should('have.value', '');
  });

  it('posts via the Create New Post dialog', () => {
    seedVisit('/bulletin-boards');
    cy.wait('@getBoards');
    cy.contains('button', 'Create New Post').click();
    cy.contains('Post to Bulletin Board').should('be.visible');
    cy.get('textarea[placeholder*="Share an upcoming meetup"]').type('Dialog post from Cypress!');
    cy.get('[role="dialog"]').contains('button', 'Publish Post').click();

    cy.wait('@postMessage').its('request.body').should('include', {
      content: 'Dialog post from Cypress!'
    });
    // Durable state: the dialog closes after publishing.
    cy.contains('Post to Bulletin Board').should('not.exist');
  });
});
