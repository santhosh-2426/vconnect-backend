const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    default: "Cash"
  },
  type: {
    type: String,
    enum: ["Advance", "Mid", "Final", "Other"],
    default: "Other"
  },
  note: {
    type: String
  }
});

const serviceSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },

    invoiceDate: {
      type: Date,
      default: Date.now
    },

    dueDate: {
      type: Date,
      required: true
    },

    totalAmount: {
      type: Number,
      required: true
    },

    payments: [paymentSchema],

    serviceBreakdown: [serviceSchema],

    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending"
    },

    reminderSentCount: {
      type: Number,
      default: 0
    },

    lastReminderDate: {
      type: Date
    }
  },
  { timestamps: true }
);


// ============================
// VIRTUAL FIELDS (CLEAN VERSION)
// ============================

// Calculate totalPaid (ONLY from payments)
invoiceSchema.virtual("totalPaid").get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});

// Calculate dueAmount
invoiceSchema.virtual("dueAmount").get(function () {
  return this.totalAmount - this.totalPaid;
});

// Make virtuals appear in JSON responses
invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Invoice", invoiceSchema);