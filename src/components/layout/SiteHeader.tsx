import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
          Shree Sales
        </Link>
        <nav className="flex gap-4 text-sm font-medium text-slate-600">
          <Link href="/dashboard" className="hover:text-slate-900">
            Dashboard
          </Link>
          <Link href="/quotation/new" className="hover:text-slate-900">
            New quotation
          </Link>
        </nav>
      </div>
    </header>
  );
}
