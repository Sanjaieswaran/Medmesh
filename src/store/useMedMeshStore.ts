import { useState, useEffect } from 'react';
import {
  District,
  Hospital,
  Incident,
  Ambulance,
  AmbulanceAssignment,
  AuditLog,
  UserRole,
  User,
  CongestionLevel,
  DistrictMetric,
  RoleConfig,
  CitizenSignUpPayload,
  AdminCreateHospitalPayload,
  AdminCreateDriverPayload,
  AdminCreateGovtPayload,
  AdminCreateOperatorPayload
} from '../types';
import {
  DISTRICTS,
  INITIAL_USERS,
  INITIAL_HOSPITALS,
  INITIAL_INCIDENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_AMBULANCES,
  INITIAL_AUDIT_LOGS,
  INITIAL_DISTRICT_METRICS,
  ROLE_CONFIGS
} from './mockData';
import { realtimeEventBus } from '../services/realtimeEventBus';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'emergency';
  timestamp: string;
}

export interface MedMeshState {
  isAuthenticated: boolean;
  currentUser: User | null;
  currentRole: UserRole;
  currentPath: string;
  attemptedUnauthorizedPath: string | null;
  authToken: string | null;
  sessionExpiresAt: string | null;
  failedLoginAttempts: number;
  isCaptchaRequired: boolean;
  mfaPendingUser: User | null;
  mfaTempToken: string | null;
  firstLoginPendingUser: User | null;
  rememberMe: boolean;

  districts: District[];
  selectedDistrictId: string;
  users: User[];
  activeHospitalId: string;
  activeAmbulanceId: string;
  surgeModeActive: boolean;
  hospitals: Hospital[];
  incidents: Incident[];
  assignments: AmbulanceAssignment[];
  ambulances: Ambulance[];
  auditLogs: AuditLog[];
  savedHospitalIds: string[];
  districtMetrics: DistrictMetric[];
  notifications: AppNotification[];
}

const STORAGE_KEY = 'medmesh_enterprise_state_v8';

export const ROLE_ROUTE_MAP: Record<UserRole, string> = {
  USER: '/user/dashboard',
  HOSPITAL_ADMIN: '/hospital/dashboard',
  OPERATOR_108: '/operator/dashboard',
  AMBULANCE_DRIVER: '/driver/dashboard',
  GOVERNMENT_OFFICIAL: '/government/dashboard',
  PLATFORM_ADMIN: '/admin/dashboard',
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  if (path === '/login' || path === '/signup' || path === '/403') return true;

  // Platform Admin has global superuser access
  if (role === 'PLATFORM_ADMIN') return true;

  if (path.startsWith('/user')) return role === 'USER';
  if (path.startsWith('/hospital')) return role === 'HOSPITAL_ADMIN';
  if (path.startsWith('/operator')) return role === 'OPERATOR_108';
  if (path.startsWith('/driver')) return role === 'AMBULANCE_DRIVER';
  if (path.startsWith('/government')) return role === 'GOVERNMENT_OFFICIAL';
  if (path.startsWith('/admin')) return false;

  return false;
}

function getInitialState(): MedMeshState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const isAuthValid = Boolean(parsed.isAuthenticated && parsed.authToken && parsed.currentUser);
      return {
        ...parsed,
        isAuthenticated: isAuthValid,
        currentUser: isAuthValid ? parsed.currentUser : null,
        currentRole: isAuthValid ? (parsed.currentRole || 'USER') : 'USER',
        currentPath: isAuthValid ? (parsed.currentPath || '/user/dashboard') : '/login',
        authToken: isAuthValid ? parsed.authToken : null,
        sessionExpiresAt: isAuthValid ? parsed.sessionExpiresAt : null,
        districts: DISTRICTS,
        selectedDistrictId: parsed.selectedDistrictId || 'dist-karur',
        users: parsed.users || INITIAL_USERS,
        hospitals: parsed.hospitals?.length > 5 ? parsed.hospitals : INITIAL_HOSPITALS,
        incidents: parsed.incidents?.length > 4 ? parsed.incidents : INITIAL_INCIDENTS,
        assignments: parsed.assignments || INITIAL_ASSIGNMENTS,
        ambulances: parsed.ambulances?.length > 5 ? parsed.ambulances : INITIAL_AMBULANCES,
        districtMetrics: parsed.districtMetrics?.length > 5 ? parsed.districtMetrics : INITIAL_DISTRICT_METRICS,
      };
    }
  } catch (e) {
    console.error('Failed to load MedMesh stored state', e);
  }

  return {
    isAuthenticated: false,
    currentUser: null,
    currentRole: 'USER',
    currentPath: '/login',
    attemptedUnauthorizedPath: null,
    authToken: null,
    sessionExpiresAt: null,
    failedLoginAttempts: 0,
    isCaptchaRequired: false,
    mfaPendingUser: null,
    mfaTempToken: null,
    firstLoginPendingUser: null,
    rememberMe: false,

    districts: DISTRICTS,
    selectedDistrictId: 'dist-karur',
    users: INITIAL_USERS,
    activeHospitalId: 'hosp-apollo',
    activeAmbulanceId: 'amb-001',
    surgeModeActive: false,
    hospitals: INITIAL_HOSPITALS,
    incidents: INITIAL_INCIDENTS,
    assignments: INITIAL_ASSIGNMENTS,
    ambulances: INITIAL_AMBULANCES,
    auditLogs: INITIAL_AUDIT_LOGS,
    savedHospitalIds: ['hosp-karur-kgmch', 'hosp-apollo'],
    districtMetrics: INITIAL_DISTRICT_METRICS,
    notifications: [
      {
        id: 'notif-1',
        title: 'MedMesh Multi-District Active',
        message: 'Karur, Tiruchirappalli & Chennai healthcare exchange network live.',
        type: 'info',
        timestamp: 'Just now'
      }
    ],
  };
}

let globalState: MedMeshState = getInitialState();
const listeners = new Set<() => void>();

function notify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
  } catch (e) {
    console.error('Failed to persist MedMesh state', e);
  }
  listeners.forEach(listener => listener());
}

