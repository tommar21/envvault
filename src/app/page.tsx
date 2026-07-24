"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Key,
  FolderSync,
  Shield,
  Zap,
  Users,
  ArrowRight,
  CheckCircle2,
  Github,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

export default function Home() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });

  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3]);

  return (
    <div ref={targetRef} className="flex min-h-screen flex-col">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" as const }}
      >
        <motion.div
          className="absolute inset-0 bg-background"
          style={{ opacity: headerOpacity }}
        />
        <div className="container relative mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Lock className="h-4 w-4 text-primary-foreground" />
            </motion.div>
            <span className="text-lg font-semibold tracking-tight">SecretBox</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {["Features", "How it works", "Security"].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
              >
                <Link
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item}
                </Link>
              </motion.div>
            ))}
          </nav>
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="sm">
                  Get Started
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 overflow-hidden">
          <motion.div
            className="container mx-auto px-4 md:px-6"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <div className="mx-auto max-w-2xl">
              <motion.div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-accent">Open source</span>
              </motion.div>

              <motion.h1
                className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Environment variables,{" "}
                <motion.span
                  className="text-accent inline-block"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  encrypted.
                </motion.span>
              </motion.h1>

              <motion.p
                className="mt-6 text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                End-to-end encrypted secrets management. Your data is encrypted in your browser before it ever reaches our servers.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/register">
                  <motion.div
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button size="lg" className="group">
                      Get Started
                      <motion.span
                        className="ml-2"
                        initial={{ x: 0 }}
                        whileHover={{ x: 3 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </Button>
                  </motion.div>
                </Link>
                <Link href="https://github.com/cogotemartinez/secret-box" target="_blank">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="lg">
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              <motion.div
                className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {[
                  "Free for personal use",
                  "No credit card",
                  "Self-hostable"
                ].map((text) => (
                  <motion.span
                    key={text}
                    className="flex items-center gap-1.5"
                    variants={fadeIn}
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {text}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              className="mx-auto max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Features
              </h2>
              <p className="mt-2 text-muted-foreground">
                Everything you need to manage secrets securely.
              </p>
            </motion.div>

            <motion.div
              className="mx-auto mt-12 grid max-w-2xl gap-8 md:max-w-none md:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="End-to-End Encryption"
                description="AES-256-GCM encryption in your browser. We never see your data."
              />
              <FeatureCard
                icon={<FolderSync className="h-5 w-5" />}
                title="Sync Across Devices"
                description="Access your variables from anywhere. Changes sync automatically."
              />
              <FeatureCard
                icon={<Key className="h-5 w-5" />}
                title="Global Variables"
                description="Define once, use everywhere. No more copy-pasting API keys."
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Team Collaboration"
                description="Share secrets with role-based access control."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="API Access"
                description="REST API for CI/CD integration with fine-grained tokens."
              />
              <FeatureCard
                icon={<Lock className="h-5 w-5" />}
                title="Two-Factor Auth"
                description="TOTP-based 2FA. Works with any authenticator app."
              />
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              className="mx-auto max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                How it works
              </h2>
              <p className="mt-2 text-muted-foreground">
                Three steps to secure your secrets.
              </p>

              <motion.div
                className="mt-10 space-y-8"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
              >
                <StepCard
                  number="1"
                  title="Create your vault"
                  description="Set a master password that encrypts all your secrets locally."
                />
                <StepCard
                  number="2"
                  title="Add your secrets"
                  description="Organize variables by project and environment (dev, staging, prod)."
                />
                <StepCard
                  number="3"
                  title="Use anywhere"
                  description="Export as .env, use the API, or share with your team."
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="border-t py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              className="mx-auto max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Security
              </h2>
              <p className="mt-2 text-muted-foreground">
                Zero-knowledge architecture. We can&apos;t read your secrets.
              </p>

              <motion.div
                className="mt-8 rounded-lg border bg-card p-6"
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your master password never leaves your device. All encryption happens in your browser using the Web Crypto API.
                  We use <span className="text-foreground">PBKDF2</span> with 100,000 iterations for key derivation
                  and <span className="text-foreground">AES-256-GCM</span> for encryption.
                </p>
                <motion.div
                  className="mt-4 flex flex-wrap gap-2"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {["Zero Knowledge", "AES-256-GCM", "PBKDF2", "Open Source"].map((tag) => (
                    <motion.span
                      key={tag}
                      className="rounded border px-2 py-0.5 text-xs text-muted-foreground"
                      variants={fadeIn}
                      whileHover={{
                        scale: 1.05,
                        borderColor: "hsl(var(--accent))",
                        backgroundColor: "hsl(var(--accent) / 0.1)",
                        color: "hsl(var(--accent))"
                      }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              className="mx-auto max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Ready to start?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Create your vault in under a minute.
              </p>
              <motion.div
                className="mt-6"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Link href="/register">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" className="group bg-accent text-accent-foreground hover:bg-accent/90">
                      Create your vault
                      <motion.span
                        className="ml-2 inline-block"
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        className="border-t py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <Lock className="h-4 w-4" />
              <span>SecretBox</span>
            </motion.div>
            <div className="flex items-center gap-6">
              {[
                { href: "https://github.com/cogotemartinez/secret-box", label: "GitHub", external: true },
                { href: "#features", label: "Features" },
                { href: "#security", label: "Security" }
              ].map((link) => (
                <motion.div
                  key={link.label}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    className="hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
            <p>MIT License</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      className="group space-y-2 rounded-lg border border-transparent p-4 transition-colors hover:border-accent/30 hover:bg-accent/5"
      variants={fadeIn}
      whileHover={{ scale: 1.02, x: 5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 text-foreground">
        <motion.span
          className="text-primary group-hover:text-accent transition-colors"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.span>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      className="flex gap-4"
      variants={fadeIn}
      whileHover={{ x: 10 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
      >
        {number}
      </motion.div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}
