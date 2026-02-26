const cron = require("node-cron");
const Invoice = require("../models/Invoice");
const { sendEmail } = require("../utils/emailService");

function startInvoiceReminderJob() {

  // Runs every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {

    console.log("⏳ Running invoice reminder job...");

    try {

      const today = new Date();
      const invoices = await Invoice.find().populate("client");

      for (const invoice of invoices) {

        // Skip if no due date or fully paid
        if (!invoice.dueDate || invoice.status === "Paid") continue;

        // Skip if no pending balance
        if (invoice.dueAmount <= 0) continue;

        const dueDate = new Date(invoice.dueDate);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const todayString = today.toDateString();
        const lastSent = invoice.lastReminderDate
          ? invoice.lastReminderDate.toDateString()
          : null;

        // ============================
        // 🔔 3 DAYS BEFORE DUE
        // ============================
        if (diffDays === 3) {

          if (lastSent === todayString) continue;

          await sendEmail({
            to: invoice.client.email,
            subject: `Reminder: Invoice ${invoice.invoiceNumber} due soon`,
            text: `
Hello ${invoice.client.name},

Friendly reminder that Invoice ${invoice.invoiceNumber} is due in 3 days.

Invoice Summary:
--------------------------------
Total Amount : ₹${invoice.totalAmount}
Total Paid   : ₹${invoice.totalPaid}
Remaining Due: ₹${invoice.dueAmount}
Due Date     : ${dueDate.toDateString()}

Please arrange payment before the due date.

Thank you,
V Connect Media
`
          });

          invoice.reminderSentCount += 1;
          invoice.lastReminderDate = new Date();
          await invoice.save();

          console.log(`3-day reminder sent for ${invoice.invoiceNumber}`);
        }

        // ============================
        // 🔥 OVERDUE
        // ============================
        if (diffDays < 0 && invoice.status !== "Paid") {

          if (lastSent === todayString) continue;
          if (invoice.reminderSentCount >= 3) continue;

          invoice.status = "Overdue";
          invoice.reminderSentCount += 1;
          invoice.lastReminderDate = new Date();
          await invoice.save();

          await sendEmail({
            to: invoice.client.email,
            subject: `⚠️ Overdue Invoice ${invoice.invoiceNumber}`,
            text: `
Hello ${invoice.client.name},

This is regarding Invoice ${invoice.invoiceNumber}, which is now overdue.

Invoice Details:
--------------------------------
Total Amount : ₹${invoice.totalAmount}
Total Paid   : ₹${invoice.totalPaid}
Outstanding  : ₹${invoice.dueAmount}
Due Date     : ${dueDate.toDateString()}

Kindly arrange payment of the outstanding balance immediately.

Thank you,
V Connect Media
`
          });

          console.log(`Overdue reminder sent for ${invoice.invoiceNumber}`);
        }

      }

    } catch (error) {
      console.error("Reminder Job Error:", error.message);
    }

  });

}

module.exports = { startInvoiceReminderJob };