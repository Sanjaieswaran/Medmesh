export type UserRole =
  | 'USER'
  | 'HOSPITAL_ADMIN'
  | 'OPERATOR_108'
  | 'AMBULANCE_DRIVER'
  | 'GOVERNMENT_OFFICIAL'
  | 'PLATFORM_ADMIN';

export type CongestionLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type Permission =
  | 'hospital:search'
  | 'hospital:detail_view'
  | 'doctor:search'
  | 'gis:map_view'
  | 'hospital:save_bookmark'
  | 'capacity:view_own'
  | 'capacity:update'
  | 'doctor:roster_manage'
  | 'hospital:reports'
  | 'incident:create'
  | 'incident:view_all'
  | 'hospital:smart_match'
  | 'incident:dispatch'
  | 'ambulance:assigned_view'
  | 'ambulance:route_track'
  | 'ambulance:status_step'
  | 'analytics:state_view'
  | 'analytics:district_view'
  | 'surge:activate'
  | 'admin:users_manage'
  | 'admin:verify_hospital'
  | 'admin:audit_logs'
  | 'admin:system_monitor';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  mobileNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  hospitalId?: string;
  ambulanceId?: string;
  title?: string;
  mfaEnabled?: boolean;
  avatar?: string;
  isCitizenSelfRegistered?: boolean;
  mustChangePassword?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  createdByAdmin?: string;
  temporaryPassword?: string;
  licenseNumber?: string;
  badgeNumber?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface CitizenSignUpPayload {
  fullName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  username: string;
  password: string;
}

export interface AdminCreateHospitalPayload {
  hospitalName: string;
  hospitalCode: string;
  hospitalEmail: string;
  contactNumber: string;
  address: string;
  licenseNumber: string;
  initialBeds: number;
  initialIcu: number;
  initialVentilators: number;
}

export interface AdminCreateDriverPayload {
  driverName: string;
  driverId: string;
  licenseNumber: string;
  ambulanceNumber: string;
  contactNumber: string;
  operatorType: '108 Emergency (EMRI)' | 'State Health Transport' | 'Apollo Fleet' | 'RedCross';
  vehicleType: 'Advanced Life Support (ALS)' | 'Basic Life Support (BLS)' | 'Patient Transport';
}

export interface AdminCreateGovtPayload {
  officerName: string;
  department: string;
  designation: string;
  officialEmail: string;
  contactNumber: string;
}

export interface AdminCreateOperatorPayload {
  operatorName: string;
  controlRoom: string;
  employeeId: string;
  officialEmail: string;
  stationDesk: string;
}

export interface CapacityHistoryPoint {
  time: string;
  beds: number;
  icu: number;
  ventilators: number;
}

export interface CapacityRecord {
  id: string;
  hospitalId: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  totalIcu: number;
  occupiedIcu: number;
  availableIcu: number;
  totalVentilators: number;
  occupiedVentilators: number;
  availableVentilators: number;
  congestion: CongestionLevel;
  updatedAt: string;
  freshnessScore: number;
  history: CapacityHistoryPoint[];
}

export interface District {
  id: string; // e.g. 'dist-karur', 'dist-trichy', 'dist-chennai'
  code: string; // e.g. 'TN-KR', 'TN-TC', 'TN-CH'
  name: string; // 'Karur', 'Tiruchirappalli', 'Chennai'
  state: string; // 'Tamil Nadu'
  latitude: number;
  longitude: number;
  zoom: number;
  headquarters: string;
  totalHospitals: number;
  totalBeds: number;
  description?: string;
}

export interface Doctor {
  id: string;
  hospitalId: string;
  hospitalName: string;
  districtId?: string;
  districtName?: string;
  name: string;
  specialty: string;
  qualification: string;
  onDuty: boolean;
  shiftHours: string;
  rating: number;
  reviewsCount: number;
  avatar: string;
  experienceYears: number;
}

export interface Hospital {
  id: string;
  name: string;
  type: 'Government' | 'Private' | 'Charitable';
  districtId: string;
  district: string;
  districtName?: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  phone: string;
  emergencyPhone: string;
  image: string;
  specialties: string[];
  capacity: CapacityRecord;
  doctors: Doctor[];
  licenseNumber?: string;
  hospitalCode?: string;
}

