import Link from "next/link";

export default function BeerNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Beer not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        This beer does not exist — maybe it was drunk already.
      </p>
      <Link href="/beers" className="mt-4 font-medium underline underline-offset-2">
        Back to the catalog
      </Link>
    </main>
  );
}
