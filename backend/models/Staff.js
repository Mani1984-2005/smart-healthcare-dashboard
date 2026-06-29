// backend/models/Staff.js
const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    staffId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ["Doctor", "Nurse", "Admin"],
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    shift: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", StaffSchema);
// backend/models/Staff.js
const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      enum: ["Doctor", "Nurse", "Admin"],
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    shift: {
      type: String,
      default: "",
      trim: true,
    },

    specialization: {
      type: String,
      default: "",
      trim: true,
    },

    qualification: {
      type: String,
      default: "",
      trim: true,
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", StaffSchema);