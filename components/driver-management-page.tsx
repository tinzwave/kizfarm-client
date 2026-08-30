"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getAllDrivers, getDriverManagementStats } from "@/lib/kizfarm/supabase-data";
import { createDriver } from "@/lib/kizfarm/supabase-mutations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Driver {
  _id: string;
  name: string;
  phone: string;
  vehicleType: "bike" | "van" | "truck" | "refrigerated_van";
  vehiclePlate: string | null;
  currentLocation: string | null;
  status: "active" | "busy" | "offline";
  totalDeliveries: number;
  averageRating?: number;
  ratingCount?: number;
  activeOrdersCount?: number;
  vehicleImages?: string[];
  createdAt: string;
}

interface Stats {
  totalDrivers: number;
  activeDrivers: number;
  totalOrders: number;
  deliveredOrders: number;
}

const VEHICLE_ICON: Record<string, string> = {
  bike: "moped",
  van: "local_shipping",
  truck: "local_shipping",
  refrigerated_van: "local_shipping",
};

const VEHICLE_LABEL: Record<string, string> = {
  bike: "Bike",
  van: "Van",
  truck: "Truck",
  refrigerated_van: "Refrigerated Van",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriverManagementPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Onboard modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicleType: "bike",
    vehiclePlate: "",
    currentLocation: "",
    vehicleImage: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, statsRes] = await Promise.all([
        getAllDrivers(),
        getDriverManagementStats(),
      ]);
      const fetchedDrivers = (driversRes.payload?.ok ? driversRes.payload.drivers : []) as Driver[];
      setDrivers(fetchedDrivers);
      if (statsRes.payload?.ok) {
        setStats({
          totalDrivers: fetchedDrivers.length,
          activeDrivers: fetchedDrivers.filter((d) => d.status === "active").length,
          totalOrders: statsRes.payload.stats.totalOrders,
          deliveredOrders: statsRes.payload.stats.deliveredOrders,
        });
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDrivers = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      (d.vehiclePlate ?? "").toLowerCase().includes(q) ||
      (d.currentLocation ?? "").toLowerCase().includes(q)
    );
  });

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Name and phone are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { res, payload } = await createDriver({
        name: form.name.trim(),
        phone: form.phone.trim(),
        vehicleType: form.vehicleType,
        vehiclePlate: form.vehiclePlate.trim() || undefined,
        currentLocation: form.currentLocation.trim() || undefined,
        vehicleImage: form.vehicleImage,
      });
      if (!res.ok) {
        setFormError(payload?.error ?? "Failed to onboard driver.");
        return;
      }
      setShowModal(false);
      setForm({
        name: "",
        phone: "",
        vehicleType: "bike",
        vehiclePlate: "",
        currentLocation: "",
        vehicleImage: null,
      });
      await fetchData();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadge = (status: Driver["status"]) => {
    const map: Record<string, string> = {
      active: "bg-green-800/10 text-green-800",
      busy: "bg-orange-500/10 text-orange-600",
      offline: "bg-slate-400/10 text-slate-500",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${map[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div
      className="text-on-background"
      style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f9f9ff" }}
    >
      {/* ── Onboard Driver Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Onboard New Driver
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError("");
                }}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleOnboard} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mwangi"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+234 800 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={form.vehicleType}
                  onChange={(e) =>
                    setForm({ ...form, vehicleType: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                >
                  <option value="bike">Bike</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="refrigerated_van">Refrigerated Van</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Plate
                </label>
                <input
                  type="text"
                  placeholder="e.g. LAG-123-XY"
                  value={form.vehiclePlate}
                  onChange={(e) =>
                    setForm({ ...form, vehiclePlate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Market, Lagos"
                  value={form.currentLocation}
                  onChange={(e) =>
                    setForm({ ...form, currentLocation: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Driver&apos;s Car Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm({ ...form, vehicleImage: e.target.files?.[0] ?? null })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-green-800 focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                />
                {form.vehicleImage && (
                  <p className="mt-1 text-xs text-slate-500">
                    Selected: {form.vehicleImage.name}
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-900 transition-colors disabled:opacity-60"
                >
                  {submitting ? "Registering…" : "Register Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedDriver.name}
                </h3>
                <p className="text-sm text-slate-500">{selectedDriver.phone}</p>
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs uppercase text-slate-400 font-bold">
                  Active Orders
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedDriver.activeOrdersCount ??
                    (selectedDriver.status === "busy" ? 1 : 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs uppercase text-slate-400 font-bold">
                  Deliveries
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedDriver.totalDeliveries}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs uppercase text-slate-400 font-bold">
                  Rating
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedDriver.averageRating?.toFixed(1) ?? "0.0"}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Vehicle:</span>{" "}
                {VEHICLE_LABEL[selectedDriver.vehicleType]} ·{" "}
                {selectedDriver.vehiclePlate ?? "No plate"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Location:</span>{" "}
                {selectedDriver.currentLocation ?? "Unknown"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                {selectedDriver.status}
              </p>
            </div>
            {selectedDriver.vehicleImages &&
              selectedDriver.vehicleImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {selectedDriver.vehicleImages.slice(0, 3).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt={`${selectedDriver.name} vehicle`}
                      className="h-24 w-full object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── TopNavBar ── */}
      <header className="flex justify-between items-center px-8 h-16 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
              data-icon="search"
            >
              search
            </span>
            <input
              className="w-full bg-slate-50 border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none transition-all"
              placeholder="Search drivers, plates, or locations..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-slate-500 hover:text-green-800 transition-colors relative">
            <span
              className="material-symbols-outlined"
              data-icon="notifications"
            >
              notifications
            </span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="text-slate-500 hover:text-green-800 transition-colors">
            <span className="material-symbols-outlined" data-icon="help">
              help
            </span>
          </button>
          <div className="h-6 w-[1px] bg-gray-200"></div>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-sm font-medium text-slate-700">
              KizFarm HQ
            </span>
            <span
              className="material-symbols-outlined text-slate-400"
              data-icon="keyboard_arrow_down"
            >
              keyboard_arrow_down
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content Canvas ── */}
      <main className="p-8 min-h-[calc(100vh-64px)]">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-slate-500">
          <span className="text-sm">Logistics</span>
          <span
            className="material-symbols-outlined text-sm"
            data-icon="chevron_right"
          >
            chevron_right
          </span>
          <span className="text-sm text-green-800 font-semibold">
            Drivers List
          </span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Delivery Fleet
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Manage and assign tasks to available drivers at KizFarm.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">
                refresh
              </span>
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-green-900 transition-colors"
            >
              <span
                className="material-symbols-outlined text-base"
                data-icon="person_add"
              >
                person_add
              </span>
              Onboard Driver
            </button>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className="bg-white border border-gray-200 rounded-xl p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Total Drivers
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-slate-900">
                {loading ? "–" : (stats?.totalDrivers ?? drivers.length)}
              </h3>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Registered
              </span>
            </div>
          </div>
          <div
            className="bg-white border border-gray-200 rounded-xl p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Active Now
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-slate-900">
                {loading
                  ? "–"
                  : drivers.filter((d) => d.status === "active").length}
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            </div>
          </div>
          <div
            className="bg-white border border-gray-200 rounded-xl p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              On Delivery
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-slate-900">
                {loading
                  ? "–"
                  : drivers.filter((d) => d.status === "busy").length}
              </h3>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                Busy
              </span>
            </div>
          </div>
          <div
            className="bg-white border border-gray-200 rounded-xl p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Deliveries Done
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-slate-900">
                {loading ? "–" : (stats?.deliveredOrders ?? "–")}
              </h3>
              <span
                className="material-symbols-outlined text-slate-300"
                data-icon="trending_up"
              >
                trending_up
              </span>
            </div>
          </div>
        </div>

        {/* Drivers Table Card */}
        <div
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Driver Directory
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-50 text-green-800 text-xs font-semibold rounded-full border border-green-100">
                  All: {drivers.length}
                </span>
                <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                  Bikes:{" "}
                  {drivers.filter((d) => d.vehicleType === "bike").length}
                </span>
                <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                  Vans+:{" "}
                  {drivers.filter((d) => d.vehicleType !== "bike").length}
                </span>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined" data-icon="refresh">
                refresh
              </span>
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <span className="material-symbols-outlined animate-spin mr-2">
                  autorenew
                </span>
                Loading drivers…
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3">
                  local_shipping
                </span>
                <p className="text-sm font-medium">
                  {search
                    ? "No drivers match your search."
                    : "No drivers registered yet."}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-4 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-900 transition-colors"
                  >
                    Onboard First Driver
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Driver Name
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Plate
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Trips
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDrivers.map((driver) => (
                    <tr
                      key={driver._id}
                      onClick={() => setSelectedDriver(driver)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-green-800 text-base">
                              person
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {driver.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {driver._id.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {driver.phone}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span
                            className="material-symbols-outlined text-lg"
                            data-icon={VEHICLE_ICON[driver.vehicleType]}
                          >
                            {VEHICLE_ICON[driver.vehicleType]}
                          </span>
                          <span className="text-sm">
                            {VEHICLE_LABEL[driver.vehicleType]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {driver.vehiclePlate ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        {driver.currentLocation ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span
                              className="material-symbols-outlined text-sm text-red-400"
                              data-icon="location_on"
                            >
                              location_on
                            </span>
                            <span className="text-sm">
                              {driver.currentLocation}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="material-symbols-outlined text-sm">
                              location_off
                            </span>
                            <span className="text-sm">Unknown</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(driver.status)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                        {driver.totalDeliveries}
                        <span className="block text-xs text-slate-400">
                          {driver.activeOrdersCount ??
                            (driver.status === "busy" ? 1 : 0)}{" "}
                          active · {driver.averageRating?.toFixed(1) ?? "0.0"}{" "}
                          stars
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination / Count Footer */}
          {!loading && filteredDrivers.length > 0 && (
            <div className="px-6 py-4 bg-slate-50/30 flex items-center justify-between border-t border-gray-100">
              <span className="text-sm text-slate-500">
                Showing {filteredDrivers.length} of {drivers.length} drivers
              </span>
            </div>
          )}
        </div>

        {/* Fleet Map (decorative) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Fleet Map Overview
            </h3>
            <div className="relative rounded-lg overflow-hidden h-[300px] bg-slate-100 border border-gray-100">
              <img
                className="w-full h-full object-cover opacity-80"
                data-alt="minimalist city map illustration with stylized green route lines and moving circular location markers for delivery tracking"
                data-location="Nigeria"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBo24yhMNgoe8otXXe0ihwacLGFPWj-zrY_g2iMgoNadbfbd8p232Kljb0aFnOcMYdP0e7oTx60gOyFccUwPWcCPTdxhOATWhbddJ6HwhMFQg5h-06kSxS6K8bb-ota1YTsDX-1ses_Uwqo8w_itI9SAtJHB2hYxsIjBCYvIassG4ervkTquqxtkmqeFQM6CNQRduupe6AZ5nzBlQ60wOdQBh_GyfLFC2CjPMK47jF8Q1-Ykj0KRIymfflDdOQdS4yzJqK5wuoCOwA"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
              <div className="absolute bottom-4 left-4 flex gap-3">
                <div className="bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-slate-700">
                    {drivers.filter((d) => d.status === "active").length} Active
                  </span>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-xs font-semibold text-slate-700">
                    {drivers.filter((d) => d.status === "busy").length} On Trip
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-green-800 text-white rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Need bulk assignment?</h3>
              <p className="text-sm opacity-80 mb-6">
                Go to the Orders workspace to assign drivers to packed orders
                ready for delivery.
              </p>
            </div>
            <a
              href="/admin/orders"
              className="relative z-10 bg-white text-green-800 px-4 py-2 rounded-lg font-bold text-sm w-fit hover:bg-green-50 transition-colors"
            >
              Go to Orders
            </a>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute top-10 -right-5 w-20 h-20 bg-white/5 rounded-full"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
