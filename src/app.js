const API_BASE_URL = "https://uncle-joes-api-24755618771.us-central1.run.app";
const SESSION_KEY = "uncle-joes-session";

const state = {
  route: window.location.hash || "#/",
  auth: loadSession(),
  navOpen: false,
};

const menuCache = {
  items: null,
  categories: null,
};

const locationsMapState = {
  map: null,
  markersLayer: null,
};

const locationDetailsCache = new Map();

const app = document.querySelector("#app");
const signInLink = document.querySelector("#signin-link");
const signOutButton = document.querySelector("#signout-button");
const navToggle = document.querySelector("#nav-toggle");
const siteNav = document.querySelector("#site-nav");

const routes = {
  "#/": renderHome,
  "#/locations": renderLocations,
  "#/menu": renderMenu,
  "#/signin": renderSignIn,
  "#/account": renderAccount,
};

navToggle.addEventListener("click", () => {
  state.navOpen = !state.navOpen;
  siteNav.classList.toggle("open", state.navOpen);
  navToggle.setAttribute("aria-expanded", String(state.navOpen));
});

siteNav.addEventListener("click", (event) => {
  if (event.target.matches("a, button")) {
    state.navOpen = false;
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

signOutButton.addEventListener("click", () => {
  clearSession();
  state.auth = null;
  navigate("#/");
});

window.addEventListener("hashchange", () => {
  state.route = window.location.hash || "#/";
  renderRoute();
});

renderRoute();

function renderRoute() {
  updateAuthUI();

  const routeKey = state.route.split("?")[0];
  const routeHandler = routes[routeKey] || renderNotFound;
  routeHandler();
}

function navigate(hash) {
  if (window.location.hash === hash) {
    state.route = hash;
    renderRoute();
    return;
  }

  window.location.hash = hash;
}

function updateAuthUI() {
  const isSignedIn = Boolean(state.auth?.memberId);
  signInLink.classList.toggle("hidden", isSignedIn);
  signOutButton.classList.toggle("hidden", !isSignedIn);
  signInLink.textContent = isSignedIn ? "Signed in" : "Sign in";
}

function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? normalizeSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalizeSession(session)));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

function normalizeSession(session) {
  if (!session) {
    return null;
  }

  const loginPayloadMemberId = extractMemberId(session.loginPayload || {});
  const profileMemberId = session.profile?.memberId || normalizeProfile(session.profile || {}).memberId;
  const upgradedMemberId =
    loginPayloadMemberId ||
    profileMemberId ||
    session.memberId ||
    session.email ||
    "";

  return {
    ...session,
    memberId: upgradedMemberId,
    profile: mergeProfiles(
      {
        memberId: upgradedMemberId,
        email: session.email || "",
      },
      session.profile || {},
    ),
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function renderFrame(content) {
  app.innerHTML = content;
}

function renderLoadingFrame(title, copy) {
  renderFrame(`
    <section class="view">
      <div class="section-head">
        <div>
          <span class="eyebrow">${escapeHtml(title)}</span>
          <h2>${escapeHtml(copy)}</h2>
        </div>
      </div>
      <div class="status-box">
        <div class="loading">Loading...</div>
      </div>
    </section>
  `);
}

function renderErrorFrame(title, error, retryHash = state.route) {
  renderFrame(`
    <section class="view">
      <div class="section-head">
        <div>
          <span class="eyebrow">${escapeHtml(title)}</span>
          <h2>Something went wrong</h2>
        </div>
      </div>
      <div class="status-box error">
        <strong>Unable to load this view</strong>
        <span>${escapeHtml(error.message)}</span>
        <button class="secondary-button" id="retry-button">Try again</button>
      </div>
    </section>
  `);

  document.querySelector("#retry-button")?.addEventListener("click", () => {
    navigate(retryHash);
  });
}

function renderHome() {
  const memberName = state.auth?.profile?.firstName || state.auth?.profile?.first_name || "there";
  const signedInNotice = state.auth?.memberId
    ? `<div class="status-box success">
        <strong>You're signed in</strong>
        <span>Your account details, points, and order history are ready to view.</span>
      </div>`
    : "";

  renderFrame(`
    <section class="view">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Welcome to Uncle Joe's</span>
          <h1>Your cozy coffee corner for menu browsing, store finding, and rewards check-ins.</h1>
          <p>
            Settle in, explore the drink menu, find a nearby shop, and sign in to see the rewards and order history
            connected to your real member account.
          </p>
          <div class="hero-actions">
            <a class="primary-button" href="#/menu">See what's brewing</a>
            <a class="secondary-button" href="${state.auth?.memberId ? "#/account" : "#/signin"}">
              ${state.auth?.memberId ? "Open my account" : "Member sign in"}
            </a>
          </div>
          <div class="welcome-strip">
            <div class="welcome-pill">
              <strong>Warm drinks</strong>
              <span>Fresh picks to explore</span>
            </div>
            <div class="welcome-pill">
              <strong>Rewards</strong>
              <span>Points for signed-in members</span>
            </div>
            <div class="welcome-pill">
              <strong>Nearby shops</strong>
              <span>Easy to browse by state</span>
            </div>
          </div>
          ${signedInNotice}
        </div>
        <aside class="hero-aside">
          <article class="coffee-photo-card" aria-label="Coffee photo">
            <div class="coffee-photo-frame">
              <img class="coffee-photo-image" src="./coffee.jpeg" alt="Coffee being served at a cafe table" />
            </div>
            <div class="coffee-photo-caption">
              <span class="eyebrow">Morning ritual</span>
              <strong>Soft light, fresh coffee, and a calmer welcome.</strong>
            </div>
          </article>
        </aside>
      </section>

      <section class="home-story-grid">
        <article class="feature-card feature-card-large">
          <span class="eyebrow">Hi, ${escapeHtml(memberName)}</span>
          <h3>Everything important is one click away.</h3>
          <p class="muted">
            The app keeps your signed-in session nearby so your points, rewards summary, and order history stay linked
            to your account while you browse.
          </p>
        </article>
        <article class="feature-card">
          <span class="eyebrow">Locations</span>
          <h3>Plan your next coffee run.</h3>
          <p class="muted">Browse live store addresses and jump straight to the closest Uncle Joe's stop.</p>
        </article>
        <article class="feature-card">
          <span class="eyebrow">Menu</span>
          <h3>Pick something comforting.</h3>
          <p class="muted">Coffee, espresso, tea, and seasonal-feeling favorites are organized in a cleaner menu layout.</p>
        </article>
      </section>
    </section>
  `);
}

async function renderLocations() {
  renderLoadingFrame("Locations", "Loading store locations");

  try {
    const payload = await apiRequest("/locations");
    const locationRecords = extractLocationRecords(payload);
    let locations = locationRecords
      .map((entry, index) => normalizeLocation(entry, index))
      .sort(sortLocations);

    renderFrame(`
      <section class="view">
        <div class="section-head">
          <div>
            <span class="eyebrow">Locations</span>
            <h2>${escapeHtml(String(payload?.total_locations || payload?.count || locations.length))} live stores</h2>
          </div>
        </div>

        <section class="panel locations-browser">
          <div class="locations-toolbar">
            <div class="field">
              <label for="location-search">Search by city or state</label>
              <input
                class="input"
                id="location-search"
                type="search"
                placeholder="Try Indianapolis or Florida"
                autocomplete="off"
              />
            </div>
            <div class="locations-summary">
              <strong id="locations-result-count">${locations.length}</strong>
              <span>matching locations</span>
            </div>
          </div>
          <section class="locations-map-panel">
            <div class="locations-map-head">
              <div>
                <span class="eyebrow">Map view</span>
                <h3>See store locations on the map</h3>
              </div>
              <p class="muted" id="locations-map-copy">Showing stores with map coordinates.</p>
            </div>
            <div id="locations-map" class="locations-map"></div>
            <div id="locations-map-empty" class="helper-text hidden">
              Map pins will appear here when location coordinates are available.
            </div>
          </section>
          <div id="locations-results"></div>
        </section>
      </section>
    `);

    const searchInput = document.querySelector("#location-search");
    const resultsNode = document.querySelector("#locations-results");
    const countNode = document.querySelector("#locations-result-count");

    const renderLocationGroups = (searchTerm = "") => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const filteredLocations = normalizedSearch
        ? locations.filter((location) => {
            const haystack = [location.city, location.state, location.stateName, location.raw]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return haystack.includes(normalizedSearch);
          })
        : locations;

      const groupedLocations = groupBy(filteredLocations, (location) => location.stateName || location.state || "Other");
      const orderedStates = Object.keys(groupedLocations).sort((a, b) => a.localeCompare(b));

      countNode.textContent = String(filteredLocations.length);
      renderLocationsMap(filteredLocations);

      if (!filteredLocations.length) {
        resultsNode.innerHTML = `
          <div class="empty-state">
            <strong>No matching locations</strong>
            <p class="muted">Try a different city or state search.</p>
          </div>
        `;
        return;
      }

      resultsNode.innerHTML = `
        <div class="state-groups">
          ${orderedStates
            .map((state) => {
              const stateLocations = groupedLocations[state];
              return `
                <section class="state-group">
                  <div class="state-group-header">
                    <div>
                      <span class="eyebrow">${escapeHtml(state)}</span>
                      <h3>${escapeHtml(state)}</h3>
                    </div>
                    <p class="muted">${stateLocations.length} locations</p>
                  </div>
                  <div class="grid locations-grid">
                    ${stateLocations
                      .map(
                        (location) => `
                          <article class="card">
                            <span class="eyebrow">${escapeHtml(location.city || "Location")}</span>
                            <h4 class="card-title">${escapeHtml(location.name || location.street || "Address unavailable")}</h4>
                            ${location.name && location.street ? `<p class="muted">${escapeHtml(location.street)}</p>` : ""}
                            <div class="detail-list">
                              <div class="detail-row">
                                <span class="detail-label">City</span>
                                <span class="detail-value">${escapeHtml(location.city || "Unavailable")}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">State</span>
                                <span class="detail-value">${escapeHtml(location.stateName || location.state || "Unavailable")}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">ZIP</span>
                                <span class="detail-value">${escapeHtml(location.zip || "Unavailable")}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Phone</span>
                                <span class="detail-value">${escapeHtml(location.phone || "Unavailable")}</span>
                              </div>
                            </div>
                            <div class="amenities-section">
                              <span class="detail-label">Amenities</span>
                              <div class="amenities-grid">
                                ${renderAmenityPill("Wi-Fi", location.amenities.wifi)}
                                ${renderAmenityPill("Drive-through", location.amenities.driveThrough)}
                                ${renderAmenityPill("DoorDash", location.amenities.doordash)}
                              </div>
                            </div>
                          </article>
                        `,
                      )
                      .join("")}
                  </div>
                </section>
              `;
            })
            .join("")}
        </div>
      `;
    };

    renderLocationGroups();
    searchInput?.addEventListener("input", (event) => {
      renderLocationGroups(event.target.value);
    });

    hydrateLocationDetails(locations).then((hydratedLocations) => {
      locations = hydratedLocations.sort(sortLocations);
      renderLocationGroups(searchInput?.value || "");
    });
  } catch (error) {
    renderErrorFrame("Locations", error);
  }
}

async function renderMenu() {
  renderLoadingFrame("Menu", "Loading menu and categories");

  try {
    if (!menuCache.items || !menuCache.categories) {
      const [menuPayload, categoriesPayload] = await Promise.all([
        apiRequest("/menu"),
        apiRequest("/menu/categories"),
      ]);

      menuCache.items = Array.isArray(menuPayload?.items) ? menuPayload.items.map(normalizeMenuItem) : [];
      menuCache.categories = Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : [];
    }

    const items = menuCache.items;
    const categories = menuCache.categories;

    const query = new URLSearchParams(state.route.split("?")[1] || "");
    const activeCategory = query.get("category") || "all";
    const activeSearch = query.get("search") || "";

    const filteredItems = items.filter((item) => {
      const matchesCategory = activeCategory === "all" ? true : item.category === activeCategory;
      const matchesSearch = activeSearch
        ? item.name.toLowerCase().includes(activeSearch.toLowerCase())
        : true;
      return matchesCategory && matchesSearch;
    });

    const groupedItems = groupBy(filteredItems, (item) => item.category || "Other");

    renderFrame(`
      <section class="view">
        <div class="section-head">
          <div>
            <span class="eyebrow">Menu</span>
            <h2>${escapeHtml(String(items.length))} live menu entries</h2>
          </div>
          <form class="menu-toolbar" id="menu-filter-form">
            <div class="field menu-control menu-search-control">
              <label class="helper-text" for="menu-search">Search for an item</label>
              <div class="menu-search-row">
                <input
                  class="input search"
                  id="menu-search"
                  type="search"
                  placeholder="Try Latte or Mocha"
                  value="${escapeAttribute(activeSearch)}"
                  autocomplete="off"
                />
                <button class="primary-button menu-search-button" type="submit">Search</button>
              </div>
            </div>
            <div class="field menu-control">
              <label class="helper-text" for="category-filter">Category</label>
              <select class="select" id="category-filter">
                <option value="all"${activeCategory === "all" ? " selected" : ""}>All categories</option>
                ${categories
                  .map(
                    (category) =>
                      `<option value="${escapeAttribute(category)}"${
                        activeCategory === category ? " selected" : ""
                      }>${escapeHtml(category)}</option>`,
                  )
                  .join("")}
              </select>
            </div>
          </form>
        </div>

        <div class="menu-groups">
          <div class="status-box">
            <strong>Good to know</strong>
            <span>
              Some drinks include limited details right now, so a few descriptions may be shorter than others.
            </span>
          </div>
          ${
            !filteredItems.length
              ? `<div class="empty-state">
                  <strong>No menu items found</strong>
                  <p class="muted">Try a different item name or category.</p>
                </div>`
              : ""
          }
          ${Object.entries(groupedItems)
            .map(
              ([category, categoryItems]) => `
                <section class="panel menu-group">
                  <div class="section-head">
                    <div>
                      <span class="eyebrow">${escapeHtml(category)}</span>
                      <h2>${escapeHtml(category)}</h2>
                    </div>
                    <p class="muted">${categoryItems.length} item variants</p>
                  </div>
                  <div class="menu-items">
                    ${categoryItems
                      .map(
                        (item) => `
                          <article class="menu-item">
                            <div class="menu-item-top">
                              <div>
                                <h3>${escapeHtml(item.name)}</h3>
                                <p class="muted">${escapeHtml(item.description)}</p>
                              </div>
                              <strong>${escapeHtml(item.price)}</strong>
                            </div>
                            <div class="tag-row">
                              <span class="tag">${escapeHtml(item.category)}</span>
                              <span class="tag">${escapeHtml(item.size)}</span>
                              <span class="tag">${escapeHtml(item.calories)}</span>
                            </div>
                          </article>
                        `,
                      )
                      .join("")}
                  </div>
                </section>
              `,
            )
            .join("")}
        </div>
      </section>
    `);

    const updateMenuFilters = () => {
      const nextCategory = document.querySelector("#category-filter")?.value || "all";
      const nextSearch = document.querySelector("#menu-search")?.value?.trim() || "";
      const nextQuery = new URLSearchParams();

      if (nextCategory !== "all") {
        nextQuery.set("category", nextCategory);
      }

      if (nextSearch) {
        nextQuery.set("search", nextSearch);
      }

      navigate(nextQuery.toString() ? `#/menu?${nextQuery.toString()}` : "#/menu");
    };

    document.querySelector("#menu-filter-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      updateMenuFilters();
    });

    document.querySelector("#category-filter")?.addEventListener("change", updateMenuFilters);
  } catch (error) {
    renderErrorFrame("Menu", error);
  }
}

function renderSignIn() {
  if (state.auth?.memberId) {
    navigate("#/account");
    return;
  }

  renderFrame(`
    <section class="view">
      <div class="split-layout">
        <section class="panel">
          <div class="section-head">
            <div>
              <span class="eyebrow">Member login</span>
              <h2>Sign in to your coffee club account</h2>
            </div>
          </div>

          <form class="auth-form" id="signin-form">
            <div class="field">
              <label for="email">Email</label>
              <input class="input" id="email" name="email" type="email" required autocomplete="email" />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input class="input" id="password" name="password" type="password" required autocomplete="current-password" />
            </div>
            <button class="primary-button" type="submit">Sign in</button>
          </form>

          <div id="signin-status"></div>
        </section>

        <aside class="panel">
          <span class="eyebrow">What you'll see</span>
          <div class="detail-list">
            <div class="detail-row">
              <span class="detail-label">Rewards</span>
              <span class="detail-value">Current points</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Profile</span>
              <span class="detail-value">Member details</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Orders</span>
              <span class="detail-value">Recent order history</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Stores</span>
              <span class="detail-value">Home shop info</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `);

  document.querySelector("#signin-form")?.addEventListener("submit", handleSignIn);
}

async function handleSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const statusNode = document.querySelector("#signin-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  statusNode.innerHTML = `<div class="status-box"><div class="loading">Signing in...</div></div>`;
  submitButton.disabled = true;

  try {
    const loginPayload = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const loginProfile = normalizeProfile(loginPayload);
    const loginSucceeded = String(loginPayload?.status || "").toLowerCase() === "success";
    const memberId =
      extractMemberId(loginPayload) ||
      loginProfile.memberId ||
      (loginSucceeded ? email : "");

    if (!memberId) {
      throw new Error(
        `We couldn't finish sign-in for this account just yet. Returned keys: ${summarizePayloadKeys(loginPayload)}.`,
      );
    }

    let profile = loginProfile.memberId || loginProfile.email || loginProfile.firstName ? loginProfile : null;

    try {
      profile = mergeProfiles(profile, normalizeProfile(await apiRequest(`/members/${memberId}`)));
    } catch (profileError) {
      profile = {
        ...(profile || {}),
        memberId,
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        email: profile?.email || email,
        fetchError: profileError.message,
      };
    }

    const session = {
      memberId,
      email,
      loginPayload,
      profile,
    };

    state.auth = session;
    saveSession(session);

    statusNode.innerHTML = `
      <div class="status-box success">
        <strong>Signed in successfully</strong>
        <span>Member ${escapeHtml(memberId)} is now stored in this browser.</span>
      </div>
    `;

    setTimeout(() => {
      navigate("#/account");
    }, 350);
  } catch (error) {
    statusNode.innerHTML = `
      <div class="status-box error">
        <strong>Sign-in failed</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `;
  } finally {
    submitButton.disabled = false;
  }
}

async function renderAccount() {
  if (!state.auth?.memberId) {
    navigate("#/signin");
    return;
  }

  renderLoadingFrame("Account", `Loading member ${state.auth.memberId}`);

  try {
    const memberId = state.auth.memberId;
    const [profileResult, pointsResult, ordersResult] = await Promise.allSettled([
      apiRequest(`/members/${memberId}`),
      apiRequest(`/members/${memberId}/points`),
      apiRequest(`/members/${memberId}/orders`),
    ]);

    if (pointsResult.status === "rejected") {
      throw pointsResult.reason;
    }

    if (ordersResult.status === "rejected") {
      throw ordersResult.reason;
    }

    const profile = mergeProfiles(
      state.auth.profile || { memberId, email: state.auth.email || memberId },
      profileResult.status === "fulfilled"
        ? normalizeProfile(profileResult.value)
        : {},
    );
    const points = normalizePoints(pointsResult.value);
    const orders = normalizeOrders(ordersResult.value);

    state.auth = {
      ...state.auth,
      profile,
    };
    saveSession(state.auth);

    renderFrame(`
      <section class="view">
        <div class="section-head">
          <div>
            <span class="eyebrow">Account</span>
            <h2>${escapeHtml(profile.displayName)}</h2>
          </div>
          <p class="muted">Member ID: <code>${escapeHtml(memberId)}</code></p>
        </div>

        <section class="metrics-grid">
          <article class="metric-card">
            <strong>${escapeHtml(points.display)}</strong>
            <span>${escapeHtml(points.programName)} points</span>
          </article>
          <article class="metric-card">
            <strong>${escapeHtml(String(orders.orderCount ?? orders.length))}</strong>
            <span>Orders on your account</span>
          </article>
          <article class="metric-card">
            <strong>${escapeHtml(profile.homeStore || "N/A")}</strong>
            <span>Home store from your member profile</span>
          </article>
        </section>

        <section class="two-column">
          <article class="panel">
            <span class="eyebrow">Profile</span>
            <div class="detail-list">
              <div class="detail-row">
                <span class="detail-label">First name</span>
                <span class="detail-value">${escapeHtml(profile.firstName || "Unavailable")}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Last name</span>
                <span class="detail-value">${escapeHtml(profile.lastName || "Unavailable")}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email</span>
                <span class="detail-value">${escapeHtml(profile.email || state.auth.email || "Unavailable")}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${escapeHtml(profile.phoneNumber || "Unavailable")}</span>
              </div>
            </div>
          </article>

          <article class="panel">
            <span class="eyebrow">Points logic</span>
            <p class="muted">
              Your rewards summary updates for the signed-in account only.
            </p>
            <p class="helper-text">
              Current balance <strong>${escapeHtml(points.display)}</strong>,
              lifetime orders <strong>${escapeHtml(String(points.lifetimeOrders))}</strong>.
            </p>
            ${
              profileResult.status === "rejected"
                ? `<p class="helper-text">Some profile details are being shown from your sign-in information.</p>`
                : ""
            }
          </article>
        </section>

        <section class="panel">
          <div class="section-head">
            <div>
              <span class="eyebrow">Order history</span>
              <h2>Your orders</h2>
            </div>
          </div>

          ${
            orders.length
              ? `<div class="order-list">
                  ${orders
                    .map(
                      (order) => `
                        <article class="order-card">
                          <div class="detail-row order-card-top">
                            <div>
                              <strong>Order ${escapeHtml(order.orderId)}</strong>
                              <div class="muted">${escapeHtml(order.date)}</div>
                            </div>
                            <strong>${escapeHtml(order.total)}</strong>
                          </div>
                          <div class="tag-row">
                            ${order.location ? `<span class="tag">${escapeHtml(order.location)}</span>` : ""}
                            ${order.status ? `<span class="tag">${escapeHtml(order.status)}</span>` : ""}
                          </div>
                          ${
                            order.lineItems.length
                              ? `<details class="order-details">
                                  <summary>
                                    <span>View items</span>
                                    <span>${escapeHtml(String(order.lineItems.length))} item${order.lineItems.length === 1 ? "" : "s"}</span>
                                  </summary>
                                  <div class="line-items">
                                    ${order.lineItems
                                      .map(
                                        (item) => `
                                          <div class="line-item line-item-rich">
                                            <div>
                                              <strong>${escapeHtml(item.name)}</strong>
                                              <div class="helper-text">
                                                ${escapeHtml(item.size)} · Qty ${escapeHtml(String(item.quantity))}${
                                                  item.quantity > 1 && item.unitPriceText !== item.displayPrice
                                                    ? ` · ${escapeHtml(item.unitPriceText)} each`
                                                    : ""
                                                }
                                              </div>
                                            </div>
                                            <span>${escapeHtml(item.displayPrice)}</span>
                                          </div>
                                        `,
                                      )
                                      .join("")}
                                    ${
                                      order.adjustmentText
                                        ? `<div class="line-item line-item-rich order-adjustment-row">
                                            <div>
                                              <strong>${escapeHtml(order.adjustmentLabel)}</strong>
                                              <div class="helper-text">Applied to match the final order total.</div>
                                            </div>
                                            <span>${escapeHtml(order.adjustmentText)}</span>
                                          </div>`
                                        : ""
                                    }
                                  </div>
                                </details>`
                              : `<div class="helper-text">Line item details are not available for this order yet.</div>`
                          }
                        </article>
                      `,
                    )
                    .join("")}
                </div>`
              : `<div class="empty-state">
                  <strong>No orders found</strong>
                  <p class="muted">There are no orders showing for this account yet.</p>
                </div>`
          }
        </section>
      </section>
    `);
  } catch (error) {
    renderErrorFrame("Account", error, "#/account");
  }
}

function renderNotFound() {
  renderFrame(`
    <section class="view">
      <div class="empty-state">
        <strong>Page not found</strong>
        <p class="muted">The page you were looking for isn't here.</p>
        <a class="primary-button" href="#/">Go home</a>
      </div>
    </section>
  `);
}

function normalizeLocation(rawAddress, index) {
  const record = rawAddress && typeof rawAddress === "object" ? rawAddress : null;
  const rawString = typeof rawAddress === "string" ? rawAddress.trim() : "";
  const prefixedAddressMatch = rawString.match(/^([0-9a-f-]{36})\s*:\s*(.+)$/i);
  const prefixedLocationId = prefixedAddressMatch ? prefixedAddressMatch[1] : "";
  const prefixedAddress = prefixedAddressMatch ? prefixedAddressMatch[2] : rawString;
  const amenitiesRecord = record?.amenities && typeof record.amenities === "object" ? record.amenities : null;
  const addressRecord =
    record?.address && typeof record.address === "object"
      ? record.address
      : record?.location && typeof record.location === "object"
        ? record.location
        : null;
  const rawValue = firstNonEmpty([
    typeof record?.address === "string" ? record.address : "",
    record?.address,
    record?.street_address,
    record?.streetAddress,
    record?.address_one,
    record?.addressOne,
    record?.address_line_1,
    record?.addressLine1,
    record?.full_address,
    record?.fullAddress,
    record?.location_map_address,
    record?.locationMapAddress,
    record?.location_address,
    record?.locationAddress,
    addressRecord?.full_address,
    addressRecord?.fullAddress,
    addressRecord?.street_address,
    addressRecord?.streetAddress,
    addressRecord?.address_one,
    addressRecord?.addressOne,
    addressRecord?.address_line_1,
    addressRecord?.addressLine1,
    record?.raw,
    prefixedAddress,
  ]);
  const trimmed = String(rawValue || "").trim();
  const match = trimmed.match(/^(.*)\s+([A-Za-z.' -]+)\s+([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/);
  const locationId = String(
    firstNonEmpty([
      prefixedLocationId,
      record?.location_id,
      record?.locationId,
      record?.store_id,
      record?.storeId,
      record?.id,
      record?.uuid,
      record?.location?.id,
      record?.location?.location_id,
    ]) || "",
  );
  const fallbackState = firstNonEmpty([record?.state, record?.state_code, record?.stateCode]) || "";
  const stateCode = (match?.[3] || fallbackState || "").trim().toUpperCase();
  const amenities = {
    wifi: normalizeAmenityValue(
      firstDefined([
        record?.wifi,
        record?.wi_fi,
        record?.wifi_available,
        record?.wifiAvailable,
        amenitiesRecord?.wifi,
        amenitiesRecord?.wi_fi,
        amenitiesRecord?.wifi_available,
        amenitiesRecord?.wifiAvailable,
      ]),
    ),
    driveThrough: normalizeAmenityValue(
      firstDefined([
        record?.drive_through,
        record?.drive_thru,
        record?.driveThrough,
        record?.has_drive_through,
        record?.hasDriveThrough,
        amenitiesRecord?.drive_through,
        amenitiesRecord?.drive_thru,
        amenitiesRecord?.driveThrough,
        amenitiesRecord?.has_drive_through,
        amenitiesRecord?.hasDriveThrough,
      ]),
    ),
    doordash: normalizeAmenityValue(
      firstDefined([
        record?.doordash,
        record?.door_dash,
        record?.doorDash,
        record?.doordash_available,
        record?.doordashAvailable,
        record?.delivery_available,
        record?.deliveryAvailable,
        amenitiesRecord?.doordash,
        amenitiesRecord?.door_dash,
        amenitiesRecord?.doorDash,
        amenitiesRecord?.doordash_available,
        amenitiesRecord?.doordashAvailable,
      ]),
    ),
  };
  const latitude = normalizeCoordinate(firstDefined([
    record?.latitude,
    record?.lat,
    record?.location_map_lat,
    record?.locationMapLat,
    record?.location_latitude,
    record?.locationLatitude,
    record?.geo?.latitude,
    record?.geo?.lat,
    record?.geolocation?.latitude,
    record?.geolocation?.lat,
    record?.coords?.latitude,
    record?.coordinates?.latitude,
    record?.coordinates?.lat,
    Array.isArray(record?.coordinates) ? record.coordinates[1] : undefined,
    addressRecord?.latitude,
    addressRecord?.lat,
  ]));
  const longitude = normalizeCoordinate(firstDefined([
    record?.longitude,
    record?.lng,
    record?.lon,
    record?.location_map_lng,
    record?.locationMapLng,
    record?.location_longitude,
    record?.locationLongitude,
    record?.geo?.longitude,
    record?.geo?.lng,
    record?.geo?.lon,
    record?.geolocation?.longitude,
    record?.geolocation?.lng,
    record?.geolocation?.lon,
    record?.coords?.longitude,
    record?.coordinates?.longitude,
    record?.coordinates?.lng,
    Array.isArray(record?.coordinates) ? record.coordinates[0] : undefined,
    addressRecord?.longitude,
    addressRecord?.lng,
    addressRecord?.lon,
  ]));

  if (!match) {
    return {
      index: index + 1,
      raw: trimmed,
      name: firstNonEmpty([record?.name, record?.location_name, record?.locationName, record?.store_name, record?.storeName]) || "",
      street: firstNonEmpty([
        record?.street,
        record?.street_address,
        record?.streetAddress,
        record?.address_one,
        record?.addressOne,
        record?.address_line_1,
        record?.addressLine1,
        addressRecord?.street,
        addressRecord?.street_address,
        addressRecord?.streetAddress,
        addressRecord?.address_one,
        addressRecord?.addressOne,
        addressRecord?.address_line_1,
        addressRecord?.addressLine1,
        trimmed,
      ]) || "",
      city: firstNonEmpty([record?.city, record?.location_city, record?.locationCity, addressRecord?.city]) || "",
      state: stateCode,
      stateName: getStateName(stateCode),
      zip: firstNonEmpty([
        record?.zip,
        record?.zip_code,
        record?.zipCode,
        record?.postal_code,
        record?.postalCode,
        addressRecord?.zip,
        addressRecord?.zip_code,
        addressRecord?.zipCode,
        addressRecord?.postal_code,
        addressRecord?.postalCode,
      ]) || "",
      phone: formatPhoneNumber(
        firstNonEmpty([
          record?.phone,
          record?.phone_number,
          record?.phoneNumber,
          record?.store_phone,
          record?.storePhone,
          record?.telephone,
          record?.contact?.phone,
          record?.contact?.phone_number,
          record?.contact?.phoneNumber,
          addressRecord?.phone,
          addressRecord?.phone_number,
          addressRecord?.phoneNumber,
        ]) || "",
      ),
      amenities,
      latitude,
      longitude,
      locationId,
      sourceRecord: record || rawAddress,
    };
  }

  return {
    index: index + 1,
    raw: trimmed,
    name: firstNonEmpty([record?.name, record?.location_name, record?.locationName, record?.store_name, record?.storeName]) || "",
    street: match[1].trim(),
    city: firstNonEmpty([record?.city, record?.location_city, record?.locationCity, addressRecord?.city, match[2].trim()]) || "",
    state: stateCode,
    stateName: getStateName(stateCode),
    zip: firstNonEmpty([
      record?.zip,
      record?.zip_code,
      record?.zipCode,
      record?.postal_code,
      record?.postalCode,
      addressRecord?.zip,
      addressRecord?.zip_code,
      addressRecord?.zipCode,
      addressRecord?.postal_code,
      addressRecord?.postalCode,
      match[4].trim(),
    ]) || "",
    phone: formatPhoneNumber(
      firstNonEmpty([
        record?.phone,
        record?.phone_number,
        record?.phoneNumber,
        record?.store_phone,
        record?.storePhone,
        record?.telephone,
        record?.contact?.phone,
        record?.contact?.phone_number,
        record?.contact?.phoneNumber,
        addressRecord?.phone,
        addressRecord?.phone_number,
        addressRecord?.phoneNumber,
      ]) || "",
    ),
    amenities,
    latitude,
    longitude,
    locationId,
    sourceRecord: record || rawAddress,
  };
}

async function hydrateLocationDetails(locations) {
  const locationsWithIds = locations.filter((location) => location.locationId);

  if (!locationsWithIds.length) {
    return locations;
  }

  const hydratedById = new Map();

  await Promise.all(
    locationsWithIds.map(async (location) => {
      if (locationDetailsCache.has(location.locationId)) {
        hydratedById.set(location.locationId, locationDetailsCache.get(location.locationId));
        return;
      }

      try {
        const detailPayload = await apiRequest(`/locations/${encodeURIComponent(location.locationId)}`);
        const detailRecord = extractLocationDetailRecord(detailPayload);
        const mergedLocation = normalizeLocation(
          mergeLocationRecords(location.sourceRecord, detailRecord),
          location.index - 1,
        );
        locationDetailsCache.set(location.locationId, mergedLocation);
        hydratedById.set(location.locationId, mergedLocation);
      } catch {
        locationDetailsCache.set(location.locationId, location);
        hydratedById.set(location.locationId, location);
      }
    }),
  );

  return locations.map((location) => hydratedById.get(location.locationId) || location);
}

function extractLocationDetailRecord(payload) {
  return (
    payload?.location ||
    payload?.store ||
    payload?.data?.location ||
    payload?.data?.store ||
    payload?.data ||
    payload ||
    {}
  );
}

function mergeLocationRecords(baseRecord, detailRecord) {
  const base = baseRecord && typeof baseRecord === "object" ? baseRecord : {};
  const detail = detailRecord && typeof detailRecord === "object" ? detailRecord : {};
  return {
    ...base,
    ...detail,
    address:
      detail.address && typeof detail.address === "object"
        ? { ...(base.address || {}), ...detail.address }
        : detail.address || base.address,
    location:
      detail.location && typeof detail.location === "object"
        ? { ...(base.location || {}), ...detail.location }
        : detail.location || base.location,
    contact:
      detail.contact && typeof detail.contact === "object"
        ? { ...(base.contact || {}), ...detail.contact }
        : detail.contact || base.contact,
    amenities:
      detail.amenities && typeof detail.amenities === "object"
        ? { ...(base.amenities || {}), ...detail.amenities }
        : detail.amenities || base.amenities,
    coordinates:
      detail.coordinates && typeof detail.coordinates === "object" && !Array.isArray(detail.coordinates)
        ? { ...(base.coordinates || {}), ...detail.coordinates }
        : detail.coordinates || base.coordinates,
  };
}

function sortLocations(a, b) {
  const stateCompare = (a.stateName || a.state || "ZZ").localeCompare(b.stateName || b.state || "ZZ");
  if (stateCompare !== 0) {
    return stateCompare;
  }

  return (a.city || "").localeCompare(b.city || "");
}

function extractLocationRecords(payload) {
  const directCandidates = [
    payload,
    payload?.locations,
    payload?.stores,
    payload?.addresses,
    payload?.data,
    payload?.data?.locations,
    payload?.data?.stores,
    payload?.data?.addresses,
  ].filter(Array.isArray);

  const discoveredCandidates = [];

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) {
        discoveredCandidates.push(value);
      }
    }
  }

  if (payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    for (const value of Object.values(payload.data)) {
      if (Array.isArray(value)) {
        discoveredCandidates.push(value);
      }
    }
  }

  const candidates = [...directCandidates, ...discoveredCandidates];

  const scoredCandidates = candidates
    .map((candidate) => ({ candidate, score: scoreLocationCandidate(candidate) }))
    .filter(({ candidate }) => candidate.length > 0)
    .sort((a, b) => b.score - a.score);

  return scoredCandidates[0]?.candidate || [];
}

function scoreLocationCandidate(candidate) {
  if (!Array.isArray(candidate) || !candidate.length) {
    return -1;
  }

  const firstItem = candidate[0];

  if (typeof firstItem === "string") {
    return 1;
  }

  if (!firstItem || typeof firstItem !== "object") {
    return 0;
  }

  let score = 10;

  if (firstItem.id || firstItem.location_id || firstItem.store_id) {
    score += 20;
  }

  if (firstItem.phone_number || firstItem.phone || firstItem.store_phone) {
    score += 12;
  }

  if (firstItem.location_map_lat || firstItem.latitude || firstItem.lat) {
    score += 12;
  }

  if (firstItem.location_map_lng || firstItem.longitude || firstItem.lng) {
    score += 12;
  }

  if (firstItem.address_one || firstItem.location_map_address || firstItem.city || firstItem.state) {
    score += 8;
  }

  if (typeof firstItem.wifi === "boolean" || typeof firstItem.drive_thru === "boolean") {
    score += 6;
  }

  return score;
}

function renderLocationsMap(locations) {
  const mapNode = document.querySelector("#locations-map");
  const mapCopyNode = document.querySelector("#locations-map-copy");
  const emptyNode = document.querySelector("#locations-map-empty");

  if (!mapNode || !mapCopyNode || !emptyNode) {
    return;
  }

  const mappableLocations = locations.filter(
    (location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
  );

  if (!mappableLocations.length || typeof window.L === "undefined") {
    mapNode.classList.add("hidden");
    emptyNode.classList.remove("hidden");
    mapCopyNode.textContent = locations.length
      ? "Map pins appear when stores include latitude and longitude."
      : "Search results will appear on the map when matching stores include coordinates.";
    if (locationsMapState.map) {
      locationsMapState.map.remove();
      locationsMapState.map = null;
      locationsMapState.markersLayer = null;
    }
    return;
  }

  mapNode.classList.remove("hidden");
  emptyNode.classList.add("hidden");
  mapCopyNode.textContent = `${mappableLocations.length} store${mappableLocations.length === 1 ? "" : "s"} shown on the map.`;

  if (!locationsMapState.map) {
    locationsMapState.map = window.L.map(mapNode, {
      scrollWheelZoom: false,
    }).setView([mappableLocations[0].latitude, mappableLocations[0].longitude], 5);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(locationsMapState.map);

    locationsMapState.markersLayer = window.L.layerGroup().addTo(locationsMapState.map);
  }

  locationsMapState.markersLayer.clearLayers();

  const bounds = [];
  mappableLocations.forEach((location) => {
    const marker = window.L.marker([location.latitude, location.longitude]);
    marker.bindPopup(`
      <strong>${escapeHtml(location.name || location.street || "Uncle Joe's")}</strong><br />
      ${escapeHtml([location.city, location.stateName || location.state].filter(Boolean).join(", "))}
    `);
    marker.addTo(locationsMapState.markersLayer);
    bounds.push([location.latitude, location.longitude]);
  });

  if (bounds.length === 1) {
    locationsMapState.map.setView(bounds[0], 11);
  } else {
    locationsMapState.map.fitBounds(bounds, { padding: [28, 28] });
  }

  setTimeout(() => {
    locationsMapState.map?.invalidateSize();
  }, 0);
}

function normalizeAmenityValue(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "yes", "y", "available", "included", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "unavailable", "not available", "none", "0"].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeCoordinate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function renderAmenityPill(label, value) {
  const statusLabel = value === true ? "Available" : value === false ? "Not available" : "";
  const toneClass = value === true ? "is-available" : value === false ? "is-unavailable" : "is-unknown";

  return `
    <span class="amenity-pill ${toneClass}">
      <strong>${escapeHtml(label)}</strong>
      ${statusLabel ? `<span>${escapeHtml(statusLabel)}</span>` : ""}
    </span>
  `;
}

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return String(value || "").trim();
}

function getStateName(stateCode) {
  const stateNames = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
  };

  return stateNames[stateCode] || stateCode;
}

