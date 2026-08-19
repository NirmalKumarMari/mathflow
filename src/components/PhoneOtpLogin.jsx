import React, { useState } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Passwordless: requesting a code logs in an existing phone number or
// registers a new one, so there's no separate "phone sign up" flow.
export default function PhoneOtpLogin() {
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("phone"); // "phone" | "verify"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.requestPhoneOtp(phone);
      setStep("verify");
    } catch (err) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await api.auth.verifyPhoneOtp({ phone, otpCode });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await api.auth.requestPhoneOtp(phone);
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  if (step === "verify") {
    return (
      <div>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <p className="text-sm text-muted-foreground text-center mb-4">
          We sent a code to {phone}
        </p>
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & continue"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button type="button" onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
          {" · "}
          <button type="button" onClick={() => setStep("phone")} className="text-primary font-medium hover:underline">
            Change number
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      {error && (
        <div className="mb-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            autoFocus
            placeholder="+14155551234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 h-12"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">Include your country code, e.g. +1 for the US.</p>
      </div>
      <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending code...
          </>
        ) : (
          "Send code"
        )}
      </Button>
    </form>
  );
}
