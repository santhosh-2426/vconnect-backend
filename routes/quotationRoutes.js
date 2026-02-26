const express = require("express");
const router = express.Router();
const { downloadQuotationPDF } = require('../controllers/quotationPdfController');
const {
  createQuotation,
  getAllQuotations,
  updateQuotation,
  updateQuotationStatus,
  deleteQuotation,
  addAdvancePayment
} = require("../controllers/quotationController");

const { protect } = require("../middleware/authMiddleware");

// 🔐 Protect all routes (single admin system)
router.use(protect);

// Create quotation
router.post("/", createQuotation);

// View all quotations
router.get("/", getAllQuotations);

// Edit quotation
router.put("/:id", updateQuotation);

// Update status (Approve / Reject)
router.put("/:id/status", updateQuotationStatus);

// Delete quotation
router.delete("/:id", deleteQuotation);
router.get('/:id/pdf', downloadQuotationPDF);

router.post("/:id/add-advance", addAdvancePayment);



module.exports = router;