function normalizeMenuItem(item) {
  const name = String(item?.name || "Unnamed item");
  const size = item?.size ? `${item.size}` : "Standard";
  const calories = item?.calories ?? "N/A";

  return {
    name,
    category: String(item?.category || "Other"),
    size,
    calories: typeof calories === "number" ? `${calories} cal` : String(calories),
    price: formatCurrency(item?.price),
    description: "A comforting pick from the menu.",
  };
}

function normalizeProfile(payload) {
  const data =
    payload?.member ||
    payload?.customer ||
    payload?.user ||
    payload?.user_profile ||
    payload?.userProfile ||
    payload?.profile ||
    payload?.data?.member ||
    payload?.data?.customer ||
    payload?.data?.user ||
    payload?.data?.user_profile ||
    payload?.data?.userProfile ||
    payload?.data?.profile ||
    payload?.data ||
    payload ||
    {};
  const firstName = firstNonEmpty([
    data.first_name,
    data.firstName,
    data.given_name,
    data.customer_first_name,
    data.user_first_name,
  ]);
  const lastName = firstNonEmpty([
    data.last_name,
    data.lastName,
    data.family_name,
    data.customer_last_name,
    data.user_last_name,
  ]);

  return {
    memberId: String(
      firstNonEmpty([
        data.member_id,
        data.memberId,
        data.memberID,
        data.customer_id,
        data.customerId,
        data.customerID,
        data.user_id,
        data.userId,
        data.uuid,
        data.member_uuid,
        data.customer_uuid,
        data.record_id,
        data.id,
        payload?.member_id,
        payload?.memberId,
        payload?.customer_id,
        payload?.customerId,
        payload?.user_id,
        payload?.userId,
        payload?.user_profile?.member_id,
        payload?.user_profile?.memberId,
        payload?.user_profile?.memberID,
        payload?.user_profile?.customer_id,
        payload?.user_profile?.customerId,
        payload?.user_profile?.user_id,
        payload?.user_profile?.userId,
        payload?.user_profile?.uuid,
        payload?.user_profile?.id,
        payload?.userProfile?.member_id,
        payload?.userProfile?.memberId,
        payload?.userProfile?.customer_id,
        payload?.userProfile?.customerId,
        payload?.userProfile?.user_id,
        payload?.userProfile?.userId,
        payload?.userProfile?.uuid,
        payload?.userProfile?.id,
        payload?.member?.id,
        payload?.customer?.id,
        payload?.user?.id,
      ]) || "",
    ),
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(" ") || "Member account",
    email: firstNonEmpty([data.email, data.customer_email, data.user_email, payload?.email]) || "",
    phoneNumber: firstNonEmpty([
      data.phone_number,
      data.phoneNumber,
      data.customer_phone,
      data.user_phone,
      payload?.phone_number,
    ]) || "",
    homeStore: firstNonEmpty([
      data.home_store,
      data.homeStore,
      data.favorite_store,
      data.store_id,
      payload?.home_store,
    ]) || "",
  };
}

