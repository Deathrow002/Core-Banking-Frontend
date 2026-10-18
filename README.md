# CoreBankingFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Default Admin Login (Local Development)

Use the following default account on the login page:

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `SecureAdminP@ssw0rd!` |
| Role | `ADMIN` |

The Authentication Service configures these values in its [application.properties](../Authentication/src/main/resources/application.properties):

On startup, the backend creates this account with an encoded password only if the email does not already exist. Updating these properties does not reset an existing account's password.

For local development, open `http://localhost:4200/login`; for Docker Compose, open `http://localhost:8080/login`. The Authentication Service and its dependencies must be running.

**Do not use these public default credentials in production.** Supply unique admin credentials through backend environment variables or a secret manager, and replace the default account credentials before exposing the application. Do not put real credentials in Angular source code or frontend environment files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Docker

The [Dockerfile](./Dockerfile) builds the production Angular application and runs its existing Node.js SSR server. The final image contains production dependencies and build output only, runs as the non-root `node` user, and checks `/login` for container health.

Run these commands from the `Frontend` directory:

```powershell
docker build -t core-banking-frontend .
docker run --rm --name core-banking-frontend -p 4200:4000 core-banking-frontend
```

Open `http://localhost:4200/login`. The server listens on container port `4000` by default; set `PORT` and adjust the port mapping if needed:

```powershell
docker run --rm --name core-banking-frontend -e PORT=8080 -p 4200:8080 core-banking-frontend
```

To build from the parent repository instead:

```powershell
docker build -t core-banking-frontend .\Frontend
```

### Authentication API routing

The Angular development [proxy configuration](./proxy.conf.json) is only used by `npm start`; it is **not** included as a production reverse proxy. The container serves the UI and SSR output, not backend API requests.

For a working containerized login, put a reverse proxy or ingress in front of the frontend and Authentication Service on a **single browser-facing origin**:

- Route `/api/v1/auth/` to `authentication-service:8084`, preserving the request path.
- Route other UI paths to the frontend on port `4000`.
- Forward `Cookie`, `Set-Cookie`, and `X-XSRF-TOKEN` headers without stripping them.
- If the proxy is also containerized, attach it and these services to a shared Docker network. Use service/container names, not `localhost`, for upstream addresses.

This preserves the same-origin `SESSION` cookie and Angular CSRF handling. Directly publishing the frontend port lets you view the UI, but login requires the API routing above. For HTTPS deployments, enable secure session cookies in the backend.

### Docker Compose

From the parent Core-Banking repository, start the frontend and its authentication dependencies:

```powershell
docker compose up -d --build frontend-gateway
docker compose ps
```

Open `http://localhost:8080/login`. Compose runs `frontend-service` internally on port `4000` and publishes `frontend-gateway` on port `8080`. The gateway forwards `/api/v1/auth/` to Authentication and other UI paths to the Angular server. Cookies and CSRF headers pass through on the same browser-facing origin; other `/api/` paths currently return `404`.

The gateway waits for the frontend and Authentication Service health checks before starting. No Java command, Eureka registration, or GitHub build token is required by the frontend image. Existing backend build requirements still apply to dependencies started by Compose.

The dependency chain also starts Kafka before Account, which is required by its Kafka listeners. The Angular SSR host allow-list includes `localhost`, `127.0.0.1`, and `frontend-service` for local Compose access and health checks. Add your actual public hostname to `security.allowedHosts` in [angular.json](./angular.json) and rebuild before deploying under a different hostname.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
