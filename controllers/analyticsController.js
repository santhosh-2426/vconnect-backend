const Invoice = require("../models/Invoice");
const Expense = require("../models/Expense");
const Project = require("../models/project");
const Client = require("../models/Client");

exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const firstDayPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayPreviousMonth = new Date(currentYear, currentMonth, 0);

    // =============================
    // CURRENT MONTH REVENUE
    // =============================
    const currentRevenueData = await Invoice.aggregate([
      { $unwind: "$payments" },
      {
        $match: {
          "payments.paymentDate": { $gte: firstDayCurrentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payments.amount" }
        }
      }
    ]);

    const currentRevenue = currentRevenueData[0]?.total || 0;

    // =============================
    // PREVIOUS MONTH REVENUE
    // =============================
    const previousRevenueData = await Invoice.aggregate([
      { $unwind: "$payments" },
      {
        $match: {
          "payments.paymentDate": {
            $gte: firstDayPreviousMonth,
            $lte: lastDayPreviousMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payments.amount" }
        }
      }
    ]);

    const previousRevenue = previousRevenueData[0]?.total || 0;

    // FIX 1: Guard zero/zero edge case to prevent NaN
    const revenueGrowth =
      previousRevenue === 0 && currentRevenue === 0
        ? 0
        : previousRevenue === 0
        ? 100
        : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

    // =============================
    // CURRENT MONTH EXPENSE
    // =============================
    const currentExpenseData = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: firstDayCurrentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const currentExpense = currentExpenseData[0]?.total || 0;

    // =============================
    // PREVIOUS MONTH EXPENSE
    // =============================
    const previousExpenseData = await Expense.aggregate([
      {
        $match: {
          expenseDate: {
            $gte: firstDayPreviousMonth,
            $lte: lastDayPreviousMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const previousExpense = previousExpenseData[0]?.total || 0;

    // FIX 1: Guard zero/zero edge case to prevent NaN
    const expenseGrowth =
      previousExpense === 0 && currentExpense === 0
        ? 0
        : previousExpense === 0
        ? 100
        : ((currentExpense - previousExpense) / previousExpense) * 100;

    // =============================
    // PROFIT CALCULATION
    // =============================
    const profit = currentRevenue - currentExpense;

    const profitMargin =
      currentRevenue === 0
        ? 0
        : (profit / currentRevenue) * 100;

    // =============================
    // REPEAT CLIENT CALCULATION
    // =============================
    const repeatClientsData = await Project.aggregate([
      {
        $group: {
          _id: "$client",
          projectCount: { $sum: 1 }
        }
      },
      {
        $match: {
          projectCount: { $gt: 1 }
        }
      }
    ]);

    const totalClients = await Client.countDocuments();

    const repeatClientPercentage =
      totalClients === 0
        ? 0
        : (repeatClientsData.length / totalClients) * 100;

    // =============================
    // BEST & WORST SERVICE BY PROFIT
    // =============================
    const serviceProfitData = await Project.aggregate([
      {
        $match: {
          serviceType: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$serviceType",
          totalProfit: { $sum: "$profit" }
        }
      },
      {
        $sort: { totalProfit: -1 }
      }
    ]);

    const bestService = serviceProfitData[0] || null;
    const worstService =
      serviceProfitData.length > 0
        ? serviceProfitData[serviceProfitData.length - 1]
        : null;

    // =============================
    // CLIENT ACQUISITION RATE
    // =============================
    const newClientsCount = await Client.countDocuments({
      createdAt: { $gte: firstDayCurrentMonth }
    });

    const totalClientsCount = await Client.countDocuments();

    const acquisitionRate =
      totalClientsCount === 0
        ? 0
        : (newClientsCount / totalClientsCount) * 100;

    // =============================
    // SMART INSIGHTS (Rule-Based)
    // =============================
    let insights = [];

    // Profit margin insight
    if (profitMargin > 40) {
      insights.push("Excellent profit margin this month. Business efficiency is strong.");
    } else if (profitMargin > 20) {
      insights.push("Profit margin is stable, but there is room for cost optimization.");
    } else {
      insights.push("Profit margin is low. Review expenses and pricing strategy.");
    }

    // FIX 2 & 3: Guard negative worstService profit and single-service edge case
    if (bestService && worstService && bestService._id !== worstService._id && bestService.totalProfit > 0) {
      if (worstService.totalProfit <= 0) {
        insights.push(
          `${bestService._id} is the top performing service. ${worstService._id} is underperforming or at a loss.`
        );
      } else {
        const ratio = (bestService.totalProfit / worstService.totalProfit).toFixed(1);
        insights.push(
          `${bestService._id} service generates ${ratio}x more profit than ${worstService._id}.`
        );
      }
    }

    // Client acquisition insight
    if (acquisitionRate > 50) {
      insights.push("Strong client acquisition this month.");
    } else if (acquisitionRate > 0) {
      insights.push("Client growth is moderate. Consider marketing push.");
    } else {
      insights.push("No new clients acquired this month.");
    }

    // Revenue growth insight
    if (revenueGrowth > 0) {
      insights.push("Revenue is growing compared to last month.");
    } else if (revenueGrowth < 0) {
      insights.push("Revenue declined compared to last month.");
    } else {
      insights.push("Revenue unchanged compared to last month.");
    }

    // =============================
    // RESPONSE
    // =============================
    res.status(200).json({
      success: true,
      data: {
        currentRevenue,
        previousRevenue,
        revenueGrowth: revenueGrowth.toFixed(2),

        currentExpense,
        previousExpense,
        expenseGrowth: expenseGrowth.toFixed(2),

        profit,
        profitMargin: profitMargin.toFixed(2),

        repeatClientPercentage: repeatClientPercentage.toFixed(2),

        bestService,
        worstService,

        newClientsCount,
        totalClientsCount,
        acquisitionRate: acquisitionRate.toFixed(2),

        insights
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};