// =============================================================================
// Cross-Tab Real-Time Sync: Listen for broadcasts from other tabs & update state
// =============================================================================
realtimeEventBus.subscribe('hospital:capacity:updated', (evt) => {
  if (!evt.hospitalId || !evt.payload) return;
  const current = globalState.hospitals.find(h => h.id === evt.hospitalId);
  if (!current) return;

  const newBeds = typeof evt.payload.availableBeds === 'number' ? evt.payload.availableBeds : current.capacity.availableBeds;
  const newIcu = typeof evt.payload.availableIcu === 'number' ? evt.payload.availableIcu : current.capacity.availableIcu;
  const newVents = typeof evt.payload.availableVentilators === 'number' ? evt.payload.availableVentilators : current.capacity.availableVentilators;

  globalState = {
    ...globalState,
    hospitals: globalState.hospitals.map(h => {
      if (h.id !== evt.hospitalId) return h;
      return {
        ...h,
        capacity: {
          ...h.capacity,
          availableBeds: newBeds,
          occupiedBeds: h.capacity.totalBeds - newBeds,
          availableIcu: newIcu,
          occupiedIcu: h.capacity.totalIcu - newIcu,
          availableVentilators: newVents,
          occupiedVentilators: h.capacity.totalVentilators - newVents,
          updatedAt: evt.timestamp || new Date().toISOString(),
          freshnessScore: 100
        }
      };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('doctor:duty:toggled', (evt) => {
  if (!evt.hospitalId || !evt.payload?.doctorId) return;
  globalState = {
    ...globalState,
    hospitals: globalState.hospitals.map(h => {
      if (h.id !== evt.hospitalId) return h;
      return {
        ...h,
        doctors: h.doctors.map(d => {
          if (d.id !== evt.payload.doctorId) return d;
          return { ...d, onDuty: evt.payload.onDuty };
        })
      };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('hospital:congestion:changed', (evt) => {
  if (!evt.hospitalId || !evt.payload?.congestion) return;
  globalState = {
    ...globalState,
    hospitals: globalState.hospitals.map(h => {
      if (h.id !== evt.hospitalId) return h;
      return {
        ...h,
        capacity: {
          ...h.capacity,
          congestion: evt.payload.congestion,
          updatedAt: evt.timestamp || new Date().toISOString(),
          freshnessScore: 100
        }
      };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('ambulance:hospital:selected', (evt) => {
  if (!evt.payload) return;
  const { incidentId, hospitalId, ambulanceId, hospitalName, etaMinutes } = evt.payload;
  globalState = {
    ...globalState,
    incidents: globalState.incidents.map(i => {
      if (i.id !== incidentId) return i;
      return {
        ...i,
        assignedHospitalId: hospitalId,
        assignedHospitalName: hospitalName || i.assignedHospitalName,
        bedReserved: true,
        etaMinutes: etaMinutes || i.etaMinutes,
        status: 'Transporting'
      };
    }),
    ambulances: globalState.ambulances.map(a => {
      if (a.id !== ambulanceId) return a;
      return {
        ...a,
        assignedHospitalId: hospitalId,
        status: 'Transporting'
      };
    }),
    hospitals: globalState.hospitals.map(h => {
      if (h.id !== hospitalId) return h;
      return {
        ...h,
        capacity: {
          ...h.capacity,
          availableBeds: Math.max(0, h.capacity.availableBeds - 1),
          occupiedBeds: h.capacity.occupiedBeds + 1,
          updatedAt: new Date().toISOString()
        }
      };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('ambulance:location:updated', (evt) => {
  if (!evt.payload?.ambulanceId || typeof evt.payload.latitude !== 'number') return;
  const { ambulanceId, latitude, longitude } = evt.payload;
  globalState = {
    ...globalState,
    ambulances: globalState.ambulances.map(a => {
      if (a.id !== ambulanceId) return a;
      return { ...a, latitude, longitude };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('assignment:created', (evt) => {
  if (!evt.payload) return;
  const assignment: AmbulanceAssignment = evt.payload;
  const exists = globalState.assignments.some(a => a.id === assignment.id);
  const updatedAssignments = exists
    ? globalState.assignments.map(a => a.id === assignment.id ? assignment : a)
    : [assignment, ...globalState.assignments];

  globalState = {
    ...globalState,
    assignments: updatedAssignments,
    incidents: globalState.incidents.map(i => {
      if (i.id !== assignment.incidentId) return i;
      return {
        ...i,
        status: 'ASSIGNED',
        assignedAmbulanceId: assignment.ambulanceId,
        assignedAmbulanceCode: assignment.ambulanceCode,
        activeAssignmentId: assignment.id,
        assignedAt: assignment.assignedAt
      };
    }),
    ambulances: globalState.ambulances.map(a => {
      if (a.id !== assignment.ambulanceId) return a;
      return {
        ...a,
        status: 'Assigned',
        currentIncidentId: assignment.incidentId
      };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('assignment:accepted', (evt) => {
  if (!evt.payload) return;
  const { assignmentId, incidentId, ambulanceId, driverGps } = evt.payload;
  globalState = {
    ...globalState,
    assignments: globalState.assignments.map(a => {
      if (a.id !== assignmentId) return a;
      return { ...a, status: 'ACCEPTED', acceptedAt: new Date().toISOString() };
    }),
    incidents: globalState.incidents.map(i => {
      if (i.id !== incidentId) return i;
      return { ...i, status: 'ACCEPTED', acceptedAt: new Date().toISOString() };
    }),
    ambulances: globalState.ambulances.map(a => {
      if (a.id !== ambulanceId) return a;
      return {
        ...a,
        status: 'En Route',
        latitude: driverGps?.latitude || a.latitude,
        longitude: driverGps?.longitude || a.longitude
      };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('assignment:rejected', (evt) => {
  if (!evt.payload) return;
  const { assignmentId, incidentId, ambulanceId, reason } = evt.payload;
  globalState = {
    ...globalState,
    assignments: globalState.assignments.map(a => {
      if (a.id !== assignmentId) return a;
      return { ...a, status: 'REJECTED', rejectionReason: reason, rejectedAt: new Date().toISOString() };
    }),
    incidents: globalState.incidents.map(i => {
      if (i.id !== incidentId) return i;
      return {
        ...i,
        status: 'PENDING_DISPATCH',
        assignedAmbulanceId: undefined,
        assignedAmbulanceCode: undefined,
        activeAssignmentId: undefined
      };
    }),
    ambulances: globalState.ambulances.map(a => {
      if (a.id !== ambulanceId) return a;
      return { ...a, status: 'Available', currentIncidentId: undefined };
    })
  };
  listeners.forEach(l => l());
});

realtimeEventBus.subscribe('assignment:expired', (evt) => {
  if (!evt.payload) return;
  const { assignmentId, incidentId, ambulanceId } = evt.payload;
  globalState = {
    ...globalState,
    assignments: globalState.assignments.map(a => {
      if (a.id !== assignmentId) return a;
      return { ...a, status: 'EXPIRED' };
    }),
    incidents: globalState.incidents.map(i => {
      if (i.id !== incidentId) return i;
      return {
        ...i,
        status: 'PENDING_DISPATCH',
        assignedAmbulanceId: undefined,
        assignedAmbulanceCode: undefined,
        activeAssignmentId: undefined
      };
    }),
    ambulances: globalState.ambulances.map(a => {
      if (a.id !== ambulanceId) return a;
      return { ...a, status: 'Available', currentIncidentId: undefined };
    })
  };
  listeners.forEach(l => l());
});

export const medMeshStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  addAuditLog: (action: string, entity: string, details?: string, statusCode: number = 200) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      actorId: globalState.currentUser?.id || 'anonymous',
      actorName: globalState.currentUser?.name || 'Unauthenticated User',
      actorRole: globalState.currentRole || 'UNKNOWN',
      action,
      entity,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      statusCode,
      details
    };
    globalState = {
      ...globalState,
      auditLogs: [newLog, ...globalState.auditLogs]
    };
    notify();
  },

  navigate: (targetPath: string) => {
    if (!globalState.isAuthenticated && targetPath !== '/login' && targetPath !== '/signup') {
      try {
        window.history.replaceState(null, '', '/login');
      } catch (e) {}
      globalState = {
        ...globalState,
        currentPath: '/login',
        attemptedUnauthorizedPath: targetPath
      };
      notify();
      return;
    }

    if (globalState.isAuthenticated && !canAccessRoute(globalState.currentRole, targetPath)) {
      medMeshStore.addAuditLog(
        'AUTH_FORBIDDEN_403',
        targetPath,
        `Role [${globalState.currentRole}] attempted unauthorized route traversal`,
        403
      );
      globalState = {
        ...globalState,
        currentPath: '/403',
        attemptedUnauthorizedPath: targetPath
      };
      notify();
      return;
    }

    globalState = {
      ...globalState,
      currentPath: targetPath,
      attemptedUnauthorizedPath: null
    };
    notify();
  },

  // Citizen Self-Registration (Public Sign Up)
  registerCitizen: (payload: CitizenSignUpPayload) => {
    // Check duplicate
    const existing = globalState.users.find(
      u => u.email.toLowerCase() === payload.email.toLowerCase() || u.username.toLowerCase() === payload.username.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'An account with this email or username already exists.' };
    }

    const newUser: User = {
      id: `usr-cit-${Date.now().toString().slice(-4)}`,
      name: payload.fullName,
      email: payload.email,
      username: payload.username,
      mobileNumber: payload.mobileNumber,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      role: 'USER', // Hardcoded! Never chosen by user
      title: 'Registered Citizen',
      isCitizenSelfRegistered: true,
      mustChangePassword: false,
      mfaEnabled: false,
      isSuspended: false,
      createdAt: new Date().toLocaleDateString(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    };

    globalState = {
      ...globalState,
      users: [newUser, ...globalState.users],
      isAuthenticated: true,
      currentUser: newUser,
      currentRole: 'USER',
      currentPath: '/user/dashboard',
      authToken: `jwt.citizen.${newUser.id}.${Date.now()}`,
      sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString(),
      failedLoginAttempts: 0
    };

    medMeshStore.addAuditLog(
      'CITIZEN_SELF_REGISTERED',
      newUser.email,
      `Citizen account created via public signup. Mobile OTP & CAPTCHA verified.`,
      200
    );
    medMeshStore.addNotification('Citizen Registration Complete', `Welcome to MedMesh, ${newUser.name}. Your healthcare identity is active.`, 'success');
    notify();
    return { success: true };
  },

  // Admin: Create Hospital Account
  adminCreateHospital: (payload: AdminCreateHospitalPayload) => {
    const tempPassword = `MedHosp@${Math.floor(1000 + Math.random() * 9000)}`;
    const username = payload.hospitalCode.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newHospId = `hosp-${Date.now().toString().slice(-4)}`;
    const newHospital: Hospital = {
      id: newHospId,
      name: payload.hospitalName,
      hospitalCode: payload.hospitalCode,
      type: 'Private',
      districtId: 'dist-chennai',
      district: 'Chennai',
      address: payload.address,
      latitude: 13.05 + (Math.random() - 0.5) * 0.04,
      longitude: 80.24 + (Math.random() - 0.5) * 0.04,
      distanceKm: 3.5,
      rating: 5.0,
      reviewCount: 0,
      verificationStatus: 'verified',
      licenseNumber: payload.licenseNumber,
      phone: payload.contactNumber,
      emergencyPhone: payload.contactNumber,
      image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800',
      specialties: ['General Medicine', 'Trauma & Emergency', 'Cardiology'],
      capacity: {
        id: `cap-${newHospId}`,
        hospitalId: newHospId,
        totalBeds: payload.initialBeds,
        occupiedBeds: 0,
        availableBeds: payload.initialBeds,
        totalIcu: payload.initialIcu,
        occupiedIcu: 0,
        availableIcu: payload.initialIcu,
        totalVentilators: payload.initialVentilators,
        occupiedVentilators: 0,
        availableVentilators: payload.initialVentilators,
        congestion: 'Low',
        updatedAt: 'Provisioned Just now',
        freshnessScore: 100,
        history: [{ time: '00:00', beds: payload.initialBeds, icu: payload.initialIcu, ventilators: payload.initialVentilators }]
      },
      doctors: []
    };

    const newUser: User = {
      id: `usr-hosp-${Date.now().toString().slice(-4)}`,
      name: `${payload.hospitalName} Superintendent`,
      email: payload.hospitalEmail,
      username,
      mobileNumber: payload.contactNumber,
      role: 'HOSPITAL_ADMIN',
      hospitalId: newHospId,
      title: 'Hospital Medical Superintendent',
      isCitizenSelfRegistered: false,
      mustChangePassword: true, // Forces password change on first login!
      temporaryPassword: tempPassword,
      mfaEnabled: true,
      isSuspended: false,
      createdByAdmin: globalState.currentUser?.id || 'usr-adm-1',
      createdAt: new Date().toLocaleDateString(),
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'
    };

    globalState = {
      ...globalState,
      users: [newUser, ...globalState.users],
      hospitals: [newHospital, ...globalState.hospitals]
    };

    medMeshStore.addAuditLog(
      'ADMIN_PROVISIONED_HOSPITAL',
      `${payload.hospitalName} (${payload.hospitalCode})`,
      `Account created for ${payload.hospitalEmail}. Temp password issued. Must change password on first login.`
    );
    medMeshStore.addNotification('Hospital Account Provisioned', `Account created for ${payload.hospitalName}. Invitation dispatched.`, 'success');
    notify();
    return { success: true, username, tempPassword };
  },

  // Admin: Create Driver Account
  adminCreateDriver: (payload: AdminCreateDriverPayload) => {
    const tempPassword = `Driver@${Math.floor(1000 + Math.random() * 9000)}`;
    const username = payload.driverId.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newAmbId = `amb-${Date.now().toString().slice(-4)}`;
    const newAmbulance: Ambulance = {
      id: newAmbId,
      code: payload.ambulanceNumber,
      driverName: payload.driverName,
      driverPhone: payload.contactNumber,
      operatorType: payload.operatorType,
      vehicleType: payload.vehicleType,
      latitude: 13.06,
      longitude: 80.24,
      status: 'Available',
      licenseNumber: payload.licenseNumber,
      equipment: ['Oxygen Cylinders', 'Suction Unit', 'Stretcher']
    };

    const newUser: User = {
      id: `usr-drv-${Date.now().toString().slice(-4)}`,
      name: payload.driverName,
      email: `${username}@108fleet.tn.gov.in`,
      username,
      mobileNumber: payload.contactNumber,
      role: 'AMBULANCE_DRIVER',
      ambulanceId: newAmbId,
      title: 'Emergency Medical Response Driver',
      isCitizenSelfRegistered: false,
      mustChangePassword: true,
      temporaryPassword: tempPassword,
      mfaEnabled: true,
      isSuspended: false,
      createdByAdmin: globalState.currentUser?.id || 'usr-adm-1',
      createdAt: new Date().toLocaleDateString(),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    };

    globalState = {
      ...globalState,
      users: [newUser, ...globalState.users],
      ambulances: [newAmbulance, ...globalState.ambulances]
    };

    medMeshStore.addAuditLog(
      'ADMIN_PROVISIONED_DRIVER',
      `${payload.driverName} (${payload.ambulanceNumber})`,
      `Driver account provisioned. License: ${payload.licenseNumber}`
    );
    notify();
    return { success: true, username, tempPassword };
  },

  // Admin: Create Government Official Account
  adminCreateGovt: (payload: AdminCreateGovtPayload) => {
    const tempPassword = `GovSec@${Math.floor(1000 + Math.random() * 9000)}`;
    const username = payload.officerName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);

    const newUser: User = {
      id: `usr-govt-${Date.now().toString().slice(-4)}`,
      name: payload.officerName,
      email: payload.officialEmail,
      username,
      mobileNumber: payload.contactNumber,
      role: 'GOVERNMENT_OFFICIAL',
      title: `${payload.designation} - ${payload.department}`,
      isCitizenSelfRegistered: false,
      mustChangePassword: true,
      temporaryPassword: tempPassword,
      mfaEnabled: true,
      isSuspended: false,
      createdByAdmin: globalState.currentUser?.id || 'usr-adm-1',
      createdAt: new Date().toLocaleDateString(),
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    };

    globalState = {
      ...globalState,
      users: [newUser, ...globalState.users]
    };

    medMeshStore.addAuditLog(
      'ADMIN_PROVISIONED_GOVT_OFFICER',
      payload.officerName,
      `Government health official credentialed for ${payload.department}`
    );
    notify();
    return { success: true, username, tempPassword };
  },

  // Admin: Create 108 Operator Account
  adminCreateOperator: (payload: AdminCreateOperatorPayload) => {
    const tempPassword = `Op108@${Math.floor(1000 + Math.random() * 9000)}`;
    const username = payload.employeeId.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newUser: User = {
      id: `usr-op-${Date.now().toString().slice(-4)}`,
      name: payload.operatorName,
      email: payload.officialEmail,
      username,
      role: 'OPERATOR_108',
      title: `108 CAD Operator (${payload.controlRoom})`,
      isCitizenSelfRegistered: false,
      mustChangePassword: true,
      temporaryPassword: tempPassword,
      mfaEnabled: true,
      isSuspended: false,
      createdByAdmin: globalState.currentUser?.id || 'usr-adm-1',
      createdAt: new Date().toLocaleDateString(),
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    };

    globalState = {
      ...globalState,
      users: [newUser, ...globalState.users]
    };

    medMeshStore.addAuditLog(
      'ADMIN_PROVISIONED_108_OPERATOR',
      `${payload.operatorName} (${payload.employeeId})`,
      `CAD Dispatch desk terminal provisioned for ${payload.controlRoom}`
    );
    notify();
    return { success: true, username, tempPassword };
  },

  // Admin User Governance Controls
  adminSuspendUser: (userId: string, reason: string = 'Administrative review') => {
    globalState = {
      ...globalState,
      users: globalState.users.map(u => {
        if (u.id !== userId) return u;
        return { ...u, isSuspended: true, suspensionReason: reason };
      })
    };
    const target = globalState.users.find(u => u.id === userId);
    medMeshStore.addAuditLog(
      'USER_ACCOUNT_SUSPENDED',
      target?.email || userId,
      `Account suspended by Admin. Reason: ${reason}`
    );
    notify();
  },

  adminActivateUser: (userId: string) => {
    globalState = {
      ...globalState,
      users: globalState.users.map(u => {
        if (u.id !== userId) return u;
        return { ...u, isSuspended: false, suspensionReason: undefined };
      })
    };
    const target = globalState.users.find(u => u.id === userId);
    medMeshStore.addAuditLog(
      'USER_ACCOUNT_ACTIVATED',
      target?.email || userId,
      `Account reactivated by Admin`
    );
    notify();
  },

  adminResetUserPassword: (userId: string) => {
    const tempPassword = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
    globalState = {
      ...globalState,
      users: globalState.users.map(u => {
        if (u.id !== userId) return u;
        return { ...u, mustChangePassword: true, temporaryPassword: tempPassword };
      })
    };
    const target = globalState.users.find(u => u.id === userId);
    medMeshStore.addAuditLog(
      'USER_PASSWORD_RESET_BY_ADMIN',
      target?.email || userId,
      `Temporary password generated. Flagged mustChangePassword = true.`
    );
    notify();
    return tempPassword;
  },

  adminForceLogout: (userId: string) => {
    const target = globalState.users.find(u => u.id === userId);
    medMeshStore.addAuditLog(
      'USER_FORCE_LOGOUT',
      target?.email || userId,
      `All active user sessions revoked by Superadmin`
    );
    notify();
  },

  // First Login Completion Flow
  completeFirstLogin: (newPassword: string, mfaCode: string) => {
    const user = globalState.firstLoginPendingUser;
    if (!user) return { success: false, error: 'No pending first login session.' };

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      return { success: false, error: 'MFA Code must be 6 digits.' };
    }

    const updatedUsers = globalState.users.map(u => {
      if (u.id !== user.id) return u;
      return {
        ...u,
        mustChangePassword: false,
        temporaryPassword: undefined,
        mfaEnabled: true
      };
    });

    const targetDashboard = ROLE_ROUTE_MAP[user.role];
    globalState = {
      ...globalState,
      users: updatedUsers,
      currentUser: { ...user, mustChangePassword: false, temporaryPassword: undefined },
      currentRole: user.role,
      isAuthenticated: true,
      currentPath: targetDashboard,
      firstLoginPendingUser: null,
      authToken: `jwt.active.${user.id}.${Date.now()}`,
      sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString()
    };

    medMeshStore.addAuditLog(
      'FIRST_LOGIN_SETUP_COMPLETED',
      user.email,
      `Password updated, MFA activated, and compliance terms accepted for [${user.role}]. Redirected to ${targetDashboard}`
    );
    medMeshStore.addNotification('Account Setup Complete', `Your operational credentials and 2FA are certified. Welcome, ${user.name}.`, 'success');
    notify();
    return { success: true };
  },

  // Login System (Requirement: Single Login Page, Credentials -> Role -> JWT -> Assigned Dashboard)
  login: (emailOrUsername: string, password: string, rememberMe: boolean = false) => {
    const input = emailOrUsername.trim().toLowerCase();
    const user = globalState.users.find(
      u => u.email.toLowerCase() === input || u.username.toLowerCase() === input
    );

    if (!user) {
      const attempts = globalState.failedLoginAttempts + 1;
      globalState = {
        ...globalState,
        failedLoginAttempts: attempts,
        isCaptchaRequired: attempts >= 3
      };
      medMeshStore.addAuditLog('AUTH_LOGIN_FAILED', emailOrUsername, `User not found. Attempts: ${attempts}`, 401);
      notify();
      return { success: false, error: 'Invalid credentials. User not registered.' };
    }

    // Check account suspension
    if (user.isSuspended) {
      medMeshStore.addAuditLog('AUTH_LOGIN_BLOCKED_SUSPENDED', user.email, `Attempted login on suspended account`, 403);
      return { success: false, error: `Account suspended by Administrator: ${user.suspensionReason || 'Access restricted'}.` };
    }

    // Password Check: matches temporary password OR default testing password 'Password123!'
    const isValidPass =
      (user.temporaryPassword && password === user.temporaryPassword) ||
      password === 'Password123!' ||
      password === 'password' ||
      password === 'admin';

    if (!isValidPass) {
      const attempts = globalState.failedLoginAttempts + 1;
      globalState = {
        ...globalState,
        failedLoginAttempts: attempts,
        isCaptchaRequired: attempts >= 3
      };
      medMeshStore.addAuditLog('AUTH_LOGIN_FAILED', user.email, `Password mismatch. Attempts: ${attempts}`, 401);
      notify();
      return { success: false, error: 'Incorrect password.' };
    }

    // First Login Check: Admin-created accounts with temporary password
    if (user.mustChangePassword) {
      globalState = {
        ...globalState,
        firstLoginPendingUser: user
      };
      notify();
      return { success: true, mustChangePassword: true };
    }

    // MFA Check: for non-citizen roles
    if (user.mfaEnabled || user.role !== 'USER') {
      globalState = {
        ...globalState,
        mfaPendingUser: user,
        mfaTempToken: `mfa-temp-${Date.now()}`,
        rememberMe
      };
      notify();
      return { success: true, mfaRequired: true };
    }

    // Standard citizen login (all other roles proceed via MFA and initialize shift in verifyMfa)
    const targetDashboard = ROLE_ROUTE_MAP[user.role];
    globalState = {
      ...globalState,
      isAuthenticated: true,
      currentUser: user,
      currentRole: user.role,
      activeAmbulanceId: user.ambulanceId || globalState.activeAmbulanceId,
      activeHospitalId: user.hospitalId || globalState.activeHospitalId,
      currentPath: targetDashboard,
      attemptedUnauthorizedPath: null,
      authToken: `jwt.${user.id}.${Date.now()}`,
      sessionExpiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 3600 * 1000 : 15 * 60 * 1000)).toLocaleTimeString(),
      failedLoginAttempts: 0,
      isCaptchaRequired: false,
      mfaPendingUser: null,
      firstLoginPendingUser: null,
      rememberMe
    };

    medMeshStore.addAuditLog(
      'AUTH_LOGIN_SUCCESS',
      user.email,
      `Authenticated as [${user.role}]. Redirecting to ${targetDashboard}`,
      200
    );

    notify();
    return { success: true, targetPath: targetDashboard };
  },

  verifyMfa: (code: string) => {
    if (!globalState.mfaPendingUser) {
      return { success: false, error: 'No active MFA challenge.' };
    }
    if (!/^\d{6}$/.test(code.trim())) {
      return { success: false, error: 'Enter a valid 6-digit TOTP code.' };
    }

    const user = globalState.mfaPendingUser;
    const targetDashboard = ROLE_ROUTE_MAP[user.role];

    let updatedAmbulances = globalState.ambulances;
    let targetAmbId = user.ambulanceId || globalState.activeAmbulanceId;
    if (user.role === 'AMBULANCE_DRIVER') {
      const amb = globalState.ambulances.find(a => a.id === user.ambulanceId || a.driverUserId === user.id);
      if (amb) {
        targetAmbId = amb.id;
        updatedAmbulances = globalState.ambulances.map(a =>
          a.id === amb.id && a.status === 'Offline' ? { ...a, status: 'Available' } : a
        );
      }
    }

    globalState = {
      ...globalState,
      isAuthenticated: true,
      currentUser: user,
      currentRole: user.role,
      activeAmbulanceId: targetAmbId,
      activeHospitalId: user.hospitalId || globalState.activeHospitalId,
      ambulances: updatedAmbulances,
      currentPath: targetDashboard,
      attemptedUnauthorizedPath: null,
      authToken: `jwt.mfa.${user.id}.${Date.now()}`,
      sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString(),
      failedLoginAttempts: 0,
      isCaptchaRequired: false,
      mfaPendingUser: null
    };

    if (user.role === 'AMBULANCE_DRIVER') {
      const amb = updatedAmbulances.find(a => a.id === targetAmbId);
      medMeshStore.addAuditLog(
        'PILOT_LOGIN',
        user.email,
        `Pilot [${user.name}] (${user.id}) MFA verified. Logged into 108 Mobile MDT. Badge: ${user.badgeNumber || 'EMS-108'}`,
        200
      );
      medMeshStore.addAuditLog(
        'PILOT_SHIFT_START',
        `${user.name} -> ${amb?.code || targetAmbId}`,
        `Pilot [${user.name}] clocked in for shift. Vehicle ${amb?.code || targetAmbId} assigned. Sector: ${amb?.districtName || 'Sector Patrol'}.`,
        200
      );
    } else {
      medMeshStore.addAuditLog('AUTH_MFA_SUCCESS', user.email, `MFA verified for [${user.role}]`, 200);
    }

    notify();
    return { success: true, targetPath: targetDashboard };
  },

  logout: () => {
    const user = globalState.currentUser;
    const userEmail = user?.email || 'user';

    if (user && user.role === 'AMBULANCE_DRIVER') {
      const amb = globalState.ambulances.find(a => a.id === user.ambulanceId || a.driverUserId === user.id);
      medMeshStore.addAuditLog(
        'PILOT_SHIFT_END',
        `${user.name} -> ${amb?.code || 'Unit'}`,
        `Pilot [${user.name}] concluded duty shift on vehicle ${amb?.code || 'Patrol Unit'}. Handover sign-off recorded.`,
        200
      );
      medMeshStore.addAuditLog(
        'PILOT_LOGOUT',
        user.email,
        `Pilot [${user.name}] (${user.id}) logged out. MDT terminal session terminated.`,
        200
      );
    } else {
      medMeshStore.addAuditLog('AUTH_LOGOUT', userEmail, 'Session revoked. Token invalidated.', 200);
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
      window.history.replaceState(null, '', '/login');
    } catch (e) {
      console.error('Storage clear error', e);
    }

    globalState = {
      ...globalState,
      isAuthenticated: false,
      currentUser: null,
      currentRole: 'USER',
      currentPath: '/login',
      attemptedUnauthorizedPath: null,
      authToken: null,
      sessionExpiresAt: null,
      mfaPendingUser: null,
      firstLoginPendingUser: null,
      rememberMe: false
    };
    notify();
  },

  // Developer Test Identity Switcher (Strictly available only in development mode)
  devSwitchUser: (targetUserId: string) => {
    if (!import.meta.env.DEV) {
      console.error('devSwitchUser is strictly forbidden in production mode.');
      return { success: false, error: 'Identity switching forbidden in production without re-authentication.' };
    }

    const targetUser = globalState.users.find(u => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Target user account not found.' };
    }

    const previousUser = globalState.currentUser;

    // Conclude shift for previous pilot if applicable
    if (previousUser && previousUser.role === 'AMBULANCE_DRIVER') {
      const prevAmb = globalState.ambulances.find(a => a.id === previousUser.ambulanceId || a.driverUserId === previousUser.id);
      medMeshStore.addAuditLog(
        'PILOT_SHIFT_END',
        `${previousUser.name} -> ${prevAmb?.code || 'Unit'}`,
        `[DEV SWITCH] Pilot [${previousUser.name}] shift concluded for developer identity switch.`,
        200
      );
    }

    // Determine target ambulance
    let targetAmbId = targetUser.ambulanceId || globalState.activeAmbulanceId;
    let updatedAmbulances = globalState.ambulances;

    if (targetUser.role === 'AMBULANCE_DRIVER') {
      const amb = globalState.ambulances.find(a => a.id === targetUser.ambulanceId || a.driverUserId === targetUser.id);
      if (amb) {
        targetAmbId = amb.id;
        updatedAmbulances = globalState.ambulances.map(a =>
          a.id === amb.id && a.status === 'Offline' ? { ...a, status: 'Available' } : a
        );
      }
      const activeAmb = updatedAmbulances.find(a => a.id === targetAmbId);
      medMeshStore.addAuditLog(
        'PILOT_SHIFT_START',
        `${targetUser.name} -> ${activeAmb?.code || targetAmbId}`,
        `[DEV SWITCH] Pilot [${targetUser.name}] clocked in on unit ${activeAmb?.code || targetAmbId}. Telemetry active.`,
        200
      );
    }

    const targetDashboard = ROLE_ROUTE_MAP[targetUser.role] || '/login';

    globalState = {
      ...globalState,
      isAuthenticated: true,
      currentUser: targetUser,
      currentRole: targetUser.role,
      activeAmbulanceId: targetAmbId,
      activeHospitalId: targetUser.hospitalId || globalState.activeHospitalId,
      ambulances: updatedAmbulances,
      currentPath: targetDashboard,
      attemptedUnauthorizedPath: null,
      authToken: `jwt.dev.${targetUser.id}.${Date.now()}`,
      sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString(),
      failedLoginAttempts: 0,
      isCaptchaRequired: false,
      mfaPendingUser: null,
      firstLoginPendingUser: null
    };

    medMeshStore.addAuditLog(
      'DEV_IDENTITY_SWITCHED',
      `${previousUser?.name || 'Anon'} -> ${targetUser.name}`,
      `[DEV MODE] Switched active identity to ${targetUser.name} [${targetUser.role}]. Redirected to ${targetDashboard}`,
      200
    );

    notify();
    return { success: true, targetPath: targetDashboard };
  },

  setActiveHospital: (hospitalId: string) => {
    globalState = { ...globalState, activeHospitalId: hospitalId };
    notify();
  },

  setActiveAmbulance: (ambulanceId: string) => {
    globalState = { ...globalState, activeAmbulanceId: ambulanceId };
    notify();
  },

  addNotification: (title: string, message: string, type: AppNotification['type'] = 'info') => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    globalState = {
      ...globalState,
      notifications: [newNotif, ...globalState.notifications.slice(0, 8)]
    };
    notify();
  },

  incrementBed: (hospitalId: string, delta: number) => {
    const targetHosp = globalState.hospitals.find(h => h.id === hospitalId);
    if (!targetHosp) return;
    const newAvail = Math.max(0, Math.min(targetHosp.capacity.totalBeds, targetHosp.capacity.availableBeds + delta));
    const newOcc = targetHosp.capacity.totalBeds - newAvail;
    const nowIso = new Date().toISOString();

    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          capacity: {
            ...h.capacity,
            availableBeds: newAvail,
            occupiedBeds: newOcc,
            updatedAt: nowIso,
            freshnessScore: 100
          }
        };
      })
    };

    const isCritical = newAvail === 0;
    const summary = isCritical
      ? `🚨 RED ALERT: ${targetHosp.name} is at 100% bed capacity (0 available beds)! Emergency diversion active.`
      : `⚡ ${targetHosp.name}: Available beds updated to ${newAvail} (${delta > 0 ? '+' + delta : delta})`;

    realtimeEventBus.publish(
      'hospital:capacity:updated',
      { hospitalId, availableBeds: newAvail, delta, previousBeds: targetHosp.capacity.availableBeds },
      {
        hospitalId,
        hospitalName: targetHosp.name,
        districtId: targetHosp.districtId,
        summary,
        severity: isCritical ? 'critical' : 'success'
      }
    );

    medMeshStore.addAuditLog(
      delta > 0 ? 'CAPACITY_BEDS_INCREASED' : 'CAPACITY_BEDS_DECREASED',
      `${targetHosp.name}`,
      `Available Beds changed by ${delta > 0 ? '+' + delta : delta} by ${globalState.currentUser?.name || 'Staff'}`
    );
    notify();
  },

  setIcuFull: (hospitalId: string) => {
    const targetHosp = globalState.hospitals.find(h => h.id === hospitalId);
    if (!targetHosp) return;
    const nowIso = new Date().toISOString();

    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          capacity: {
            ...h.capacity,
            availableIcu: 0,
            occupiedIcu: h.capacity.totalIcu,
            updatedAt: nowIso,
            freshnessScore: 100
          }
        };
      })
    };

    realtimeEventBus.publish(
      'hospital:capacity:updated',
      { hospitalId, availableIcu: 0 },
      {
        hospitalId,
        hospitalName: targetHosp.name,
        districtId: targetHosp.districtId,
        summary: `🚨 RED ALERT: ${targetHosp.name} ICU is FULL (0 critical care beds available)! ICU diversion active.`,
        severity: 'critical'
      }
    );

    medMeshStore.addAuditLog('CAPACITY_ICU_FULL', targetHosp.name, 'Emergency diversion status triggered for ICU patients');
    medMeshStore.addNotification('ICU Capacity Alert', `${targetHosp.name} ICU is now at 100% capacity.`, 'warning');
    notify();
  },

  setVentilatorFull: (hospitalId: string) => {
    const targetHosp = globalState.hospitals.find(h => h.id === hospitalId);
    if (!targetHosp) return;
    const nowIso = new Date().toISOString();

    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          capacity: {
            ...h.capacity,
            availableVentilators: 0,
            occupiedVentilators: h.capacity.totalVentilators,
            updatedAt: nowIso,
            freshnessScore: 100
          }
        };
      })
    };

    realtimeEventBus.publish(
      'hospital:capacity:updated',
      { hospitalId, availableVentilators: 0 },
      {
        hospitalId,
        hospitalName: targetHosp.name,
        districtId: targetHosp.districtId,
        summary: `⚠️ ALERT: ${targetHosp.name} ventilators are completely occupied (0 available).`,
        severity: 'warning'
      }
    );

    medMeshStore.addAuditLog('CAPACITY_VENTILATOR_FULL', targetHosp.name, 'Critical respiratory equipment at zero available');
    medMeshStore.addNotification('Ventilator Alert', `${targetHosp.name} ventilators are completely occupied.`, 'warning');
    notify();
  },

  setCongestion: (hospitalId: string, level: CongestionLevel) => {
    const targetHosp = globalState.hospitals.find(h => h.id === hospitalId);
    if (!targetHosp) return;
    const nowIso = new Date().toISOString();

    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          capacity: {
            ...h.capacity,
            congestion: level,
            updatedAt: nowIso,
            freshnessScore: 100
          }
        };
      })
    };

    realtimeEventBus.publish(
      'hospital:congestion:changed',
      { hospitalId, congestion: level },
      {
        hospitalId,
        hospitalName: targetHosp.name,
        districtId: targetHosp.districtId,
        summary: level === 'Critical'
          ? `🚨 CRITICAL CONGESTION: ${targetHosp.name} Emergency Department overwhelmed!`
          : `⚡ ${targetHosp.name}: ED Congestion updated to ${level}`,
        severity: level === 'Critical' ? 'critical' : level === 'High' ? 'warning' : 'normal'
      }
    );

    medMeshStore.addAuditLog(`CAPACITY_CONGESTION_${level.toUpperCase()}`, targetHosp.name, `Triage queue updated to ${level}`);
    notify();
  },

  updateCapacityFull: (
    hospitalId: string,
    availBeds: number,
    availIcu: number,
    availVentilators: number,
    congestion: CongestionLevel
  ) => {
    const targetHosp = globalState.hospitals.find(h => h.id === hospitalId);
    if (!targetHosp) return;
    const totalBeds = targetHosp.capacity.totalBeds;
    const totalIcu = targetHosp.capacity.totalIcu;
    const totalVentilators = targetHosp.capacity.totalVentilators;

    const safeBeds = Math.max(0, Math.min(totalBeds, availBeds));
    const safeIcu = Math.max(0, Math.min(totalIcu, availIcu));
    const safeVents = Math.max(0, Math.min(totalVentilators, availVentilators));
    const nowIso = new Date().toISOString();

    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          capacity: {
            ...h.capacity,
            availableBeds: safeBeds,
            occupiedBeds: totalBeds - safeBeds,
            availableIcu: safeIcu,
            occupiedIcu: totalIcu - safeIcu,
            availableVentilators: safeVents,
            occupiedVentilators: totalVentilators - safeVents,
            congestion,
            updatedAt: nowIso,
            freshnessScore: 100
          }
        };
      })
    };

    const isCritical = safeBeds === 0 || safeIcu === 0 || congestion === 'Critical';

    realtimeEventBus.publish(
      'hospital:capacity:updated',
      { hospitalId, availableBeds: safeBeds, availableIcu: safeIcu, availableVentilators: safeVents, congestion },
      {
        hospitalId,
        hospitalName: targetHosp.name,
        districtId: targetHosp.districtId,
        summary: isCritical
          ? `🚨 RED ALERT: ${targetHosp.name} verified full capacity / critical triage queue!`
          : `⚡ ${targetHosp.name}: Full capacity telemetry published (Beds: ${safeBeds}, ICU: ${safeIcu}, Vents: ${safeVents})`,
        severity: isCritical ? 'critical' : 'success'
      }
    );

    medMeshStore.addAuditLog('CAPACITY_FULL_UPDATE', targetHosp.name, `Beds: ${availBeds}, ICU: ${availIcu}, Vents: ${availVentilators}, Congestion: ${congestion}`);
    medMeshStore.addNotification('Capacity Published', `${targetHosp.name} capacity verified and broadcasted to 108 network.`, 'success');
    notify();
  },

  toggleDoctorDuty: (hospitalId: string, doctorId: string) => {
    let docName = '';
    let nowOnDuty = false;
    const targetHosp = globalState.hospitals.find(h => h.id === hospitalId);

    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          doctors: h.doctors.map(d => {
            if (d.id !== doctorId) return d;
            docName = d.name;
            nowOnDuty = !d.onDuty;
            return { ...d, onDuty: !d.onDuty };
          })
        };
      })
    };

    realtimeEventBus.publish(
      'doctor:duty:toggled',
      { hospitalId, doctorId, onDuty: nowOnDuty, doctorName: docName },
      {
        hospitalId,
        hospitalName: targetHosp?.name,
        districtId: targetHosp?.districtId,
        entityId: doctorId,
        summary: `🩺 ${docName} (${targetHosp?.name}) shift updated to ${nowOnDuty ? 'AVAILABLE ON DUTY' : 'OFF DUTY'}`,
        severity: nowOnDuty ? 'success' : 'normal'
      }
    );

    medMeshStore.addAuditLog(
      nowOnDuty ? 'DOCTOR_DUTY_CLOCK_IN' : 'DOCTOR_DUTY_CLOCK_OUT',
      `${docName} - ${targetHosp?.name}`,
      `Roster shift status changed to ${nowOnDuty ? 'ON DUTY' : 'OFF DUTY'}`
    );
    notify();
  },

  createIncident: (
    category: Incident['category'],
    locationName: string,
    notes?: string,
    patientName?: string,
    districtId?: string
  ) => {
    const targetDistrictId = districtId || (globalState.selectedDistrictId !== 'all' ? globalState.selectedDistrictId : 'dist-karur');
    const dist = globalState.districts.find(d => d.id === targetDistrictId) || globalState.districts[0];

    const baseLat = dist?.latitude || 10.9601;
    const baseLng = dist?.longitude || 78.0766;

    const newIncident: Incident = {
      id: `inc-${Date.now().toString().slice(-4)}`,
      category,
      patientName: patientName || 'Unidentified Emergency Patient',
      locationName,
      latitude: baseLat + (Math.random() - 0.5) * 0.04,
      longitude: baseLng + (Math.random() - 0.5) * 0.04,
      districtId: dist?.id,
      districtName: dist?.name,
      urgency: 'Critical',
      status: 'Pending',
      etaMinutes: 10,
      reportedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bedReserved: false,
      notes: notes || 'Dispatched via 108 Emergency Operator console.'
    };

    globalState = {
      ...globalState,
      incidents: [newIncident, ...globalState.incidents]
    };

    realtimeEventBus.publish(
      'incident:created',
      newIncident,
      {
        districtId: dist?.id,
        summary: `🚨 New 108 Emergency Incident #${newIncident.id} (${category}) at ${locationName}`,
        severity: 'critical'
      }
    );

    medMeshStore.addAuditLog('INCIDENT_CREATED', `#${newIncident.id} (${category})`, `Location: ${locationName} [${dist?.name || ''}]`);
    medMeshStore.addNotification('New Emergency Incident', `Category: ${category} at ${locationName} (${dist?.name || ''}). Ready for Smart Hospital Matching.`, 'emergency');
    notify();
    return newIncident.id;
  },

  // =========================================================================
  // AMBULANCE ASSIGNMENT LIFECYCLE (Dedicated Ownership Model & 120s Timer)
  // =========================================================================

  createAmbulanceAssignment: (incidentId: string, ambulanceId: string, dispatcherId?: string) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    const amb = globalState.ambulances.find(a => a.id === ambulanceId);
    if (!inc || !amb) return null;

    const driverUser = globalState.users.find(u => u.ambulanceId === ambulanceId || u.name === amb.driverName);
    const dispatcher = globalState.users.find(u => u.id === dispatcherId) || globalState.currentUser;

    const assignmentId = `asg-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 120 * 1000).toISOString(); // Strict 2-minute timer

    const newAssignment: AmbulanceAssignment = {
      id: assignmentId,
      incidentId,
      incidentNumber: inc.id,
      ambulanceId,
      ambulanceCode: amb.code,
      pilotId: driverUser?.id || `usr-pilot-${amb.id}`,
      pilotName: driverUser?.name || amb.driverName,
      assignedByDispatcherId: dispatcher?.id || 'usr-op-1',
      dispatcherName: dispatcher?.name || '108 CAD Dispatcher',
      status: 'ASSIGNED',
      assignedAt: nowIso,
      expiresAt: expiresIso
    };

    globalState = {
      ...globalState,
      assignments: [newAssignment, ...globalState.assignments.filter(a => a.incidentId !== incidentId || a.status !== 'ASSIGNED')],
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          status: 'ASSIGNED',
          assignedAmbulanceId: ambulanceId,
          assignedAmbulanceCode: amb.code,
          activeAssignmentId: assignmentId,
          assignedAt: nowIso,
          etaMinutes: Math.floor(Math.random() * 5) + 4
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== ambulanceId) return a;
        return {
          ...a,
          status: 'Assigned',
          currentIncidentId: incidentId
        };
      })
    };

    // Emit targeted real-time event STRICTLY to Room: "ambulance_{ambulanceId}"
    realtimeEventBus.publish(
      'assignment:created',
      newAssignment,
      {
        room: `ambulance_${ambulanceId}`,
        districtId: inc.districtId,
        summary: `🚨 Emergency Assignment: Unit ${amb.code} allocated to ${inc.category} at ${inc.locationName}`,
        severity: 'critical'
      }
    );

    // Also notify dispatcher channel
    realtimeEventBus.publish(
      'incident:dispatched',
      { incidentId, ambulanceId, assignmentId, ambulanceCode: amb.code },
      {
        room: `dispatcher_district_${inc.districtId || 'all'}`,
        summary: `⚡ Dispatcher Assigned Unit ${amb.code} to Call #${incidentId}`,
        severity: 'success'
      }
    );

    medMeshStore.addAuditLog(
      'DISPATCHER_ASSIGNED_CASE',
      `Unit ${amb.code} -> Incident #${incidentId}`,
      `Dispatcher [${dispatcher?.name || 'Operator'}] created assignment ${assignmentId} for Pilot [${newAssignment.pilotName}]. 120s timer active.`
    );

    medMeshStore.addNotification(
      'Emergency Unit Dispatched',
      `Unit ${amb.code} alerted. 2-minute acceptance countdown initiated.`,
      'success'
    );

    notify();
    return newAssignment;
  },

  acceptAssignment: (assignmentId: string, gpsCoords?: { latitude: number; longitude: number }) => {
    const asg = globalState.assignments.find(a => a.id === assignmentId);
    if (!asg || asg.status !== 'ASSIGNED') return;

    const inc = globalState.incidents.find(i => i.id === asg.incidentId);
    const amb = globalState.ambulances.find(a => a.id === asg.ambulanceId);
    const nowIso = new Date().toISOString();

    const currentPilot = globalState.currentUser;
    const effectivePilotId = currentPilot?.role === 'AMBULANCE_DRIVER' ? currentPilot.id : asg.pilotId;
    const effectivePilotName = currentPilot?.role === 'AMBULANCE_DRIVER' ? currentPilot.name : asg.pilotName;

    const updatedLat = gpsCoords?.latitude || amb?.latitude || 13.0827;
    const updatedLng = gpsCoords?.longitude || amb?.longitude || 80.2707;

    globalState = {
      ...globalState,
      assignments: globalState.assignments.map(a => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          pilotId: effectivePilotId,
          pilotName: effectivePilotName,
          status: 'ACCEPTED',
          acceptedAt: nowIso
        };
      }),
      incidents: globalState.incidents.map(i => {
        if (i.id !== asg.incidentId) return i;
        return {
          ...i,
          status: 'ACCEPTED',
          acceptedAt: nowIso
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== asg.ambulanceId) return a;
        return {
          ...a,
          status: 'En Route',
          currentIncidentId: asg.incidentId,
          latitude: updatedLat,
          longitude: updatedLng
        };
      })
    };

    realtimeEventBus.publish(
      'assignment:accepted',
      {
        assignmentId,
        incidentId: asg.incidentId,
        ambulanceId: asg.ambulanceId,
        pilotId: effectivePilotId,
        pilotName: effectivePilotName,
        driverGps: { latitude: updatedLat, longitude: updatedLng }
      },
      {
        room: `dispatcher_district_${inc?.districtId || 'all'}`,
        summary: `✅ Pilot [${effectivePilotName}] Accepted Call #${asg.incidentId}. Unit ${asg.ambulanceCode} en route to scene.`,
        severity: 'success'
      }
    );

    medMeshStore.addAuditLog(
      'DRIVER_ACCEPTED_ASSIGNMENT',
      `Assignment #${assignmentId}`,
      `Pilot [${effectivePilotName}] (${effectivePilotId}) accepted response within 120s timer on Unit ${asg.ambulanceCode}.`
    );

    notify();
  },

  rejectAssignment: (assignmentId: string, reason: string = 'Driver declined / vehicle maintenance') => {
    const asg = globalState.assignments.find(a => a.id === assignmentId);
    if (!asg) return;

    const inc = globalState.incidents.find(i => i.id === asg.incidentId);
    const nowIso = new Date().toISOString();

    globalState = {
      ...globalState,
      assignments: globalState.assignments.map(a => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          status: 'REJECTED',
          rejectionReason: reason,
          rejectedAt: nowIso
        };
      }),
      incidents: globalState.incidents.map(i => {
        if (i.id !== asg.incidentId) return i;
        return {
          ...i,
          status: 'PENDING_DISPATCH',
          assignedAmbulanceId: undefined,
          assignedAmbulanceCode: undefined,
          activeAssignmentId: undefined
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== asg.ambulanceId) return a;
        return {
          ...a,
          status: 'Available',
          currentIncidentId: undefined
        };
      })
    };

    realtimeEventBus.publish(
      'assignment:rejected',
      {
        assignmentId,
        incidentId: asg.incidentId,
        ambulanceId: asg.ambulanceId,
        reason
      },
      {
        room: `dispatcher_district_${inc?.districtId || 'all'}`,
        summary: `⚠️ Driver Declined Call #${asg.incidentId} (${asg.ambulanceCode}): ${reason}. Re-queued to CAD.`,
        severity: 'warning'
      }
    );

    medMeshStore.addAuditLog(
      'DRIVER_REJECTED_ASSIGNMENT',
      `Assignment #${assignmentId}`,
      `Driver [${asg.pilotName}] rejected response. Reason: ${reason}`
    );

    notify();
  },

  expireAssignment: (assignmentId: string) => {
    const asg = globalState.assignments.find(a => a.id === assignmentId);
    if (!asg || asg.status !== 'ASSIGNED') return;

    const inc = globalState.incidents.find(i => i.id === asg.incidentId);

    globalState = {
      ...globalState,
      assignments: globalState.assignments.map(a => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          status: 'EXPIRED'
        };
      }),
      incidents: globalState.incidents.map(i => {
        if (i.id !== asg.incidentId) return i;
        return {
          ...i,
          status: 'PENDING_DISPATCH',
          assignedAmbulanceId: undefined,
          assignedAmbulanceCode: undefined,
          activeAssignmentId: undefined
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== asg.ambulanceId) return a;
        return {
          ...a,
          status: 'Available',
          currentIncidentId: undefined
        };
      })
    };

    // Emit to ambulance room to dismiss alert card
    realtimeEventBus.publish(
      'assignment:expired',
      { assignmentId, incidentId: asg.incidentId, ambulanceId: asg.ambulanceId },
      {
        room: `ambulance_${asg.ambulanceId}`,
        summary: `Turnout window expired (2 minutes). Returning to Standby.`,
        severity: 'warning'
      }
    );

    // Emit to dispatcher room with alert
    realtimeEventBus.publish(
      'assignment:expired',
      { assignmentId, incidentId: asg.incidentId, ambulanceId: asg.ambulanceId },
      {
        room: `dispatcher_district_${inc?.districtId || 'all'}`,
        summary: `🚨 Turnout Expired: Unit ${asg.ambulanceCode} did not respond within 120s. Returned to dispatch queue.`,
        severity: 'critical'
      }
    );

    medMeshStore.addAuditLog(
      'ASSIGNMENT_EXPIRED_TIMEOUT',
      `Assignment #${assignmentId}`,
      `2-minute SLA elapsed for ${asg.ambulanceCode}. Incident #${asg.incidentId} returned to pending dispatch.`
    );

    notify();
  },

  getActiveAssignmentForAmbulance: (ambulanceId: string): AmbulanceAssignment | null => {
    return globalState.assignments.find(
      a => a.ambulanceId === ambulanceId && (a.status === 'ASSIGNED' || a.status === 'ACCEPTED')
    ) || null;
  },

  getActiveIncidentForAmbulance: (ambulanceId: string): Incident | null => {
    const activeAsg = medMeshStore.getActiveAssignmentForAmbulance(ambulanceId);
    if (!activeAsg) return null;
    return globalState.incidents.find(
      i => i.id === activeAsg.incidentId && i.status !== 'Completed' && i.status !== 'CLOSED'
    ) || null;
  },

  dispatchIncident: (incidentId: string, hospitalId: string, ambulanceId: string) => {
    // Automatically creates an AmbulanceAssignment record!
    medMeshStore.createAmbulanceAssignment(incidentId, ambulanceId);
  },

  acceptIncident: (incidentId: string, gpsCoords?: { latitude: number; longitude: number }) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc) return;

    const amb = globalState.ambulances.find(
      a => a.id === inc.assignedAmbulanceId || a.code === inc.assignedAmbulanceCode || a.currentIncidentId === incidentId
    ) || globalState.ambulances[0];

    const updatedLat = gpsCoords?.latitude || amb.latitude;
    const updatedLng = gpsCoords?.longitude || amb.longitude;

    globalState = {
      ...globalState,
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          status: 'En Route',
          acceptedAt: new Date().toISOString(),
          assignedHospitalId: undefined,
          assignedHospitalName: undefined,
          patientOnboardAt: undefined,
          arrivedSceneAt: undefined,
          arrivedHospitalAt: undefined,
          completedAt: undefined,
          etaMinutes: Math.max(2, i.etaMinutes || 6)
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== amb.id) return a;
        return {
          ...a,
          status: 'En Route',
          currentIncidentId: incidentId,
          assignedHospitalId: undefined,
          latitude: updatedLat,
          longitude: updatedLng
        };
      })
    };

    realtimeEventBus.publish(
      'incident:step:advanced',
      { incidentId, status: 'En Route', category: inc.category },
      {
        summary: `🚨 Driver Accepted Emergency Call #${incidentId}. Ambulance ${amb.code} en route to scene with siren active.`,
        severity: 'critical'
      }
    );

    if (gpsCoords) {
      realtimeEventBus.publish(
        'ambulance:location:updated',
        { ambulanceId: amb.id, latitude: updatedLat, longitude: updatedLng },
        {
          summary: `📍 GPS Fix acquired for Unit ${amb.code}: [${updatedLat.toFixed(4)}, ${updatedLng.toFixed(4)}]`,
          severity: 'normal'
        }
      );
    }

    medMeshStore.addAuditLog(
      'DISPATCH_ACCEPTED',
      `Incident #${incidentId}`,
      `Driver confirmed response. Ambulance ${amb.code} en route to ${inc.locationName}.`
    );
    medMeshStore.addNotification('Dispatch Call Accepted', `En route to ${inc.locationName}. Siren active.`, 'success');
    notify();
  },

  autoReassignIncident: (incidentId: string, currentAmbulanceId: string, reason: string = 'Driver declined / 30s Timeout') => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc) return;

    const currentAmb = globalState.ambulances.find(a => a.id === currentAmbulanceId);

    // Find other available ambulances in the same district
    const targetDistrictId = inc.districtId || currentAmb?.districtId || globalState.selectedDistrictId;
    const backupAmbulances = globalState.ambulances
      .filter(a => a.id !== currentAmbulanceId && (a.status === 'Available' || a.status === 'Offline') && (!targetDistrictId || targetDistrictId === 'all' || a.districtId === targetDistrictId))
      .map(a => {
        const dist = Math.sqrt(Math.pow((a.latitude - inc.latitude) * 111, 2) + Math.pow((a.longitude - inc.longitude) * 111, 2));
        return { ambulance: a, distance: dist };
      })
      .sort((a, b) => a.distance - b.distance);

    if (backupAmbulances.length > 0) {
      const nextAmb = backupAmbulances[0].ambulance;
      const distKm = backupAmbulances[0].distance.toFixed(1);

      globalState = {
        ...globalState,
        incidents: globalState.incidents.map(i => {
          if (i.id !== incidentId) return i;
          return {
            ...i,
            status: 'Assigned',
            assignedAmbulanceId: nextAmb.id,
            assignedAmbulanceCode: nextAmb.code,
            assignedAt: new Date().toISOString()
          };
        }),
        ambulances: globalState.ambulances.map(a => {
          if (a.id === currentAmbulanceId) {
            return { ...a, status: 'Available', currentIncidentId: undefined };
          }
          if (a.id === nextAmb.id) {
            return { ...a, status: 'Assigned', currentIncidentId: incidentId };
          }
          return a;
        })
      };

      realtimeEventBus.publish(
        'incident:reassigned',
        {
          incidentId,
          previousAmbulanceId: currentAmbulanceId,
          previousAmbulanceCode: currentAmb?.code,
          newAmbulanceId: nextAmb.id,
          newAmbulanceCode: nextAmb.code,
          reason
        },
        {
          districtId: targetDistrictId,
          summary: `⚡ 30s Auto-Reassign: Call #${incidentId} transferred from ${currentAmb?.code || 'Unit'} to ${nextAmb.code} (${distKm} km away).`,
          severity: 'warning'
        }
      );

      medMeshStore.addAuditLog(
        'DISPATCH_AUTO_REASSIGNED',
        `Incident #${incidentId}`,
        `${currentAmb?.code} timed out / declined. Reassigned to nearest standby unit ${nextAmb.code} (${distKm} km).`
      );
      medMeshStore.addNotification('Call Auto-Reassigned', `Call #${incidentId} transferred to ${nextAmb.code} (${distKm} km away). Unit ready for new calls.`, 'warning');
    } else {
      // No backup units available in district -> return to Pending
      globalState = {
        ...globalState,
        incidents: globalState.incidents.map(i => {
          if (i.id !== incidentId) return i;
          return {
            ...i,
            status: 'Pending',
            assignedAmbulanceId: undefined,
            assignedAmbulanceCode: undefined
          };
        }),
        ambulances: globalState.ambulances.map(a => {
          if (a.id === currentAmbulanceId) {
            return { ...a, status: 'Available', currentIncidentId: undefined };
          }
          return a;
        })
      };

      realtimeEventBus.publish(
        'incident:step:advanced',
        { incidentId, status: 'Pending', category: inc.category, rejectedReason: reason },
        {
          districtId: targetDistrictId,
          summary: `⚠️ Call #${incidentId} timed out on ${currentAmb?.code || 'Unit'}. No other units available in sector. Returned to pending CAD queue.`,
          severity: 'critical'
        }
      );

      medMeshStore.addAuditLog(
        'DISPATCH_TIMEOUT_PENDING',
        `Incident #${incidentId}`,
        `No backup ambulances available in sector. Returned to 108 operator queue.`
      );
      medMeshStore.addNotification('Dispatch Timed Out', `Call #${incidentId} returned to pending queue. No backup units available.`, 'warning');
    }

    notify();
  },

  rejectIncident: (incidentId: string, reason: string = 'Driver unavailable or vehicle maintenance') => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc) return;
    const currentAmbId = inc.assignedAmbulanceId || globalState.activeAmbulanceId;
    medMeshStore.autoReassignIncident(incidentId, currentAmbId, reason);
  },

  acknowledgeHospitalIntake: (incidentId: string, hospitalId: string, bayNumber: string = 'Trauma Bay #01') => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    const hosp = globalState.hospitals.find(h => h.id === hospitalId);

    globalState = {
      ...globalState,
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          intakeAcknowledged: true,
          assignedBay: bayNumber
        };
      })
    };

    realtimeEventBus.publish(
      'hospital:intake:acknowledged',
      { incidentId, hospitalId, hospitalName: hosp?.name, bayNumber },
      {
        hospitalId,
        hospitalName: hosp?.name,
        summary: `🏥 Intake Acknowledged: ${hosp?.name} prepared ${bayNumber} for Call #${incidentId}.`,
        severity: 'success'
      }
    );

    medMeshStore.addAuditLog(
      'HOSPITAL_INTAKE_ACKNOWLEDGED',
      `${hosp?.name} - ${bayNumber}`,
      `ER triage team confirmed readiness for inbound patient (${inc?.category || 'Emergency'}).`
    );
    medMeshStore.addNotification('Hospital Intake Confirmed', `${hosp?.name} has prepared ${bayNumber}.`, 'success');
    notify();
  },

  setDriverOnlineStatus: (ambulanceId: string, isOnline: boolean) => {
    const amb = globalState.ambulances.find(a => a.id === ambulanceId);
    const pilot = globalState.currentUser;
    globalState = {
      ...globalState,
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== ambulanceId) return a;
        return {
          ...a,
          status: isOnline ? 'Available' : 'Offline'
        };
      })
    };

    const action = isOnline ? 'PILOT_STANDBY_ONLINE' : 'PILOT_STANDBY_OFFLINE';
    const detail = isOnline
      ? `Pilot [${pilot?.name || amb?.driverName || 'Pilot'}] marked unit ${amb?.code || ambulanceId} ONLINE. Ready for 108 CAD turnout.`
      : `Pilot [${pilot?.name || amb?.driverName || 'Pilot'}] placed unit ${amb?.code || ambulanceId} OFFLINE (Standby / Rest / Refueling).`;

    medMeshStore.addAuditLog(action, `${amb?.code || ambulanceId} (${pilot?.name || 'Pilot'})`, detail, 200);
    notify();
  },

  // Stage 3: Arrive at incident scene
  arriveAtScene: (incidentId: string) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc || (inc.status !== 'En Route' && inc.status !== 'ACCEPTED' && inc.status !== 'EN_ROUTE_SCENE')) return;

    const nowIso = new Date().toISOString();
    globalState = {
      ...globalState,
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          status: 'On Scene',
          arrivedSceneAt: nowIso,
          etaMinutes: 0
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.currentIncidentId !== incidentId) return a;
        return { ...a, status: 'On Scene' };
      })
    };

    realtimeEventBus.publish(
      'incident:step:advanced',
      { incidentId, status: 'On Scene', category: inc.category },
      {
        summary: `📍 Unit reached scene for Incident #${incidentId} (${inc.locationName}). Clinical triage initiated.`,
        severity: 'normal'
      }
    );

    medMeshStore.addAuditLog('AMBULANCE_ARRIVED_SCENE', `Incident #${incidentId}`, `Arrived at scene. Patient assessment commenced.`);
    medMeshStore.addNotification('Arrived At Scene', `Stationed at ${inc.locationName}. Commencing triage.`, 'info');
    notify();
  },

  // Stage 4: Patient secured onboard ambulance
  confirmPatientOnboard: (incidentId: string) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc || (inc.status !== 'On Scene' && inc.status !== 'AT_SCENE')) return;

    const nowIso = new Date().toISOString();
    globalState = {
      ...globalState,
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          patientOnboardAt: nowIso
        };
      })
    };

    medMeshStore.addAuditLog('PATIENT_ONBOARD', `Incident #${incidentId}`, `Patient stabilized & secured onboard ambulance. Hospital selection initiated.`);
    medMeshStore.addNotification('Patient Secured Onboard', 'Select destination hospital based on live bed/ICU availability.', 'info');
    notify();
  },

  // Strict linear advancement guard (Prevents skipping!)
  advanceIncidentStep: (incidentId: string) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc) return;

    if (inc.status === 'Assigned' || inc.status === 'ASSIGNED') {
      medMeshStore.acceptIncident(incidentId);
    } else if (inc.status === 'En Route' || inc.status === 'ACCEPTED' || inc.status === 'EN_ROUTE_SCENE') {
      medMeshStore.arriveAtScene(incidentId);
    } else if ((inc.status === 'On Scene' || inc.status === 'AT_SCENE') && !inc.patientOnboardAt) {
      medMeshStore.confirmPatientOnboard(incidentId);
    } else if (inc.status === 'Transporting' || inc.status === 'EN_ROUTE_HOSPITAL') {
      medMeshStore.arriveAtHospital(incidentId);
    } else if (inc.status === 'Arrived' || inc.status === 'ARRIVED_HOSPITAL') {
      medMeshStore.completeIncidentCase(incidentId);
    }
  },

  selectDestinationHospital: (ambulanceId: string, incidentId: string, hospitalId: string, careUnit: string = 'Emergency Resuscitation Bay') => {
    const amb = globalState.ambulances.find(a => a.id === ambulanceId);
    const inc = globalState.incidents.find(i => i.id === incidentId);
    const hosp = globalState.hospitals.find(h => h.id === hospitalId);
    if (!hosp) return;

    const dist = amb ? Math.sqrt(Math.pow((amb.latitude - hosp.latitude) * 111, 2) + Math.pow((amb.longitude - hosp.longitude) * 111, 2)) : 5;
    const etaMins = Math.max(2, Math.round(dist * 2.2 + 2));

    globalState = {
      ...globalState,
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          assignedHospitalId: hospitalId,
          assignedHospitalName: hosp.name,
          bedReserved: true,
          status: 'Transporting',
          careUnit,
          patientOnboardAt: new Date().toISOString(),
          etaMinutes: etaMins
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== ambulanceId) return a;
        return {
          ...a,
          assignedHospitalId: hospitalId,
          status: 'Transporting'
        };
      }),
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          capacity: {
            ...h.capacity,
            availableBeds: Math.max(0, h.capacity.availableBeds - 1),
            occupiedBeds: h.capacity.occupiedBeds + 1,
            updatedAt: new Date().toISOString()
          }
        };
      })
    };

    realtimeEventBus.publish(
      'ambulance:hospital:selected',
      {
        ambulanceId,
        ambulanceCode: amb?.code || 'AMB-108',
        driverName: amb?.driverName || 'Driver',
        driverPhone: amb?.driverPhone || '9876543210',
        incidentId,
        category: inc?.category || 'Medical Emergency',
        patientName: inc?.patientName || 'Emergency Patient',
        urgency: inc?.urgency || 'Critical',
        hospitalId,
        hospitalName: hosp.name,
        etaMinutes: etaMins,
        careUnit,
        currentLocation: {
          latitude: amb?.latitude || hosp.latitude,
          longitude: amb?.longitude || hosp.longitude,
          address: inc?.locationName || 'Transit Corridor'
        }
      },
      {
        hospitalId,
        hospitalName: hosp.name,
        summary: `🚨 INBOUND EMS ALERT: Ambulance ${amb?.code} en route to ${hosp.name} (ETA: ${etaMins}m, ${careUnit})`,
        severity: 'critical'
      }
    );

    medMeshStore.addAuditLog(
      'AMBULANCE_HOSPITAL_SELECTED',
      `${amb?.code} -> ${hosp.name}`,
      `Patient pickup complete. Routing to ${hosp.name}. ETA: ${etaMins}m (${careUnit}).`
    );

    medMeshStore.addNotification(
      'Receiving Hospital Notified',
      `Direct triage notification transmitted to ${hosp.name}. Emergency bay reserved. ETA ${etaMins} mins.`,
      'success'
    );

    notify();
  },

  // Stage 7: Arrive at receiving hospital
  arriveAtHospital: (incidentId: string) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc || (inc.status !== 'Transporting' && inc.status !== 'EN_ROUTE_HOSPITAL')) return;

    const nowIso = new Date().toISOString();
    globalState = {
      ...globalState,
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          status: 'Arrived',
          arrivedHospitalAt: nowIso,
          etaMinutes: 0
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.currentIncidentId !== incidentId) return a;
        return { ...a, status: 'On Scene' }; // On scene at hospital bay
      })
    };

    realtimeEventBus.publish(
      'incident:step:advanced',
      { incidentId, status: 'Arrived', category: inc.category },
      {
        summary: `🏥 Ambulance arrived at ${inc.assignedHospitalName || 'Hospital'} ER Bay for Incident #${incidentId}.`,
        severity: 'success'
      }
    );

    medMeshStore.addAuditLog('AMBULANCE_ARRIVED_HOSPITAL', `Incident #${incidentId}`, `Arrived at ${inc.assignedHospitalName || 'Hospital'}. Handover commencing.`);
    medMeshStore.addNotification('Arrived At Hospital', `Unit at ${inc.assignedHospitalName}. Transferring patient.`, 'success');
    notify();
  },

  // Stage 8: Complete case handover & return to standby
  completeIncidentCase: (incidentId: string) => {
    const inc = globalState.incidents.find(i => i.id === incidentId);
    if (!inc) return;

    const nowIso = new Date().toISOString();
    globalState = {
      ...globalState,
      assignments: globalState.assignments.map(a => {
        if (a.incidentId !== incidentId || (a.status !== 'ASSIGNED' && a.status !== 'ACCEPTED')) return a;
        return {
          ...a,
          status: 'COMPLETED',
          completedAt: nowIso
        };
      }),
      incidents: globalState.incidents.map(i => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          status: 'Completed',
          completedAt: nowIso,
          etaMinutes: 0
        };
      }),
      ambulances: globalState.ambulances.map(a => {
        if (a.currentIncidentId !== incidentId) return a;
        return {
          ...a,
          status: 'Available',
          currentIncidentId: undefined,
          assignedHospitalId: undefined
        };
      })
    };

    realtimeEventBus.publish(
      'incident:step:advanced',
      { incidentId, status: 'Completed', category: inc.category },
      {
        summary: `✅ Incident #${incidentId} completed. Unit is back in Available status for district patrol.`,
        severity: 'success'
      }
    );

    medMeshStore.addAuditLog('CASE_HANDOVER_COMPLETED', `Incident #${incidentId}`, `Patient transfer signed off. Unit returned to standby.`);
    medMeshStore.addNotification('Handover Complete', `Case #${incidentId} closed. Ready for next turnout.`, 'success');
    notify();
  },

  updateAmbulanceLocation: (ambulanceId: string, latitude: number, longitude: number) => {
    globalState = {
      ...globalState,
      ambulances: globalState.ambulances.map(a => {
        if (a.id !== ambulanceId) return a;
        return { ...a, latitude, longitude };
      })
    };

    realtimeEventBus.publish(
      'ambulance:location:updated',
      { ambulanceId, latitude, longitude },
      { summary: `Ambulance ${ambulanceId} location updated`, severity: 'normal' }
    );

    notify();
  },

  toggleSurgeMode: () => {
    const willBeActive = !globalState.surgeModeActive;
    globalState = {
      ...globalState,
      surgeModeActive: willBeActive
    };

    realtimeEventBus.publish(
      'surge:toggled',
      { surgeModeActive: willBeActive },
      {
        summary: willBeActive ? '🚨 STATEWIDE SURGE PROTOCOL ACTIVATED' : 'Statewide Surge Protocol stood down',
        severity: willBeActive ? 'critical' : 'normal'
      }
    );

    medMeshStore.addAuditLog(
      willBeActive ? 'SURGE_MODE_ACTIVATED' : 'SURGE_MODE_STAND_DOWN',
      'Tamil Nadu State Health Directorate',
      willBeActive ? 'All hospitals mandated to report capacity every 10 mins. Emergency protocols in effect.' : 'Standard operational monitoring resumed.'
    );
    medMeshStore.addNotification(
      willBeActive ? '🚨 HEALTHCARE SURGE MODE ACTIVE' : 'Surge Mode Stand Down',
      willBeActive ? 'State Health Directorate has declared Emergency Surge Protocol. Real-time reallocation active.' : 'Normal capacity monitoring restored.',
      willBeActive ? 'emergency' : 'info'
    );
    notify();
  },

  toggleSaveHospital: (hospitalId: string) => {
    const isSaved = globalState.savedHospitalIds.includes(hospitalId);
    globalState = {
      ...globalState,
      savedHospitalIds: isSaved
        ? globalState.savedHospitalIds.filter(id => id !== hospitalId)
        : [...globalState.savedHospitalIds, hospitalId]
    };
    notify();
  },

  verifyHospital: (hospitalId: string, status: 'verified' | 'rejected') => {
    globalState = {
      ...globalState,
      hospitals: globalState.hospitals.map(h => {
        if (h.id !== hospitalId) return h;
        return { ...h, verificationStatus: status };
      })
    };
    const hosp = globalState.hospitals.find(h => h.id === hospitalId);
    medMeshStore.addAuditLog(
      `HOSPITAL_VERIFICATION_${status.toUpperCase()}`,
      hosp?.name || hospitalId,
      `Superadmin validation reviewed credentials`
    );
    notify();
  },

  resetDemoData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
    } catch (e) {}

    globalState = {
      isAuthenticated: false,
      currentUser: null,
      currentRole: 'USER',
      currentPath: '/login',
      attemptedUnauthorizedPath: null,
      authToken: null,
      sessionExpiresAt: null,
      failedLoginAttempts: 0,
      isCaptchaRequired: false,
      mfaPendingUser: null,
      mfaTempToken: null,
      firstLoginPendingUser: null,
      rememberMe: false,

      districts: DISTRICTS,
      selectedDistrictId: 'dist-karur',
      users: INITIAL_USERS,
      activeHospitalId: 'hosp-apollo',
      activeAmbulanceId: 'amb-001',
      surgeModeActive: false,
      hospitals: INITIAL_HOSPITALS,
      incidents: INITIAL_INCIDENTS,
      ambulances: INITIAL_AMBULANCES,
      assignments: INITIAL_ASSIGNMENTS,
      auditLogs: INITIAL_AUDIT_LOGS,
      savedHospitalIds: ['hosp-apollo', 'hosp-sunrise'],
      districtMetrics: INITIAL_DISTRICT_METRICS,
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Simulation Reset',
          message: 'All hospitals, beds, ambulances, incidents, and sessions reset to initial state.',
          type: 'info',
          timestamp: 'Just now'
        }
      ]
    };
    notify();
  },

  setSelectedDistrict: (districtId: string) => {
    globalState = {
      ...globalState,
      selectedDistrictId: districtId
    };
    const targetDistrict = globalState.districts.find(d => d.id === districtId);
    medMeshStore.addAuditLog(
      'DISTRICT_CONTEXT_CHANGED',
      districtId,
      `Switched capacity network context to ${targetDistrict ? targetDistrict.name : 'Statewide (All Districts)'}`,
      200
    );
    notify();
  }
};

