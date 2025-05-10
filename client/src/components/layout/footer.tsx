export default function Footer() {
  return (
    <footer className="bg-white border-t py-4 text-center text-sm text-neutral-300">
      <p>© {new Date().getFullYear()} SBO-ERP. All rights reserved.</p>
      <p className="text-xs mt-1">Ver 1.0.0</p>
    </footer>
  );
}
