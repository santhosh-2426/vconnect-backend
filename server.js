require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { startInvoiceReminderJob } = require("./services/reminderService");

dotenv.config();

const app = express();

// Connect Database
connectDB().then(() => {
  console.log("MongoDB Connected ✅");
  startInvoiceReminderJob();
});

/* =========================
   ✅ PRODUCTION CORS FIX
========================= */
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "https://vconnect-backend-ahja.onrender.com",
  "https://yourdomain.com",        // 🔥 REPLACE WITH YOUR REAL DOMAIN
  "https://www.yourdomain.com"     // 🔥 REPLACE WITH YOUR REAL DOMAIN
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));



app.use(express.json());

/* =========================
   ROUTES
========================= */

const clientRoutes = require("./routes/clientRoutes");
app.use("/api/clients", clientRoutes);

const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

const expenseRoutes = require("./routes/expenseRoutes");
app.use("/api/expenses", expenseRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

const invoiceRoutes = require("./routes/invoiceRoutes");
app.use("/api/invoices", invoiceRoutes);

const analyticsRoutes = require("./routes/analyticsRoutes");
app.use("/api/analytics", analyticsRoutes);

const quotationRoutes = require("./routes/quotationRoutes");
app.use("/api/quotations", quotationRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

// Root Test Route
app.get("/", (req, res) => {
  res.send("V Connect Media API Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});