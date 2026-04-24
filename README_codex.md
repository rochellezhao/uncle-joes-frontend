# Uncle Joe's Frontend

This is a lightweight single-page frontend connected to the live Uncle Joe's API at:

`https://uncle-joes-api-24755618771.us-central1.run.app`

## Endpoint Review

- `GET /locations`
  Used for the Locations page.
  Live response currently includes `total_locations` and an `addresses` array.
  The address strings are parsed on the frontend into street, city, state, and zip.

- `GET /menu`
  Used for the Menu page.
  Live response currently includes `items` with fields such as `name`, `category`, `size`, `calories`, and `price`.

- `GET /menu/categories`
  Used for category filters on the Menu page.

- `POST /login`
  Used for member sign-in.
  The frontend expects the login response to include a member identifier and stores it locally for the signed-in session.

- `GET /members/{member_id}`
  Used to hydrate the signed-in member's profile after login.

- `GET /members/{member_id}/orders`
  Used for order history.
  The frontend only calls this for the stored signed-in member ID.

- `GET /members/{member_id}/points`
  Used for loyalty points.
  The frontend only calls this for the stored signed-in member ID.

## Important API Notes

- The public locations list route does not currently expose phone numbers, store names, or location IDs in its live response, so the frontend does not invent those values.
- The account pages are wired to the documented member-specific routes and persist the signed-in `member_id` in local storage.
- Because no public member-list endpoint is exposed, the account flow must be tested with a real member email supported by the API's login route.

## Run Locally

From this folder, start a simple static server, for example:

`python3 -m http.server 4173`

Then open:

`http://localhost:4173`