export type IncidentCategory =
  | 'Road Accident'
  | 'Cardiac Arrest'
  | 'Trauma'
  | 'Respiratory Distress'
  | 'Maternal Emergency'
  | 'Stroke';

export type IncidentStatus =
  | 'Pending'
  | 'PENDING_DISPATCH'
  | 'Assigned'
  | 'ASSIGNED'
  | 'Accepted'
  | 'ACCEPTED'
  | 'En Route'
  | 'EN_ROUTE_SCENE'
  | 'On Scene'
  | 'AT_SCENE'
  | 'Patient Onboard'
  | 'PATIENT_ONBOARD'
  | 'Transporting'
  | 'EN_ROUTE_HOSPITAL'
  | 'Arrived'
  | 'ARRIVED_HOSPITAL'
  | 'HANDOVER_COMPLETE'
  | 'Completed'
  | 'CLOSED'
  | 'CANCELLED';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'COMPLETED';

export interface AmbulanceAssignment {
  id: string;
  incidentId: string;
  incidentNumber?: string;
  ambulanceId: string;
  ambulanceCode?: string;
  pilotId: string;
  pilotName?: string;
  emtId?: string;
  assignedByDispatcherId: string;
  dispatcherName?: string;
  status: AssignmentStatus;
  rejectionReason?: string;
  assignedAt: string; // ISO 8601
  expiresAt: string;  // ISO 8601 (2-minute timer)
  acceptedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
}

export interface Incident {
  id: string;
  districtId?: string;
  districtName?: string;
  category: IncidentCategory;
  patientName?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  urgency: 'Critical' | 'Urgent' | 'Moderate';
  status: IncidentStatus;
  activeAssignmentId?: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  assignedAmbulanceId?: string;
  assignedAmbulanceCode?: string;
  etaMinutes: number;
  reportedAt: string;
  bedReserved: boolean;
  notes?: string;
  intakeAcknowledged?: boolean;
  assignedBay?: string;
  careUnit?: string;
  assignedAt?: string;
  acceptedAt?: string;
  arrivedSceneAt?: string;
  patientOnboardAt?: string;
  arrivedHospitalAt?: string;
  completedAt?: string;
}

export type DriverWorkflowState =
  | 'Waiting'
  | 'Assigned'
  | 'Accepted'
  | 'En Route'
  | 'Arrived At Scene'
  | 'Patient Onboard'
  | 'Hospital Selected'
  | 'Transporting'
  | 'Arrived Hospital'
  | 'Completed';

export type AmbulanceStatus =
  | 'Available'
  | 'Assigned'
  | 'En Route'
  | 'On Scene'
  | 'Transporting'
  | 'Maintenance'
  | 'Offline';

export interface Ambulance {
  id: string;
  districtId?: string;
  districtName?: string;
  code: string;
  driverName: string;
  driverPhone: string;
  operatorType: '108 Emergency (EMRI)' | 'State Health Transport' | 'Apollo Fleet' | 'RedCross';
  latitude: number;
  longitude: number;
  status: AmbulanceStatus;
  currentIncidentId?: string;
  assignedHospitalId?: string;
  vehicleType: 'Advanced Life Support (ALS)' | 'Basic Life Support (BLS)' | 'Patient Transport';
  equipment: string[];
  licenseNumber?: string;
  driverUserId?: string;
  paramedicName?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | string;
  action: string;
  entity: string;
  timestamp: string;
  statusCode?: number;
  details?: string;
}

export interface Feedback {
  id: string;
  hospitalId: string;
  hospitalName: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  category: string;
}

export interface DistrictMetric {
  district: string;
  occupancyPercent: number;
  totalHospitals: number;
  availableBeds: number;
  availableIcu: number;
  criticalCases: number;
  color: string;
}

export interface RoleConfig {
  role: UserRole;
  name: string;
  dashboardPath: string;
  description: string;
  permissions: Permission[];
}
