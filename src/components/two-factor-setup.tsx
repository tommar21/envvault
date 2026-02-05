"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Shield, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onSuccess: () => void;
}

export function TwoFactorSetup({ isEnabled, onSuccess }: TwoFactorSetupProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"initial" | "verify">("initial");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSetup() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to start setup");
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("verify");
    } catch (error) {
      logger.error("2FA setup error", error);
      toast.error("Failed to start 2FA setup");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify() {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid code");
        return;
      }

      toast.success("Two-factor authentication enabled!");
      setOpen(false);
      resetState();
      onSuccess();
    } catch (error) {
      logger.error("2FA verify error", error);
      toast.error("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  }

  function resetState() {
    setStep("initial");
    setQrCode(null);
    setSecret(null);
    setVerificationCode("");
    setCopied(false);
  }

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (isEnabled) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button>
          <Shield className="mr-2 h-4 w-4" />
          Enable 2FA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "initial" ? "Enable Two-Factor Authentication" : "Verify Setup"}
          </DialogTitle>
          <DialogDescription>
            {step === "initial"
              ? "Add an extra layer of security to your account using an authenticator app."
              : "Scan the QR code with your authenticator app, then enter the 6-digit code."}
          </DialogDescription>
        </DialogHeader>

        {step === "initial" ? (
          <>
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-4">
                <h4 className="font-medium">How it works:</h4>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>Scan the QR code or enter the secret key</li>
                  <li>Enter the 6-digit code from the app to verify</li>
                </ol>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSetup} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {qrCode && (
                <div className="flex justify-center">
                  {/* Using img for data URL - Next.js Image doesn't optimize data URLs */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="Scan this QR code with your authenticator app"
                    className="rounded-lg"
                    width={200}
                    height={200}
                  />
                </div>
              )}

              {secret && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Can&apos;t scan? Enter this code manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted p-2 text-sm font-mono">
                      {secret}
                    </code>
                    <Button variant="outline" size="icon" onClick={copySecret}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                  autoComplete="one-time-code"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("initial")}>
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
