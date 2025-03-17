const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();



const app = express();

// ✅ Enable CORS for your domain
app.use(cors({ origin: "*", credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ Serve static files (for logo support)
app.use("/public", express.static("public")); // ✅ Now it's correctly placed

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const fs = require("fs");


// ✅ Replace with your Google Sheet ID
const SHEET_ID = "1Xp_IEXsq1pyo_u6-1We38P0auFdXu4-lKChH6sS2iwk";

// ✅ Load Google Service Account Credentials
console.log("📂 Loading Google Service Account Credentials...");
let CREDENTIALS;
try {
    CREDENTIALS = JSON.parse(fs.readFileSync("skillang-database-2d497fab2a4f.json", "utf8"));
    console.log("✅ Credentials loaded successfully!");
} catch (error) {
    console.error("❌ ERROR: Failed to load credentials file:", error);
    process.exit(1); // Stop the server if credentials are missing
}

// ✅ Authenticate Using google-auth-library
const serviceAccountAuth = new JWT({
    email: CREDENTIALS.client_email,
    key: CREDENTIALS.private_key.replace(/\\n/g, "\n"), // Fixes private key formatting issue
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ✅ New Endpoint to Send Data to Google Sheets
app.post("/submit-to-google-sheets", async (req, res) => {
    try {
        console.log("📩 Received request at /submit-to-google-sheets");

        const { name, email, phone, pincode, lookingFor, experience, country, origin } = req.body;

        // Validate Data
        const missingFields = [];
        if (!name) missingFields.push("Name");
        if (!email) missingFields.push("Email");
        if (!phone) missingFields.push("Phone");
        if (!pincode) missingFields.push("Pincode");
        if (!lookingFor) missingFields.push("LookingFor");
        if (!origin) missingFields.push("Origin");
        if (missingFields.length > 0) {
            console.error("❌ Validation Error: Missing fields:", missingFields);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        console.log("✅ All required fields are present. Proceeding...");

        // Get current time in IST and split into date and time
        const now = new Date();
        const optionsDate = { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' };
        const optionsTime = { timeZone: "Asia/Kolkata", hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };

        // Format date as DD-MM-YYYY (replace '/' with '-')
        const formattedDate = now.toLocaleDateString("en-GB", optionsDate).replace(/\//g, "-");
        // Format time as HH:mm:ss
        const formattedTime = now.toLocaleTimeString("en-GB", optionsTime);

        // Connect to Google Sheets
        console.log("📂 Initializing Google Sheets connection...");
        const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        console.log(`✅ Spreadsheet loaded: ${doc.title}`);

        const sheet = doc.sheetsByIndex[0]; // First sheet
        console.log(`📄 Found sheet: ${sheet.title}`);

        // Append new row with data using separate date and time columns
        console.log("📤 Adding data to Google Sheets...");
        await sheet.addRow({
            Origin: origin,
            Name: name,
            Email: email,
            Phone: phone,
            Pincode: pincode,
            LookingFor: lookingFor,
            Country: country || "",
            Experience: experience || "",
            Date: formattedDate,  // Date column
            Time: formattedTime,  // Time column
        });

        console.log("✅ Data added successfully!");
        res.json({ success: true, message: "Data submitted successfully" });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, message: "Server Error: Try again later", error: error.message });
    }
});





// // ✅ Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI || "mongodb+srv://admin:0uomUdTBahyzrjOj@cluster0.mongodb.net/skillang_data?retryWrites=true&w=majority", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

// mongoose.connection.on("connected", () => console.log("✅ MongoDB connected successfully"));
// mongoose.connection.on("error", (err) => console.error("❌ MongoDB connection error:", err));

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
    const { email, name } = req.body; // Accept name from request body

    if (!email || !name) {
        return res.status(400).json({ success: false, message: "Email and Name are required!" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    const mailOptions = {
        from: `"Skillang Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "🔐 Your Skillang OTP Code",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center;">
                <img src="http://13.232.213.117:3001/public/images/logo.png" alt="Skillang Logo" style="max-width: 150px;">
            </div>
            <h2 style="color: #333; text-align: center;">Dear ${name},</h2>
            <p style="font-size: 16px; color: #555; text-align: center;">
                Your One-Time Password (OTP) for verification is:
            </p>
            <div style="text-align: center; font-size: 22px; font-weight: bold; background: #f4f4f4; padding: 10px; border-radius: 5px; margin: 10px 0;">
                ${otp}
            </div>
            <p style="font-size: 14px; color: #777; text-align: center;">
                This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
            </p>
            <p style="font-size: 16px; text-align: center;">
                Thanks & Regards, <br>
                <strong>Skillang Support Team</strong>
            </p>
            <hr>
            <p style="font-size: 12px; color: #aaa; text-align: center;">
                This is a system-generated email. Please do not reply to this email.
            </p>
        </div>
    `,
    };

    try {
        console.log(`📤 Sending OTP: ${otp} to ${email} (Name: ${name})`);
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
        // const inquiry = new Inquiry(req.body);
        //         await inquiry.save(); MongoDB code is commented out, so just return success
        res.json({ message: "✅ Inquiry submitted successfully!" });
    } catch (error) {
        console.error("❌ Error Handling Inquiry:", error);
        res.status(500).json({ message: "❌ Server Error", error });
    }
});

// ✅ New Endpoint to Send Partnership Data to Google Sheets
app.post("/submit-partnership-to-google-sheets", async (req, res) => {
    try {
        console.log("📩 Received partnership request at /submit-partnership-to-google-sheets");

        const { type, name, email, phone, companyName, designation, origin } = req.body;

        // Validate Data
        const missingFields = [];
        if (!type) missingFields.push("Type");
        if (!name) missingFields.push("Name");
        if (!email) missingFields.push("Email");
        if (!phone) missingFields.push("Phone");
        if (!companyName) missingFields.push("Company Name");
        if (!designation) missingFields.push("Designation");


        if (missingFields.length > 0) {
            console.error("❌ Validation Error: Missing fields:", missingFields);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        console.log("✅ All required fields are present. Proceeding...");

        // Get current time in IST and split into date and time
        const now = new Date();
        const optionsDate = { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' };
        const optionsTime = { timeZone: "Asia/Kolkata", hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };

        // Format date as DD-MM-YYYY (replace '/' with '-')
        const formattedDate = now.toLocaleDateString("en-GB", optionsDate).replace(/\//g, "-");
        // Format time as HH:mm:ss
        const formattedTime = now.toLocaleTimeString("en-GB", optionsTime);

        // Connect to Google Sheets - use the new sheet ID
        console.log("📂 Initializing Partnership Google Sheets connection...");
        const PARTNERSHIP_SHEET_ID = "1DoGTJ863AT7Sx8V9epcbVrdO-tR4qXMiol284ot16Wc";
        const doc = new GoogleSpreadsheet(PARTNERSHIP_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        console.log(`✅ Partnership Spreadsheet loaded: ${doc.title}`);

        // Get the first sheet using the exact sheet name
        // If the sheet name is different from "Sheet1", replace it here
        const sheet = doc.sheetsByTitle["Sheet1"] || doc.sheetsByIndex[0]; // Try to find by title, otherwise use first sheet
        console.log(`📄 Found partnership sheet: ${sheet.title}`);

        // Append new row with data using separate date and time columns
        console.log("📤 Adding partnership data to Google Sheets...");
        await sheet.addRow({
            Type: type,
            Name: name,
            "Mobile number": phone,   // Changed from "Phone" to "Mobile number" to match sheet
            Email: email,
            Company: companyName,     // Changed from "CompanyName" to "Company" to match sheet
            Designation: designation,
            // Keeping origin even though it's not in the headers (might be useful)
            Date: formattedDate,
            Time: formattedTime,
        });

        console.log("✅ Partnership data added successfully!");
        res.json({ success: true, message: "Partnership data submitted successfully" });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, message: "Server Error: Try again later", error: error.message });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://skillang.com:${PORT}`);
});
