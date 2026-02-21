import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer4Col from "@/components/ui/footer-column";

export default function Home() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-blue-500/30">
            <Navbar />
            <Hero />
            <Footer4Col />
        </main>
    );
}
