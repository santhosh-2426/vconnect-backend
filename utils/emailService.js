const nodemailer = require("nodemailer");

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false   // 🔥 ADD THIS LINE
  }
});

exports.sendEmail = async ({ to, subject, text, attachments }) => {
  await transporter.sendMail({
    from: `"V Connect Media" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    subject,
    text,
    attachments
  });
};            