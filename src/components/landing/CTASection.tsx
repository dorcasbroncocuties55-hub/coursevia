import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-16">
      <div className="container-wide">
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-primary/10 p-10 lg:p-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="max-w-xl">
            <span className="text-sm font-medium text-primary mb-2 block">Become A Instructor</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              You can join with Coursevia as a{" "}
              <span className="text-primary">instructor?</span>
            </h2>
            <Button size="lg" asChild className="rounded-full px-8">
              <Link to="/signup">
                Drop Information
                <ArrowRight className="ml-2" size={18} />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
