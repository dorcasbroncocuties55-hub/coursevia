import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Star, Users } from "lucide-react";
import heroStudent from "@/assets/hero-student.png";
import heroBusiness from "@/assets/hero-business.png";
import heroCreator from "@/assets/hero-creator.png";
import heroTherapist from "@/assets/hero-therapist.png";
const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-primary/5 py-12 lg:py-20">
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
              <GraduationCap size={18} />
              Learn, book expert sessions, and grow with confidence
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Premium learning, expert coaching, and guided wellness{" "}
              <span className="text-primary">in one serious platform.</span>
            </h1>

            <p className="text-muted-foreground text-lg mb-8 max-w-lg">
              Coursevia helps learners access high-quality courses, private sessions, and premium video content from trusted coaches, therapists, and creators.
            </p>

            <div className="flex items-center gap-6 flex-wrap">
              <Button size="lg" asChild className="rounded-full px-8">
                <Link to="/courses">
                  Explore Courses
                  <ArrowRight className="ml-2" size={18} />
                </Link>
              </Button>

              <motion.div
                className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Users size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Trusted by ambitious learners</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Right — student hero + 3 smaller images */}
          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative">
              {/* Main student image with Swinging Animation */}
              <motion.img
                src={heroStudent}
                alt="Student learning on Coursevia"
                className="relative z-10 w-64 object-contain sm:w-72 lg:w-80"
                initial={{ opacity: 0, rotate: -3 }}
                animate={{ opacity: 1, rotate: 3 }}
                transition={{
                  opacity: { duration: 1 }, // Fades in once
                  rotate: {
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "linear", // Constant speed swinging
                  },
                }}
                style={{ transformOrigin: "bottom center" }}
              />

              {/* Top-right: Therapist thumbnail */}
              <motion.div
                className="absolute -top-2 -right-4 sm:right-0 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <img
                  src={heroTherapist}
                  alt="Therapist on Coursevia"
                  className="w-24 h-20 sm:w-28 sm:h-24 object-cover"
                />
              </motion.div>

              {/* Bottom-left: Business thumbnail */}
              <motion.div
                className="absolute bottom-12 -left-8 sm:-left-12 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                <img
                  src={heroBusiness}
                  alt="Business coaching on Coursevia"
                  className="w-24 h-20 sm:w-28 sm:h-24 object-cover"
                />
              </motion.div>

              {/* Bottom-right: Creator thumbnail */}
              <motion.div
                className="absolute bottom-4 -right-6 sm:-right-8 z-20 rounded-xl overflow-hidden border-[3px] border-background shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
              >
                <img
                  src={heroCreator}
                  alt="Content creator on Coursevia"
                  className="w-24 h-20 sm:w-28 sm:h-24 object-cover"
                />
              </motion.div>

              {/* Rating badge */}
              <motion.div
                className="absolute top-6 left-0 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-md flex items-center gap-1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                <span className="text-lg font-bold text-foreground">5.0</span>
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
              </motion.div>

              {/* Course count badge */}
              <motion.div
                className="absolute top-2 right-24 sm:right-32 z-30 bg-primary text-primary-foreground rounded-full h-16 w-16 flex flex-col items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
              >
                <GraduationCap size={14} />
                <span className="text-xs font-bold leading-tight">1,235</span>
                <span className="text-[8px] leading-tight">courses</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
