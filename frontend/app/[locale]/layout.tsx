import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { getTranslation } from "@/i18n/server";
import { locales, toLocale } from "@/i18n/settings";
import { LocaleSwitcher } from "@/features/i18n/LocaleSwitcher";
import { Providers } from "../providers";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return {
    title: t("app.name"),
    description: t("app.tagline"),
  };
};

const RootLayout = async ({ children, params }: Props) => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-foreground focus:outline focus:outline-2 focus:outline-focus-ring"
        >
          {t("a11y.skipToContent")}
        </a>
        <Providers locale={locale}>
          <header className="flex justify-end p-4">
            <LocaleSwitcher />
          </header>
          {/* Plain wrapper, not <main> — every page under {children} already
              renders its own <main>; this just gives the skip link a
              focusable target (WCAG technique SCR28). */}
          <div id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
