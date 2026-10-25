# CoreBankingFrontend

The web UI for Core Banking, built with Angular 22 and server-side rendering (SSR). It was generated with [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Quick start

Run these commands from the `Frontend` directory:

```bash
npm install
npm start
```

Open `http://localhost:4200/` in your browser. The app reloads automatically when you change source files. `npm start` uses the [proxy configuration](./proxy.conf.json) to forward API requests.

## Available scripts

| Command                                   | Description                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `npm start`                               | Start the development server at `http://localhost:4200/` (`ng serve`).     |
| `npm run build`                           | Build the application into `dist/` (`ng build`).                            |
| `npm run watch`                           | Rebuild on file changes using the development configuration.               |
| `npm test`                                | Run unit tests with Vitest (`ng test`).                                     |
| `npm run serve:ssr:core-banking-frontend` | Run the built SSR server from `dist/`. Run `npm run build` first.           |

To run any other Angular CLI command, use `npm run ng -- <command>`.

## Project structure

```text
src/
├── styles.scss        Global entry; loads the design system below
├── styles/            Design tokens (navy/crimson palette, type), base and shared UI classes
└── app/
    ├── core/          Shared code used across features
    │   ├── accounts/  Account API service
    │   ├── auth/      Auth service, route guard, HTTP interceptor, models, form validators
    │   ├── customers/ Customer API service
    │   └── users/     User management API service
    ├── layout/shell/  Signed-in layout: sidebar navigation, top bar, sign out
    ├── shared/        Brand seal logo and inline icon set
    ├── features/      Screens, grouped by feature
    │   ├── accounts/  Open account page
    │   ├── auth/      Login page
    │   ├── customers/ New customer page
    │   ├── home/      Dashboard
    │   └── users/     User list, detail, and form pages
    ├── app.config.ts  Application providers
    └── app.routes.ts  Route definitions (signed-in pages are children of the shell)
```

## Default admin login (local development)

Use this default account on the login page:

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `admin@example.com`    |
| Password | `SecureAdminP@ssw0rd!` |
| Role     | `ADMIN`                |

These values are set in the Authentication Service's [application.properties](../Authentication/src/main/resources/application.properties). On startup, the backend creates this account with an encoded password only if the email does not already exist. Updating these properties does not reset an existing account's password.

Open `http://localhost:4200/login` for local development, or `http://localhost:8080/login` with Docker Compose. The Authentication Service and its dependencies must be running.

> **Warning:** Do not use these public default credentials in production. Supply unique admin credentials through backend environment variables or a secret manager, and replace the default account credentials before exposing the application. Do not put real credentials in Angular source code or frontend environment files.

## Code scaffolding

Angular CLI includes code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project, run:

```bash
npm run build
```

This compiles the project and stores the build artifacts in the `dist/` directory. The production build is optimized for performance and speed.

## Docker

The [Dockerfile](./Dockerfile) builds the production Angular application and runs its Node.js SSR server. The final image contains production dependencies and build output only, runs as the non-root `node` user, and checks `/login` for container health.

Run these commands from the `Frontend` directory:

```powershell
docker build -t core-banking-frontend .
docker run --rm --name core-banking-frontend -p 4200:4000 core-banking-frontend
```

Open `http://localhost:4200/login`. The server listens on container port `4000` by default. To change it, set `PORT` and update the port mapping:

```powershell
docker run --rm --name core-banking-frontend -e PORT=8080 -p 4200:8080 core-banking-frontend
```

To build from the parent repository instead:

```powershell
docker build -t core-banking-frontend .\Frontend
```

### Authentication API routing

The Angular development [proxy configuration](./proxy.conf.json) is only used by `npm start`. It is **not** a production reverse proxy. The container serves the UI and SSR output, not backend API requests.

For a working containerized login, put a reverse proxy or ingress in front of the frontend and Authentication Service on a **single browser-facing origin**:

- Route `/api/v1/auth/` to `authentication-service:8084`, preserving the request path.
- Route other UI paths to the frontend on port `4000`.
- Forward `Cookie`, `Set-Cookie`, and `X-XSRF-TOKEN` headers without stripping them.
- If the proxy is also containerized, attach it and these services to a shared Docker network. Use service or container names, not `localhost`, for upstream addresses.

This preserves the same-origin `SESSION` cookie and Angular CSRF handling. Publishing the frontend port directly lets you view the UI, but login requires the API routing above. For HTTPS deployments, enable secure session cookies in the backend.

### Docker Compose

From the parent Core-Banking repository, start the frontend and its authentication dependencies:

```powershell
docker compose up -d --build frontend-gateway
docker compose ps
```

Open `http://localhost:8080/login`. Compose runs `frontend-service` internally on port `4000` and publishes `frontend-gateway` on port `8080`. The gateway forwards `/api/v1/auth/` to Authentication and UI paths to the Angular server. Cookies and CSRF headers pass through on the same browser-facing origin. Unconfigured `/api/` paths return `404`.

The gateway also forwards OAuth/OIDC endpoints and `/api/mobile/**` to the corresponding backend services. Angular still uses only session cookies and CSRF, not mobile bearer tokens, and its `/login` page is unchanged. OAuth browser sign-in uses `/oauth/login`. See the [Authentication README](../Authentication/README.md) for the mobile PKCE client and Phase 1 money-operation restrictions. Start Transaction and Loan separately when testing their mobile routes: `docker compose up -d --build transaction-service loan-service`.

The gateway waits for the frontend and Authentication Service health checks before starting. The frontend image does not need Java, Eureka registration, or a GitHub build token. Existing backend build requirements still apply to dependencies started by Compose.

The dependency chain also starts Kafka before Account, which its Kafka listeners require. The Angular SSR host allow-list includes `localhost`, `127.0.0.1`, and `frontend-service` for local Compose access and health checks. Add your actual public hostname to `security.allowedHosts` in [angular.json](./angular.json) and rebuild before deploying under a different hostname.

## Testing

### Unit tests

Unit tests use the [Vitest](https://vitest.dev/) test runner:

```bash
npm test
```

### End-to-end tests

```bash
ng e2e
```

Angular CLI does not include an end-to-end testing framework by default. Choose one that suits your needs before running this command.

## Additional resources

For more information on using the Angular CLI, including detailed command references, see the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
