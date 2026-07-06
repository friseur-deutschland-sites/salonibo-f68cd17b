import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import Leistungen from "../components/Leistungen";
import Team from "../components/Team";
import Gallery from "../components/Gallery";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Leistungen />
        <Team />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
