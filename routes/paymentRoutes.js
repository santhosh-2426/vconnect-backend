const express = require("express");
const router = express.Router();
const Payment = require("../models/payment");
const Project = require("../models/project"); // ✅ FIXED lowercase

// ➕ Add Payment
router.post("/", async (req, res) => {
  try {
    const { project, amount, type } = req.body;

    if (!project || !amount) {
      return res.status(400).json({ message: "Project and amount are required" });
    }

    const projectData = await Project.findById(project);

    if (!projectData) {
      return res.status(404).json({ message: "Project not found" });
    }

    const payment = new Payment({
      project,
      amount,
      type,
    });

    await payment.save();

    // 🔥 Update totals safely
    projectData.totalPaid = (projectData.totalPaid || 0) + Number(amount);
    projectData.balance = projectData.projectValue - projectData.totalPaid;

    if (type === "advance") {
      projectData.advanceReceived =
        (projectData.advanceReceived || 0) + Number(amount);
    }

    await projectData.save();

    res.status(201).json({
      message: "Payment added successfully",
      totalPaid: projectData.totalPaid,
      balance: projectData.balance,
    });

  } catch (error) {
    console.error("Payment Error:", error); // 🔥 log full error
    res.status(500).json({ message: error.message });
  }
});

// 📋 Get Payments by Project
router.get("/:projectId", async (req, res) => {
  try {
    const payments = await Payment.find({
      project: req.params.projectId,
    }).sort({ createdAt: -1 });

    res.json(payments);

  } catch (error) {
    console.error("Fetch Payment Error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;