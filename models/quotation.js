const mongoose = require("mongoose");

const quotationServiceSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true
  },
  description: String,
  amount: {
    type: Number,
    required: true
  }
});

const quotationSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    quotationNumber: {
      type: String,
      required: true,
      unique: true
    },

    quotationDate: {
      type: Date,
      default: Date.now
    },

    validUntil: {
      type: Date
    },

    services: [quotationServiceSchema],

    totalAmount: {
      type: Number,
      required: true
    },

    // 🔥 NEW PAYMENT STRUCTURE SYSTEM
    paymentTerms: {
      type: {
        type: String,
        enum: ['100', '50-50', '40-40-20'],
        default: '40-40-20'
      },
      advance: { type: Number, default: 0 },
      mid: { type: Number, default: 0 },
      final: { type: Number, default: 0 }
    },

    notes: String,

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);
module.exports = mongoose.models.Quotation || mongoose.model("Quotation", quotationSchema);