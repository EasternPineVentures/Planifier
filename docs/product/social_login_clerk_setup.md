# Planifier Social Login Setup

Planifier uses Clerk for authentication. The app code is configured to show
social sign-in buttons at the top of the Clerk sign-in and sign-up forms when
providers are enabled in the Clerk Dashboard.

## Providers To Enable

### Facebook

Clerk supports Facebook as a social connection.

Development:

- In Clerk Dashboard, open SSO connections.
- Add a connection for all users.
- Select Facebook.
- Clerk development instances can use shared OAuth credentials.

Production:

- Enable Facebook for sign-up and sign-in.
- Enable custom credentials.
- Create a Facebook app in Meta for Developers.
- Add the Clerk redirect URI to Facebook Login settings.
- Add the Facebook App ID and App Secret in Clerk.

Clerk guide:

- https://clerk.com/docs/authentication/social-connections/facebook

### TikTok

Clerk supports TikTok as a social connection.

Development and staging:

- TikTok cannot use Clerk shared development credentials because TikTok requires
  redirect URL ownership verification.
- Use a TikTok sandbox app or a staging/preview domain.
- Enable custom credentials in Clerk.

Production:

- Enable TikTok for sign-up and sign-in.
- Enable custom credentials.
- Create a TikTok developer app.
- Verify the production domain with TikTok.
- Submit the TikTok app for review.
- Add the TikTok Client ID and Client Secret in Clerk.

Clerk guide:

- https://clerk.com/docs/authentication/social-connection-with-tiktok

## App Code Status

- `app/sign-in/[[...sign-in]]/page.tsx` uses Clerk's prebuilt `<SignIn />`.
- `app/sign-up/[[...sign-up]]/page.tsx` uses Clerk's prebuilt `<SignUp />`.
- `lib/auth/clerkAppearance.ts` places social buttons at the top and uses the
  Eastern Pine Ventures visual style.

## Operational Notes

- Do not commit provider secrets.
- Store provider app IDs/secrets only in Clerk Dashboard or secure environment
  settings.
- After enabling providers, test via `/sign-in` and `/sign-up` locally and on
  the production Clerk account portal.
- TikTok review can take several days, so plan marketing launch timing around
  provider approval.
