const calculateInvoiceStatus = (invoice) => {
  const totalPaid =
    invoice.advancePaid +
    invoice.payments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= invoice.totalAmount) {
    return "Paid";
  }

  if (new Date() > invoice.dueDate && totalPaid < invoice.totalAmount) {
    return "Overdue";
  }

  if (totalPaid > 0) {
    return "Partial";
  }

  return "Pending";
};

module.exports = calculateInvoiceStatus;