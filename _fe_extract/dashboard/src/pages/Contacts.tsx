import { useEffect, useMemo, useState } from "react";
import { PageHeader, Button } from "../components/ui";
import Input from "../components/common/Input.jsx";
import Select from "../components/common/Select.jsx";
import Toast from "../components/common/Toast.jsx";
import Dialog from "../components/ui/Dialog.tsx";
import { useContactsStore, generateCommunicationInsights, ContactRecord } from "../stores/contactsStore.ts";
import ContactCard from "../components/contacts/ContactCard.tsx";
import ContactForm, { ContactFormData } from "../components/contacts/ContactForm.tsx";
import AICommunicationAssistant from "../components/contacts/AICommunicationAssistant.tsx";
import ComposeMessageModal from "../components/contacts/ComposeMessageModal.tsx";

const categoryOptions = ["All", "Emergency", "Hospital", "Patient"];
const priorityOptions = ["All", "Critical", "High", "Normal"];

export default function Contacts() {
  const { contacts, searchTerm, filters, loading, error, loadContacts, addContact, updateContact, deleteContact, markContacted, search, filter } = useContactsStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);
  const [messagingContact, setMessagingContact] = useState<ContactRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(term) || c.subType.toLowerCase().includes(term) || c.department.toLowerCase().includes(term) || c.phone.includes(term));
    }
    if (filters.category !== "All") list = list.filter((c) => c.category === filters.category);
    if (filters.priority !== "All") list = list.filter((c) => c.emergencyPriority === filters.priority);
    return list.sort((a, b) => {
      const order = { Critical: 0, High: 1, Normal: 2 };
      return order[a.emergencyPriority] - order[b.emergencyPriority];
    });
  }, [contacts, searchTerm, filters]);

  const insights = useMemo(() => generateCommunicationInsights(contacts), [contacts]);

  const handleAdd = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const handleEdit = (contact: ContactRecord) => {
    setEditingContact(contact);
    setModalOpen(true);
  };

  const handleSave = (data: ContactFormData) => {
    if (editingContact) {
      updateContact(editingContact.id, data);
      setToast({ message: "Contact updated.", variant: "success" });
    } else {
      addContact(data);
      setToast({ message: "Contact added.", variant: "success" });
    }
    setModalOpen(false);
    setEditingContact(null);
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteContact(deleteTargetId);
    setToast({ message: "Contact removed.", variant: "success" });
    setDeleteTargetId(null);
  };

  const handleQueueMessage = (channel: string) => {
    if (messagingContact) markContacted(messagingContact.id);
    setToast({ message: `Message queued via ${channel} (not actually delivered — no provider connected).`, variant: "info" });
    setMessagingContact(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contacts & communication"
        title="Hospital contact directory"
        description="Emergency services, hospital staff, and patient-side contacts in one place, with priority-aware suggestions."
        actions={<Button onClick={handleAdd} disabled={loading}>Add contact</Button>}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Sync issue</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <AICommunicationAssistant insights={insights} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Search" id="contact-search" placeholder="Name, type, department, phone" value={searchTerm} onChange={(event) => search(event.target.value)} />
          <Select label="Category" id="contact-category-filter" value={filters.category} onChange={(event) => filter({ category: event.target.value as typeof filters.category })}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select label="Priority" id="contact-priority-filter" value={filters.priority} onChange={(event) => filter({ priority: event.target.value as typeof filters.priority })}>
            {priorityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>
      </section>

      {filteredContacts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No contacts found.</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the search or filters, or add a new contact.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => handleEdit(contact)}
              onDelete={() => setDeleteTargetId(contact.id)}
              onMessage={() => setMessagingContact(contact)}
            />
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingContact(null); }} title={editingContact ? "Edit contact" : "Add contact"}>
        <ContactForm
          initialValues={editingContact ? { ...editingContact } : undefined}
          onCancel={() => { setModalOpen(false); setEditingContact(null); }}
          onSubmit={handleSave}
          submitLabel={editingContact ? "Update contact" : "Add contact"}
        />
      </Dialog>

      <Dialog open={Boolean(messagingContact)} onClose={() => setMessagingContact(null)} title={messagingContact ? `Message ${messagingContact.name}` : "Compose message"}>
        {messagingContact && <ComposeMessageModal contact={messagingContact} onClose={() => setMessagingContact(null)} onQueued={handleQueueMessage} />}
      </Dialog>

      <Dialog open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Confirm deletion">
        <div className="space-y-6">
          <p>Are you sure you want to remove this contact? This action cannot be undone.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
