const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Card = require("./cardModel");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CARD_PRICE_INR = Number(process.env.CARD_PRICE_INR || 499);

// 🔥 Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 🔥 Nodemailer (Hostinger SMTP)
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 🔧 Helpers
function createSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
}

function normalizeUrl(url) {
    if (!url) return "";

    url = url.trim();

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    return "https://" + url;
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    return generatedSignature === signature;
}

// 🔥 MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
}

// 🧪 Test route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});

// 💳 Create Razorpay Order
app.post("/create-order", async (req, res) => {
    try {
        const userData = req.body;

        if (!userData.name || !userData.personalEmail || !userData.businessEmail) {
            return res.status(400).json({
                message: "Missing required user details."
            });
        }

        const order = await razorpay.orders.create({
            amount: CARD_PRICE_INR * 100,
            currency: "INR",
            receipt: `ecard_${Date.now()}`
        });

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            message: "Failed to create payment order."
        });
    }
});

// ✅ Verify Payment + Create Card + Send Email
app.post("/verify-payment", async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userData
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userData) {
            return res.status(400).json({
                message: "Missing payment verification details."
            });
        }

        const isValidSignature = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValidSignature) {
            return res.status(400).json({
                message: "Invalid payment signature."
            });
        }

        console.log("Payment verified:", razorpay_payment_id);

        // 🔧 Normalize links
        userData.youtube = normalizeUrl(userData.youtube);
        userData.instagram = normalizeUrl(userData.instagram);
        userData.x = normalizeUrl(userData.x);
        userData.linkedin = normalizeUrl(userData.linkedin);
        userData.facebook = normalizeUrl(userData.facebook);

        // 🔥 Unique slug
        let slug = createSlug(userData.name);
        const baseSlug = slug;
        let counter = 1;

        while (await Card.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // 💾 Save to DB
        const newCard = await Card.create({
            name: userData.name,
            slug,
            occupation: userData.occupation,
            description: userData.description,
            achievement1: userData.achievement1,
            achievement2: userData.achievement2,
            achievement3: userData.achievement3,
            businessEmail: userData.businessEmail,
            personalEmail: userData.personalEmail,
            phone: userData.phone,
            youtube: userData.youtube,
            instagram: userData.instagram,
            x: userData.x,
            linkedin: userData.linkedin,
            facebook: userData.facebook
        });

        const cardLink = `${BASE_URL}/card/${slug}`;

        // 📧 Send Email
        await transporter.sendMail({
            from: `"Xevonet ECard" <${process.env.EMAIL_USER}>`,
            to: userData.personalEmail,
            subject: "Your Digital Card is Ready 🚀",
            html: `
                <h2>Your E-Card is Ready!</h2>
                <p>Hello ${userData.name},</p>
                <p>Your payment was successful.</p>
                <p>Click below to view your card:</p>
                <p><a href="${cardLink}" target="_blank">${cardLink}</a></p>
                <br>
                <p>Thanks for using Xevonet.</p>
            `
        });

        console.log("Card created + email sent");

        res.json({
            message: "Success",
            cardURL: cardLink
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            message: "Failed to complete process."
        });
    }
});

// 🎯 Card page
app.get("/card/:username", async (req, res) => {
    try {
        const user = await Card.findOne({ slug: req.params.username });

        if (!user) {
            return res.status(404).send("Card not found");
        }

        res.render("card", { user });

    } catch (error) {
        console.error("Error fetching card:", error.message);
        res.status(500).send("Server error");
    }
});

// 🚀 Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on ${BASE_URL}`);
    });
});