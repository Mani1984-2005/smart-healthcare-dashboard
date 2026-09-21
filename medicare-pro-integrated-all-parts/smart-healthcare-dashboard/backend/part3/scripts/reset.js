// Clears all Part 3 runtime data (documents, OCR results, extractions, timeline, audit). Synthetic fixtures are bundled and unaffected.
//   npm run part3:reset
import { loadConfig } from "../config/config.js";
import { Part3Store } from "../models/store.js";

const config = loadConfig();
if (!config.dataDir) {
  console.log("Part 3 is configured for in-memory storage (PART3_DATA_DIR=memory); nothing to reset.");
} else {
  new Part3Store({ dataDir: config.dataDir }).resetAll();
  console.log(`Part 3 demo data reset (${config.dataDir}).`);
}
