# DocsChain Admin Dashboard

React admin dashboard for DocsChain.

`../admin` is only a UI template reference. Do not edit it from this project. All real admin dashboard work should happen inside `admin-dashboard`.

## Current Milestone

The first slice is implemented:

- React + Vite (`vite.config.js`, client-side routes via `presentation/app/App.jsx`).
- Login UI matching the DocsChain reference screen.
- Login redirects to `/dashboard`, and saved Firebase sessions reopen the dashboard automatically.
- Firebase Auth email/password login.
- Firebase forgot-password flow using password reset email.
- Firestore `admins/{uid}` authorization after Firebase sign-in.
- Loading, success, and error states in the login form.
- Alert UI inspired by the admin template `Alert` usage.
- Arabic and English UI foundation with RTL support.
- Clean architecture folders ready for the rest of the admin dashboard.

## Template Rule

`../admin` is the visual and implementation reference. Before creating a new auth screen or common UI pattern, check the equivalent implementation there first and copy the direction, not the files. Keep all real code changes inside `admin-dashboard`.

## Run

```powershell
cd "C:\Users\_Koala_\StudioProjects\docs chain\admin-dashboard"
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5501
```

Build check:

```powershell
npm.cmd run build
```

## Firebase Environment

Create `.env.local` beside `package.json`:

```powershell
Copy-Item .env.example .env.local
```

Then fill these values from Firebase project settings:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=docs-chain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=docs-chain
VITE_FIREBASE_STORAGE_BUCKET=docs-chain.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_DOCSCHAIN_API_BASE_URL=http://127.0.0.1:3000
```

If `.env.local` still uses `NEXT_PUBLIC_*` from an older Next.js attempt, rename those keys back to `VITE_*` above.

`docschain-api` uses Firebase Admin credentials for the backend. Do not copy the service account private key into React. The frontend still needs the Web App config values from Firebase Console: `apiKey`, `messagingSenderId`, and `appId`.

User hard delete uses `docschain-api` because Firebase Authentication users can only be deleted with Firebase Admin SDK. The dashboard sends the signed-in admin Firebase ID token to `DELETE /api/admin/users/{uid}`; the API checks the admin profile before deleting Auth, Firestore user data, and related backend records.

Run `docschain-api` before testing permanent user deletion:

```powershell
cd "C:\Users\_Koala_\StudioProjects\docs chain\docschain-api"
npm.cmd run dev
```

Restart `npm.cmd run dev` in `admin-dashboard` after editing `.env.local`.

## Architecture

```text
src/
  domain/
    auth/                 Pure auth rules, admin roles, session model, error mapping
  application/
    auth/                 Login/logout use cases
  infrastructure/
    auth/                 Firebase auth repository implementation
    firebase/             Firebase app, auth, and firestore setup
  presentation/
    app/                  Root App.jsx wiring (routes + DI), error boundary
    components/           Reusable UI components such as AppAlert
    features/auth/        Login UI
    i18n/                 Arabic/English translations and direction handling
    layouts/              Shared auth layout
    styles/               Global styles
```

Dependency direction:

```text
presentation -> application -> domain
infrastructure -> domain
app composition wires application to infrastructure
```

The UI talks to use cases, not directly to Firebase. Firebase is isolated in `infrastructure`, so the login page stays stable if the auth implementation changes later.

## Admin Auth Direction

- Firebase Auth handles email/password login.
- Firestore has a separate `admins` collection.
- The first `super_admin` is created manually from Firebase Console.
- After login, the dashboard should check `admins/{uid}` before allowing access.
- If the Auth user exists but `admins/{uid}` is missing or inactive, login is rejected and Firebase signs the user out.

## Manual Test Admin Example

For the first login test, add the admin yourself from Firebase.

1. Create a user in Firebase Authentication:

```text
Email: super.admin@docschain.local
Password: Admin@123456
```

2. Copy the created Firebase Auth `uid`.

3. Create this Firestore document manually:

```ts
admins/{uid} {
  uid: "{same Firebase Auth uid}"
  email: "super.admin@docschain.local"
  displayName: "DocsChain Super Admin"
  adminRole: "super_admin"
  isActive: true
  createdAt: serverTimestamp()
  createdBy: "firebase_console"
  lastLoginAt: null
}
```

Preferred setup: make the Firestore document ID the same as the Firebase Auth `uid`.

Compatibility: legacy auto-generated admin document IDs are still accepted only when exactly one `admins` document has a `uid` field matching the Firebase Auth user uid. The same active-role validation still applies.

If login shows `This account is not registered as an admin.`, the Firebase Auth account exists, but Firestore has neither `admins/{uid}` nor exactly one legacy admin document with `uid` equal to that Auth user's uid.

Required document shape:

```ts
admins/{uid} {
  uid: string
  email: string
  displayName: string
  adminRole: "super_admin" | "admin" | "support"
  isActive: boolean
  createdAt: serverTimestamp()
  createdBy: "firebase_console"
  lastLoginAt: serverTimestamp() | null
}
```

## Next Milestones

1. Test login and forgot-password with a real Firebase project config.
2. Confirm Firestore rules allow the signed-in admin to read `admins/{uid}` or query by `uid`.
3. Decide the post-login route once the dashboard shell returns.
4. Rebuild the dashboard shell after login is complete.
