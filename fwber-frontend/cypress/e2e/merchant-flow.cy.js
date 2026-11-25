describe('Merchant Flow', () => {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
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

  const merchantUser = { ...user, role: 'merchant' };

  function seedVisit(path, asUser) {
    // Middleware cookie before navigation (see notifications.cy.js).
    cy.visit('/login');
    cy.setCookie('fwber_auth', '1');
    cy.visit(path, {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('fwber_token', 'fake-token');
        win.localStorage.setItem('fwber_user', JSON.stringify(asUser));
      }
    });
  }

  beforeEach(() => {
    // Fallback beneath the specifics (see friends-full.cy.js).
    cy.intercept('**/api/**', { statusCode: 200, body: {} }).as('apiFallback');
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: user }).as('getMe');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: user } }).as('getUser');
  });

  it('allows a user to register as a merchant', () => {
    cy.intercept('POST', '**/api/merchant-portal/register', {
      statusCode: 200,
      body: { data: { id: 1, business_name: "Joe's Pizza", category: 'Restaurant', role: 'merchant' }, message: 'Merchant profile created successfully' }
    }).as('registerMerchant');

    seedVisit('/merchant/register', user);

    // Current form is id-keyed RHF (register spread also sets name).
    cy.get('#business_name').type("Joe's Pizza");
    cy.get('#category').select('Restaurant');
    cy.get('#description').type('Best pizza in town');
    cy.get('#address').type('123 Main St');
    cy.get('button[type="submit"]').click();

    cy.wait('@registerMerchant').its('request.body').should('include', {
      business_name: "Joe's Pizza",
      category: 'Restaurant'
    });
    cy.url().should('include', '/merchant/dashboard');
  });

  it('allows a merchant to create a promotion', () => {
    // The merchant layout gates on role from /auth/me, so the seeded
    // localStorage user alone is not enough.
    cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: merchantUser }).as('getMeMerchant');
    cy.intercept('GET', '**/api/user', { statusCode: 200, body: { data: merchantUser } }).as('getMerchantUser');
    cy.intercept('POST', '**/api/merchant-portal/promotions', {
      statusCode: 201,
      body: { data: { id: 101, title: '50% Off Lunch', code: 'LUNCH50' }, message: 'Promotion created' }
    }).as('createPromotion');

    seedVisit('/merchant/promotions/new', merchantUser);

    cy.get('#title').type('50% Off Lunch');
    cy.get('#discount_value').type('50%');
    cy.get('#radius').clear().type('500');
    cy.get('#description').type('Valid on weekdays');

    // Location validation requires a non-zero lat/lng from the map picker.
    cy.get('.leaflet-container').click(200, 150);

    cy.get('button[type="submit"]').click();
    cy.wait('@createPromotion').its('request.body').should('include', {
      title: '50% Off Lunch',
      discount_value: '50%',
      radius: 500
    });
    cy.url().should('include', '/merchant/dashboard');
  });
});
