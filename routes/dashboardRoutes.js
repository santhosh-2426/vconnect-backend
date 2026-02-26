const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Project = require("../models/project");
const Expense = require("../models/Expense");
const Invoice = require("../models/Invoice");

// Import the needed controller and middleware for the summary route
const { getDashboardSummary } = require("../controllers/invoiceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Connect the summary route exactly how the frontend expects it
router.get("/summary", protect, authorizeRoles("Admin"), getDashboardSummary);

router.get("/", async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    const totalProjects = await Project.countDocuments();

    const activeProjects = await Project.countDocuments({
      status: { $ne: "Closed" },
    });

    const revenueData = await Project.aggregate([
      { $group: { _id: null, total: { $sum: "$projectValue" } } },
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const expenseData = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenseData.length > 0 ? expenseData[0].total : 0;

    const netProfit = totalRevenue - totalExpenses;

    const today = new Date();

const overdueInvoices = await Invoice.countDocuments({
  status: { $ne: "Paid" },
  dueDate: { $lt: today }
});

res.status(200).json({
  success: true,
  totalClients,
  totalProjects,
  activeProjects,
  totalRevenue,
  totalExpenses,
  totalProfit: netProfit,
  overdueInvoices
});

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;