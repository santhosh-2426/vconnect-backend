const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },

    companyName: { 
      type: String 
    },

    phone: { 
      type: String 
    },

    email: { 
      type: String 
    },

    address: { 
      type: String 
    },

    gstNumber: { 
      type: String 
    },

    notes: { 
      type: String 
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.models.Client || mongoose.model("Client", clientSchema);