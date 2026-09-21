// Part 3 — Medical Documents & OCR. Public entry points of the module.
//   createPart3Router(opts) -> { router, context }   mount with app.use("/part3", router)   (optional integration)
//   createPart3App(opts)    -> { app, context }      a complete Express app (used by the standalone server and by tests)
import express from "express";
import { createPart3Router } from "./routes/index.js";

export { createPart3Router, createPart3Context } from "./routes/index.js";
export { loadConfig } from "./config/config.js";

/** @param {{ beforeRoutes?: import("express").RequestHandler }} options `beforeRoutes` (e.g. CORS) is installed ahead of the router. */
export function createPart3App({ beforeRoutes, ...options } = {}) {
  const { router, context } = createPart3Router(options);
  const app = express();
  app.disable("x-powered-by");
  if (beforeRoutes) app.use(beforeRoutes);
  app.use("/part3", router);
  app.use("/api/part3", router); // same router under the /api prefix used by the frontend dev proxy
  return { app, context };
}
