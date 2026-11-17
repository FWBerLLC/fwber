describe('Match Insights Integration', () => {
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
      },
      token_balance: 100
    };

    const match = {
        id: 2,
        name: 'Potential Match',
        bio: 'I like hiking',
        age: 25,
        locationDescription: 'New York, NY',
        avatarUrl: '/images/test-avatar.svg',
        compatibilityScore: 0.9,
        distance: 5,
        is_verified: true,
        photos: [{ id: 2, url: '/images/test-avatar.svg', is_private: false, is_primary: true }]
    };

    function seedSession() {
      // Middleware cookie before navigation (see notifications.cy.js).
      cy.visit('/login');
      cy.setCookie('fwber_auth', '1');
      cy.visit('/matches', {
        onBeforeLoad: (win) => {
          win.localStorage.setItem('fwber_token', 'fake-token');
          win.localStorage.setItem('fwber_user', JSON.stringify(user));
        }
      });
    }

    beforeEach(() => {
      // Fallback beneath the specifics (see friends-full.cy.js).
      cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');

      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          access_token: 'fake-token',
          token_type: 'Bearer',
          user: user
        }
      }).as('login');

      cy.intercept('GET', '**/api/auth/me', {
        statusCode: 200,
        body: user
      }).as('getMe');

      cy.intercept('GET', '**/api/user', {
        statusCode: 200,
        body: { data: user }
      }).as('getUser');

      // Mock share-unlock status
      cy.intercept('GET', '**/api/share-unlock/*', {
          statusCode: 200,
          body: { unlocked: false }
      }).as('getShareUnlock');

      // Mock subscription check
      cy.intercept('GET', '**/api/subscriptions/creator/*', {
          statusCode: 200,
          body: { is_subscribed: false }
      }).as('checkSubscription');
    });

    it('shows locked insights and unlocks with tokens', () => {
        // Matches page normalizes a bare array or { matches } (not { data }).
        cy.intercept('GET', '**/api/matches*', {
            statusCode: 200,
            body: { matches: [match] }
        }).as('getMatches');

      // Mock locked insights
      cy.intercept('GET', `**/api/matches/${match.id}/insights`, {
        statusCode: 200,
        body: {
          data: {
            total_score: 85,
            is_locked: true,
            cost: 10,
            preview_message: 'Unlock detailed compatibility analysis and AI insights for 10 tokens.'
          }
        }
      }).as('getLockedInsights');

      // Mock unlock action
      cy.intercept('POST', `**/api/matches/${match.id}/insights/unlock`, {
        statusCode: 200,
        body: {
          message: 'Unlocked successfully',
          balance: 90
        }
      }).as('unlockInsights');

      seedSession();

      // Wait for matches and open the profile modal via the Info button
      cy.contains('Potential Match').should('be.visible');
      cy.get('button:has(svg.lucide-info)').click();

      // Verify modal opens
      cy.contains('AI Compatibility Report').should('be.visible');

      // Wait for the insights request to actually happen
      cy.wait('@getLockedInsights');

      // Verify locked state elements
      cy.contains('85%').should('be.visible');
      cy.contains('Unlock Analysis (10 Tokens)').should('be.visible');

      // Override the intercept to return UNLOCKED insights BEFORE we click
      cy.intercept('GET', `**/api/matches/${match.id}/insights`, {
        statusCode: 200,
        body: {
            data: {
                total_score: 85,
                is_locked: false,
                ai_explanation: 'You both love hiking and outdoor adventures. This is a high compatibility match!',
                breakdown: {
                    base: 80,
                    preferences: 90,
                    communication: 85,
                    mutual: 88
                }
            }
        }
      }).as('getUnlockedInsights');

      // Click unlock
      cy.contains('Unlock Analysis (10 Tokens)').click();

      // Verify API call and UI update
      cy.wait('@unlockInsights');

      // Should now see the explanation
      cy.contains('You both love hiking and outdoor adventures').should('be.visible');
      cy.contains('Base').should('be.visible');
    });
  });
