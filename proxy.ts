import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under /app needs a session. The public board and the Clerk
// routes stay open. Authorisation (who may change what) lives in Convex
// functions, this only decides who may load the signed-in pages.
const isProtected = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return;
  // protect() answers 404 for a signed-out visitor, which reads as a broken
  // link rather than "you need an account". Redirect to our own sign-in page
  // instead, carrying the original URL so they land where they were going.
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
