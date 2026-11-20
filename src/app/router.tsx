import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { PlannerWorkspace } from '@/features/team-builder/PlannerWorkspace';

const teamSearchSchema = z.object({
  g: z.string().optional(),
  s: z.string().optional(),
  p: z.string().optional(),
});

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => teamSearchSchema.parse(search),
  component: PlannerWorkspace,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
