const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const logSchema = new Schema({
  kind: {
    type: String,
    required: true,
  },
  item: { type: Schema.Types.ObjectId, refPath: "kind" },
});

module.exports = mongoose.model("Log", logSchema);
