// Part 4 — ClinicalContextProvider interface. Part 4 owns its data contract; any future data source (another SIH part,
// a hospital system, a database) only needs to implement { name, list(), get(patientId) } and return a
// ClinicalPatientContext (see contracts/schemas.js). Nothing else in this module knows where data comes from.
import { getDemoContext, listDemoScenarios } from "../data/demoScenarios.js";

/** Built-in provider backed by the synthetic demo scenarios. */
export class DemoContextProvider {
  constructor() { this.name = "demo"; this.origin = "demo"; }
  async list() { return listDemoScenarios(); }
  async get(patientId) { return getDemoContext(patientId); }
}
