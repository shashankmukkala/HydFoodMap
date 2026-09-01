"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/useAuth";

type SignInModalProps = {
  onClose: () => void;
  onSignedIn: () => void;
};

export default function SignInModal({ onClose, onSignedIn }: SignInModalProps) {
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const phoneValid = /^\d{10}$/.test(phone.trim());
  const fullPhone = `+91${phone.trim()}`;
  const codeValid = /^\d{4,8}$/.test(code.trim());

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await sendOtp(fullPhone);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setStep("code");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!codeValid || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await verifyOtp(fullPhone, code);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    onSignedIn();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            Browsing is free. Saving, reviewing, and marking visits needs a mobile number.
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <form onSubmit={submitPhone} className="space-y-2.5">
            <div className="flex items-center rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
              <span className="mr-2 text-sm text-neutral-400">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                autoFocus
                className="w-full bg-transparent text-sm focus:outline-none dark:text-neutral-100"
              />
            </div>
            {error && <p className="text-[11px] text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={!phoneValid || busy}
              className="w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {busy ? "Sending code…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-2.5">
            <p className="text-[11px] text-neutral-400">Enter the code sent to +91 {phone}.</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Verification code"
              inputMode="numeric"
              autoFocus
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none dark:border-neutral-700 dark:bg-transparent dark:text-neutral-100"
            />
            {error && <p className="text-[11px] text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={!codeValid || busy}
              className="w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="w-full text-center text-[11px] text-neutral-400 hover:underline"
            >
              Use a different number
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
