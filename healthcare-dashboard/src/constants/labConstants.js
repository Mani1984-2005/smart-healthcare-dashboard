// src/constants/labConstants.js

export const LAB_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  ON_HOLD: "on_hold",
};

export const LAB_STATUS_LABELS = {
  [LAB_STATUS.PENDING]: "Pending",
  [LAB_STATUS.IN_PROGRESS]: "In Progress",
  [LAB_STATUS.COMPLETED]: "Completed",
  [LAB_STATUS.CANCELLED]: "Cancelled",
  [LAB_STATUS.ON_HOLD]: "On Hold",
};

export const LAB_PRIORITY = {
  ROUTINE: "routine",
  URGENT: "urgent",
  STAT: "stat",
};

export const LAB_PRIORITY_LABELS = {
  [LAB_PRIORITY.ROUTINE]: "Routine",
  [LAB_PRIORITY.URGENT]: "Urgent",
  [LAB_PRIORITY.STAT]: "STAT",
};

export const SAMPLE_TYPES = {
  BLOOD: "blood",
  URINE: "urine",
  STOOL: "stool",
  SPUTUM: "sputum",
  SWAB: "swab",
  CSF: "csf",
  TISSUE: "tissue",
  OTHER: "other",
};

export const SAMPLE_TYPE_LABELS = {
  [SAMPLE_TYPES.BLOOD]: "Blood",
  [SAMPLE_TYPES.URINE]: "Urine",
  [SAMPLE_TYPES.STOOL]: "Stool",
  [SAMPLE_TYPES.SPUTUM]: "Sputum",
  [SAMPLE_TYPES.SWAB]: "Swab",
  [SAMPLE_TYPES.CSF]: "CSF",
  [SAMPLE_TYPES.TISSUE]: "Tissue",
  [SAMPLE_TYPES.OTHER]: "Other",
};

export const TEST_CATEGORIES = {
  HEMATOLOGY: "hematology",
  BIOCHEMISTRY: "biochemistry",
  MICROBIOLOGY: "microbiology",
  IMMUNOLOGY: "immunology",
  PATHOLOGY: "pathology",
  RADIOLOGY: "radiology",
  URINALYSIS: "urinalysis",
  SEROLOGY: "serology",
};

export const TEST_CATEGORY_LABELS = {
  [TEST_CATEGORIES.HEMATOLOGY]: "Hematology",
  [TEST_CATEGORIES.BIOCHEMISTRY]: "Biochemistry",
  [TEST_CATEGORIES.MICROBIOLOGY]: "Microbiology",
  [TEST_CATEGORIES.IMMUNOLOGY]: "Immunology",
  [TEST_CATEGORIES.PATHOLOGY]: "Pathology",
  [TEST_CATEGORIES.RADIOLOGY]: "Radiology",
  [TEST_CATEGORIES.URINALYSIS]: "Urinalysis",
  [TEST_CATEGORIES.SEROLOGY]: "Serology",
};

export const RESULT_STATUS = {
  NORMAL: "normal",
  ABNORMAL: "abnormal",
  CRITICAL: "critical",
  INCONCLUSIVE: "inconclusive",
};

export const RESULT_STATUS_LABELS = {
  [RESULT_STATUS.NORMAL]: "Normal",
  [RESULT_STATUS.ABNORMAL]: "Abnormal",
  [RESULT_STATUS.CRITICAL]: "Critical",
  [RESULT_STATUS.INCONCLUSIVE]: "Inconclusive",
};

export const SPECIMEN_CONTAINERS = {
  RED_TOP: "red_top",
  LAVENDER_TOP: "lavender_top",
  GREEN_TOP: "green_top",
  BLUE_TOP: "blue_top",
  YELLOW_TOP: "yellow_top",
  GREY_TOP: "grey_top",
  URINE_CUP: "urine_cup",
  SWAB_TUBE: "swab_tube",
};

export const CONTAINER_LABELS = {
  [SPECIMEN_CONTAINERS.RED_TOP]: "Red Top (SST)",
  [SPECIMEN_CONTAINERS.LAVENDER_TOP]: "Lavender Top (EDTA)",
  [SPECIMEN_CONTAINERS.GREEN_TOP]: "Green Top (Heparin)",
  [SPECIMEN_CONTAINERS.BLUE_TOP]: "Blue Top (Citrate)",
  [SPECIMEN_CONTAINERS.YELLOW_TOP]: "Yellow Top (ACD)",
  [SPECIMEN_CONTAINERS.GREY_TOP]: "Grey Top (Fluoride)",
  [SPECIMEN_CONTAINERS.URINE_CUP]: "Urine Cup",
  [SPECIMEN_CONTAINERS.SWAB_TUBE]: "Swab Tube",
};

export const COMMON_LAB_TESTS = [
  {
    id: "CBC",
    name: "Complete Blood Count",
    category: TEST_CATEGORIES.HEMATOLOGY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.LAVENDER_TOP,
    turnaroundHours: 2,
  },
  {
    id: "BMP",
    name: "Basic Metabolic Panel",
    category: TEST_CATEGORIES.BIOCHEMISTRY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.RED_TOP,
    turnaroundHours: 4,
  },
  {
    id: "CMP",
    name: "Comprehensive Metabolic Panel",
    category: TEST_CATEGORIES.BIOCHEMISTRY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.RED_TOP,
    turnaroundHours: 6,
  },
  {
    id: "LFT",
    name: "Liver Function Test",
    category: TEST_CATEGORIES.BIOCHEMISTRY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.RED_TOP,
    turnaroundHours: 6,
  },
  {
    id: "RFT",
    name: "Renal Function Test",
    category: TEST_CATEGORIES.BIOCHEMISTRY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.RED_TOP,
    turnaroundHours: 4,
  },
  {
    id: "LIPID",
    name: "Lipid Profile",
    category: TEST_CATEGORIES.BIOCHEMISTRY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.RED_TOP,
    turnaroundHours: 6,
  },
  {
    id: "UA",
    name: "Urinalysis",
    category: TEST_CATEGORIES.URINALYSIS,
    sampleType: SAMPLE_TYPES.URINE,
    container: SPECIMEN_CONTAINERS.URINE_CUP,
    turnaroundHours: 1,
  },
  {
    id: "TSH",
    name: "Thyroid Stimulating Hormone",
    category: TEST_CATEGORIES.IMMUNOLOGY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.RED_TOP,
    turnaroundHours: 8,
  },
  {
    id: "HBA1C",
    name: "Glycated Hemoglobin (HbA1c)",
    category: TEST_CATEGORIES.BIOCHEMISTRY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.LAVENDER_TOP,
    turnaroundHours: 4,
  },
  {
    id: "PT_INR",
    name: "Prothrombin Time / INR",
    category: TEST_CATEGORIES.HEMATOLOGY,
    sampleType: SAMPLE_TYPES.BLOOD,
    container: SPECIMEN_CONTAINERS.BLUE_TOP,
    turnaroundHours: 2,
  },
];

export const STORAGE_KEYS = {
  LAB_ORDERS: "medicare_lab_orders",
  LAB_RESULTS: "medicare_lab_results",
  LAB_TESTS: "medicare_lab_tests",
  LAB_SPECIMENS: "medicare_lab_specimens",
};

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
};