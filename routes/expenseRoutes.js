const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Project = require("../models/Project");

const { protect } = require("../middleware/authMiddleware");

// 🔐 Protect all expense routes
router.use(protect);

// =============================
// CREATE EXPENSE
// =============================
router.post("/", async (req, res) => {
  try {
    const { title, amount, project } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: "Title and amount are required" });
    }

    const expenseAmount = Number(amount) || 0;

    const expense = new Expense({
      title,
      amount: expenseAmount,
      project
    });

    const savedExpense = await expense.save();

    if (project) {
      const existingProject = await Project.findById(project);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      existingProject.expenses =
        (existingProject.expenses || 0) + expenseAmount;

      existingProject.profit =
        (existingProject.projectValue || 0) -
        (existingProject.expenses || 0);

      await existingProject.save();
    }

    res.status(201).json(savedExpense);

  } catch (error) {
    console.error("Expense creation error:", error);
    res.status(500).json({ message: error.message });
  }
});

// =============================
// UPDATE EXPENSE
// =============================
router.put("/:id", async (req, res) => {
  try {
    const { title, amount } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const project = await Project.findById(expense.project);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const oldAmount = Number(expense.amount) || 0;
    const newAmount = Number(amount) || 0;

    // Update expense values
    expense.title = title || expense.title;
    expense.amount = newAmount;
    await expense.save();

    // 🔥 Proper adjustment logic
    project.expenses =
      (project.expenses || 0) - oldAmount + newAmount;

    project.profit =
      (project.projectValue || 0) - (project.expenses || 0);

    await project.save();

    res.json({
      success: true,
      message: "Expense updated successfully",
      data: expense
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// DELETE EXPENSE
// =============================
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const project = await Project.findById(expense.project);
    if (project) {
      const oldAmount = Number(expense.amount) || 0;

      project.expenses =
        (project.expenses || 0) - oldAmount;

      if (project.expenses < 0) project.expenses = 0;

      project.profit =
        (project.projectValue || 0) - (project.expenses || 0);

      await project.save();
    }

    await expense.deleteOne();

    res.json({
      success: true,
      message: "Expense deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// GET ALL EXPENSES
// =============================
router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find().populate("project");
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;