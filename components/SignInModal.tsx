"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type SignInModalProps = {
  onClose: () => void;
  onSignedIn: (phone: string) => void;
};

export default function SignInModal({ onClose, onSignedIn }: SignInModalProps) {
  const [phone, setPhone] = useState("");

  const valid = /^\d{10}$/.test(phone.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSignedIn(phone.trim());
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

        <form onSubmit={submit} className="space-y-2.5">
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
          <p className="text-[11px] text-neutral-400">
            OTP verification isn&apos;t live yet — for now this just signs you in with the number you enter.
          </p>
          <button
            type="submit"
            disabled={!valid}
            className="w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
