import express from "express";
import prisma from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const queues = await prisma.queue.findMany({
      include: {
        patient: true,
        appointment: {
          include: {
            doctor: true
          }
        },
      }
    });
    res.json(queues);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch queue" });
  }
});

router.post("/checkin", async (req, res) => {
  try {
    const { patientId, appointmentId, doctorId } = req.body;
    
    const existing = await prisma.queue.findFirst({
      where: { appointmentId }
    });
    
    if (existing) {
      return res.status(409).json({ error: "Patient already checked in for this appointment" });
    }

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "ARRIVED" }
    });

    const queue = await prisma.queue.create({
      data: { 
        patientId, 
        appointmentId, 
        doctorId,
        status: "WAITING"
      },
      include: { patient: true, appointment: { include: { doctor: true } } }
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: "Failed to check in patient" });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === "COMPLETED") {
      updateData.completedTime = new Date();
    }
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    // Sync appointment status
    if (status === "IN_PROGRESS") {
      await prisma.appointment.update({
        where: { id: queue.appointmentId },
        data: { status: "IN_CONSULTATION" }
      });
    } else if (status === "COMPLETED") {
      await prisma.appointment.update({
        where: { id: queue.appointmentId },
        data: { status: "COMPLETED" }
      });
    }
    
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: "Failed to update queue status" });
  }
});

export default router;
