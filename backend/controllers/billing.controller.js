export const getSummary = (req, res) => {
  res.json({ message: "Summary API" });
};

export const getInvoices = (req, res) => {
  res.json({ message: "Invoices API" });
};

export const getInvoiceById = (req, res) => {
  res.json({ message: "Single Invoice API" });
};

export const createInvoice = (req, res) => {
  res.json({ message: "Create Invoice API" });
};

export const updateInvoice = (req, res) => {
  res.json({ message: "Update Invoice API" });
};

export const deleteInvoice = (req, res) => {
  res.json({ message: "Delete Invoice API" });
};
