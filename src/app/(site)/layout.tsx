import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Preloader } from "@/components/preloader/Preloader";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Preloader />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
