const Invoice = require("../models/Invoice");
const Quotation = require("../models/quotation");
const calculateInvoiceStatus = require("../utils/invoiceStatusHelper");


// ============================
// CREATE INVOICE
// ============================
exports.createInvoice = async (req, res) => {
  try {
    let {
      client,
      project,
      invoiceNumber,
      dueDate,
      totalAmount,
      advancePaid,
      serviceBreakdown
    } = req.body;

    // 🔥 Auto-generate invoice number if missing
    if (!invoiceNumber) {
      const invoiceCount = await Invoice.countDocuments();
      invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;
    }

    // 🔥 Auto-set due date to 7 days if not provided
    if (!dueDate) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
    }

    const invoice = new Invoice({
      client,
      project,
      invoiceNumber,
      dueDate,
      totalAmount,
      advancePaid: advancePaid || 0,
      serviceBreakdown: serviceBreakdown || []
    });

    invoice.status = calculateInvoiceStatus(invoice);

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================
// CONVERT QUOTATION TO INVOICE
// ============================
exports.createInvoiceFromQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("client");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    // ✅ Only allow conversion if quotation is Approved
    if (quotation.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Quotation must be Approved before converting to an invoice"
      });
    }

    // 🔥 CHECK IF INVOICE ALREADY EXISTS
    const existingInvoice = await Invoice.findOne({
  invoiceNumber: `INV-${quotation.quotationNumber}`
});

