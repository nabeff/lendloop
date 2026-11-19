// Clerk issues the JWT (template "convex"), Convex validates it against the
// issuer domain. CLERK_JWT_ISSUER_DOMAIN is set with `npx convex env set`.
// Until it is set the provider list is empty, so a fresh deployment pushes
// cleanly and simply rejects every signed in call.
const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

const authConfig = {
  providers: issuer ? [{ domain: issuer, applicationID: "convex" }] : [],
};

export default authConfig;
