const express = require("express");
const router = express.Router();
const { downloadInvoicePDF } = require("../controllers/invoicePdfController");

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

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", authorizeRoles("Admin", "Accountant"), createInvoice);
router.post("/from-quotation/:id", authorizeRoles("Admin", "Accountant"), createInvoiceFromQuotation);
router.post("/:id/payment", authorizeRoles("Admin", "Accountant"), addPayment);

router.get("/", authorizeRoles("Admin", "Accountant"), getAllInvoices);
router.get("/overdue", authorizeRoles("Admin", "Accountant"), getOverdueInvoices);
router.get("/analytics/monthly-revenue", authorizeRoles("Admin"), getMonthlyRevenue);
router.get("/analytics/service-revenue", authorizeRoles("Admin"), getServiceRevenue);
router.get("/analytics/dashboard-summary", authorizeRoles("Admin"), getDashboardSummary);
router.delete("/:id", authorizeRoles("Admin"), deleteInvoice);
router.get("/:id/pdf", authorizeRoles("Admin", "Accountant"), downloadInvoicePDF);
router.post("/:id/send", authorizeRoles("Admin"), sendInvoiceEmail);

module.exports = router;