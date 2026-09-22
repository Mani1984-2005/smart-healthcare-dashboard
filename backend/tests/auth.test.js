import request from "supertest";
import express from "express";
import test from "node:test";
import assert from "node:assert/strict";
import { authorize } from "../middleware/authMiddleware.js";

const app = express();
app.use(express.json());

// Mock route
app.get("/api/protected", (req, res, next) => {
  req.user = { role: req.headers["x-mock-role"] }; // mock authentication
  next();
}, authorize(["ADMIN"]), (req, res) => {
  res.status(200).json({ success: true });
});

test("RBAC Middleware blocks access without correct role", async () => {
  const res = await request(app).get("/api/protected").set("x-mock-role", "PATIENT");
  assert.equal(res.statusCode, 403);
});

test("RBAC Middleware allows access with correct role", async () => {
  const res = await request(app).get("/api/protected").set("x-mock-role", "ADMIN");
  assert.equal(res.statusCode, 200);
});

test("RBAC Middleware normalizes lowercase roles before enforcing RBAC", async () => {
  const lowerCaseApp = express();
  lowerCaseApp.use(express.json());
  lowerCaseApp.get("/api/lowercase-role", (req, res, next) => {
    req.user = { role: "admin" };
    next();
  }, authorize(["ADMIN"]), (req, res) => {
    res.status(200).json({ success: true });
  });

  const res = await request(lowerCaseApp).get("/api/lowercase-role");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("RBAC Middleware denies lowercase non-admin roles even when a role is present", async () => {
  const lowerCaseApp = express();
  lowerCaseApp.use(express.json());
  lowerCaseApp.get("/api/lowercase-role-deny", (req, res, next) => {
    req.user = { role: "patient" };
    next();
  }, authorize(["ADMIN", "RECEPTIONIST"]), (req, res) => {
    res.status(200).json({ success: true });
  });

  const res = await request(lowerCaseApp).get("/api/lowercase-role-deny");
  assert.equal(res.statusCode, 403);
});
