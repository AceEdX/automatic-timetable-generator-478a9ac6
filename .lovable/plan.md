

# Save Data Locally Without Login

## Summary
Remove the sign-in requirement entirely and save all user data to the browser's localStorage. This means data persists across page refreshes on the same device without needing any account.

## What Changes

### 1. Add localStorage persistence layer
Create a new hook `useLocalPersistence.ts` that automatically saves and loads all data (school settings, teachers, classes, subjects, time slots, and generated timetables) to/from localStorage whenever they change.

### 2. Update SchoolDataContext to use localStorage
Replace the current cloud-sync logic (which requires a logged-in user) with localStorage-based persistence that works immediately for everyone -- no sign-in needed.

### 3. Remove sign-in UI from sidebar
Remove the "Sign In to Save Data" button, auth dialog, and all auth-related imports from the AppLayout sidebar. The app will just work out of the box.

### 4. Clean up unused auth code
- Remove `AuthProvider` wrapper from `App.tsx` (or keep it minimal)
- Remove `AuthPage.tsx`
- Remove the `/auth` redirect route

### 5. Fix the /auth route landing issue
The user is currently stuck on `/auth` which redirects to `/` but still shows issues. This will be resolved by removing the auth route entirely.

---

## Technical Details

### New file: `src/hooks/useLocalPersistence.ts`
- Uses `localStorage.getItem` / `localStorage.setItem` with JSON serialization
- Keys: `aceedx_school`, `aceedx_teachers`, `aceedx_classes`, `aceedx_subjects`, `aceedx_timeslots`, `aceedx_timetable`
- Loads on mount, saves on every state change via `useEffect`

### Modified: `src/context/SchoolDataContext.tsx`
- Remove `useAuth` and `useDataPersistence` imports/usage
- Replace with `useLocalPersistence` for load/save
- On mount: load from localStorage; if empty, use mock defaults
- On every state change: debounce-save to localStorage

### Modified: `src/components/AppLayout.tsx`
- Remove auth dialog, sign-in button, sign-out button, and all auth imports
- Simplify sidebar footer to just show school name/board info

### Modified: `src/App.tsx`
- Remove `AuthProvider` wrapper
- Remove `/auth` route
- Keep all other routes as-is

### Deleted: `src/pages/AuthPage.tsx`

## Limitations
- Data only exists on the current browser/device
- Clearing browser data will erase timetable data
- No cross-device sync

