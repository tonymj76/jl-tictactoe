const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: { type: String, default: "Player" },
    email: String,
    wins: { type: Number , default: 0},
    losses: { type: Number , default: 0}
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);