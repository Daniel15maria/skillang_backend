const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// ✅ Enable CORS for your domain
app.use(cors({
    origin: ["http://skillang.com", "https://skillang.com"],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/skillang", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => console.log("✅ MongoDB connected successfully"));
mongoose.connection.on("error", (err) => console.error("❌ MongoDB connection error:", err));

// ✅ Define Schema & Model
const InquirySchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    pincode: String,
    lookingFor: String,
    otp: String,
});

const Inquiry = mongoose.model("Inquiry", InquirySchema, "enquiry_form");

// ✅ Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Store OTPs temporarily
const otpStore = {};

// ✅ Send OTP to Email
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required!" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Verification",
        text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
    };

    try {
        console.log(`📤 Sending OTP: ${otp} to ${email}`);
        let info = await transporter.sendMail(mailOptions);
        console.log("✅ Email Sent Successfully:", info.response);

        res.json({ success: true, message: "OTP sent successfully!" });
    } catch (error) {
        console.error("❌ Email Send Error:", error);
        res.status(500).json({ success: false, message: "Error sending OTP", error });
    }
});

// ✅ Verify OTP
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required!" });
    }

    if (otpStore[email] == otp) {
        console.log(`✅ OTP Verified for ${email}`);
        delete otpStore[email];
        res.json({ success: true, message: "OTP verified successfully!" });
    } else {
        console.log(`❌ Invalid OTP Attempt for ${email}`);
        res.status(400).json({ success: false, message: "Invalid OTP" });
    }
});

// ✅ Handle Form Submission
app.post("/submit-inquiry", async (req, res) => {
    try {
        console.log("📩 Received Data:", req.body);
        const inquiry = new Inquiry(req.body);
        await inquiry.save();
        res.json({ message: "✅ Inquiry submitted successfully!" });
    } catch (error) {
        console.error("❌ Error Saving Inquiry:", error);
        res.status(500).json({ message: "❌ Error saving inquiry", error });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://skillang.com:${PORT}`);
});
