import request from "supertest";
import express from "express";
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

describe("RBAC Middleware", () => {
  it("should block access without correct role", async () => {
    const res = await request(app).get("/api/protected").set("x-mock-role", "PATIENT");
    expect(res.statusCode).toEqual(403);
  });

  it("should allow access with correct role", async () => {
    const res = await request(app).get("/api/protected").set("x-mock-role", "ADMIN");
    expect(res.statusCode).toEqual(200);
  });
});
