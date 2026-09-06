"use client";

import React, { useState, useEffect } from "react";
import { getFarmerBankDetails } from "@/lib/kizfarm/supabase-data";
import { saveFarmerBankDetails } from "@/lib/kizfarm/supabase-mutations";

type Props = { hideSidebar?: boolean };

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function BankSetupPage({ hideSidebar = false }: Props) {
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isVerified, setIsVerified] = useState(false);

  const fetchBankDetails = async () => {
    try {
      const { res, payload } = await getFarmerBankDetails();
      if (res.ok && payload.bankDetails) {
        setBankName(payload.bankDetails.bankName || "");
        setAccountHolderName(payload.bankDetails.accountHolderName || "");
        setAccountNumber(payload.bankDetails.accountNumber || "");
        setBranchCode(payload.bankDetails.branchCode || "");
        setIsVerified(payload.bankDetails.isVerified || false);
      }
    } catch (err) {
      console.error('Fetch bank details failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchBankDetails());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (accountNumber.length < 10 || accountNumber.length > 12) {
      setMessageType("error");
      setMessage("Account number must be 10-12 digits.");
      return;
    }

    setSaving(true);

    try {
      const { res, payload } = await saveFarmerBankDetails({
        bankName,
        accountHolderName,
        accountNumber,
        branchCode,
      });

      if (res.ok) {
        setMessageType("success");
        setMessage("Bank details saved successfully!");
        setIsVerified(false);
        fetchBankDetails();
      } else {
        setMessageType("error");
        setMessage(payload?.error || "Failed to save bank details");
      }
    } catch (err) {
      setMessageType("error");
      setMessage("Network error. Please try again.");
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-green-700">autorenew</span>
        <span className="ml-2 text-gray-600">Loading bank details...</span>
      </div>
    );
  }

  return (
    <div className="font-body-md text-on-surface" style={{ backgroundColor: "#ffffff" }}>
      <main className={`${hideSidebar ? "pt-24 pb-16 px-margin min-h-screen flex flex-col items-center" : "ml-[280px] pt-24 pb-16 px-margin min-h-screen flex flex-col items-center"}`}>
        <div className="max-w-4xl w-full">
          <div className="mb-lg text-center">
            <img
              className="h-12 mx-auto mb-md"
              alt="KizFarm logo"
              src="/logo.jpeg"
            />
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Bank Account Setup</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
              Configure your payout details to receive payments for your farm products directly to your bank account.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-md">
              {message && (
                <div className={`mb-4 p-4 rounded-lg ${
                  messageType === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {message}
                </div>
              )}

              {isVerified && (
                <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Verified</strong> - Bank details on file
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-md">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-12 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all font-body-md outline-none"
                    placeholder="e.g., Access Bank, GTBank"
                    required
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Account Holder Name</label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full h-12 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all font-body-md outline-none"
                    placeholder="Legal name as on bank records"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(onlyDigits(e.target.value).slice(0, 12))}
                      className="w-full h-12 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all font-body-md outline-none"
                      placeholder="10-12 digits"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength={10}
                      maxLength={12}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Branch Code / Swift (Optional)</label>
                    <input
                      type="text"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="w-full h-12 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all font-body-md outline-none"
                      placeholder="e.g. AGRI123"
                    />
                  </div>
                </div>

                <div className="pt-base">
                  <button
                    className="w-full h-12 bg-[#1B6D24] text-white font-label-sm rounded-lg hover:bg-green-800 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Bank Details"}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 space-y-md">
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md">
                <div className="flex items-start gap-md">
                  <div className="w-10 h-10 rounded-full bg-[#1B6D24]/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#1B6D24]">verified_user</span>
                  </div>
                  <div>
                    <h3 className="font-label-sm text-label-sm text-on-surface mb-xs">Security and Privacy</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                      Your data is encrypted using industry-standard AES-256 protocols. KizFarm does not store your full account credentials - only the necessary routing information for verified payouts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-outline-variant rounded-xl p-md overflow-hidden group">
                <div className="relative h-40 -mx-md -mt-md mb-md overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt="agricultural field"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZr8vaz9IUki0I9SKsTYLN96yYsO74_eW1DO3zE67h7cTvTbjfmLaRcHvrgrh0lV8jg1jT0kY2xU5GJ1phwuF_m2iGoG-wYMCW8IE8S41zIsp52qrFoupy1iGFX-tipO_f7Z023Y6IJKaVCYcWZkRdVcSuE9o8rKRk3tiYzVb4XFB-emI1sr1JVdJYaf6Ic2GzDaiP-KnBwHc3qSHF2jplEhSe20-YgzlrV9vssEQ-f69fkTSVC83AjRHMzOk2l2MvTX8t1s8q9aE"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-md">
                    <span className="text-white font-label-sm">Grow your business with Kiz Farm</span>
                  </div>
                </div>
                <h4 className="font-label-sm text-label-sm text-on-surface mb-xs">Need Help?</h4>
                <p className="text-label-xs font-label-xs text-on-surface-variant">
                  Our support team is available 24/7 for financial verification assistance.
                </p>
                <a className="inline-flex items-center gap-1 mt-md text-[#1B6D24] font-label-sm hover:underline" href="#">
                  Contact Support
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-lg border-t border-outline-variant pt-md flex flex-wrap justify-center gap-md">
            <div className="flex items-center gap-2 opacity-60">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span className="text-label-xs font-label-xs">PCI DSS Compliant</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span className="text-label-xs font-label-xs">SSL Secured Connection</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span className="material-symbols-outlined text-sm">payments</span>
              <span className="text-label-xs font-label-xs">Direct Deposit Enabled</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
