import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBeer } from "@/features/catalog/api";
import { BeerDetailsCard } from "@/features/catalog/BeerDetailsCard";

type Props = { params: Promise<{ id: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const beer = await getBeer((await params).id);
  return {
    title: beer ? `${beer.name} — Kalia` : "Beer not found — Kalia",
  };
};

const BeerPage = async ({ params }: Props) => {
  const { id } = await params;
  const beer = await getBeer(id);
  if (!beer) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <Link
        href="/beers"
        className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
      >
        ← Back to catalog
      </Link>
      <BeerDetailsCard beer={beer} />
    </main>
  );
};

export default BeerPage;
