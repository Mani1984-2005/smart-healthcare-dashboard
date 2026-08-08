import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(0, "Age must be a positive number"),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

export const doctorSchema = z.object({
  name: z.string().min(2),
  department: z.string().min(2),
  specialization: z.string().min(2),
  phone: z.string().min(10).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

export const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }),
  timeSlot: z.string().min(5),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
