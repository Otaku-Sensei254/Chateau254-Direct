# Implementation Plan for Château254 Booking Feature

## Overview
This plan implements the requested booking feature with the following components:
1. Customer booking form in `/booking` route
2. Admin reservations management in admin dashboard
3. Table management with reserved/occupied/available states
4. Authentication guard for home page access
5. Route redirects for admin/rider to their dashboards

## Key Components

### 1. Booking Feature (`booking.jsx`)
- Authenticated form requiring logged-in user
- Fields: name, party size, preferred item/package, dining time, notes
- POST to `/api/bookings` with auth token
- Success message with reservation confirmation
- Uses catalog items for preferred item dropdown

### 2. Admin Reservations Management
- Added "Reservations" to admin sidebar
- Shows all bookings with status filtering
- Assign tables to bookings (marks table reserved)
- Real-time updates via socket events

### 3. Table Management
- Added "Tables" to admin sidebar
- Create/edit tables with status: available/reserved/occupied
- Table status syncs with bookings
- Real-time status updates

### 4. Authentication Guards
- `/` route redirects logged-in users to `/menu`
- `/profile` redirects admin/rider to their dashboards
- `/booking` requires authentication

## Files Modified

### 1. `src/App.js`
- Added `GuestRoute` component
- Added `ProfileRoute` component
- Updated `/` route to use `GuestRoute`
- Updated `/profile` route to use `ProfileRoute`
- Updated `/booking` route to pass user/token and require auth
- Passed `catalog` to `Booking` component

### 2. `src/pages/UI/booking.jsx`
- Complete booking form with all required fields
- Authenticated POST to `/api/bookings`
- Success message on successful submission
- Responsive design matching existing patterns

### 3. `src/pages/UI/admin/admin_dash.jsx`
- Added `bookings` and `tables` state variables
- Added `fetchBookings` and `fetchTables` functions
- Added socket listeners for `booking:created` and `booking:updated`
- Added "Reservations" and "Tables" to sidebar navigation
- Added `ReservationsContent` component
- Added `TablesContent` component
- Added `TableEditor` modal component
- Added table assignment/unassignment functions

### 5. `src/App.css`
- Added CSS for booking page
- Added CSS for booking form fields
- Added success message styling
- Added reservation status badge colors
- Added table status styling

## Verification Steps

1. **Build Validation**: `npm run build` completes without errors
2. **Route Testing**:
   - Logged-in user accessing `/` redirects to `/menu`
   - Logged-in user accessing `/profile` redirects to `/admin` or `/rider`
   - `/booking` route requires authentication
3. **Feature Testing**:
   - Customer submits booking form with valid data
   - Admin sees new reservation in "Reservations" tab
   - Admin can assign tables to bookings
   - Admin can update table status (available/reserved/occupied)
4. **Socket Events**:
   - New bookings trigger `booking:created` event
   - Table assignments trigger `booking:updated` event

## Risks & Mitigations

1. **API Endpoints**: Backend must implement `/api/bookings`, `/api/bookings/:id/table`, `/api/tables`, `/api/tables/:id/status`
   - Mitigation: Follow existing API patterns from `/orders` and `/menu`

2. **Socket Integration**: Admin dashboard must have backend socket events
   - Mitigation: Added socket event handling as shown in implementation

3. **State Management**: Ensure state updates are properly synchronized
   - Mitigation: Used `Promise.all` for concurrent fetches and socket event handlers

4. **CSS Compatibility**: New styles must match existing design system
   - Mitigation: Used existing CSS variables and pattern matching

## Next Steps

1. Implement backend API endpoints
2. Verify frontend integration with API
3. Test all user flows including edge cases
4. Deploy to staging environment