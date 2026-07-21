import Link from "next/link";

const Home = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Kalia</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Craft beer management for enthusiasts.
      </p>
      <Link
        href="/beers"
        className="mt-2 rounded-md bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Browse the beer catalog
      </Link>
    </main>
  );
};

export default Home;