export function useMedMesh() {
  const [state, setState] = useState<MedMeshState>(medMeshStore.getState());

  useEffect(() => {
    return medMeshStore.subscribe(() => {
      setState(medMeshStore.getState());
    });
  }, []);

  const currentDistrict = state.districts.find(d => d.id === state.selectedDistrictId) || null;

  return {
    ...state,
    currentDistrict,
    setSelectedDistrict: medMeshStore.setSelectedDistrict,
    login: medMeshStore.login,
    registerCitizen: medMeshStore.registerCitizen,
    verifyMfa: medMeshStore.verifyMfa,
    completeFirstLogin: medMeshStore.completeFirstLogin,
    adminCreateHospital: medMeshStore.adminCreateHospital,
    adminCreateDriver: medMeshStore.adminCreateDriver,
    adminCreateGovt: medMeshStore.adminCreateGovt,
    adminCreateOperator: medMeshStore.adminCreateOperator,
    adminSuspendUser: medMeshStore.adminSuspendUser,
    adminActivateUser: medMeshStore.adminActivateUser,
    adminResetUserPassword: medMeshStore.adminResetUserPassword,
    adminForceLogout: medMeshStore.adminForceLogout,
    logout: medMeshStore.logout,
    navigate: medMeshStore.navigate,
    setActiveHospital: medMeshStore.setActiveHospital,
    setActiveAmbulance: medMeshStore.setActiveAmbulance,
    incrementBed: medMeshStore.incrementBed,
    setIcuFull: medMeshStore.setIcuFull,
    setVentilatorFull: medMeshStore.setVentilatorFull,
    setCongestion: medMeshStore.setCongestion,
    updateCapacityFull: medMeshStore.updateCapacityFull,
    toggleDoctorDuty: medMeshStore.toggleDoctorDuty,
    createIncident: medMeshStore.createIncident,
    createAmbulanceAssignment: medMeshStore.createAmbulanceAssignment,
    acceptAssignment: medMeshStore.acceptAssignment,
    rejectAssignment: medMeshStore.rejectAssignment,
    expireAssignment: medMeshStore.expireAssignment,
    getActiveAssignmentForAmbulance: medMeshStore.getActiveAssignmentForAmbulance,
    getActiveIncidentForAmbulance: medMeshStore.getActiveIncidentForAmbulance,
    dispatchIncident: medMeshStore.dispatchIncident,
    acceptIncident: medMeshStore.acceptIncident,
    rejectIncident: medMeshStore.rejectIncident,
    autoReassignIncident: medMeshStore.autoReassignIncident,
    acknowledgeHospitalIntake: medMeshStore.acknowledgeHospitalIntake,
    setDriverOnlineStatus: medMeshStore.setDriverOnlineStatus,
    arriveAtScene: medMeshStore.arriveAtScene,
    confirmPatientOnboard: medMeshStore.confirmPatientOnboard,
    selectDestinationHospital: medMeshStore.selectDestinationHospital,
    arriveAtHospital: medMeshStore.arriveAtHospital,
    completeIncidentCase: medMeshStore.completeIncidentCase,
    advanceIncidentStep: medMeshStore.advanceIncidentStep,
    updateAmbulanceLocation: medMeshStore.updateAmbulanceLocation,
    toggleSurgeMode: medMeshStore.toggleSurgeMode,
    toggleSaveHospital: medMeshStore.toggleSaveHospital,
    verifyHospital: medMeshStore.verifyHospital,
    resetDemoData: medMeshStore.resetDemoData,
    devSwitchUser: medMeshStore.devSwitchUser,
    addNotification: medMeshStore.addNotification,
  };
}
