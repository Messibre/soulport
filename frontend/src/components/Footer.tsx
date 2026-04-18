export function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-200/60">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm sm:px-6 lg:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="opacity-70">
          SoulPort · Portable reputation for professionals
        </p>
        <div className="flex items-center gap-4 opacity-80">
          <a
            className="link link-hover"
            href="https://base.org"
            target="_blank"
            rel="noreferrer"
          >
            Built on Base
          </a>
          <a
            className="link link-hover"
            href="https://easscan.org"
            target="_blank"
            rel="noreferrer"
          >
            EAS Explorer
          </a>
        </div>
      </div>
    </footer>
  );
}
