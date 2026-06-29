// backend/models/Department.js
const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    floor: { type: String, default: "" },
    headStaff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", DepartmentSchema);
