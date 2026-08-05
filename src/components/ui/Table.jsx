// FILE PATH: src/components/ui/Table.jsx
// CREATE this new file.
//
// Reusable table primitives. These are intentionally low-level building
// blocks (not a data-driven "smart table") so existing pages' table logic
// (filtering, sorting, row actions) can be preserved as-is — only the
// markup/classNames change.
//
// USAGE (mirrors plain <table> structure you already have):
//   <Table>
//     <Table.Head>
//       <Table.Row>
//         <Table.HeaderCell>Name</Table.HeaderCell>
//         <Table.HeaderCell>Status</Table.HeaderCell>
//       </Table.Row>
//     </Table.Head>
//     <Table.Body>
//       {items.length === 0 ? (
//         <Table.EmptyRow colSpan={2} message="No records found." />
//       ) : (
//         items.map((item) => (
//           <Table.Row key={item.id}>
//             <Table.Cell>{item.name}</Table.Cell>
//             <Table.Cell><Badge status={item.status} /></Table.Cell>
//           </Table.Row>
//         ))
//       )}
//     </Table.Body>
//   </Table>

function Root({ children, className = "" }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200/60 shadow-card overflow-x-auto">
      <table className={`w-full text-body text-left ${className}`}>{children}</table>
    </div>
  );
}

function Head({ children }) {
  return (
    <thead className="bg-neutral-50 border-b border-neutral-200">
      {children}
    </thead>
  );
}

function Body({ children }) {
  return <tbody className="divide-y divide-neutral-100">{children}</tbody>;
}

function Row({ children, className = "", highlight = false, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`
        ${highlight ? "bg-warning-50" : "hover:bg-neutral-50"}
        ${onClick ? "cursor-pointer" : ""}
        transition-colors duration-100
        ${className}
      `}
    >
      {children}
    </tr>
  );
}

function HeaderCell({ children, className = "", align = "left" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`px-4 py-3 text-tiny font-semibold uppercase tracking-wide text-neutral-500 ${alignClass} ${className}`}>
      {children}
    </th>
  );
}

function Cell({ children, className = "", align = "left" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td className={`px-4 py-3 text-neutral-700 ${alignClass} ${className}`}>
      {children}
    </td>
  );
}

function EmptyRow({ colSpan = 1, message = "No records found.", icon = null }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          {icon}
          <p className="text-small">{message}</p>
        </div>
      </td>
    </tr>
  );
}

function Footer({ children, className = "" }) {
  return (
    <div className={`px-4 py-2.5 text-tiny text-neutral-400 border-t border-neutral-100 ${className}`}>
      {children}
    </div>
  );
}

const Table = { Root, Head, Body, Row, HeaderCell, Cell, EmptyRow, Footer };

// Allow both `<Table>` (defaulting to Root) and `<Table.Row>` etc.
export default function TableWrapper(props) {
  return <Root {...props} />;
}

TableWrapper.Head = Head;
TableWrapper.Body = Body;
TableWrapper.Row = Row;
TableWrapper.HeaderCell = HeaderCell;
TableWrapper.Cell = Cell;
TableWrapper.EmptyRow = EmptyRow;
TableWrapper.Footer = Footer;