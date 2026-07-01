exports.getSummary = (req, res) => {
    res.json({ message: "Summary API" });
};

exports.getInvoices = (req, res) => {
    res.json({ message: "Invoices API" });
};

exports.getInvoiceById = (req, res) => {
    res.json({ message: "Single Invoice API" });
};

exports.createInvoice = (req, res) => {
    res.json({ message: "Create Invoice API" });
};

exports.updateInvoice = (req, res) => {
    res.json({ message: "Update Invoice API" });
};

exports.deleteInvoice = (req, res) => {
    res.json({ message: "Delete Invoice API" });
};