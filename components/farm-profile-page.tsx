"use client";

import React, { useState, useEffect } from "react";
import { getMyFullProfile } from "@/lib/kizfarm/supabase-data";
import { updateMyFullProfile } from "@/lib/kizfarm/supabase-mutations";

interface FarmerProfile {
  user: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    profileImage?: string;
  };
  farmer: {
    farmName: string;
    farmType: string;
    location: string;
    isVerified?: boolean;
  };
}

type Props = { hideSidebar?: boolean };

export default function FarmProfilePage({ hideSidebar = false }: Props) {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    farmName: "",
    farmType: "",
    location: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { res, payload } = await getMyFullProfile();
      if (res.ok && payload.profile) {
        const p = payload.profile;
        setProfile({
          user: {
            name: p.name,
            email: p.email,
            phone: p.phone,
            address: p.address,
            city: p.city,
            state: p.state,
            country: p.country,
            profileImage: p.profileImage,
          },
          farmer: {
            farmName: p.farmName,
            farmType: p.farmType,
            location: p.location,
            isVerified: p.isVerified,
          },
        });
        setFormData({
          name: p.name || "",
          phone: p.phone || "",
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          country: p.country || "",
          farmName: p.farmName || "",
          farmType: p.farmType || "",
          location: p.location || "",
        });
      } else {
        setMessage(payload?.error || "Failed to load profile");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Fetch profile failed:", err);
      setMessage("Failed to load profile");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { res, payload } = await updateMyFullProfile(formData);
      if (res.ok) {
        setMessageType("success");
        setMessage("Profile updated successfully!");
        setShowEditModal(false);
        fetchProfile();
      } else {
        setMessageType("error");
        setMessage(payload?.error || "Failed to update profile");
      }
    } catch (err) {
      setMessageType("error");
      setMessage("Network error. Please try again.");
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-green-700">autorenew</span>
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  const farmName = profile?.farmer?.farmName || "Farm Profile";
  const location = `${profile?.farmer?.location || "Location not set"}`;
  const farmType = profile?.farmer?.farmType || "Farm Type";
  const isVerified = profile?.farmer?.isVerified || false;

  return (
    <div className="bg-surface text-on-surface" style={{ backgroundColor: "#fbf9f8", fontFamily: "'Inter', sans-serif" }}>
      {!hideSidebar && (
        <aside className="fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-gray-100 flex flex-col py-4 gap-2 z-50">
          <div className="text-2xl font-black text-[#1B6D24] p-6">KIZ FARM</div>
          <nav className="flex flex-col px-4 gap-1">
            <a className="flex items-center gap-3 px-4 py-3 font-label-sm text-label-sm transition-all hover:bg-gray-50 text-gray-600" href="/farmer/dashboard">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </a>
            <a className="flex items-center gap-3 px-4 py-3 font-label-sm text-label-sm transition-all hover:bg-gray-50 text-gray-600" href="/farmer/products">
              <span className="material-symbols-outlined">inventory_2</span>
              Products
            </a>
            <a className="flex items-center gap-3 px-4 py-3 font-label-sm text-label-sm transition-all hover:bg-gray-50 text-gray-600" href="/farmer/orders">
              <span className="material-symbols-outlined">shopping_cart</span>
              Orders
            </a>
            <a className="flex items-center gap-3 px-4 py-3 font-label-sm text-label-sm transition-all hover:bg-gray-50 text-gray-600" href="/farmer/payouts">
              <span className="material-symbols-outlined">payments</span>
              Earnings
            </a>
            <a className="flex items-center gap-3 px-4 py-3 font-label-sm text-label-sm transition-all hover:bg-gray-50 text-gray-600" href="/farmer/chat">
              <span className="material-symbols-outlined">chat</span>
              Chat
            </a>
            <a className="flex items-center gap-3 px-4 py-3 font-label-sm text-label-sm transition-all bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" href="/farmer/profile">
              <span className="material-symbols-outlined">person</span>
              Profile
            </a>
          </nav>
        </aside>
      )}

      <header className={`fixed top-0 right-0 ${hideSidebar ? "left-0" : "left-[280px]"} h-16 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 z-40`}>
        <div className="font-['Inter'] text-sm font-medium text-gray-500 uppercase tracking-widest">
          Farmer Portal
        </div>
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:text-[#1B6D24] transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-gray-200">
            {profile?.user?.profileImage ? (
              <img className="w-full h-full object-cover" src={profile.user.profileImage} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1B6D24]">
                <span className="material-symbols-outlined">person</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={`${hideSidebar ? "pt-16 min-h-screen" : "ml-[280px] pt-16 min-h-screen"}`}>
        <div className="max-w-[1440px] mx-auto p-gutter lg:p-margin">
          <section className="relative mb-lg">
            <div className="h-64 w-full rounded-xl overflow-hidden mb-[-80px] relative bg-gradient-to-br from-green-400 to-green-600">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>

            <div className="relative px-md">
              <div className="bg-white rounded-xl border border-gray-100 p-md flex flex-col md:flex-row items-end md:items-center justify-between gap-md">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-md -mt-16 md:-mt-12">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl border-4 border-white overflow-hidden shadow-sm bg-white">
                    {profile?.user?.profileImage ? (
                      <img className="w-full h-full object-cover" src={profile.user.profileImage} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-[#1B6D24]">
                        <span className="material-symbols-outlined text-6xl">agriculture</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center md:text-left pb-2">
                    <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                      <h1 className="font-headline-lg text-headline-lg text-on-background">{farmName}</h1>
                      {isVerified && (
                        <span className="px-2 py-0.5 bg-green-100 text-[#1B6D24] text-label-xs font-label-xs rounded-full uppercase tracking-tighter">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 justify-center md:justify-start">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex-1 md:flex-none h-12 px-6 border border-[#1B6D24] text-[#1B6D24] rounded-lg font-label-sm text-label-sm hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-start">
            <div className="md:col-span-4 flex flex-col gap-md">
              <div className="bg-white p-md rounded-xl border border-gray-100">
                <h3 className="font-label-sm text-label-sm text-gray-400 uppercase tracking-widest mb-md">
                  Farm Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#1B6D24]">
                      <span className="material-symbols-outlined">agriculture</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Farm Type</div>
                      <div className="text-sm text-gray-500">{farmType}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#1B6D24]">
                      <span className="material-symbols-outlined">location_on</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Location</div>
                      <div className="text-sm text-gray-500">{location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#1B6D24]">
                      <span className="material-symbols-outlined">email</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Email</div>
                      <div className="text-sm text-gray-500">{profile?.user?.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#1B6D24]">
                      <span className="material-symbols-outlined">phone</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Phone</div>
                      <div className="text-sm text-gray-500">{profile?.user?.phone || "Not provided"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 flex flex-col gap-md">
              <div className="bg-white p-lg rounded-xl border border-gray-100">
                <h2 className="font-headline-md text-headline-md text-on-background mb-4">
                  Farm Information
                </h2>
                <div className="space-y-4 text-on-surface-variant font-body-md">
                  <div>
                    <h3 className="font-semibold text-on-background mb-1">Farm Name</h3>
                    <p>{farmName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-background mb-1">Address</h3>
                    <p>{profile?.user?.address || "Not provided"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-background mb-1">City, State, Country</h3>
                    <p>{`${profile?.user?.city || ""} ${profile?.user?.state || ""} ${profile?.user?.country || ""}`}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <h2 className="font-headline-md text-on-background">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {message && (
                <div className={`p-4 rounded-lg ${
                  messageType === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Farm Name</label>
                <input
                  type="text"
                  value={formData.farmName}
                  onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Farm Type</label>
                  <input
                    type="text"
                    value={formData.farmType}
                    onChange={(e) => setFormData({ ...formData, farmType: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-10 border border-outline-variant rounded-lg font-label-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 bg-[#1B6D24] text-white rounded-lg font-label-sm hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