if (existingInvoice) {
  return res.status(200).json({
    success: true,
    message: "Invoice already exists",
    data: existingInvoice
  });
}
    const invoiceNumber = `INV-${quotation.quotationNumber}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = new Invoice({
      client: quotation.client._id,
      project: null,
      invoiceNumber,
      dueDate,
      totalAmount: quotation.totalAmount,
      payments: [],
      // ✅ Store quotation status for reference only — does NOT affect invoice payment logic
      quotationStatus: quotation.status,
      serviceBreakdown: quotation.services?.map(service => ({
        serviceName: service.serviceName,
        amount: service.amount
      })) || []
    });

    // ✅ Invoice always starts as "Unpaid" — driven purely by payment logic
    invoice.status = calculateInvoiceStatus(invoice);

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Invoice created from quotation successfully",
      data: invoice
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================
// ADD PAYMENT TO INVOICE
// ============================
exports.addPayment = async (req, res) => {
  try {
    const { amount, method, type } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    invoice.payments.push({
      amount,
      method,
      type,
      
    });

    invoice.status = calculateInvoiceStatus(invoice);

    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: invoice
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================
// GET ALL INVOICES
// ============================
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("client")
      .populate("project")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================
// GET OVERDUE INVOICES
// ============================
exports.getOverdueInvoices = async (req, res) => {
  try {
    const today = new Date();

    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $ne: "Paid" }
    })
      .populate("client")
      .populate("project");

    res.status(200).json({
      success: true,
      count: overdueInvoices.length,
      data: overdueInvoices
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================
// MONTHLY REVENUE ANALYTICS
// ============================
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const revenue = await Invoice.aggregate([
      { $unwind: "$payments" },
      {
        $group: {
          _id: {
            year: { $year: "$payments.paymentDate" },
            month: { $month: "$payments.paymentDate" }
          },
          totalRevenue: { $sum: "$payments.amount" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: revenue
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================
// SERVICE-WISE REVENUE
// ============================
exports.getServiceRevenue = async (req, res) => {
  try {
    const revenue = await Invoice.aggregate([
      { $unwind: "$serviceBreakdown" },
      {
        $group: {
          _id: "$serviceBreakdown.serviceName",
          totalRevenue: { $sum: "$serviceBreakdown.amount" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: revenue
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================
// DASHBOARD SUMMARY
// ============================
exports.getDashboardSummary = async (req, res) => {
  try {

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const totalRevenueData = await Invoice.aggregate([
      { $unwind: "$payments" },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$payments.amount" }
        }
      }
    ]);

    const totalRevenue = totalRevenueData[0]?.totalRevenue || 0;

    const monthlyRevenueData = await Invoice.aggregate([
      { $unwind: "$payments" },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: "$payments.paymentDate" }, currentMonth] },
              { $eq: [{ $year: "$payments.paymentDate" }, currentYear] }
            ]
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

    const thisMonthRevenue = monthlyRevenueData[0]?.total || 0;

    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $ne: "Paid" }
    });

    const totalOverdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + inv.dueAmount,
      0
    );

    const totalInvoices = await Invoice.countDocuments();
    const totalOverdueInvoices = overdueInvoices.length;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        thisMonthRevenue,
        totalOverdueAmount,
        totalInvoices,
        totalOverdueInvoices
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================
// DELETE INVOICE
// ============================
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================
// SEND INVOICE EMAIL
// ============================
const puppeteer = require("puppeteer");
const { sendEmail } = require("../utils/emailService");

exports.sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    const totalAmount = invoice.totalAmount || 0;

    const totalPaid = invoice.payments?.reduce(
      (sum, payment) => sum + payment.amount,
      0
    ) || 0;

    const dueAmount = totalAmount - totalPaid;

   const advancePaid = invoice.payments?.filter(
  p => p.type?.toLowerCase() === "advance"
).reduce((sum, p) => sum + p.amount, 0) || 0;

    const midPaid = invoice.payments
      .filter(p => p.type === "Mid")
      .reduce((sum, p) => sum + p.amount, 0);

    const finalPaid = invoice.payments
      .filter(p => p.type === "Final")
      .reduce((sum, p) => sum + p.amount, 0);

    // INR Formatter
    const formatINR = (amount) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    // Date Formatters
    const invoiceDate = invoice.createdAt
      ? new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    const dueDateFormatted = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    // 🔥 PREMIUM HTML TEMPLATE — used for BOTH email body AND PDF attachment
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;letter-spacing:2px;text-transform:uppercase;">V CONNECT MEDIA</h1>
              <p style="margin:6px 0 0;color:#a0a8c0;font-size:13px;">Creative Agency &amp; Media Solutions</p>
            </td>
          </tr>

          <!-- INVOICE TITLE BAR -->
          <tr>
            <td style="background-color:#e8f0fe;padding:14px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:bold;color:#1a1a2e;">INVOICE</td>
                  <td align="right" style="font-size:13px;color:#555;">
                    <strong style="color:#1a1a2e;">#${invoice.invoiceNumber}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INVOICE META: BILL TO + DATES -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- BILL TO -->
                  <td width="50%" valign="top">
                    <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;">Bill To</p>
                    <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a2e;">${invoice.client?.name || 'N/A'}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#555;">${invoice.client?.email || ''}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#555;">${invoice.client?.phone || ''}</p>
                  </td>
                  <!-- DATES -->
                  <td width="50%" valign="top" align="right">
                    <table cellpadding="4" cellspacing="0" align="right">
                      <tr>
                        <td style="font-size:12px;color:#888;text-align:right;">Invoice Date:</td>
                        <td style="font-size:12px;color:#1a1a2e;font-weight:bold;padding-left:10px;">${invoiceDate}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#888;text-align:right;">Due Date:</td>
                        <td style="font-size:12px;color:#e63946;font-weight:bold;padding-left:10px;">${dueDateFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:20px 32px 0;">
              <hr style="border:none;border-top:1px solid #e8e8e8;margin:0;"/>
            </td>
          </tr>

          <!-- DESCRIPTION TABLE -->
          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#1a1a2e;">
                    <th style="padding:10px 14px;text-align:left;font-size:12px;color:#ffffff;border-radius:4px 0 0 4px;">Description</th>
                    <th style="padding:10px 14px;text-align:right;font-size:12px;color:#ffffff;border-radius:0 4px 4px 0;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background-color:#f9f9f9;">
                    <td style="padding:12px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">
                      Project Service${invoice.project ? ` — ${invoice.project}` : ''}
                    </td>
                    <td style="padding:12px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #eee;">
                      ${formatINR(totalAmount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding:12px 14px;font-size:14px;font-weight:bold;color:#1a1a2e;">Total Amount</td>
                    <td style="padding:12px 14px;font-size:14px;font-weight:bold;color:#1a1a2e;text-align:right;">${formatINR(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- PAYMENT BREAKDOWN -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fbff;border:1px solid #dce8ff;border-radius:6px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:12px 16px;background-color:#e8f0fe;">
                    <strong style="font-size:13px;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.5px;">Payment Breakdown</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#555;border-bottom:1px solid #eee;">Advance Paid</td>
                  <td style="padding:10px 16px;font-size:13px;color:#1565c0;font-weight:bold;text-align:right;border-bottom:1px solid #eee;">${formatINR(advancePaid)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#555;border-bottom:1px solid #eee;">Mid Paid</td>
                  <td style="padding:10px 16px;font-size:13px;color:#1565c0;font-weight:bold;text-align:right;border-bottom:1px solid #eee;">${formatINR(midPaid)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#555;border-bottom:1px solid #eee;">Final Paid</td>
                  <td style="padding:10px 16px;font-size:13px;color:#1565c0;font-weight:bold;text-align:right;border-bottom:1px solid #eee;">${formatINR(finalPaid)}</td>
                </tr>
                <tr style="background-color:#e8f5e9;">
                  <td style="padding:10px 16px;font-size:13px;color:#2e7d32;font-weight:bold;border-bottom:1px solid #c8e6c9;">Total Paid</td>
                  <td style="padding:10px 16px;font-size:13px;color:#2e7d32;font-weight:bold;text-align:right;border-bottom:1px solid #c8e6c9;">${formatINR(totalPaid)}</td>
                </tr>
                <tr style="background-color:#fdecea;">
                  <td style="padding:12px 16px;font-size:14px;color:#c62828;font-weight:bold;">Due Amount</td>
                  <td style="padding:12px 16px;font-size:14px;color:#c62828;font-weight:bold;text-align:right;">${formatINR(dueAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BANK DETAILS -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;border-left:4px solid #1a1a2e;border-radius:0 6px 6px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:bold;">Bank Details</p>
                    <p style="margin:0;font-size:13px;color:#333;line-height:1.8;">
                      <strong>Account Name:</strong> V Connect Media<br/>
                      <strong>Bank:</strong> HDFC Bank<br/>
                      <strong>Account No:</strong> XXXXXXXXXXXX<br/>
                      <strong>IFSC Code:</strong> HDFC0XXXXXX<br/>
                      <strong>UPI:</strong> vconnectmedia@upi
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- THANK YOU -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#555;">Thank you for choosing <strong style="color:#1a1a2e;">V Connect Media</strong>.</p>
              <p style="margin:6px 0 0;font-size:12px;color:#999;">Please complete the pending payment before the due date.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1a1a2e;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a0a8c0;">© ${new Date().getFullYear()} V Connect Media. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 🔥 GENERATE PDF USING PUPPETEER from the same premium HTML template
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    // 🔥 SEND EMAIL with premium HTML body + Puppeteer-generated PDF attachment
    await sendEmail({
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber} from V Connect Media`,
      html,
      attachments: [
        {
          filename: `invoice_${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: "Invoice email sent successfully"
    });

  } catch (error) {
    console.error("SEND INVOICE EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};