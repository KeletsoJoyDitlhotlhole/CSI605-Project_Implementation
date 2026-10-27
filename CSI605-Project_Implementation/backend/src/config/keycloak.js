// keycloak.js — Keycloak configuration constants

require("dotenv").config();

const keycloakConfig = {
  // Base URL of the Keycloak server
  serverUrl: process.env.KEYCLOAK_URL || "http://localhost:8180",

  // The realm that contains the application's users and roles
  realm: process.env.KEYCLOAK_REALM || "publications",

  // The client ID registered in Keycloak for this API
  clientId: process.env.KEYCLOAK_CLIENT_ID || "publications-api",

  // Computed: JWKS endpoint used to fetch the public keys for token verification
  get jwksUri() {
    return `${this.serverUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
  },

  // Computed: Expected token issuer for JWT validation
  get issuer() {
    return `${this.serverUrl}/realms/${this.realm}`;
  },
};

module.exports = keycloakConfig;
