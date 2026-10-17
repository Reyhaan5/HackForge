# Bruno API checks

This collection covers all 13 route registrations in `Backend/app.py`: the login and registration aliases, receipt processing and reads, employee and policy endpoints, session, both reset aliases, and CSV export.

## Open and run

1. Open this `bruno` directory as a Bruno collection.
2. Select the `local` environment, or set `baseUrl` to the backend URL.
3. Start the backend and its database. The default demo credentials come from `Backend/database.py`; override them in the environment if your database uses different accounts.
4. Run requests in sequence so the login requests can set the in-memory `adminToken` and `employeeToken` used by later requests.

## Safety

Several requests write data. Registration creates employee accounts, receipt upload stores a receipt and an image, and policy update overwrites the active rules. The two `Reset` requests are destructive: either one deletes **all receipt records** in the database. Run the full collection only against a disposable database. Do not run the reset requests against shared or production data.

The receipt upload uses the checked-in fixture at `test/test_images/receipt_normal_usd.jpg`. If the backend has a Gemini/Google API key configured, the upload may call the configured extraction service; remove that key from the backend environment to exercise its local fallback instead.

## Request inventory

| Method | Path | Notes |
|---|---|---|
| POST | `/api/login` | Saves the admin bearer token for this collection run |
| POST | `/auth/login` | Login alias |
| POST | `/api/register` | Creates a generated demo employee |
| POST | `/auth/register` | Registration alias; creates another generated demo employee |
| POST | `/api/process-receipt` | Multipart upload; writes a receipt |
| GET | `/api/receipts` | Includes employee, channel, and status filters |
| GET | `/api/employees` | Authenticated employee listing |
| GET | `/api/policy` | Reads active rules |
| PUT | `/api/policy` | Writes active rules |
| GET | `/api/session` | Reads scoped history and spend |
| POST | `/api/reset-session` | **Destructive** receipt reset |
| POST | `/api/reset` | Reset alias; **destructive** |
| GET | `/api/export-csv` | Checks CSV response content type |

The collection checks HTTP status and key response fields. Bruno stores login tokens as runtime variables only; they are not persisted into the environment file.
