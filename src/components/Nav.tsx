import Link from "next/link";
import WalletButton from "./WalletButton";

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <span className="editorial grid h-8 w-8 place-items-center rounded-full border border-[var(--ink)] text-lg transition-transform duration-200 group-hover:scale-105">
            M
          </span>
          <span className="text-sm font-semibold tracking-[.2em] transition-colors group-hover:text-[var(--forest)]">
            MANTISSA
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--muted)] md:flex">
          <Link
            href="/yield"
            className="transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Strategies
          </Link>
          <Link
            href="/private"
            className="transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Private actions
          </Link>
          <Link
            href="/proof"
            className="transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Proof
          </Link>
          <Link
            href="/compliance"
            className="transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Compliance
          </Link>
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
