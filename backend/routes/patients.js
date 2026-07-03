import express from "express";
import pool from "../db.js";

const router = express.Router();

// GET all patients
router.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM patients");
  res.json(result.rows);
});

// ADD patient
router.post("/", async (req, res) => {
  const { name, age, gender, phone } = req.body;

  const result = await pool.query(
    "INSERT INTO patients (name, age, gender, phone) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, age, gender, phone]
  );

  res.json(result.rows[0]);
});

export default router;
