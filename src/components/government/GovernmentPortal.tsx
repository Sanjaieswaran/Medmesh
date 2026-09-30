import React, { useState } from 'react';
import {
  Landmark,
  ShieldAlert,
  Download,
  TrendingUp,
  Building2,
  Bed,
  HeartPulse,
  Activity,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Filter,
  MapPin,
  Radio,
  Zap
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { LiveTimestamp } from '../common/LiveTimestamp';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const GovernmentPortal: React.FC = () => {
  const {
    surgeModeActive,
    toggleSurgeMode,
    districtMetrics,
    districts,
    hospitals,
    selectedDistrictId,
    setSelectedDistrict,
    currentDistrict
  } = useMedMesh();

  const { getFlashClass } = useRealtimeSync();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'reports'>('dashboard');

  // Live district metrics computed dynamically from hospitals
  const computedDistrictMetrics = districtMetrics.map(dm => {
    const districtHospitals = hospitals.filter(h =>
      h.district.toLowerCase().includes(dm.district.toLowerCase()) ||
      (h.districtId && h.districtId.toLowerCase().includes(dm.district.toLowerCase()))
    );
    if (districtHospitals.length === 0) return dm;

    const availBeds = districtHospitals.reduce((acc, h) => acc + h.capacity.availableBeds, 0);
    const totalBeds = districtHospitals.reduce((acc, h) => acc + h.capacity.totalBeds, 0);
    const availIcu = districtHospitals.reduce((acc, h) => acc + h.capacity.availableIcu, 0);
    const totalIcu = districtHospitals.reduce((acc, h) => acc + h.capacity.totalIcu, 0);
    const occPercent = totalBeds > 0 ? Math.round(((totalBeds - availBeds) / totalBeds) * 100) : dm.occupancyPercent;

    const color = occPercent >= 80 ? '#EF4444' : occPercent >= 70 ? '#F59E0B' : '#10B981';

    return {
      ...dm,
      totalHospitals: Math.max(districtHospitals.length, dm.totalHospitals),
      availableBeds: availBeds,
      availableIcu: availIcu,
      occupancyPercent: occPercent,
      color
    };
  });

  // Selected district metrics calculation
  const selectedMetric = computedDistrictMetrics.find(
    dm => selectedDistrictId === 'all' ? false : dm.district.toLowerCase() === (currentDistrict?.name.toLowerCase() || '')
  );

  const totalAvailBeds = hospitals.reduce((acc, h) => acc + h.capacity.availableBeds, 0);
  const totalAvailIcu = hospitals.reduce((acc, h) => acc + h.capacity.availableIcu, 0);
  const totalBedsAll = hospitals.reduce((acc, h) => acc + h.capacity.totalBeds, 0);
  const stateAvgOccupancy = totalBedsAll > 0 ? Math.round(((totalBedsAll - totalAvailBeds) / totalBedsAll) * 100) : (surgeModeActive ? 84 : 68);
  const stateIcuUtil = Math.min(99, Math.round(stateAvgOccupancy * 1.08));

  const totalHospitalsCount = selectedMetric ? selectedMetric.totalHospitals : hospitals.length;
  const avgOccupancy = selectedMetric ? selectedMetric.occupancyPercent : stateAvgOccupancy;
  const icuUtilization = selectedMetric 
    ? Math.min(99, Math.round(selectedMetric.occupancyPercent * 1.08))
    : stateIcuUtil;
  const availableBedsCount = selectedMetric ? selectedMetric.availableBeds : totalAvailBeds;
  const availableIcuCount = selectedMetric ? selectedMetric.availableIcu : totalAvailIcu;

  // Trend Data for State Occupancy (Wireframe 5.1)
  const occupancyTrendData = [
    { hour: '00:00', stateOccupancy: Math.max(40, avgOccupancy - 7), icuUtil: Math.max(40, icuUtilization - 6) },
    { hour: '04:00', stateOccupancy: Math.max(40, avgOccupancy - 6), icuUtil: Math.max(40, icuUtilization - 4) },
    { hour: '08:00', stateOccupancy: Math.max(40, avgOccupancy - 3), icuUtil: Math.max(40, icuUtilization - 2) },
    { hour: '12:00', stateOccupancy: Math.min(98, avgOccupancy + 3), icuUtil: Math.min(98, icuUtilization + 3) },
    { hour: '16:00', stateOccupancy: Math.min(98, avgOccupancy + 1), icuUtil: Math.min(98, icuUtilization + 1) },
    { hour: '20:00', stateOccupancy: avgOccupancy, icuUtil: icuUtilization },
  ];

  // Hospital Type Distribution Data (Wireframe 5.2)
  const hospitalTypeData = [
    { name: 'Government (DPH & DME)', value: 58, color: '#2563EB' },
    { name: 'Private Accredited', value: 32, color: '#14B8A6' },
    { name: 'Charitable / Trust', value: 10, color: '#F59E0B' },
  ];

  const handleDownloadReport = (reportName: string) => {
    alert(`Generating official ${reportName} (Digital Signature certified by TN State Health Directorate)... Download started.`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Government Top Control Bar (Wireframe 5.1) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-slate-900">Tamil Nadu State Health Directorate</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Statewide Live Telemetry Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Department of Health & Family Welfare • Government of Tamil Nadu
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* District Selector Filter */}
            <select
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="text-xs font-black py-2 px-3 bg-blue-50/80 border border-blue-200 rounded-xl focus:outline-none text-blue-800 cursor-pointer shadow-xs"
              title="Filter Directorate View by District"
            >
              <option value="all">🌐 All Districts (Tamil Nadu Statewide)</option>
              <option value="dist-karur">📍 Karur District</option>
              <option value="dist-trichy">📍 Tiruchirappalli District</option>
              <option value="dist-chennai">📍 Chennai District</option>
              <option value="dist-coimbatore">📍 Coimbatore District</option>
              <option value="dist-salem">📍 Salem District</option>
            </select>

            {/* Emergency Surge Mode Trigger Button */}
            <button
              onClick={toggleSurgeMode}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide flex items-center space-x-2 transition shadow-md ${
                surgeModeActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{surgeModeActive ? '🚨 SURGE MODE ACTIVE (CLICK TO STAND DOWN)' : 'ACTIVATE SURGE MODE'}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex space-x-3 text-xs sm:text-sm font-bold border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2 rounded-xl transition ${
              activeSubTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            5.1 & 5.2 State Analytics & Heatmap
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 rounded-xl transition ${
              activeSubTab === 'reports' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            5.3 Statutory Reports & Exports
          </button>
        </div>

        {activeSubTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Row (Wireframe 5.1) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Connected Hospitals</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{totalHospitalsCount}</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">100% telemetry freshness &lt; 30s</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bed Occupancy</span>
                  <div className="text-3xl font-black text-blue-600 mt-1">{avgOccupancy}%</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {availableBedsCount.toLocaleString()} available beds {selectedDistrictId === 'all' ? 'statewide' : `in ${currentDistrict?.name || 'district'}`}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bed className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ICU Bed Utilization</span>
                  <div className={`text-3xl font-black mt-1 ${surgeModeActive ? 'text-red-600' : 'text-teal-600'}`}>
                    {icuUtilization}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {availableIcuCount.toLocaleString()} critical care beds available {selectedDistrictId === 'all' ? 'statewide' : `in ${currentDistrict?.name || 'district'}`}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <HeartPulse className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Comparative District Capacity Overview (Multi-District Analysis) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Comparative District Capacity Overview</h3>
                    <p className="text-xs text-slate-500">Live capacity stress across monitored Tamil Nadu healthcare corridors</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>Normal (&lt;70%)</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>Elevated (70-79%)</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>Surge (≥80%)</span>
                </div>
              </div>

              {/* District Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {computedDistrictMetrics.map((dm) => {
                  const targetDistrict = districts.find(d => d.name.toLowerCase() === dm.district.toLowerCase());
                  const targetId = targetDistrict ? targetDistrict.id : 'all';
                  const isSelected = selectedDistrictId === targetId;

                  return (
                    <button
                      key={dm.district}
                      onClick={() => setSelectedDistrict(targetId)}
                      className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2.5 group cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white'
                      } ${getFlashClass(dm.district.toLowerCase())}`}
                      title={`Click to filter Directorate dashboard to ${dm.district}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                          <span className="font-black text-xs text-slate-900 truncate">{dm.district}</span>
                        </div>
                        <span
                          className="text-[10px] font-black px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${dm.color}15`,
                            color: dm.color
                          }}
                        >
                          {dm.occupancyPercent}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${dm.occupancyPercent}%`,
                            backgroundColor: dm.color
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100/80">
                        <span>{dm.availableBeds} beds</span>
                        <span className="text-teal-600 font-semibold">{dm.availableIcu} ICU</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle Grid: Trend Chart & Hospital Type Breakdown (Wireframe 5.1 & 5.2) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Occupancy Trend Line Chart */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Statewide Occupancy Trend (Hourly)</h3>
                    <p className="text-xs text-slate-500">General bed load vs critical ICU occupancy</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold">
                    14 Sep 2026
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[40, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="stateOccupancy" stroke="#2563EB" strokeWidth={3} name="Bed Occupancy %" />
                      <Line type="monotone" dataKey="icuUtil" stroke="#14B8A6" strokeWidth={3} name="ICU Utilization %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hospital Type Distribution Pie Chart */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Hospital Capacity by Type</h3>
                  <p className="text-xs text-slate-500">State healthcare infrastructure distribution</p>
                </div>

                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hospitalTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {hospitalTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {hospitalTypeData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Districts by Occupancy Table & Heatmap (Wireframe 5.1 & 5.2) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Top Districts by Occupancy Pressure</h3>
                  <p className="text-xs text-slate-500">Real-time load heat across Tamil Nadu districts</p>
                </div>
                <span className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-bold">
                  Surge threshold: &gt; 80%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">District</th>
                      <th className="px-6 py-3">Occupancy %</th>
                      <th className="px-6 py-3">Hospitals</th>
                      <th className="px-6 py-3">Available Beds</th>
                      <th className="px-6 py-3">Available ICU</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {computedDistrictMetrics.map(dm => {
                      const isHigh = dm.occupancyPercent >= 80;
                      const isMod = dm.occupancyPercent >= 70 && dm.occupancyPercent < 80;

                      return (
                        <tr key={dm.district} className={`hover:bg-slate-50 transition-colors ${getFlashClass(dm.district.toLowerCase())}`}>
                          <td className="px-6 py-3.5 font-bold text-slate-900 text-sm">{dm.district}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-sm" style={{ color: dm.color }}>
                                {dm.occupancyPercent}%
                              </span>
                              <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${dm.occupancyPercent}%`,
                                    backgroundColor: dm.color
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-slate-700 font-medium">{dm.totalHospitals}</td>
                          <td className="px-6 py-3.5 font-bold text-blue-600">{dm.availableBeds}</td>
                          <td className="px-6 py-3.5 font-bold text-teal-600">{dm.availableIcu}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isHigh ? 'bg-red-100 text-red-800' :
                              isMod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isHigh ? 'High Congestion' : isMod ? 'Elevated' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5.3 Statutory Reports & Exports (Wireframe 5.3) */}
        {activeSubTab === 'reports' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Government Healthcare Reports & Data Exports</h3>
                <p className="text-xs text-slate-500">Period: 01 Dec 2026 - 14 Sep 2026 • Verified Public Health Dataset</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Capacity Report', desc: 'Statewide bed, ICU, and ventilator availability logs', type: 'CSV & PDF' },
                { name: 'Emergency Dispatch Report', desc: '108 CAD turnaround times, hospital handovers, and routing', type: 'PDF' },
                { name: 'District Analytics Report', desc: 'Regional capacity pressure, surge indicators, and inter-district triage', type: 'CSV' },
                { name: 'Occupancy Trend Ledger', desc: 'Hourly occupancy trends per facility with trust scores', type: 'Excel (.xlsx)' }
              ].map(rep => (
                <div key={rep.name} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{rep.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{rep.desc}</p>
                      <span className="inline-block mt-2 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Format: {rep.type}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadReport(rep.name)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition shadow-sm"
                    title="Download Report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
