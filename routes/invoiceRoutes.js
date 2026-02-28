const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createInvoice,
  createInvoiceFromQuotation,
  addPayment,
  getAllInvoices,
  getOverdueInvoices,
  getMonthlyRevenue,
  getServiceRevenue,
  getDashboardSummary,
  deleteInvoice,
  sendInvoiceEmail,
} = require("../controllers/invoiceController");

const { downloadInvoicePDF } = require("../controllers/invoicePdfController");

// Only token required
router.use(protect);

router.post("/", createInvoice);
router.post("/from-quotation/:id", createInvoiceFromQuotation);
router.post("/:id/payment", addPayment);

router.get("/", getAllInvoices);
router.get("/overdue", getOverdueInvoices);
router.get("/analytics/monthly-revenue", getMonthlyRevenue);
router.get("/analytics/service-revenue", getServiceRevenue);
router.get("/analytics/dashboard-summary", getDashboardSummary);
router.delete("/:id", deleteInvoice);
router.get("/:id/pdf", downloadInvoicePDF);
router.post("/:id/send", sendInvoiceEmail);

module.exports = router;