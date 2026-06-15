// src/pages/MedicinesPage.jsx
import { useState } from "react";
import { MEDICINES } from "../data/medicines";

export default function MedicinesPage({ darkMode }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = ["All", ...new Set(MEDICINES.map((item) => item.category))];
  const filtered = MEDICINES.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  
  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
            Medicine Comparator
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Availability, pricing, and basic usage information.
          </p>
        </div>

        {/* Safety Notice */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
          <p className="text-red-700 font-semibold text-sm">Important Safety Notice</p>
          <p className="text-red-600 text-xs mt-0.5">
            This information is for reference only. Always consult a qualified doctor or pharmacist before taking any medicine.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            placeholder="Search medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
              darkMode
                ? "bg-slate-900 border-slate-700 text-white placeholder-slate-400"
                : "bg-white border-slate-300"
            }`}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm outline-none ${
              darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
            }`}
          >
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        {/* Medicine Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{item.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                    {item.category}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.stock === "Available"
                    ? "bg-green-100 text-green-700"
                    : item.stock === "Low Stock"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-600"
                }`}>
                  {item.stock}
                </span>
              </div>

              {/* Pricing */}
              <div className={`flex gap-4 my-3 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                <div>
                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>MRP</p>
                  <p className={`font-bold line-through ${darkMode ? "text-slate-400" : "text-slate-500"}`}>₹{item.mrp}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Our Price</p>
                  <p className="font-bold text-green-600">₹{item.price}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Savings</p>
                  <p className="font-bold text-cyan-600">₹{item.mrp - item.price}</p>
                </div>
              </div>

              <p className={`text-xs mb-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                <span className="font-medium">Uses:</span> {item.uses}
              </p>
              <p className="text-xs text-yellow-600">
                <span className="font-medium">Warning:</span> {item.warning}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}