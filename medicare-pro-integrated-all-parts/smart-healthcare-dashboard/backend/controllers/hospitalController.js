// backend/controllers/hospitalController.js
import Department from "../models/Department.js";
import Staff from "../models/Staff.js";

export const getDashboard = async (req, res) => {
  try {
    const [departments, staff] = await Promise.all([
      Department.find().sort({ createdAt: -1 }),
      Staff.find().populate("department").sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      counts: {
        departments: departments.length,
        staff: staff.length,
        doctors: staff.filter((s) => s.role === "Doctor").length,
        nurses: staff.filter((s) => s.role === "Nurse").length,
        admins: staff.filter((s) => s.role === "Admin").length,
      },
      departments,
      staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate("headStaff").sort({ createdAt: -1 });
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate("headStaff");
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.json({ success: true, department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });

    await Staff.updateMany({ department: req.params.id }, { $unset: { department: "" } });
    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStaff = async (req, res) => {
  try {
    const staff = await Staff.create(req.body);
    res.status(201).json({ success: true, staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find().populate("department").sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).populate("department");
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
    res.json({ success: true, staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
    res.json({ success: true, message: "Staff deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignStaffToDepartment = async (req, res) => {
  try {
    const { staffId, departmentId } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });

    const department = await Department.findById(departmentId);
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });

    staff.department = departmentId;
    await staff.save();

    res.json({ success: true, message: "Staff assigned to department", staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};