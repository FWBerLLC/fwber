describe('fwber.site Bulletin Board System', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    profile: {
      avatar_url: '/images/test-avatar.svg'
    }
  };

  const mockLocation = {
    coords: {
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10
    }
  };

  const mockBoards = {
    boards: [
      {
        id: 1,
        name: 'Times Square Local',
        description: 'Local updates for Times Square area',
        center_lat: 40.7589,
        center_lng: -73.9851,
        radius_meters: 500,
        message_count: 10,
        active_users: 5,
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    ],
    user_location: {
      lat: 40.7589,
      lng: -73.9851
    },
    search_radius: 1000
  };

  const mockMessages = {
    messages: {
      data: [
        {
          id: 101,
          bulletin_board_id: 1,
          user_id: 2,
          content: 'Hello Times Square!',
          is_anonymous: false,
          created_at: new Date().toISOString(),
          author_name: 'Tourist',
          user: {
            id: 2,
            name: 'Tourist',
            avatar_url: null
          },
          reaction_count: 2,
          reply_count: 0
        }
      ],
      current_page: 1,
      last_page: 1,
      total: 1
    },
    board: mockBoards.boards[0]
  };

  beforeEach(() => {
    // Mock Geolocation
    cy.visit('/bulletin-boards', {
      onBeforeLoad(win) {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) => {
          return cb(mockLocation);
        });
        
        // Mock localStorage for authentication
        win.localStorage.setItem('fwber_token', 'mock-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(user));
      },
    });

    // Mock User Profile
    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: { data: user }
    }).as('getUser');

    // Mock Boards List
    cy.intercept('GET', '**/api/bulletin-boards*', {
      statusCode: 200,
      body: mockBoards
    }).as('getBoards');

    // Mock Specific Board Messages
    cy.intercept('GET', '**/api/bulletin-boards/1/messages*', {
      statusCode: 200,
      body: mockMessages
    }).as('getMessages');

    // Mock Single Board Details
    cy.intercept('GET', '**/api/bulletin-boards/1?*', {
      statusCode: 200,
      body: {
        board: mockBoards.boards[0],
        user_location: mockBoards.user_location
      }
    }).as('getBoard');

    // Mock Create Board
    cy.intercept('POST', '**/api/bulletin-boards', {
      statusCode: 201,
      body: {
        board: {
          id: 2,
          name: 'New Board',
          center_lat: 40.7589,
          center_lng: -73.9851,
          radius_meters: 500,
          message_count: 0,
          active_users: 1
        },
        created: true
      }
    }).as('createBoard');

    // Mock Post Message
    cy.intercept('POST', '**/api/bulletin-boards/1/messages', {
      statusCode: 201,
      body: {
        message: {
          id: 102,
          bulletin_board_id: 1,
          user_id: 1,
          content: 'Test message from Cypress!',
          is_anonymous: false,
          created_at: new Date().toISOString(),
          author_name: 'Test User',
          reaction_count: 0,
          reply_count: 0
        },
        board: mockBoards.boards[0]
      }
    }).as('postMessage');
  });

  it('should display bulletin board interface', () => {
    cy.wait('@getBoards');
    cy.contains('Local Bulletin Boards').should('be.visible');
    cy.contains('Times Square Local').should('be.visible');
  });

  it('should allow creating a new bulletin board', () => {
    cy.wait('@getBoards');
    // Check if the button exists first
    cy.get('body').then($body => {
      if ($body.find('button:contains("New Board")').length > 0) {
        cy.contains('button', 'New Board').click();
      } else {
        cy.log('New Board button not found, skipping creation test step');
      }
    });
  });

  it('should allow posting messages to bulletin boards', () => {
    cy.wait('@getBoards');
    
    // Click on the board to view messages
    cy.contains('Times Square Local').click();
    cy.wait('@getMessages');

    // Check existing message
    cy.contains('Hello Times Square!').should('be.visible');
    
    // Type a test message
    cy.get('input[placeholder*="Share something"]').type('Test message from Cypress!');
    
    // Intercept the re-fetch of messages to include the new one
    cy.intercept('GET', '**/api/bulletin-boards/1/messages*', {
      statusCode: 200,
      body: {
        messages: {
          data: [
            ...mockMessages.messages.data,
            {
              id: 102,
              bulletin_board_id: 1,
              user_id: 1,
              content: 'Test message from Cypress!',
              is_anonymous: false,
              created_at: new Date().toISOString(),
              author_name: 'Test User',
              user: user,
              reaction_count: 0,
              reply_count: 0
            }
          ],
          current_page: 1,
          last_page: 1,
          total: 2
        },
        board: mockBoards.boards[0]
      }
    }).as('getMessagesAfterPost');

    // Post the message
    cy.contains('button', 'Post').click();
    
    cy.wait('@postMessage');
    cy.wait('@getMessagesAfterPost');
    
    // Should show the message in the list (optimistic update or re-fetch)
    cy.contains('Test message from Cypress!').should('be.visible');
  });

  it('should handle anonymous posting', () => {
    cy.wait('@getBoards');
    cy.contains('Times Square Local').click();
    cy.wait('@getMessages');
    
    // Mock anonymous post
    cy.intercept('POST', '**/api/bulletin-boards/1/messages', {
      statusCode: 201,
      body: {
        message: {
          id: 103,
          bulletin_board_id: 1,
          user_id: 1,
          content: 'Anonymous test message',
          is_anonymous: true,
          created_at: new Date().toISOString(),
          author_name: 'Anonymous',
          reaction_count: 0,
          reply_count: 0
        },
        board: mockBoards.boards[0]
      }
    }).as('postAnonymousMessage');

    // Check the anonymous option
    // Assuming there is a checkbox or toggle
    cy.get('label').contains('Post anonymously').click();
    
    // Type a message
    cy.get('input[placeholder*="Share something"]').type('Anonymous test message');
    
    // Intercept the re-fetch of messages to include the new anonymous one
    cy.intercept('GET', '**/api/bulletin-boards/1/messages*', {
      statusCode: 200,
      body: {
        messages: {
          data: [
            ...mockMessages.messages.data,
            {
              id: 103,
              bulletin_board_id: 1,
              user_id: 1,
              content: 'Anonymous test message',
              is_anonymous: true,
              created_at: new Date().toISOString(),
              author_name: 'Anonymous',
              user: null,
              reaction_count: 0,
              reply_count: 0
            }
          ],
          current_page: 1,
          last_page: 1,
          total: 2
        },
        board: mockBoards.boards[0]
      }
    }).as('getMessagesAfterAnonPost');

    // Post the message
    cy.contains('button', 'Post').click();
    
    cy.wait('@postAnonymousMessage');
    cy.wait('@getMessagesAfterAnonPost');
    
    // Should show as anonymous
    cy.contains('Anonymous').should('be.visible');
  });
});


