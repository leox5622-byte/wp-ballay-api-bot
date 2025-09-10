const mongoose = require("mongoose");

const messageCountSchema = new mongoose.Schema({
  threadID: String,
  userID: String,
  name: String,
  count: { type: Number, default: 1 }
});

module.exports = mongoose.model("MessageCount", messageCountSchema);
