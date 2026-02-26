const Client = require('../models/Client');
const Project = require('../models/project');
const Invoice = require('../models/Invoice');

exports.getDashboardSummary = async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    const totalProjects = await Project.countDocuments();

    const revenueAgg = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    res.json({
      totalClients,
      totalProjects,
      totalRevenue,
      totalProfit: 0,
      overdueInvoices: 0
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};