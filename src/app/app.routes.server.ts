import { RenderMode, ServerRoute } from '@angular/ssr';

// Auth state lives in localStorage, so guarded routes must render in the browser.
export const serverRoutes: ServerRoute[] = [
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
