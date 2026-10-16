import { AssistantChat } from "@/components/AssistantChat";
import { Footer } from "@/components/Footer";
import { Footsteps } from "@/components/Footsteps";
import { Header } from "@/components/Header";
import { Preloader } from "@/components/preloader/Preloader";
import { assistantReady } from "@/lib/assistant";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Preloader />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Footsteps />
      {/* Only shown once OPENROUTER_API_KEY is set. */}
      {assistantReady && <AssistantChat />}
    </>
  );
}
