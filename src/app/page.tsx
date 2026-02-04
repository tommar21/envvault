import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock, Key, FolderSync, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6" />
            <span className="text-xl font-bold">SecretBox</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Secure Environment Variables
            <br />
            <span className="text-muted-foreground">Made Simple</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Centralize all your environment variables in one secure place.
            End-to-end encrypted. Sync across projects. Export with one click.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Start for Free</Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">
              Everything you need
            </h2>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Shield className="h-8 w-8" />}
                title="End-to-End Encryption"
                description="Your secrets are encrypted in your browser before being stored. We never see your data in plain text."
              />
              <FeatureCard
                icon={<FolderSync className="h-8 w-8" />}
                title="Sync Across Devices"
                description="Access your environment variables from anywhere. Changes sync automatically."
              />
              <FeatureCard
                icon={<Key className="h-8 w-8" />}
                title="Global Variables"
                description="Define variables once, use them across all your projects. No more copy-pasting API keys."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to get started?</h2>
            <p className="mt-4 text-muted-foreground">
              Free forever for personal use. No credit card required.
            </p>
            <Link href="/register">
              <Button size="lg" className="mt-8">
                Create your vault
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SecretBox. Open source.</p>
        </div>
      </footer>
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
    <div className="rounded-lg border bg-background p-6">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
