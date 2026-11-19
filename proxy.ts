import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under /app needs a session. The public board and the Clerk
// routes stay open. Authorisation (who may change what) lives in Convex
// functions, this only decides who may load the signed-in pages.
const isProtected = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
