"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAddresses, createAddress, updateAddress, deleteAddress } from "@/lib/kizfarm/supabase-mutations";

interface AddressItem {
  _id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [label, setLabel] = useState("Home");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { res, payload } = await getAddresses();
      if (!res.ok) {
        setError(payload?.error || "Failed to fetch addresses");
        return;
      }
      setAddresses(payload.addresses || []);
    } catch (err) {
      console.error("Error fetching addresses:", err);
      setError("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchAddresses());
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingAddressId(null);
    setLabel("Home");
    setStreet("");
    setCity("");
    setState("");
    setCountry("Nigeria");
    setPhone("");
    setIsDefault(false);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (address: AddressItem) => {
    setIsEditing(true);
    setEditingAddressId(address._id);
    setLabel(address.label || "Home");
    setStreet(address.street || "");
    setCity(address.city || "");
    setState(address.state || "");
    setCountry(address.country || "Nigeria");
    setPhone(address.phone || "");
    setIsDefault(address.isDefault || false);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !city || !state) {
      setError("Street, City, and State are required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const bodyData = { label, street, city, state, country, phone, isDefault };
      const { res, payload } = isEditing
        ? await updateAddress(editingAddressId!, bodyData)
        : await createAddress(bodyData);

      if (!res.ok) {
        setError(payload?.error || "Failed to save address.");
        return;
      }

      setShowModal(false);
      fetchAddresses();
    } catch (err) {
      console.error("Submit address error:", err);
      setError("Server connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const { res, payload } = await deleteAddress(id);
      if (!res.ok) {
        alert(payload?.error || "Failed to delete address");
        return;
      }
      fetchAddresses();
    } catch (err) {
      console.error("Delete address error:", err);
      alert("Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { res, payload } = await updateAddress(id, { isDefault: true });
      if (!res.ok) {
        alert(payload?.error || "Failed to set default address");
        return;
      }
      fetchAddresses();
    } catch (err) {
      console.error("Set default address error:", err);
    }
  };

  return (
    <>
      {/* TopAppBar Shell */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 docked full-width top-0 sticky z-50">
        <div className="flex justify-between items-center w-full px-6 py-3 h-16 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/buyer/marketplace" className="cursor-pointer flex items-center gap-2">
              <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/buyer/marketplace" className="text-sm font-semibold text-primary hover:underline">Marketplace</Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-lg">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col gap-2 mb-xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-2xl">Saved Addresses</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage your delivery locations for fresh farm produce deliveries.</p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && !showModal && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && addresses.length === 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] mb-8">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">home_pin</span>
              <h3 className="text-lg font-bold text-on-surface mb-1">No addresses saved</h3>
              <p className="text-sm text-on-surface-variant mb-6">You need to save at least one delivery address to place orders.</p>
              <button 
                onClick={openAddModal}
                className="px-6 py-3 bg-[#1B6D24] text-white rounded-lg font-bold hover:bg-primary transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add_location</span>
                Add First Address
              </button>
            </div>
          )}

          {/* Address Grid/List */}
          {!loading && addresses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-xl">
              {addresses.map((address) => (
                <div 
                  key={address._id}
                  className={`bg-white border rounded-xl p-6 relative group transition-all duration-200 hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] ${
                    address.isDefault ? "border-[#1B6D24] ring-2 ring-[#1B6D24]/10" : "border-[#E5E7EB]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#1B6D24]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {address.label?.toLowerCase() === "office" ? "business" : "home"}
                      </span>
                      <span className="font-label-sm text-label-xs bg-primary-container text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        {address.label || "Home"}
                      </span>
                      {address.isDefault && (
                        <span className="font-label-sm text-label-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!address.isDefault && (
                        <button 
                          onClick={() => handleSetDefault(address._id)}
                          className="text-xs text-primary font-semibold px-2 py-1 hover:bg-green-50 rounded transition-colors"
                          title="Set as Default"
                        >
                          Set Default
                        </button>
                      )}
                      <button 
                        onClick={() => openEditModal(address)}
                        className="p-1.5 text-gray-500 hover:text-primary transition-colors hover:bg-gray-50 rounded"
                      >
                        <span className="material-symbols-outlined text-lg" data-icon="edit">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(address._id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 transition-colors hover:bg-gray-50 rounded"
                      >
                        <span className="material-symbols-outlined text-lg" data-icon="delete">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-body-md text-body-md text-on-surface-variant font-medium leading-relaxed">
                      {address.street}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                      {address.city}, {address.state}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                      {address.country}
                    </p>
                    {address.phone && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]" data-icon="call">call</span>
                        {address.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          {!loading && addresses.length > 0 && (
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={openAddModal}
                disabled={addresses.length >= 5}
                className={`w-full md:w-auto min-w-[320px] h-12 px-8 bg-[#1B6D24] text-white rounded-lg font-label-sm text-label-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-transform active:scale-95 duration-200 shadow-md ${
                  addresses.length >= 5 ? "opacity-50 cursor-not-allowed" : "hover:bg-primary"
                }`}
              >
                <span className="material-symbols-outlined" data-icon="add_location">add_location</span>
                Add New Address
              </button>
              <p className="font-label-xs text-label-xs text-outline italic">
                {addresses.length >= 5 ? "Maximum address limit reached (5)" : "Maximum 5 addresses per account"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Edit/Add Overlay Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1B6D24]">home_pin</span>
              {isEditing ? "Edit Delivery Address" : "Add Delivery Address"}
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Label (e.g. Home, Office)</label>
                  <input 
                    type="text" 
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full h-11 border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-primary bg-white text-black"
                    placeholder="Home"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-primary bg-white text-black"
                    placeholder="+234 80 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Street Address</label>
                <input 
                  type="text" 
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full h-11 border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-primary bg-white text-black"
                  placeholder="42 Greenfield Avenue"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">City</label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-primary bg-white text-black"
                    placeholder="Ikeja"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">State</label>
                  <input 
                    type="text" 
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full h-11 border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-primary bg-white text-black"
                    placeholder="Lagos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Country</label>
                  <input 
                    type="text" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-11 border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-primary bg-white text-black"
                    placeholder="Nigeria"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input 
                  type="checkbox" 
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm font-semibold text-gray-700">Set as default shipping address</span>
              </label>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#1B6D24] text-white rounded-lg font-semibold hover:bg-primary disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
