import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  console.log("📧 Attempting to send email to:", to);
  console.log("📧 SMTP Config:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? "✅ Password exists" : "❌ Password MISSING",
  });

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("📧 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP Connection verified!");
  } catch (verifyError) {
    console.error("❌ SMTP Verification Failed:");
    console.error("❌ Error Code:", verifyError.code);
    console.error("❌ Error Message:", verifyError.message);
    throw verifyError;
  }

  const mailOptions = {
    from:    `"E-Commerce Store" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("✅ Email sent successfully! ID:", info.messageId);
  return info;
};

export default sendEmail;