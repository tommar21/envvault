"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2, FileText, Check, AlertCircle } from "lucide-react";
import { parseEnvFile } from "@/lib/env-parser";
import { encryptVariable } from "@/lib/crypto/encryption";
import { createVariable } from "@/lib/actions/variables";
import { toast } from "sonner";

interface ImportEnvDialogProps {
  environmentId: string;
  cryptoKey: CryptoKey | null;
  onSuccess: () => void;
}

export function ImportEnvDialog({
  environmentId,
  cryptoKey,
  onSuccess,
}: ImportEnvDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedVars, setParsedVars] = useState<Array<{ key: string; value: string }>>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const variables = parseEnvFile(content);
      setParsedVars(variables);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!cryptoKey || parsedVars.length === 0) return;

    setIsLoading(true);

    try {
      // Encrypt and save each variable
      let successCount = 0;
      let errorCount = 0;

      for (const { key, value } of parsedVars) {
        try {
          const encrypted = await encryptVariable(key, value, cryptoKey);
          await createVariable(environmentId, {
            ...encrypted,
            isSecret: isLikelySecret(key),
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast.warning(`Imported ${successCount} variables, ${errorCount} failed`);
      } else {
        toast.success(`Imported ${successCount} variables`);
      }

      setOpen(false);
      setParsedVars([]);
      setFileName("");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to import variables");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setParsedVars([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import .env
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import .env File</DialogTitle>
          <DialogDescription>
            Upload a .env file to import variables. They will be encrypted
            before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File input */}
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,.env.*,text/plain"
              onChange={handleFileSelect}
              className="hidden"
              id="env-file-input"
            />
            <label
              htmlFor="env-file-input"
              className="flex cursor-pointer flex-col items-center gap-2"
            >
              {fileName ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {parsedVars.length} variables found
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm">Click to upload .env file</span>
                  <span className="text-xs text-muted-foreground">
                    or drag and drop
                  </span>
                </>
              )}
            </label>
          </div>

          {/* Preview */}
          {parsedVars.length > 0 && (
            <div className="max-h-60 overflow-auto rounded-md border">
              <div className="divide-y">
                {parsedVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 text-sm">
                    {isLikelySecret(v.key) ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    <code className="font-medium">{v.key}</code>
                    <span className="text-muted-foreground">=</span>
                    <code className="truncate text-muted-foreground">
                      {isLikelySecret(v.key)
                        ? "••••••••"
                        : v.value.length > 30
                        ? v.value.slice(0, 30) + "..."
                        : v.value}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedVars.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Variables with sensitive names (API_KEY, SECRET, TOKEN, PASSWORD)
              will be marked as secrets automatically.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {parsedVars.length > 0 && (
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={isLoading || parsedVars.length === 0 || !cryptoKey}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {parsedVars.length} Variables
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Check if a variable key likely contains sensitive data
 */
function isLikelySecret(key: string): boolean {
  const upperKey = key.toUpperCase();
  const sensitivePatterns = [
    "SECRET",
    "KEY",
    "TOKEN",
    "PASSWORD",
    "PASS",
    "PWD",
    "API_KEY",
    "APIKEY",
    "AUTH",
    "CREDENTIAL",
    "PRIVATE",
  ];

  return sensitivePatterns.some((pattern) => upperKey.includes(pattern));
}
