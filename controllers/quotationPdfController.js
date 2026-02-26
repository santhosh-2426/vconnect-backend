const puppeteer = require("puppeteer");
const Quotation = require("../models/quotation");

exports.downloadQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("client");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const formatINR = (amount) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
      }).format(amount);

    const quotationDate = quotation.createdAt
      ? new Date(quotation.createdAt).toLocaleDateString("en-IN")
      : "N/A";

    const html = `
      <html>
      <body style="font-family:Arial;padding:40px;">
        <h2 style="text-align:center;">V CONNECT MEDIA</h2>
        <hr/>
        <h3>QUOTATION</h3>

        <p><strong>Date:</strong> ${quotationDate}</p>
        <p><strong>Status:</strong> ${quotation.status}</p>

        <h4>Client Details:</h4>
        <p>
          ${quotation.client?.name || ""}<br>
          ${quotation.client?.email || ""}
        </p>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background:#f4f4f4;">
            <th align="left">Description</th>
            <th align="right">Amount</th>
          </tr>
          <tr>
            <td>Project Service</td>
            <td align="right">${formatINR(quotation.totalAmount)}</td>
          </tr>
        </table>

        <hr/>
        <p style="margin-top:40px;text-align:center;">
          Thank you for choosing V Connect Media.
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
      `attachment; filename=quotation_${quotation._id}.pdf`
    );

    res.send(pdfBuffer);

  } catch (error) {
    console.error("Quotation PDF Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};