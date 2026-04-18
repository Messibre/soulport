import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-4 py-20">
      <div className="card border border-base-300 bg-base-200/70 max-w-md w-full">
        <div className="card-body text-center">
          <h1 className="text-4xl font-black">404</h1>
          <p className="opacity-75">The requested page does not exist.</p>
          <Link to="/" className="btn btn-primary mx-auto mt-3">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
