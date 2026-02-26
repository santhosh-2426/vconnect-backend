const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    expenseDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);