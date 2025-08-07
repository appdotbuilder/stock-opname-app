import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  createLocationInputSchema,
  createStockOpnameSessionInputSchema,
  updateStockOpnameSessionInputSchema,
  addStockOpnameItemInputSchema,
  getSessionItemsInputSchema,
  generateReportInputSchema
} from './schema';

// Import handlers
import { login } from './handlers/login';
import { createUser } from './handlers/create_user';
import { getLocations } from './handlers/get_locations';
import { createLocation } from './handlers/create_location';
import { createStockOpnameSession } from './handlers/create_stock_opname_session';
import { getUserSessions } from './handlers/get_user_sessions';
import { updateStockOpnameSession } from './handlers/update_stock_opname_session';
import { addStockOpnameItem } from './handlers/add_stock_opname_item';
import { getSessionItems } from './handlers/get_session_items';
import { generateExcelReport } from './handlers/generate_excel_report';
import { generatePdfReport } from './handlers/generate_pdf_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Location management
  getLocations: publicProcedure
    .query(() => getLocations()),

  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(({ input }) => createLocation(input)),

  // Stock opname session management
  createStockOpnameSession: publicProcedure
    .input(createStockOpnameSessionInputSchema)
    .mutation(({ input }) => createStockOpnameSession(input)),

  getUserSessions: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserSessions(input.userId)),

  updateStockOpnameSession: publicProcedure
    .input(updateStockOpnameSessionInputSchema)
    .mutation(({ input }) => updateStockOpnameSession(input)),

  // Stock opname item management
  addStockOpnameItem: publicProcedure
    .input(addStockOpnameItemInputSchema)
    .mutation(({ input }) => addStockOpnameItem(input)),

  getSessionItems: publicProcedure
    .input(getSessionItemsInputSchema)
    .query(({ input }) => getSessionItems(input)),

  // Report generation
  generateExcelReport: publicProcedure
    .input(generateReportInputSchema)
    .query(({ input }) => generateExcelReport(input)),

  generatePdfReport: publicProcedure
    .input(generateReportInputSchema)
    .query(({ input }) => generatePdfReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();