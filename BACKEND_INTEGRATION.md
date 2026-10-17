# Backend integration

## Χάρτης κώδικα για τον επόμενο developer

Read the code in this order to follow a complete request:

1. `src/types/models.ts` defines the UI's stable data shapes. Its field comments explain which values come from the server.
2. `src/services/contracts.ts` lists every operation the pages may call. `src/services/index.ts` selects the implementation using `VITE_API_MODE`.
3. `src/services/http/httpServices.ts` maps those operations to proposed endpoints and payloads. This is the first file to change after agreeing on the backend API. `src/services/http/httpClient.ts` handles the common HTTP details, cookies, JSON, and errors.
4. `src/services/mock/data.ts` and `src/services/mock/mockServices.ts` are demo-only equivalents. They show example responses and expected validation but are not part of real-mode persistence.
5. `src/app/AuthContext.tsx` restores and updates the signed-in user. `src/pages/DashboardPage.tsx` reads the full day's roster; `src/pages/ShiftEntryPage.tsx` submits a unit's assignments and rebuilds the form from the saved response.
6. `src/utils/permissions.ts` only shapes the UI. The server must enforce the authorization rules below. `src/utils/exportExcel.ts` generates the spreadsheet in the browser from already loaded service data.

Τα ελληνικά σχόλια δίπλα στους τύπους, τα effects, τις μετατροπές, τις κλήσεις API και τους κανόνες ελέγχου εξηγούν γιατί υπάρχει κάθε βήμα. Οι σελίδες δεν χρειάζεται να γνωρίζουν τα συγκεκριμένα endpoint paths.

## 1. Frontend data flow

The UI is React with typed service interfaces in `src/services/contracts.ts`. Pages call `services` from `src/services/index.ts`; that single composition point selects the mock or HTTP adapter. Components do not call `fetch` or read persistent storage. `AuthProvider` loads the current user. Dashboard and shift entry retrieve data on date changes, and the shift form rebuilds its state from the service response after a successful save. Effect cleanup discards responses for obsolete dates or units. The Dashboard has an explicit refresh action for server-side changes.

The browser date key is `YYYY-MM-DD` in `Europe/Athens`. Treat it as a calendar date, not as a UTC timestamp. All roster requests and filenames use this key. `formatGreekDate` is display-only.

## 2. Data contracts

Canonical TypeScript interfaces are in `src/types/models.ts`:

| Type | Important fields |
| --- | --- |
| `User` | `id`, `username`, `displayName`, `role: admin\|user`, `departmentId: string\|null`, `editableUnitIds: string[]` |
| `Department` | `id`, `name`, `kind: department\|service`, `shiftTypes: ShiftType[]` |
| `StaffMember` | `id`, `fullName`, `departmentId`, `availableForUnitIds` |
| `ShiftType` | `id`, `label` |
| `ShiftAssignment` | `id`, `date`, `unitId`, `shiftTypeId`, `staffIds`, optional `updatedAt` |
| `DailyRoster` | `date`, `assignments: ShiftAssignment[]` |
| `SaveUnitAssignmentsRequest` | `date`, `unitId`, complete `assignments` array for one unit |

Stable IDs must be used throughout. Staff membership is immutable from this application. `availableForUnitIds` controls the options for 24H service as well as department shifts. Units supply their own shift types; no fixed three-shift assumption exists in the UI.

## 3. Service methods and proposed HTTP contract

The paths below are **proposals** to agree with the backend developer. `src/services/http/httpServices.ts` is the sole place to adapt paths or response mappings. JSON is expected. Example IDs are illustrative.

| Frontend operation | Service method | Proposed endpoint |
| --- | --- | --- |
| Login | `AuthService.login` | `POST /auth/login` |
| Restore session / current user | `AuthService.currentUser` | `GET /auth/me` |
| Sign out | `AuthService.logout` | `POST /auth/logout` |
| Submit registration request | `AuthService.register` | `POST /auth/registration-requests` |
| Registration dropdown and application unit catalog | `StaffService.getDepartments` | `GET /units` |
| Staff options for one unit | `StaffService.getStaff` | `GET /units/{unitId}/staff` |
| Dashboard and existing shift values | `ShiftService.getDailyRoster` | `GET /rosters/{date}` |
| Replace one unit's daily assignments | `ShiftService.saveUnitAssignments` | `PUT /rosters/{date}/units/{unitId}` |
| Excel export | Client-side `buildRosterWorkbook` | No endpoint; uses loaded roster, units, staff |

`GET /units` needs to be readable before login for the registration form. Other catalog and roster endpoints require authentication. Alternatively, if the backend splits public registration options into another endpoint, map it in `StaffService` without changing the page.

### Authentication examples

`POST /auth/login` request:

```json
{"username":"d4","password":"example-password"}
```

Successful `POST /auth/login` and `GET /auth/me` response:

```json
{"id":"u-d4","username":"d4","displayName":"Δ4","role":"user","departmentId":"d4","editableUnitIds":["d4"]}
```