function normalizePoints(payload) {
  const possibleValue = firstDefined([
    payload?.points,
    payload?.loyalty_points,
    payload?.loyaltyPoints,
    payload?.total_points,
    payload?.totalPoints,
    payload?.points_summary?.current_balance,
    payload?.points_summary?.balance,
    payload?.data?.points,
  ]);

  return {
    value: Number.isFinite(Number(possibleValue)) ? Number(possibleValue) : 0,
    display: Number.isFinite(Number(possibleValue)) ? `${Number(possibleValue)}` : "0",
    lifetimeOrders: Number(firstDefined([
      payload?.points_summary?.lifetime_orders,
      payload?.lifetime_orders,
      payload?.lifetimeOrders,
    ]) || 0),
    programName:
      firstNonEmpty([
        payload?.points_summary?.program_name,
        payload?.program_name,
        payload?.programName,
      ]) || "Rewards program",
  };
}

function normalizeOrders(payload) {
  const rawOrders = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.orders)
      ? payload.orders
      : Array.isArray(payload?.data?.orders)
        ? payload.data.orders
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  const rawOrderItems = Array.isArray(payload?.order_items)
    ? payload.order_items
    : Array.isArray(payload?.orderItems)
      ? payload.orderItems
      : Array.isArray(payload?.data?.order_items)
        ? payload.data.order_items
        : Array.isArray(payload?.data?.orderItems)
          ? payload.data.orderItems
          : [];

  const orders = rawOrders.map((order, index) => {
    const orderId = String(firstNonEmpty([order?.order_id, order?.orderId, order?.id]) || `#${index + 1}`);
    const orderTotalValue = parseMoney(firstDefined([
      order?.order_total,
      order?.total,
      order?.amount,
      order?.final_total,
      order?.finalTotal,
    ]));
    const matchedOrderItems = rawOrderItems.filter((item) => {
      const itemOrderId = firstNonEmpty([item?.order_id, item?.orderId, item?.id_order]);
      return itemOrderId && String(itemOrderId) === orderId;
    });
    const lineItemsSource = Array.isArray(order?.line_items)
      ? order.line_items
      : Array.isArray(order?.lineItems)
        ? order.lineItems
        : Array.isArray(order?.order_items)
          ? order.order_items
          : Array.isArray(order?.orderItems)
            ? order.orderItems
        : Array.isArray(order?.items)
          ? order.items
          : matchedOrderItems;

    const lineItems = lineItemsSource.map((item, itemIndex) => normalizeLineItem(item, itemIndex));
    const lineItemsSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotalValue, 0);
    const adjustmentValue = Number.isFinite(orderTotalValue) ? roundCurrency(orderTotalValue - lineItemsSubtotal) : 0;
    const hasAdjustment = Math.abs(adjustmentValue) >= 0.01;

    return {
      orderId,
      date: formatDate(firstNonEmpty([order?.order_date, order?.date, order?.created_at, order?.createdAt])),
      total: formatCurrency(orderTotalValue),
      location: firstNonEmpty([
        order?.location_name,
        order?.locationName,
        compactLocationLabel(order),
      ]),
      status: firstNonEmpty([order?.status, order?.order_status]) || "",
      lineItems,
      adjustmentLabel: adjustmentValue < 0 ? "Discount or reward" : "Added charges",
      adjustmentText: hasAdjustment ? formatSignedCurrency(adjustmentValue) : "",
    };
  });

  orders.orderCount = Number(firstDefined([payload?.order_count, payload?.count]) || orders.length);
  return orders;
}

