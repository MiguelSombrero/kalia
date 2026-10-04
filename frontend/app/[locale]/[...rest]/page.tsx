import { notFound } from "next/navigation";

// Without this, a URL under a locale that matches no route gets the framework's
// own 404, outside this layout, since no root layout exists above [locale].
const NoSuchPage = () => notFound();

export default NoSuchPage;
