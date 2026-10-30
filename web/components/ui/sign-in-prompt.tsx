import Link from "next/link";
import { Button, buttonVariants } from "./button";
import { EmptyState } from "./empty-state";

type SignInPromptProps = {
  title: string;
  hint: string;
  signInLabel: string;
  signUpLabel: string;
  signUpHref: string;
  signInAction: (formData: FormData) => Promise<void>;
  locale: string;
  headingLevel: 2 | 3;
};

export const SignInPrompt = ({
  title,
  hint,
  signInLabel,
  signUpLabel,
  signUpHref,
  signInAction,
  locale,
  headingLevel,
}: SignInPromptProps) => {
  return (
    <EmptyState
      title={title}
      headingLevel={headingLevel}
      hint={hint}
      className="max-w-xl"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <form action={signInAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="primary">
              {signInLabel}
            </Button>
          </form>
          <Link href={signUpHref} className={buttonVariants("outline")}>
            {signUpLabel}
          </Link>
        </div>
      }
    />
  );
};
