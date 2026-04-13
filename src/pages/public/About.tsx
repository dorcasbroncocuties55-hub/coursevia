import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const About = () => (
  <div className="min-h-screen bg-background"><Navbar />
    <div className="container-wide section-spacing">
      <h1 className="text-4xl font-bold text-foreground mb-6">About Coursevia</h1>
      <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed mb-6">Coursevia is a multi-vendor platform that combines course creation, expert coaching, and premium video content into one powerful ecosystem. We empower learners, coaches, and creators to grow together.</p>
      <p className="text-muted-foreground leading-relaxed max-w-2xl">Our mission is to democratize access to quality education and coaching while providing creators with the tools to monetize their expertise. Every coach and creator on our platform is verified, and funds are held securely in escrow.</p>
    </div>
    <Footer />
  </div>
);
export default About;
