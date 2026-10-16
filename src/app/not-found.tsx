import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotFound } from "@/components/NotFound";

/** Any URL that matches no page. Outside the (site) group, so it adds the header and footer itself. */
export default function RootNotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <NotFound />
      </main>
      <Footer />
    </>
  );
}
