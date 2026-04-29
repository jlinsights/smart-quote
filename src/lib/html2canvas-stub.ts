// Stub for html2canvas — jsPDF's optionalDependencies pulls it in via dynamic
// import for doc.html()/addHTML() features. This app never calls those, so the
// real ~200KB library is replaced with this minimal stub at bundle time via
// vite.config.ts resolve.alias.
//
// If the runtime ever reaches this code, jsPDF was asked to render HTML —
// which means we now need html2canvas for real. Remove this stub and the alias.
const html2canvas = (): never => {
  throw new Error(
    'html2canvas stub invoked: doc.html()/addHTML() is unused. Remove vite alias if you need real html2canvas.',
  );
};

export default html2canvas;