function normalizeLineItem(item, index) {
  const quantity = Number(firstDefined([item?.quantity, item?.qty, item?.count]) || 1);
  const unitPriceValue = parseMoney(firstDefined([
    item?.price,
    item?.unit_price,
    item?.unitPrice,
    item?.item_price,
    item?.price_per_item,
    item?.pricePerItem,
  ]));
  const lineTotalValue = parseMoney(firstDefined([
    item?.line_price,
    item?.linePrice,
    item?.line_total,
    item?.lineTotal,
    item?.total,
    item?.extended_price,
    item?.extendedPrice,
  ]));
  const name =
    firstNonEmpty([
      item?.name,
      item?.item_name,
      item?.itemName,
      item?.menu_item_name,
      item?.menuItemName,
      item?.product_name,
      item?.productName,
    ]) || `Item ${index + 1}`;
  const size = firstNonEmpty([
    item?.size,
    item?.item_size,
    item?.itemSize,
    item?.menu_item_size,
    item?.menuItemSize,
    item?.variant_name,
    item?.variantName,
  ]) || "Standard";
  const fallbackUnitPriceValue = Number.isFinite(unitPriceValue)
    ? unitPriceValue
    : quantity > 0 && Number.isFinite(lineTotalValue)
      ? roundCurrency(lineTotalValue / quantity)
      : null;
  const fallbackLineTotalValue = Number.isFinite(lineTotalValue)
    ? lineTotalValue
    : Number.isFinite(fallbackUnitPriceValue)
      ? roundCurrency(fallbackUnitPriceValue * quantity)
      : 0;

  return {
    name,
    size,
    quantity,
    unitPriceText:
      fallbackUnitPriceValue == null && fallbackLineTotalValue === 0
        ? "Included"
        : formatCurrency(fallbackUnitPriceValue ?? 0),
    displayPrice:
      fallbackUnitPriceValue == null && fallbackLineTotalValue === 0
        ? "Included"
        : formatCurrency(fallbackLineTotalValue),
    lineTotalValue: fallbackLineTotalValue,
  };
}

