import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t py-4 text-center text-sm text-neutral-500">
      <p>
        <a
          href="https://github.com/doogypooooo/sbo-erp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          소상공인을 위한 무료 ERP 솔루션 (sbo-erp)
        </a>
      </p>
      <p className="text-xs mt-1">© {new Date().getFullYear()} All rights reserved.</p>
    </footer>
  );
}
