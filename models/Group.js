const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  settings: {
    welcomeDisabled: { type: Boolean, default: false },
    welcomeMessage: { type: String, default: null },
    goodbyeDisabled: { type: Boolean, default: false }
  },
  commandCount: { type: Number, default: 0 },
  members: { type: Array, default: [] }
});

module.exports = mongoose.model("Group", groupSchema);