function parseMoney(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatSignedCurrency(value) {
  const rounded = roundCurrency(value);
  return `${rounded >= 0 ? "+" : "-"}${formatCurrency(Math.abs(rounded))}`;
}

function extractMemberId(payload) {
  return firstNonEmpty([
    payload?.member_id,
    payload?.memberId,
    payload?.memberID,
    payload?.customer_id,
    payload?.customerId,
    payload?.customerID,
    payload?.user_id,
    payload?.userId,
    payload?.user_profile?.member_id,
    payload?.user_profile?.memberId,
    payload?.user_profile?.memberID,
    payload?.user_profile?.customer_id,
    payload?.user_profile?.customerId,
    payload?.user_profile?.user_id,
    payload?.user_profile?.userId,
    payload?.user_profile?.uuid,
    payload?.user_profile?.id,
    payload?.userProfile?.member_id,
    payload?.userProfile?.memberId,
    payload?.userProfile?.customer_id,
    payload?.userProfile?.customerId,
    payload?.userProfile?.user_id,
    payload?.userProfile?.userId,
    payload?.userProfile?.uuid,
    payload?.userProfile?.id,
    payload?.uuid,
    payload?.member_uuid,
    payload?.customer_uuid,
    payload?.member?.member_id,
    payload?.member?.memberId,
    payload?.member?.memberID,
    payload?.member?.uuid,
    payload?.member?.id,
    payload?.customer?.member_id,
    payload?.customer?.memberId,
    payload?.customer?.customer_id,
    payload?.customer?.customerId,
    payload?.customer?.uuid,
    payload?.customer?.id,
    payload?.user?.member_id,
    payload?.user?.memberId,
    payload?.user?.user_id,
    payload?.user?.userId,
    payload?.user?.uuid,
    payload?.user?.id,
    payload?.id,
    payload?.data?.member_id,
    payload?.data?.memberId,
    payload?.data?.memberID,
    payload?.data?.customer_id,
    payload?.data?.customerId,
    payload?.data?.user_id,
    payload?.data?.userId,
    payload?.data?.uuid,
    payload?.data?.member?.member_id,
    payload?.data?.member?.memberId,
    payload?.data?.member?.id,
    payload?.data?.customer?.customer_id,
    payload?.data?.customer?.customerId,
    payload?.data?.customer?.id,
    payload?.data?.user?.user_id,
    payload?.data?.user?.userId,
    payload?.data?.user?.id,
  ]);
}

function summarizePayloadKeys(payload) {
  if (payload == null) {
    return "none";
  }

  if (Array.isArray(payload)) {
    return `array(${payload.length})`;
  }

  if (typeof payload !== "object") {
    return typeof payload;
  }

  const topLevelKeys = Object.keys(payload);
  if (!topLevelKeys.length) {
    return "none";
  }

  return topLevelKeys.join(", ");
}

function mergeProfiles(baseProfile = {}, incomingProfile = {}) {
  return {
    memberId: incomingProfile.memberId || baseProfile.memberId || "",
    firstName: incomingProfile.firstName || baseProfile.firstName || "",
    lastName: incomingProfile.lastName || baseProfile.lastName || "",
    displayName:
      incomingProfile.displayName ||
      baseProfile.displayName ||
      [incomingProfile.firstName || baseProfile.firstName, incomingProfile.lastName || baseProfile.lastName]
        .filter(Boolean)
        .join(" ") ||
      "Member account",
    email: incomingProfile.email || baseProfile.email || "",
    phoneNumber: incomingProfile.phoneNumber || baseProfile.phoneNumber || "",
    homeStore: incomingProfile.homeStore || baseProfile.homeStore || "",
  };
}

function compactLocationLabel(order) {
  const pieces = [
    firstNonEmpty([order?.store_city, order?.city]),
    firstNonEmpty([order?.store_state, order?.state]),
  ].filter(Boolean);

  return pieces.join(", ");
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function firstNonEmpty(values) {
  return values.find((value) => value != null && String(value).trim() !== "");
}

function firstDefined(values) {
  return values.find((value) => value !== undefined && value !== null);
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(item);
    return groups;
  }, {});
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
