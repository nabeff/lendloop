// Clerk issues the JWT (template "convex"), Convex validates it against the
// issuer domain. CLERK_JWT_ISSUER_DOMAIN is set with `npx convex env set`.
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