`GET /auth/me` returns `401` when signed out; the adapter maps that to `null`. Login should establish a secure server session, preferably an HttpOnly cookie. The HTTP client sends `credentials: include`. Configure CORS and cookie attributes for the actual deployment origin. If cookie authentication is used, the backend must supply CSRF protection for state-changing requests; add the agreed token header to `HttpClient` once its contract is known. Do not store passwords or long-lived tokens in localStorage. `POST /auth/logout` can return `204`.

`POST /auth/registration-requests` request:

```json
{"fullName":"Ελένη Παράδειγμα","username":"eleni","password":"example-password","departmentId":"d4"}
```

The chosen department is only a request attribute; it must not grant access or admin rights. A `204` response means submission accepted, not account activation.

### Catalog examples

`GET /units` response:

```json
[
  {"id":"d4","name":"Δ4","kind":"department","shiftTypes":[{"id":"morning","label":"Πρωινή"}]},
  {"id":"24h","name":"24ωρη Υπηρεσία — ΑΚΠ / ΑΥΜ","kind":"service","shiftTypes":[{"id":"duty","label":"24ωρη υπηρεσία"}]}
]
```

The real response must include Δ4, Δ5, ΕΜΚ and the 24H unit with their agreed shift types. No times are assumed by the current frontend.

`GET /units/d4/staff` response:

```json
[{"id":"staff-123","fullName":"Ελένη Παράδειγμα","departmentId":"d4","availableForUnitIds":["d4"]}]
```

The 24H staff endpoint should return only eligible members. The frontend cannot create, rename, delete, or move staff or units.

### Roster examples

`GET /rosters/2026-10-17` response:

```json
{"date":"2026-10-17","assignments":[{"id":"a-123","date":"2026-10-17","unitId":"d4","shiftTypeId":"morning","staffIds":["staff-123"],"updatedAt":"2026-10-17T08:10:00Z"}]}
```

An omitted assignment or an empty `staffIds` means no person has been declared. The frontend renders every configured shift even if its assignment is absent. A shift can contain multiple people. The API should return the complete day's roster for all units, because the Dashboard and Excel export show the whole day.

`PUT /rosters/2026-10-17/units/d4` request:

```json
{"assignments":[{"shiftTypeId":"morning","staffIds":["staff-123"]},{"shiftTypeId":"afternoon","staffIds":[]}]}
```

The request contains all configured shifts for the selected unit. The server must upsert by `(date, unitId, shiftTypeId)` atomically, prevent duplicates, and preserve every other unit and date. Return a `DailyRoster` with the effective saved state. The UI uses that response to show success and replace its draft; a rejected save leaves the draft unsaved. If concurrent edits matter, introduce a revision/ETag contract before deployment.

## 4. Identity and authorization

The backend must authenticate every protected request and derive permissions from trusted server-side state. It must enforce the following independently of the UI:

- Δ4, Δ5, ΕΜΚ users can update only their own unit's daily assignments.
- ΑΚΠ and ΑΥΜ admins can update all three departments and the 24H service.
- All authenticated users can read the complete daily roster and export it on the client.
- No app user, including an admin, can modify staff lists, staff department membership, units, or shift configuration through this application.
- Every save must validate the date, configured shift IDs, duplicate staff IDs in a shift, and each person's membership/eligibility for the target unit. A person in different shifts on one day is currently allowed.

The UI filters controls using `editableUnitIds`, and both adapters check the requested unit before save. These checks are for feedback only. The server must reject forged or stale requests with `403`/`422` as appropriate.

## 5. Errors and state

The HTTP client maps `400/422` to validation, `401` to unauthorized, `403` to forbidden, `404` to not found, and network/5xx to readable errors. Suggested error payload:

```json
{"message":"Το άτομο δεν είναι διαθέσιμο για το τμήμα.","fieldErrors":{"assignments.0.staffIds":"Μη έγκυρη επιλογή"}}
```

The current UI displays the message and never reports success after a rejected save. A future backend may add field-level rendering using `ServiceError.fieldErrors`. Loading states disable save and export during requests. The `GET /auth/me` response should stay current when permissions change. For stronger handling of expired sessions during a protected page request, the app can redirect to login on a `401` after the final auth/session contract is settled.

## 6. Switching to the real API and deployment

1. Confirm endpoints, JSON shapes, cookie/CSRF behavior, and any proxy prefix with the backend developer.
2. Adjust only `src/services/http/httpServices.ts` and `httpClient.ts` if paths or payloads differ. Keep `contracts.ts` stable; map backend DTOs to these UI contracts in the adapter if needed.
3. Set `VITE_API_MODE=real` and `VITE_API_BASE_URL=/api` (or the deployed API origin) at **build time**. Rebuild with `npm run build`.
4. Serve `dist/` as static files from the internal Linux web server, with SPA fallback to `index.html` and HTTPS for credentials. Ensure the API is reachable at the configured URL and cookie policy allows the frontend origin.
5. Run the type check, lint, tests and production build. Verify all five roles and a multi-user save against the actual backend.

Mock mode alone uses localStorage for roster data and sessionStorage for a demo user ID. It provides no cross-browser sync or server security. Real mode does not access these stores.
