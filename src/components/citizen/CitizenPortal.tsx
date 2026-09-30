import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Stethoscope,
  Building2,
  Navigation,
  Phone,
  Bookmark,
  BookmarkCheck,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldCheck,
  Filter,
  Eye,
  Calendar,
  Share2,
  Zap
} from 'lucide-react';
import { useMedMesh } from '../../store/useMedMeshStore';
import { Hospital, Doctor } from '../../types';
import { CitizenMapView } from './CitizenMapView';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { LiveTimestamp } from '../common/LiveTimestamp';

export const CitizenPortal: React.FC = () => {
  const { hospitals, savedHospitalIds, toggleSaveHospital, selectedDistrictId, currentDistrict } = useMedMesh();
  const { getFlashClass, isFlashing, getFlashType } = useRealtimeSync();

  // Internal tab state: 'home' | 'search' | 'detail' | 'doctors' | 'map' | 'saved'
  const [citizenTab, setCitizenTab] = useState<'home' | 'search' | 'detail' | 'doctors' | 'map' | 'saved'>('home');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('hosp-karur-kgmch');
  
  // Search state
  const [searchLocation, setSearchLocation] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('All Specialties');
  const [hospitalTypeFilter, setHospitalTypeFilter] = useState<'All' | 'Government' | 'Private'>('All');
  const [sortBy, setSortBy] = useState<'distance' | 'beds' | 'rating'>('distance');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Filtered hospitals by selected district and search query
  const filteredHospitals = hospitals.filter(h => {
    if (selectedDistrictId !== 'all' && h.districtId !== selectedDistrictId) return false;
    if (hospitalTypeFilter !== 'All' && h.type !== hospitalTypeFilter) return false;
    if (searchSpecialty !== 'All Specialties' && !h.specialties.some(s => s.toLowerCase().includes(searchSpecialty.toLowerCase()))) return false;
    if (searchLocation && !h.district.toLowerCase().includes(searchLocation.toLowerCase()) && !h.address.toLowerCase().includes(searchLocation.toLowerCase()) && !h.name.toLowerCase().includes(searchLocation.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
    if (sortBy === 'beds') return b.capacity.availableBeds - a.capacity.availableBeds;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const selectedHospital = filteredHospitals.find(h => h.id === selectedHospitalId) || filteredHospitals[0] || hospitals[0];

  // All doctors
  const allDoctors = hospitals.flatMap(h => h.doctors);
  const filteredDoctors = allDoctors.filter(d => {
    if (doctorSearchQuery) {
      const q = doctorSearchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.hospitalName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelectHospital = (id: string) => {
    setSelectedHospitalId(id);
    setCitizenTab('detail');
  };

  const handleNavigateToHospital = (id: string) => {
    setSelectedHospitalId(id);
    setCitizenTab('map');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Single Clean Healthcare Navigation System */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex space-x-1.5 sm:space-x-3 text-xs sm:text-sm font-bold overflow-x-auto py-2">
              <button
                onClick={() => setCitizenTab('home')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                  citizenTab === 'home' || citizenTab === 'search'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Hospital Directory</span>
              </button>
              <button
                onClick={() => setCitizenTab('map')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                  citizenTab === 'map'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>Live GIS Map</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  citizenTab === 'map' ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Live
                </span>
              </button>
              <button
                onClick={() => setCitizenTab('doctors')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                  citizenTab === 'doctors'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-teal-500" />
                <span>Doctor Directory</span>
              </button>
              <button
                onClick={() => setCitizenTab('saved')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                  citizenTab === 'saved'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>Saved Facilities</span>
                {savedHospitalIds.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    citizenTab === 'saved' ? 'bg-blue-500 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {savedHospitalIds.length}
                  </span>
                )}
              </button>
            </div>

            <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping-slow"></span>
              <span className="font-semibold text-slate-700">{currentDistrict ? `${currentDistrict.name} Healthcare Corridor` : 'Tamil Nadu Statewide Network'} • Real-Time GIS Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* =========================================================================
            1.1 CITIZEN HOME PAGE (Wireframe 1.1)
           ========================================================================= */}
        {citizenTab === 'home' && (
          <div className="space-y-8">
            {/* Hero Search Section */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm mb-4">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> State Health Directorate Verified Network
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
                  Find the right hospital, right now.
                </h1>
                <p className="text-blue-100 text-sm sm:text-base mb-6 max-w-2xl">
                  Check live bed availability, ICU vacancies, ventilators, and on-duty specialists in real time before leaving home.
                </p>

                {/* Search Bar Card */}
                <div className="bg-white rounded-2xl p-3 shadow-2xl text-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
                  <div className="sm:col-span-4 flex items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <MapPin className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      placeholder="Your Location (e.g. Chennai)"
                      className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Stethoscope className="w-4 h-4 text-teal-600 mr-2 flex-shrink-0" />
                    <select
                      value={searchSpecialty}
                      onChange={(e) => setSearchSpecialty(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none"
                    >
                      <option>All Specialties</option>
                      <option>Cardiology</option>
                      <option>Neurology</option>
                      <option>Trauma & Emergency</option>
                      <option>Orthopedics</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Building2 className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" />
                    <select
                      value={hospitalTypeFilter}
                      onChange={(e) => setHospitalTypeFilter(e.target.value as any)}
                      className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none"
                    >
                      <option value="All">Hospital Type (All)</option>
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      onClick={() => setCitizenTab('search')}
                      className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/30"
                    >
                      <Search className="w-4 h-4" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access Grid (Wireframe 1.1) */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Access</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onClick={() => setCitizenTab('search')}
                  className="bg-white hover:bg-blue-50/50 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Nearby Hospitals</span>
                  <span className="text-xs text-slate-400 mt-0.5">Live bed occupancy</span>
                </button>

                <button
                  onClick={() => setCitizenTab('doctors')}
                  className="bg-white hover:bg-teal-50/50 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Find Doctors</span>
                  <span className="text-xs text-slate-400 mt-0.5">On-duty specialists</span>
                </button>

                <button
                  onClick={() => setCitizenTab('map')}
                  className="bg-white hover:bg-emerald-50/50 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Live Map</span>
                  <span className="text-xs text-slate-400 mt-0.5">Real-time GIS routing</span>
                </button>

                <button
                  onClick={() => alert('🚨 Emergency Helplines:\n• State 108 Ambulance Dispatch: 108\n• Trauma Center Hotline: 1066\n• Tamil Nadu Health Helpline: 104')}
                  className="bg-white hover:bg-rose-50/50 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Phone className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Emergency Contacts</span>
                  <span className="text-xs text-slate-400 mt-0.5">108 & 104 direct line</span>
                </button>
              </div>
            </div>

            {/* Nearby Hospitals Section (Wireframe 1.1) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Nearby Hospitals</h2>
                  <p className="text-xs text-slate-500">Live capacity status within 10 km radius</p>
                </div>
                <button
                  onClick={() => setCitizenTab('search')}
                  className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>View All ({filteredHospitals.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredHospitals.slice(0, 3).map(h => {
                  const isFull = h.capacity.availableBeds === 0 || h.capacity.congestion === 'Critical';
                  const isUpdated = isFlashing(h.id);
                  const flashType = getFlashType(h.id);

                  return (
                    <div
                      key={h.id}
                      className={`bg-white rounded-2xl border transition overflow-hidden flex flex-col ${getFlashClass(h.id)} ${
                        isFull
                          ? 'border-rose-300 ring-2 ring-rose-500/20 shadow-rose-100'
                          : 'border-slate-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="relative h-36 bg-slate-100 overflow-hidden">
                        <img src={h.image} alt={h.name} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center space-x-1 shadow-sm">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{h.rating}</span>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-md text-[11px] font-medium">
                          {h.distanceKm} km away
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <h3 className="font-bold text-slate-900 text-base line-clamp-1">{h.name}</h3>
                                {isUpdated && flashType === 'green' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                                    ⚡ Live Sync
                                  </span>
                                )}
                              </div>
                              <span className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{h.district}</span>
                              </span>
                            </div>
                            <button
                              onClick={() => toggleSaveHospital(h.id)}
                              className="text-slate-400 hover:text-blue-600 ml-2"
                              title="Save hospital"
                            >
                              {savedHospitalIds.includes(h.id) ? (
                                <BookmarkCheck className="w-5 h-5 text-blue-600 fill-blue-600" />
                              ) : (
                                <Bookmark className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{h.address}</p>

                          {/* Critical Diversion Red Alert Banner */}
                          {isFull && (
                            <div className="mt-2.5 bg-rose-600 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center justify-between shadow-xs animate-pulse">
                              <span>🚨 DIVERSION: 100% CAPACITY</span>
                              <span>0 BEDS</span>
                            </div>
                          )}

                          {/* Live Relative Timestamp Ticker */}
                          <div className="mt-2">
                            <LiveTimestamp timestamp={h.capacity.updatedAt} compact={true} />
                          </div>

                          {/* Capacity indicators pill grid */}
                          <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl text-center">
                            <div>
                              <div className="text-[11px] text-slate-500">Beds</div>
                              <div className={`text-sm font-black ${h.capacity.availableBeds === 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                {h.capacity.availableBeds} avail
                              </div>
                            </div>
                            <div className="border-x border-slate-200">
                              <div className="text-[11px] text-slate-500">ICU</div>
                              <div className={`text-sm font-black ${h.capacity.availableIcu === 0 ? 'text-rose-600' : 'text-teal-600'}`}>
                                {h.capacity.availableIcu} avail
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">Ventilators</div>
                              <div className={`text-sm font-black ${h.capacity.availableVentilators === 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                {h.capacity.availableVentilators} avail
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-xs">
                            <span className="text-slate-500">Triage:</span>
                            <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              h.capacity.congestion === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                              h.capacity.congestion === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800 font-black animate-pulse'
                            }`}>
                              {h.capacity.congestion}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleNavigateToHospital(h.id)}
                              className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition flex items-center space-x-1"
                              title="Generate road route on Live GIS Map"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Navigate</span>
                            </button>
                            <button
                              onClick={() => handleSelectHospital(h.id)}
                              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            1.2 HOSPITAL SEARCH RESULTS (Wireframe 1.2)
           ========================================================================= */}
        {citizenTab === 'search' && (
          <div className="space-y-6">
            {/* Filter and Query Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchSpecialty === 'All Specialties' ? '' : searchSpecialty}
                    onChange={(e) => setSearchSpecialty(e.target.value || 'All Specialties')}
                    placeholder="Search by specialty (e.g. Cardiology, Orthopedics)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-4 relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    placeholder="Location / Area (e.g. Chennai, Kilpauk)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none"
                  >
                    <option value="distance">Sort by: Distance (Nearest)</option>
                    <option value="beds">Sort by: Bed Availability</option>
                    <option value="rating">Sort by: Patient Rating</option>
                  </select>
                </div>
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 flex items-center mr-2">
                  <Filter className="w-3.5 h-3.5 mr-1" /> Filter:
                </span>
                {(['All', 'Government', 'Private'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setHospitalTypeFilter(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      hospitalTypeFilter === type
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'All' ? 'All Hospitals' : type}
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-auto">
                  Showing {filteredHospitals.length} verified hospitals
                </span>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {filteredHospitals.map(h => {
                const isFull = h.capacity.availableBeds === 0 || h.capacity.availableIcu === 0 || h.capacity.congestion === 'Critical';
                const flashClass = getFlashClass(h.id);
                return (
                <div
                  key={h.id}
                  className={`bg-white rounded-2xl border transition p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isFull ? 'border-red-300 ring-1 ring-red-200 shadow-sm' : 'border-slate-200 shadow-sm hover:shadow-md'
                  } ${flashClass}`}
                >
                  <div className="flex items-start space-x-4 w-full sm:w-auto">
                    <img
                      src={h.image}
                      alt={h.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0 border border-slate-100"
                    />
                    <div>
                      {isFull && (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                          <span>🚨 DIVERSION: 100% CAPACITY REACHED</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="font-bold text-base sm:text-lg text-slate-900">{h.name}</h3>
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{h.district}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {h.type}
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-0.5" />
                          {h.rating} ({h.reviewCount})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {h.distanceKm} km away • {h.address}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {h.specialties.map(spec => (
                          <span key={spec} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded-md font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2">
                        <LiveTimestamp timestamp={h.capacity.updatedAt} />
                      </div>
                    </div>
                  </div>

                  {/* Live Capacity Card Right */}
                  <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-3">
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">Live Beds:</span>
                        <span className={`text-base font-extrabold ${h.capacity.availableBeds === 0 ? 'text-red-600 font-black' : 'text-blue-600'}`}>
                          {h.capacity.availableBeds} / {h.capacity.totalBeds}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-600">
                        <span>ICU: <strong className={h.capacity.availableIcu === 0 ? 'text-red-600 font-black' : 'text-teal-600'}>{h.capacity.availableIcu}</strong></span>
                        <span>Vents: <strong className="text-indigo-600">{h.capacity.availableVentilators}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleSaveHospital(h.id)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50"
                        title="Save hospital"
                      >
                        {savedHospitalIds.includes(h.id) ? (
                          <BookmarkCheck className="w-4 h-4 text-blue-600 fill-blue-600" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleNavigateToHospital(h.id)}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate</span>
                      </button>
                      <button
                        onClick={() => handleSelectHospital(h.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* =========================================================================
            1.3 HOSPITAL DETAILS (Wireframe 1.3)
           ========================================================================= */}
        {citizenTab === 'detail' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCitizenTab('search')}
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
              >
                <span>← Back to Search</span>
              </button>

              <button
                onClick={() => toggleSaveHospital(selectedHospital.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {savedHospitalIds.includes(selectedHospital.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-blue-600 fill-blue-600" />
                    <span>Saved in My Hospitals</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Save Hospital</span>
                  </>
                )}
              </button>
            </div>

            {/* Hospital Hero Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="relative h-64 sm:h-80 bg-slate-900">
                <img
                  src={selectedHospital.image}
                  alt={selectedHospital.name}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white flex items-center space-x-1 shadow-sm">
                        <MapPin className="w-3 h-3" />
                        <span>📍 {selectedHospital.district} District</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                        {selectedHospital.type} Hospital
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/80 text-white">
                        State Health Verified
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black">{selectedHospital.name}</h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-blue-400" />
                      {selectedHospital.distanceKm} km • {selectedHospital.address}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <a
                      href={`tel:${selectedHospital.emergencyPhone}`}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-red-600/30 transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Hospital ({selectedHospital.emergencyPhone})</span>
                    </a>
                    <button
                      onClick={() => handleNavigateToHospital(selectedHospital.id)}
                      className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 transition shadow"
                    >
                      <Navigation className="w-4 h-4 text-blue-600" />
                      <span>Live GIS Route</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Capacity KPI Grid (Wireframe 1.3) */}
              <div className={`p-6 sm:p-8 bg-slate-50 border-b border-slate-200 transition-colors ${getFlashClass(selectedHospital.id)}`}>
                {/* Critical diversion banner if full */}
                {(selectedHospital.capacity.availableBeds === 0 || selectedHospital.capacity.availableIcu === 0 || selectedHospital.capacity.congestion === 'Critical') && (
                  <div className="mb-4 bg-red-600 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg shadow-red-600/30">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse flex-shrink-0" />
                      <div>
                        <span className="font-black text-xs sm:text-sm uppercase tracking-wider">Hospital Diverting Emergency Ambulances</span>
                        <p className="text-[11px] sm:text-xs text-red-100">Critical occupancy threshold exceeded. Non-trauma cases are advised to select alternate corridor hospitals.</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] sm:text-xs font-black uppercase whitespace-nowrap ml-2">Status: Diverting</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping-slow"></span>
                    <span>Live Capacity Telemetry</span>
                  </h2>
                  <div className="flex items-center space-x-3">
                    <LiveTimestamp timestamp={selectedHospital.capacity.updatedAt} />
                    <span className="text-xs text-slate-500">
                      Freshness: <strong className="text-emerald-600 font-bold">{selectedHospital.capacity.freshnessScore}%</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Beds</div>
                    <div className={`text-2xl sm:text-3xl font-black mt-1 ${selectedHospital.capacity.availableBeds === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {selectedHospital.capacity.availableBeds}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedHospital.capacity.occupiedBeds} occupied / {selectedHospital.capacity.totalBeds} total
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ICU Beds</div>
                    <div className={`text-2xl sm:text-3xl font-black mt-1 ${selectedHospital.capacity.availableIcu === 0 ? 'text-red-600' : 'text-teal-600'}`}>
                      {selectedHospital.capacity.availableIcu}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedHospital.capacity.occupiedIcu} occupied / {selectedHospital.capacity.totalIcu} total
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventilators</div>
                    <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
                      {selectedHospital.capacity.availableVentilators}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedHospital.capacity.occupiedVentilators} in use / {selectedHospital.capacity.totalVentilators} total
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ED Congestion</div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold ${
                        selectedHospital.capacity.congestion === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                        selectedHospital.capacity.congestion === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedHospital.capacity.congestion}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Emergency triage status</div>
                  </div>
                </div>
              </div>

              {/* Specialties & Doctors */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Specialties & Care Units</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedHospital.specialties.map(spec => (
                      <span key={spec} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-100">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Specialist Doctors On Duty ({selectedHospital.doctors.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedHospital.doctors.map(doc => (
                      <div key={doc.id} className={`p-4 rounded-2xl border border-slate-200 flex items-center justify-between transition-colors ${getFlashClass(doc.id)}`}>
                        <div className="flex items-center space-x-3">
                          <img src={doc.avatar} alt={doc.name} className="w-12 h-12 rounded-xl object-cover" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-sm text-slate-900">{doc.name}</h4>
                              {doc.onDuty ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                                  ON DUTY
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                  OFF DUTY
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600">{doc.specialty}</p>
                            <p className="text-[11px] text-slate-400">{doc.shiftHours}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setShowBookingModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Consult
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            1.4 & 1.5 DOCTOR DIRECTORY & DETAILS (Wireframe 1.4)
           ========================================================================= */}
        {citizenTab === 'doctors' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-96 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  placeholder="Search doctor by name, specialty, or hospital..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-xs text-slate-500">
                Verified Medical Council of India (MCI) Directory
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map(doc => (
                <div
                  key={doc.id}
                  className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between ${getFlashClass(doc.id)}`}
                >
                  <div className="flex items-start space-x-4">
                    <img src={doc.avatar} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                        <span className="inline-flex items-center text-xs font-semibold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-0.5" />
                          {doc.rating}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-blue-600">{doc.specialty}</p>
                      <p className="text-xs text-slate-500">{doc.hospitalName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{doc.qualification} • {doc.experienceYears} yrs exp</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600">{doc.shiftHours}</span>
                      {doc.onDuty ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          AVAILABLE NOW
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium">
                          OFF DUTY
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setShowBookingModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition shadow-sm"
                    >
                      Book / Consult
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            LIVE GIS MAP VIEW (Real GIS Engine, OSRM Road Routing & Hospital Cards)
           ========================================================================= */}
        {citizenTab === 'map' && (
          <CitizenMapView
            initialSelectedHospitalId={selectedHospitalId}
            onSelectHospitalDetails={handleSelectHospital}
          />
        )}

        {/* =========================================================================
            1.7 SAVED HOSPITALS (Wireframe 1.7)
           ========================================================================= */}
        {citizenTab === 'saved' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saved Hospitals</h2>
              <p className="text-xs text-slate-500">Quick-access bookmarked facilities for your household</p>
            </div>

            {savedHospitalIds.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700">No saved hospitals yet</h3>
                <p className="text-xs text-slate-400 mt-1">Bookmark frequently visited hospitals for immediate one-tap capacity checks.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hospitals.filter(h => savedHospitalIds.includes(h.id)).map(h => (
                  <div key={h.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-base text-slate-900">{h.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{h.distanceKm} km • {h.address}</p>
                        </div>
                        <button
                          onClick={() => toggleSaveHospital(h.id)}
                          className="text-blue-600 hover:text-slate-400"
                          title="Remove bookmark"
                        >
                          <BookmarkCheck className="w-5 h-5 fill-blue-600" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-blue-50/50 rounded-xl text-center">
                        <div>
                          <div className="text-[11px] text-slate-500">Beds</div>
                          <div className="text-sm font-extrabold text-blue-600">{h.capacity.availableBeds} avail</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">ICU</div>
                          <div className="text-sm font-extrabold text-teal-600">{h.capacity.availableIcu} avail</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Ventilators</div>
                          <div className="text-sm font-extrabold text-indigo-600">{h.capacity.availableVentilators} avail</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`tel:${h.emergencyPhone}`}
                        className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{h.emergencyPhone}</span>
                      </a>
                      <button
                        onClick={() => handleSelectHospital(h.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking / Consultation Modal */}
      {showBookingModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Doctor Consultation Request</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl">
              <img src={selectedDoctor.avatar} alt={selectedDoctor.name} className="w-14 h-14 rounded-xl object-cover" />
              <div>
                <h4 className="font-bold text-sm text-slate-900">{selectedDoctor.name}</h4>
                <p className="text-xs text-blue-600 font-semibold">{selectedDoctor.specialty}</p>
                <p className="text-[11px] text-slate-500">{selectedDoctor.hospitalName}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name</label>
              <input
                type="text"
                defaultValue="Karthik Subramanian"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Slot</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Today: {selectedDoctor.shiftHours}</option>
                <option>Tomorrow Morning (10:00 AM - 12:00 PM)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Consultation booked with ${selectedDoctor.name}. Appointment ID: #MED-${Date.now().toString().slice(-4)}`);
                  setShowBookingModal(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 transition"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
