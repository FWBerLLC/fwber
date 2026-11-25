describe('AI-Powered Recommendations', () => {
  const user = {
    id: 1,
    name: 'Recommendation Test User',
    email: 'rec-test@example.com',
    emailVerifiedAt: new Date().toISOString(),
    onboarding_completed_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Recommendation Test User',
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

  const mixedBody = {
    recommendations: [
      {
        id: 'rec_1',
        type: 'ai',
        score: 95,
        reason: 'Based on your interest in hiking',
        content: { id: 'content_1', title: 'Hiking Group in Yosemite', description: 'Join us for a weekend hike.' }
      },
      {
        id: 'rec_2',
        type: 'location',
        score: 88,
        reason: 'Near your location',
        content: { id: 'content_2', name: 'Downtown Coffee Meetup', description: 'Socialize with locals.', distance: 500 }
      }
    ],
    metadata: { total: 2, types: ['ai', 'location'], generated_at: new Date().toISOString(), cache_hit: false }
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
    // Fallback + generic first; specifics registered later win in Cypress.
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');
    cy.intercept('GET', '**/api/recommendations/type/*', { statusCode: 200, body: { recommendations: [], metadata: { total: 0 } } }).as('getByType');
    cy.intercept('GET', '**/api/recommendations/feed*', { statusCode: 200, body: { feed: [], metadata: { total: 0 } } }).as('getFeed');
    cy.intercept('GET', '**/api/recommendations/trending*', {
      statusCode: 200,
      body: {
        trending: [
          { id: 'trend_1', type: 'bulletin_board', title: 'Trending Topic 1', description: 'Popular discussion topic', engagement_score: 0.95, trending_since: new Date().toISOString() }
        ],
        metadata: { total: 1 }
      }
    }).as('getTrending');
    cy.intercept('GET', '**/api/recommendations/type/ai*', {
      statusCode: 200,
      body: { recommendations: [mixedBody.recommendations[0]], metadata: { total: 1 } }
    }).as('getAIRecommendations');
    cy.intercept('GET', '**/api/recommendations*', { statusCode: 200, body: mixedBody }).as('getRecommendations');
    cy.intercept('POST', '**/api/recommendations/feedback', {
      statusCode: 200,
      body: { message: 'Feedback recorded successfully', feedback_id: 'fb_123' }
    }).as('submitFeedback');
    cy.intercept('POST', '**/api/matches/action', { statusCode: 200, body: { success: true } }).as('matchAction');
  });

  it('loads the page and displays mixed recommendations', () => {
    seedVisit('/recommendations');
    cy.wait('@getRecommendations');
    cy.contains('h1', 'Recommendations').should('be.visible');
    cy.contains('Hiking Group in Yosemite').should('be.visible');
    cy.contains('Downtown Coffee Meetup').should('be.visible');
    cy.contains('AI').should('be.visible');
    cy.contains('LOCATION').should('be.visible');
    cy.contains('95%').should('be.visible');
  });

  it('switches tabs and loads specific recommendation types', () => {
    seedVisit('/recommendations');
    cy.wait('@getRecommendations');
    cy.contains('button', 'AI').click();
    cy.wait('@getAIRecommendations');
    cy.contains('Hiking Group in Yosemite').should('be.visible');
    cy.contains('Downtown Coffee Meetup').should('not.exist');
  });

  it('loads trending recommendations', () => {
    seedVisit('/recommendations');
    cy.contains('button', 'Trending').click();
    cy.wait('@getTrending');
    cy.contains('Trending Topic 1').should('be.visible');
  });

  it('records like feedback with rating', () => {
    seedVisit('/recommendations');
    cy.wait('@getRecommendations');
    cy.contains('Hiking Group in Yosemite').closest('.h-full').contains('button', 'Like').click();
    cy.wait('@submitFeedback').its('request.body').should('deep.include', {
      recommendation_id: 'rec_1',
      action: 'like',
      rating: 5
    });
  });

  it('refreshes recommendations', () => {
    seedVisit('/recommendations');
    cy.wait('@getRecommendations');
    cy.contains('button', 'Refresh').click();
    cy.wait('@getRecommendations');
    cy.contains('Hiking Group in Yosemite').should('be.visible');
  });
});
