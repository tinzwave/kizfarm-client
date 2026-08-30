"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminFarmerVerifications } from "@/lib/kizfarm/supabase-data";
import { adminReviewFarmer } from "@/lib/kizfarm/supabase-mutations";

export default function FarmerVerificationReviewPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // approve a farmer application
  const handleApprove = async (id: string) => {
    setSubmitting(true);
    try {
      const { res, payload } = await adminReviewFarmer(id, true);
      if (!res.ok) throw new Error(payload?.error || "Approve failed");
      // remove from pending list
      setList((l) => l.filter((it) => it._id !== id));
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // (Decision actions happen on the detail page.)

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { payload } = await getAdminFarmerVerifications();
        if (payload?.ok) setList(payload.list || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ensure the Admin sidebar highlights the Farmer Verification item
  useEffect(() => {
    try {
      const updateActive = () => {
        const links = Array.from(
          document.querySelectorAll('a[href^="/admin"]'),
        ) as HTMLAnchorElement[];
        links.forEach((link) => {
          if (link.getAttribute("href") === "/admin/verify-farmers") {
            link.classList.add(
              "bg-[#f0fdf4]",
              "text-[#1B6D24]",
              "font-semibold",
            );
          } else {
            link.classList.remove(
              "bg-[#f0fdf4]",
              "text-[#1B6D24]",
              "font-semibold",
            );
          }
        });
      };
      updateActive();
      window.addEventListener("popstate", updateActive);
      return () => window.removeEventListener("popstate", updateActive);
    } catch (e) {
      /* ignore */
    }
  }, []);

  return (
    <div
      className="bg-background text-on-background antialiased"
      style={{
        fontFamily: "'Inter', sans-serif",
        minHeight: "max(884px, 100dvh)",
      }}
    >
      <main className="min-h-screen">
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center h-16 px-8">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200">
              <span className="material-symbols-outlined text-primary">
                menu
              </span>
            </button>
            <h2 className="text-lg font-bold text-emerald-900">
              Farmer Verification
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <input
                className="pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-low text-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all w-64"
                placeholder="Global search..."
                type="text"
              />
              <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400 text-lg">
                search
              </span>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 relative">
              <span className="material-symbols-outlined text-primary">
                notifications
              </span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              <img alt="User Profile" src="/placeholder.svg" />
            </div>
          </div>
        </header>

        <section className="p-8 max-w-[1440px] mx-auto">
          <nav className="flex mb-6 text-sm text-gray-500 font-medium">
            <a className="hover:text-primary" href="#">
              Admin Dashboard
            </a>
            <span className="mx-2">/</span>
            <span className="text-primary-container font-semibold">
              Farmer Verification
            </span>
          </nav>

          <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant text-sm focus:ring-2 focus:ring-primary-container/10 focus:border-primary-container outline-none w-80"
                  placeholder="Search by name or email..."
                  type="text"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-sm">
                  search
                </span>
              </div>
              <select className="pl-3 pr-8 py-2 rounded-lg border border-outline-variant text-sm text-gray-600 bg-white">
                <option>Status: All</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 border border-outline-variant rounded-lg hover:bg-gray-50 transition-colors">
                <span className="material-symbols-outlined text-lg">
                  filter_list
                </span>
                More Filters
              </button>
            </div>
            <button className="bg-primary-container text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary transition-all flex items-center gap-2 shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-lg">
                person_add
              </span>
              Invite Farmer
            </button>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-gray-50/30">
              <h3 className="font-h3 text-on-surface text-lg">
                Total Pending{" "}
                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {list.length}
                </span>
              </h3>
              <div className="flex gap-2">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined">download</span>
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 border-b border-outline-variant">
                      User Profile
                    </th>
                    <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 border-b border-outline-variant">
                      Email Address
                    </th>
                    <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 border-b border-outline-variant">
                      Phone Number
                    </th>
                    <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 border-b border-outline-variant">
                      Status
                    </th>
                    <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 border-b border-outline-variant">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 border-b border-outline-variant text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {list.map((f: any) => (
                    <tr
                      key={f._id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            className="rounded border-outline-variant text-primary focus:ring-primary"
                            type="checkbox"
                          />
                          <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            <img
                              alt="Farmer Avatar"
                              src={f.selfieUrl || "/placeholder.svg"}
                            />
                          </div>
                          <div>
                            <div className="text-body-md font-semibold text-on-surface">
                              {f.userId?.name || "Unnamed"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {f.farmName || "Farmer"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-gray-600">
                        {f.userId?.email || ""}
                      </td>
                      <td className="px-6 py-4 text-body-sm text-gray-600">
                        {f.userId?.phone || f.phone || ""}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${f.status === "pending" ? "bg-amber-100 text-amber-800" : f.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                        >
                          {f.status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-gray-600">
                        {new Date(
                          f.createdAt || Date.now(),
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/verify-farmers/${f._id || f.id}`,
                              )
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-emerald-50 rounded-md transition-colors border border-transparent hover:border-emerald-100"
                          >
                            View Details
                          </button>
                          <button className="px-3 py-1.5 text-xs font-semibold text-error hover:bg-red-50 rounded-md transition-colors">
                            Suspend
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-white border-t border-outline-variant flex items-center justify-between">
              <span className="text-body-sm text-gray-500">
                Showing 1 to {list.length} of {list.length} farmers
              </span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-gray-50 text-gray-400 cursor-not-allowed">
                  {" "}
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>{" "}
                </button>
                <button className="px-3 py-1 bg-primary text-white rounded font-medium text-sm">
                  1
                </button>
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-gray-50 text-gray-600 text-sm">
                  2
                </button>
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-gray-50 text-gray-600 text-sm">
                  3
                </button>
                <span className="px-3 py-1 text-gray-400">...</span>
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-gray-50 text-gray-600 text-sm">
                  250
                </button>
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-gray-50 text-gray-600">
                  {" "}
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>{" "}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
