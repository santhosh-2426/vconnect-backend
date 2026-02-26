const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    
    serviceType: {
  type: String,
  enum: ['Website', 'Animation', 'Editing', 'Walkthrough', 'General'],
  default: 'General'
},

    projectValue: {
      type: Number,
      required: true,
    },

    advanceReceived: {
      type: Number,
      default: 0,
    },

    totalPaid: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    deadline: Date,

    // ✅ UPDATED STATUS ENUM (matches frontend exactly)
    status: {
      type: String,
      enum: [
        "discussion",
        "active",
        "in progress",
        "completed",
        "cancelled",
      ],
      default: "discussion",
    },

    expenses: {
      type: Number,
      default: 0,
    },

    profit: {
      type: Number,
      default: 0,
    },

    assignedEditors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports =
module.exports = mongoose.models.Project || mongoose.model("Project", projectSchema);