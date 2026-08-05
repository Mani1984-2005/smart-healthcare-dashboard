// FILE PATH: src/components/ui/PageContainer.jsx
// Standard page wrapper — consistent max-width, padding, responsive margins.
// Every page wraps its content in this so spacing is uniform.
//
// USAGE:
//   <PageContainer>
//     <PageHeader ... />
//     ...page content...
//   </PageContainer>

export default function PageContainer({ children, className = "", maxWidth = "max-w-7xl" }) {
  return (
    <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 ${className}`}>
      {children}
    </div>
  );
}
