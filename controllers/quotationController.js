const Quotation = require("../models/Quotation");
const Project = require("../models/Project");
const Invoice = require("../models/Invoice");
const calculateInvoiceStatus = require("../utils/invoiceStatusHelper");
const PDFDocument = require("pdfkit");


// =============================
// CREATE QUOTATION
// =============================
exports.createQuotation = async (req, res) => {
  try {
    const {
      client,
      services = [],
      totalAmount,
      validUntil,
      notes,
      paymentType
    } = req.body;

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Client is required"
      });
    }

    if (!totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Total amount is required"
      });
    }

    const amount = Number(totalAmount);

    // 🔥 AUTO CALCULATE MILESTONES
    let advance = 0;
    let mid = 0;
    let final = 0;

    if (paymentType === "100") {
      advance = amount;
    } else if (paymentType === "50-50") {
      advance = amount * 0.5;
      final = amount * 0.5;
    } else {
      advance = amount * 0.4;
      mid = amount * 0.4;
      final = amount * 0.2;
    }

    // 🔥 AUTO NUMBER GENERATOR (SAFE)
    const lastQuotation = await Quotation.findOne().sort({ createdAt: -1 });

    let quotationNumber;

    if (lastQuotation && lastQuotation.quotationNumber) {
      const lastParts = lastQuotation.quotationNumber.split("-");
      const lastNumber = parseInt(lastParts[lastParts.length - 1]);
      quotationNumber = `QT-${lastNumber + 1}`;
    } else {
      quotationNumber = "QT-1001";
    }

    const quotation = await Quotation.create({
      client,
      quotationNumber,
      services,
      totalAmount: amount,
      validUntil,
      notes,
      paymentTerms: {
        type: paymentType || "40-40-20",
        advance,
        mid,
        final
      }
    });

    res.status(201).json({
      success: true,
      data: quotation
    });

  } catch (error) {
    console.error("CREATE QUOTATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// =============================
// GET ALL QUOTATIONS
// =============================
exports.getAllQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate("client")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// =============================
// UPDATE QUOTATION (EDIT)
// =============================
exports.updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    quotation.client = req.body.client ?? quotation.client;
    quotation.quotationNumber = req.body.quotationNumber ?? quotation.quotationNumber;
    quotation.totalAmount = req.body.totalAmount ?? quotation.totalAmount;
    quotation.services = req.body.services ?? quotation.services;
    quotation.validUntil = req.body.validUntil ?? quotation.validUntil;
    quotation.notes = req.body.notes ?? quotation.notes;

    // 🔥 RECALCULATE PAYMENT TERMS IF NEEDED
    if (req.body.paymentType || req.body.totalAmount) {
      const type = req.body.paymentType || quotation.paymentTerms.type;
      const amount = Number(req.body.totalAmount ?? quotation.totalAmount);

      let advance = 0;
      let mid = 0;
      let final = 0;

      if (type === "100") {
        advance = amount;
      } else if (type === "50-50") {
        advance = amount * 0.5;
        final = amount * 0.5;
      } else {
        advance = amount * 0.4;
        mid = amount * 0.4;
        final = amount * 0.2;
      }

      quotation.paymentTerms = {
        type,
        advance,
        mid,
        final
      };
    }

    await quotation.save();

    res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// =============================
// UPDATE STATUS (Approve / Reject)
// =============================
exports.updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    if (quotation.status === status) {
      return res.status(400).json({
        success: false,
        message: `Quotation already ${status.toLowerCase()}`
      });
    }

    quotation.status = status;
    await quotation.save();

    // 🚀 AUTO CREATE PROJECT + INVOICE WHEN APPROVED
   

   
    

    res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// =============================
// DELETE QUOTATION
// =============================
exports.deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    await quotation.deleteOne();

    res.status(200).json({
      success: true,
      message: "Quotation deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// =============================
// GENERATE QUOTATION PDF
// =============================
exports.downloadQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate("client");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Quotation-${quotation.quotationNumber}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(22).text("V CONNECT MEDIA", { align: "center" });
    doc.moveDown();

    doc.fontSize(16).text(`Quotation # ${quotation.quotationNumber}`);
    doc.moveDown();

    doc.fontSize(12).text(`Client: ${quotation.client?.name || "N/A"}`);
    doc.text(`Amount: ₹${quotation.totalAmount}`);
    doc.text(`Advance: ₹${quotation.paymentTerms?.advance || 0}`);
    doc.text(`Mid: ₹${quotation.paymentTerms?.mid || 0}`);
    doc.text(`Final: ₹${quotation.paymentTerms?.final || 0}`);
    doc.text(`Status: ${quotation.status}`);
    doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`);

    doc.moveDown();
    doc.text("Thank you for choosing V Connect Media!", { align: "center" });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF"
    });
  }
};
  exports.addAdvancePayment = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const amount = Number(req.body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid advance amount" });
    }

    // 🔥 Find existing invoice
    let invoice = await Invoice.findOne({
      invoiceNumber: `INV-${quotation.quotationNumber}`
    });

    // 🔥 If invoice does not exist, create it
    if (!invoice) {
      invoice = new Invoice({
        client: quotation.client,
        invoiceNumber: `INV-${quotation.quotationNumber}`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalAmount: quotation.totalAmount,
        payments: []
      });
    }

    // 🔥 Push advance payment into payments array
    invoice.payments.push({
      amount,
      method: "Manual",
      type: "Advance",
      paymentDate: new Date()
    });

    invoice.status = calculateInvoiceStatus(invoice);

    await invoice.save();

    res.json({ message: "Advance payment added successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};