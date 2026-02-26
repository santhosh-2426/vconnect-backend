const puppeteer = require("puppeteer");
const Invoice = require("../models/Invoice");

exports.downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client")
      .populate("project");

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

    const midPaid = invoice.payments?.filter(
      p => p.type?.toLowerCase() === "mid"
    ).reduce((sum, p) => sum + p.amount, 0) || 0;

    const finalPaid = invoice.payments?.filter(
      p => p.type?.toLowerCase() === "final"
    ).reduce((sum, p) => sum + p.amount, 0) || 0;

    const formatINR = (amount) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
      }).format(amount);

    const invoiceDate = invoice.createdAt
      ? new Date(invoice.createdAt).toLocaleDateString("en-IN")
      : "N/A";

    const dueDateFormatted = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
      : "N/A";

    const html = `
      <html>
      <body style="font-family:Arial;padding:40px;">
        <h2 style="text-align:center;">V CONNECT MEDIA</h2>
        <hr/>
        <h3>INVOICE # ${invoice.invoiceNumber}</h3>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p><strong>Due Date:</strong> ${dueDateFormatted}</p>

        <h4>Bill To:</h4>
        <p>
          ${invoice.client?.name || ""}<br>
          ${invoice.client?.email || ""}
        </p>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background:#f4f4f4;">
            <th align="left">Description</th>
            <th align="right">Amount</th>
          </tr>
          <tr>
            <td>Project Service</td>
            <td align="right">${formatINR(totalAmount)}</td>
          </tr>
        </table>

        <br>

        <table width="100%" cellpadding="6">
          <tr>
            <td align="right"><strong>Advance Paid:</strong></td>
            <td align="right">${formatINR(advancePaid)}</td>
          </tr>
          <tr>
            <td align="right"><strong>Mid Paid:</strong></td>
            <td align="right">${formatINR(midPaid)}</td>
          </tr>
          <tr>
            <td align="right"><strong>Final Paid:</strong></td>
            <td align="right">${formatINR(finalPaid)}</td>
          </tr>
          <tr>
            <td align="right"><strong>Total Paid:</strong></td>
            <td align="right">${formatINR(totalPaid)}</td>
          </tr>
          <tr>
            <td align="right"><strong>Due:</strong></td>
            <td align="right">${formatINR(dueAmount)}</td>
          </tr>
        </table>

        <hr/>
        <p><strong>Bank Details:</strong><br>
        UPI / Account No</p>

        <p style="text-align:center;margin-top:40px;">
          Thank you for your business!
        </p>
      </body>
      </html>
    `;

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

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`
    );

    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};