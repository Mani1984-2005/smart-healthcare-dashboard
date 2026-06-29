// backend/models/Billing.js
const mongoose = require("mongoose");

const BillingItemSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Consultation", "Lab", "Procedure", "Medicine", "Room", "Other"],
      default: "Other",
    },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BillingSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    patientId: {
      type: String,
      required: true,
      trim: true,
    },

    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    visitId: {
      type: String,
      default: "",
      trim: true,
    },

    items: {
      type: [BillingItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Insurance", "Pending"],
      default: "Pending",
    },

    status: {
      type: String,
      enum: ["Draft", "Unpaid", "Partially Paid", "Paid", "Cancelled"],
      default: "Draft",
    },

    notes: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    billingDate: {
      type: Date,
      default: Date.now,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Billing", BillingSchema);