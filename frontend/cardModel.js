const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        occupation: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        achievement1: {
            type: String,
            default: ""
        },
        achievement2: {
            type: String,
            default: ""
        },
        achievement3: {
            type: String,
            default: ""
        },
        businessEmail: {
            type: String,
            required: true,
            trim: true
        },
        personalEmail: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        youtube: {
            type: String,
            default: ""
        },
        instagram: {
            type: String,
            default: ""
        },
        x: {
            type: String,
            default: ""
        },
        linkedin: {
            type: String,
            default: ""
        },
        facebook: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Card", cardSchema);
