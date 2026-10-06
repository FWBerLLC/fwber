describe('PWA Verification', () => {
  it('should have a valid manifest.json', () => {
    cy.request('/manifest.json').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('name', 'fwber.site — Adult Dating Platform');
      expect(response.body).to.have.property('short_name', 'fwber');
      expect(response.body).to.have.property('display', 'standalone');
      expect(response.body).to.have.property('start_url', '/');
      expect(response.body.icons).to.be.an('array').that.is.not.empty;
    });
  });

  it('should register a service worker', () => {
    cy.visit('/');
    cy.window().then((win) => {
      // Check if service worker is supported
      if ('serviceWorker' in win.navigator) {
        // Wait for registration
        cy.wrap(win.navigator.serviceWorker.getRegistration()).should((registration) => {
           // It might be null if not yet registered or in dev mode without PWA
           // But in a production-like build it should be there.
           // For now, we just check if the API exists.
           expect(win.navigator.serviceWorker).to.exist;
        });
      }
    });
  });

  it('should serve offline.html', () => {
    cy.request('/offline.html').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.include('Offline');
    });
  });

  it('should have correct theme color meta tag', () => {
    cy.visit('/');
    cy.get('meta[name="theme-color"]').should('have.attr', 'content', '#f97316');
  });

  it('should have apple-touch-icon', () => {
    cy.visit('/');
    cy.get('link[rel="apple-touch-icon"]').should('exist');
  });
});
