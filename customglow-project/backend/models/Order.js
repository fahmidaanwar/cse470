const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerName: String,
    email: String,
    phone: String,
    address: String,

    items: [
      {
        productId: String,
        name: String,
        price: Number,
        quantity: Number
      }
    ],

    total: Number,

    status: {
      type: String,
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);