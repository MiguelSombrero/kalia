import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getTranslation } from "@/i18n/server";
import { locales, toLocale } from "@/i18n/settings";
import { LocaleSwitcher } from "@/features/i18n/LocaleSwitcher";
import { Providers } from "../providers";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="flex justify-end p-2">
            <LocaleSwitcher />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
