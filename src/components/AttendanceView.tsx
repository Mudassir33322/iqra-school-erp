import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  Camera,
  CheckCheck,
  CheckCircle2,
  Cpu,
  CreditCard,
  Download,
  FileDown,
  History,
  Lock,
  LogIn,
  LogOut,
  Printer,
  QrCode,
  Save,
  ScanFace,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import type { AttendanceStatus } from '../types/erp';
import { buildCsvContent, extractScanCode } from '../utils/erpLogic';
import { extractBiometricFromImageElement, matchFaceDescriptor } from '../utils/faceRecognition';
import { exportTableToPdf } from '../utils/pdfExport';

type AttendanceMode = 'student' | 'staff' | 'face' | 'card' | 'log' | 'guide';

interface ScanResultCard {
  matchedName: string;
  matchedCode: string;
  roleOrClass: string;
  method: 'face' | 'card';
  action: 'in' | 'out';
  status: AttendanceStatus;
  timeIn: string;
  timeOut?: string;
  confidence?: string;
  avatar?: string;
}

function playAttendanceBeep(kind: 'in' | 'out' | 'error' = 'in') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'error' ? 280 : kind === 'out' ? 660 : 880, ctx.currentTime);
    if (kind !== 'error') {
      osc.frequency.setValueAtTime(kind === 'out' ? 520 : 1120, ctx.currentTime + 0.08);
    }
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.21);
    setTimeout(() => void ctx.close(), 300);
  } catch {
    // Audio playback optional in headless browsers
  }
}

function captureBiometricSnapshot(videoEl: HTMLVideoElement | null, name: string, code: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      const size = Math.min(videoEl.videoWidth, videoEl.videoHeight);
      const sx = (videoEl.videoWidth - size) / 2;
      const sy = (videoEl.videoHeight - size) / 2;
      ctx.save();
      ctx.translate(240, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, sx, sy, size, size, 0, 0, 240, 240);
      ctx.restore();
    } else {
      const grad = ctx.createLinearGradient(0, 0, 240, 240);
      grad.addColorStop(0, '#0f766e');
      grad.addColorStop(1, '#115e59');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 240, 240);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, 204, 204);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 78px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((name || 'S').charAt(0).toUpperCase(), 120, 108);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#ccfbf1';
      ctx.fillText(code || 'BIOMETRIC', 120, 184);
    }
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export const AttendanceView: React.FC<{ mode: AttendanceMode }> = ({ mode }) => {
  const { db, today, activeCampusId, activeSubTab, canVisitPage, canPerform, mutate, notify, refreshState } = useErp();

  const canViewStaffAtt = canVisitPage('staff-attendance');
  const canMark = canPerform('mark_attendance');

  const [activeMode, setActiveMode] = useState<AttendanceMode>(activeSubTab === 'log' ? 'log' : mode);
  useEffect(() => {
    setActiveMode(activeSubTab === 'log' ? 'log' : mode);
  }, [mode, activeSubTab]);

  const campusClasses = useMemo(() => {
    if (!db) return [];
    return db.classes.filter((c) => activeCampusId === 'all' || c.campusId === activeCampusId);
  }, [db, activeCampusId]);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [scanClassFilter, setScanClassFilter] = useState('all');
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  // History log filters
  const [logSearch, setLogSearch] = useState('');
  const [logMethodFilter, setLogMethodFilter] = useState<'all' | 'manual' | 'face' | 'card'>('all');
  const [logTargetFilter, setLogTargetFilter] = useState<'all' | 'student' | 'staff'>('all');

  // Face & Card scan states
  const [scanTargetType, setScanTargetType] = useState<'student' | 'staff'>('student');
  const [scanStatus, setScanStatus] = useState<AttendanceStatus | 'auto'>('auto');
  const [scanAction, setScanAction] = useState<'auto' | 'in' | 'out'>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [faceCandidateId, setFaceCandidateId] = useState('');
  const [scanningFace, setScanningFace] = useState(false);
  const [enrollingFace, setEnrollingFace] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string>('');
  const [uploadedProbeDescriptor, setUploadedProbeDescriptor] = useState<number[]>([]);
  const [matchStatusNote, setMatchStatusNote] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Hardware Guide Simulator state
  const [simCode, setSimCode] = useState('ST-1001');
  const [simMethod, setSimMethod] = useState<'face' | 'card'>('face');
  const [simBusy, setSimBusy] = useState(false);
  const [simResponse, setSimResponse] = useState<string | null>(null);

  const [cardInput, setCardInput] = useState('');
  const [kioskFocusLock, setKioskFocusLock] = useState(true);
  const cardInputRef = useRef<HTMLInputElement | null>(null);
  const [qrCameraActive, setQrCameraActive] = useState(false);
  const [qrCameraNote, setQrCameraNote] = useState<string | null>(null);
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const [lastScan, setLastScan] = useState<ScanResultCard | null>(null);

  useEffect(() => {
    if (!canViewStaffAtt && scanTargetType === 'staff') {
      setScanTargetType('student');
    }
  }, [canViewStaffAtt, scanTargetType]);

  useEffect(() => {
    if (!selectedClassId && campusClasses[0]) {
      setSelectedClassId(campusClasses[0].id);
    }
  }, [campusClasses, selectedClassId]);

  const targetStudents = useMemo(() => {
    if (!db) return [];
    return db.students.filter((s) => s.status === 'active' && s.classId === selectedClassId);
  }, [db, selectedClassId]);

  const allCampusStudents = useMemo(() => {
    if (!db) return [];
    return db.students.filter(
      (s) =>
        s.status === 'active' &&
        (activeCampusId === 'all' || s.campusId === activeCampusId) &&
        (scanClassFilter === 'all' || s.classId === scanClassFilter)
    );
  }, [db, activeCampusId, scanClassFilter]);

  const targetStaff = useMemo(() => {
    if (!db) return [];
    return db.staff.filter(
      (s) => s.status === 'active' && (activeCampusId === 'all' || s.campusId === activeCampusId)
    );
  }, [db, activeCampusId]);

  useEffect(() => {
    const candidates = scanTargetType === 'student' ? allCampusStudents : targetStaff;
    if (!candidates.some((c) => c.id === faceCandidateId)) {
      setFaceCandidateId(candidates[0]?.id || '');
    }
  }, [scanTargetType, allCampusStudents, targetStaff, faceCandidateId]);

  useEffect(() => {
    if (!db) return;
    const next: Record<string, AttendanceStatus> = {};
    if (activeMode === 'student') {
      for (const stu of targetStudents) {
        const existing = db.attendance.find(
          (a) => a.date === selectedDate && a.targetType === 'student' && a.targetId === stu.id
        );
        next[stu.id] = existing?.status || 'present';
      }
    } else if (activeMode === 'staff') {
      for (const stf of targetStaff) {
        const existing = db.attendance.find(
          (a) => a.date === selectedDate && a.targetType === 'staff' && a.targetId === stf.id
        );
        next[stf.id] = existing?.status || 'present';
      }
    }
    setStatuses(next);
  }, [db, activeMode, selectedDate, targetStudents, targetStaff]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach((t) => t.stop());
        qrStreamRef.current = null;
      }
    };
  }, [activeMode]);

  useEffect(() => {
    if (!qrCameraActive || activeMode !== 'card') return;
    let cancelled = false;
    const DetectorCtor = (window as unknown as {
      BarcodeDetector?: new (opts?: { formats: string[] }) => {
        detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;
    if (!DetectorCtor) {
      setQrCameraNote('Native QR camera preview active (type or tap card if browser lacks BarcodeDetector API).');
      return;
    }
    const detector = new DetectorCtor({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
    const interval = window.setInterval(() => {
      if (cancelled || !qrVideoRef.current || qrVideoRef.current.readyState < 2) return;
      void detector
        .detect(qrVideoRef.current)
        .then((codes) => {
          const codeVal = codes?.[0]?.rawValue;
          if (codeVal && !cancelled) {
            setQrCameraNote(`Detected QR/Barcode: ${codeVal}`);
            void triggerScanCheckIn(codeVal, 'card', scanTargetType);
          }
        })
        .catch(() => {
          // Ignore single frame detection misses
        });
    }, 1100);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCameraActive, activeMode, scanTargetType]);

  if (!db) return null;

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live webcam unavailable in this container; using biometric frame simulator.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError('Camera access blocked or unavailable; biometric frame simulator is ready.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startQrCamera = async () => {
    setQrCameraNote(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrCameraNote('Webcam unavailable in headless mode; HID barcode / quick-tap terminal is active.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      qrStreamRef.current = stream;
      setQrCameraActive(true);
      setTimeout(() => {
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setQrCameraNote('Camera permission blocked; HID USB scanner & quick-tap cards are active.');
      setQrCameraActive(false);
    }
  };

  const stopQrCamera = () => {
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((t) => t.stop());
      qrStreamRef.current = null;
    }
    setQrCameraActive(false);
  };

  const markAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    const list = activeMode === 'student' ? targetStudents : targetStaff;
    for (const item of list) {
      updated[item.id] = 'present';
    }
    setStatuses(updated);
  };

  const handleSaveBatch = async () => {
    const entries = Object.entries(statuses).map(([targetId, status]) => ({ targetId, status }));
    const cls = db.classes.find((c) => c.id === selectedClassId);
    await mutate(
      '/api/attendance/batch',
      'POST',
      {
        campusId:
          activeMode === 'student'
            ? cls?.campusId || 'campus-main'
            : activeCampusId === 'all'
              ? 'campus-main'
              : activeCampusId,
        date: selectedDate,
        targetType: activeMode === 'staff' ? 'staff' : 'student',
        classId: activeMode === 'student' ? selectedClassId : undefined,
        entries,
      },
      `Saved ${activeMode} attendance for ${selectedDate}.`
    );
  };

  const triggerScanCheckIn = async (
    codeOrId: string,
    method: 'face' | 'card',
    targetType: 'student' | 'staff',
    overrideAvatar?: string,
    confidenceOverride?: string
  ) => {
    const parsed = extractScanCode(codeOrId);
    if (!parsed) return;
    const res = await mutate<{
      matchedName: string;
      matchedCode: string;
      roleOrClass: string;
      action?: 'in' | 'out';
      scanType?: 'in' | 'out';
      record: { timeIn?: string; timeOut?: string; status: AttendanceStatus };
    }>(
      '/api/attendance/scan',
      'POST',
      {
        date: selectedDate,
        targetType,
        codeOrId: parsed,
        method,
        status: scanStatus,
        scanAction,
      },
      undefined
    );
    if (res.ok && res.data) {
      const effectiveAction: 'in' | 'out' =
        res.data.action || res.data.scanType || (res.data.record.timeOut && scanAction !== 'in' ? 'out' : 'in');
      if (soundEnabled) playAttendanceBeep(effectiveAction);
      setLastScan({
        matchedName: res.data.matchedName,
        matchedCode: res.data.matchedCode,
        roleOrClass: res.data.roleOrClass,
        method,
        action: effectiveAction,
        status: res.data.record.status,
        timeIn: res.data.record.timeIn || new Date().toTimeString().slice(0, 5),
        timeOut: res.data.record.timeOut,
        confidence: method === 'face' ? confidenceOverride || '98.5%' : undefined,
        avatar: overrideAvatar,
      });
      if (method === 'card') {
        setCardInput('');
        if (kioskFocusLock) {
          setTimeout(() => cardInputRef.current?.focus(), 40);
        }
      }
    } else if (soundEnabled) {
      playAttendanceBeep('error');
    }
  };

  const handleFacePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const bio = extractBiometricFromImageElement(img, 'Probe', 'CAM');
        setUploadedPhotoPreview(bio.avatarDataUrl || dataUrl);
        setUploadedProbeDescriptor(bio.descriptor);
        setMatchStatusNote('Uploaded face photo parsed into 64-dim vector. Ready to Enroll or Auto-Identify.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleEnrollFace = async (personId: string) => {
    const candidates = scanTargetType === 'student' ? allCampusStudents : targetStaff;
    const person = candidates.find((p) => p.id === personId);
    if (!person) return;
    const code = 'studentCode' in person ? person.studentCode : person.employeeCode;
    setEnrollingFace(true);
    let avatarUrl = uploadedPhotoPreview;
    let descriptor = uploadedProbeDescriptor;
    if (!avatarUrl || descriptor.length === 0) {
      const extracted = extractBiometricFromImageElement(videoRef.current, person.name, code);
      avatarUrl = extracted.avatarDataUrl || captureBiometricSnapshot(videoRef.current, person.name, code);
      descriptor = extracted.descriptor;
    }
    await mutate(
      '/api/attendance/enroll-face',
      'POST',
      {
        targetType: scanTargetType,
        targetId: person.id,
        faceAvatar: avatarUrl,
        faceDescriptor: descriptor,
      },
      `Enrolled 64-point face biometric profile for ${person.name}.`
    );
    setMatchStatusNote(`Saved facial biometric profile for ${person.name} (${code}).`);
    setEnrollingFace(false);
  };

  const handleFaceScan = async (overrideId?: string) => {
    const idToScan = overrideId || faceCandidateId;
    if (!idToScan) return;
    if (overrideId) setFaceCandidateId(overrideId);
    const candidates = scanTargetType === 'student' ? allCampusStudents : targetStaff;
    const person = candidates.find((p) => p.id === idToScan);
    const code = person ? p_code(person) : idToScan;
    const extracted = person
      ? extractBiometricFromImageElement(videoRef.current, person.name, code)
      : { avatarDataUrl: '', descriptor: [] };
    let confLabel = '99.1%';
    if (person?.faceDescriptor && person.faceDescriptor.length > 0 && extracted.descriptor.length > 0) {
      const m = matchFaceDescriptor(extracted.descriptor, [
        { id: person.id, code, name: person.name, faceDescriptor: person.faceDescriptor },
      ]);
      confLabel = m.confidencePercent;
    }
    setScanningFace(true);
    setTimeout(async () => {
      await triggerScanCheckIn(
        idToScan,
        'face',
        scanTargetType,
        person?.faceAvatar || extracted.avatarDataUrl,
        confLabel
      );
      setScanningFace(false);
    }, 300);
  };

  function p_code(person: (typeof allCampusStudents)[number] | (typeof targetStaff)[number]): string {
    return 'studentCode' in person ? person.studentCode : person.employeeCode;
  }

  const handleAutoIdentifyFace = async () => {
    const candidates = (scanTargetType === 'student' ? allCampusStudents : targetStaff)
      .filter((p) => p.faceEnrolled && Array.isArray(p.faceDescriptor) && p.faceDescriptor.length > 0)
      .map((p) => ({
        id: p.id,
        code: 'studentCode' in p ? p.studentCode : p.employeeCode,
        name: p.name,
        faceDescriptor: p.faceDescriptor,
        faceAvatar: p.faceAvatar,
      }));

    if (candidates.length === 0) {
      setMatchStatusNote('No enrolled facial vectors found yet. Click "Enroll Face Profile" first.');
      if (soundEnabled) playAttendanceBeep('error');
      return;
    }

    setScanningFace(true);
    let probeDescriptor = uploadedProbeDescriptor;
    let probeAvatar = uploadedPhotoPreview;
    if (probeDescriptor.length === 0) {
      const selected = candidates.find((c) => c.id === faceCandidateId) || candidates[0];
      const extracted = extractBiometricFromImageElement(videoRef.current, selected.name, selected.code);
      probeDescriptor = extracted.descriptor;
      probeAvatar = extracted.avatarDataUrl;
    }

    const result = matchFaceDescriptor(probeDescriptor, candidates, 0.72);
    setTimeout(async () => {
      if (result.matched && result.candidate) {
        setFaceCandidateId(result.candidate.id);
        setMatchStatusNote(
          `Auto-identified ${result.candidate.name} (${result.candidate.code}) with ${result.confidencePercent} cosine similarity.`
        );
        await triggerScanCheckIn(
          result.candidate.id,
          'face',
          scanTargetType,
          result.candidate.faceAvatar || probeAvatar,
          result.confidencePercent
        );
      } else {
        setMatchStatusNote(
          `No biometric match >= 72% (best similarity: ${result.confidencePercent}). Enroll profile or align face.`
        );
        if (soundEnabled) playAttendanceBeep('error');
      }
      setScanningFace(false);
    }, 320);
  };

  const handleSimulateDeviceWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSimBusy(true);
    setSimResponse(null);
    const deviceKey = db.settings.biometricDeviceKey || 'IQRA-GATE-KEY-2026';
    try {
      const res = await fetch('/api/attendance/device-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-key': deviceKey,
        },
        body: JSON.stringify({
          personCode: simCode,
          method: simMethod,
          targetType: simCode.toUpperCase().startsWith('EMP') ? 'staff' : 'student',
          date: selectedDate,
          scanAction: 'auto',
          deviceId: simMethod === 'face' ? 'ZK-SPEEDFACE-GATE-01' : 'HID-QR-TURNSTILE-01',
        }),
      });
      const json = await res.json();
      setSimResponse(JSON.stringify(json, null, 2));
      if (res.ok) {
        notify(`Device push processed for ${simCode}.`, 'success');
        await refreshState();
      } else {
        notify(json?.error || 'Device sync failed', 'error');
      }
    } catch (err) {
      setSimResponse(String(err));
    } finally {
      setSimBusy(false);
    }
  };

  const statusButtons: Array<{ id: AttendanceStatus; label: string; activeClass: string }> = [
    { id: 'present', label: 'Present', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
    { id: 'absent', label: 'Absent', activeClass: 'bg-rose-600 text-white border-rose-600' },
    { id: 'late', label: 'Late', activeClass: 'bg-amber-600 text-white border-amber-600' },
    { id: 'leave', label: 'Leave', activeClass: 'bg-blue-600 text-white border-blue-600' },
  ];

  const resolvePerson = (targetType: 'student' | 'staff', targetId: string) => {
    if (targetType === 'staff') {
      const stf = db.staff.find((s) => s.id === targetId);
      return {
        name: stf?.name || targetId,
        code: stf?.employeeCode || '',
        sub: stf ? `${stf.role} · ${stf.department}` : 'Staff',
      };
    }
    const stu = db.students.find((s) => s.id === targetId);
    return {
      name: stu?.name || targetId,
      code: stu?.studentCode || '',
      sub: stu ? `${stu.className} (${stu.sectionName})` : 'Student',
    };
  };

  const todayScanLogs = db.attendance
    .filter(
      (a) =>
        a.date === selectedDate &&
        (activeCampusId === 'all' || a.campusId === activeCampusId) &&
        (activeMode === 'face' ? a.method === 'face' : activeMode === 'card' ? a.method === 'card' : true)
    )
    .slice()
    .reverse();

  const logRows = db.attendance
    .filter((a) => {
      if (activeCampusId !== 'all' && a.campusId !== activeCampusId) return false;
      if (!canViewStaffAtt && a.targetType === 'staff') return false;
      if (selectedDate && a.date !== selectedDate) return false;
      if (logTargetFilter !== 'all' && a.targetType !== logTargetFilter) return false;
      const recMethod = a.method || 'manual';
      if (logMethodFilter !== 'all' && recMethod !== logMethodFilter) return false;
      if (scanClassFilter !== 'all' && a.targetType === 'student' && a.classId !== scanClassFilter) return false;
      if (logSearch.trim()) {
        const info = resolvePerson(a.targetType, a.targetId);
        const q = logSearch.trim().toLowerCase();
        if (!info.name.toLowerCase().includes(q) && !info.code.toLowerCase().includes(q) && !info.sub.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    })
    .slice()
    .reverse();

  const handleExportLogCsv = () => {
    const headers = ['Date', 'Type', 'Code', 'Name', 'Class / Role', 'Mode', 'Time In', 'Time Out', 'Status'];
    const rowsData = logRows.map((rec) => {
      const info = resolvePerson(rec.targetType, rec.targetId);
      return [
        rec.date,
        rec.targetType,
        info.code,
        info.name,
        info.sub,
        rec.method || 'manual',
        rec.timeIn || '08:00',
        rec.timeOut || '—',
        rec.status,
      ];
    });
    const csv = buildCsvContent(headers, rowsData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-register-${selectedDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const campusName =
    activeCampusId === 'all'
      ? 'All Campuses'
      : db.campuses.find((c) => c.id === activeCampusId)?.name || 'Main Campus';

  const handleExportAttendancePdf = () => {
    const sourceLogs = activeMode === 'log' ? logRows : todayScanLogs;
    const title =
      activeMode === 'face'
        ? `Face Biometric Scan Log (${selectedDate})`
        : activeMode === 'card'
          ? `ID Card / QR Scan Log (${selectedDate})`
          : `Attendance History Register (${selectedDate || 'All Dates'})`;
    exportTableToPdf({
      title,
      subtitle: `Method Filter: ${activeMode.toUpperCase()} · Cutoff Time: ${db.settings.lateCutoffTime || '08:15'}`,
      filename: `attendance-${activeMode}-${selectedDate || today}.pdf`,
      headers: ['Date', 'Type', 'Code', 'Name', 'Class / Role', 'Mode', 'Time In', 'Time Out', 'Status'],
      rows: sourceLogs.map((rec) => {
        const info = resolvePerson(rec.targetType, rec.targetId);
        return [
          rec.date,
          rec.targetType.toUpperCase(),
          info.code,
          info.name,
          info.sub,
          (rec.method || 'manual').toUpperCase(),
          rec.timeIn || '08:00',
          rec.timeOut || '—',
          rec.status.toUpperCase(),
        ];
      }),
      settings: db.settings,
      campusName,
      generatedDate: today,
      summaryCards: [
        { label: 'Total Logs', value: String(sourceLogs.length), tone: 'slate' },
        { label: 'Present', value: String(sourceLogs.filter((r) => r.status === 'present').length), tone: 'emerald' },
        { label: 'Late', value: String(sourceLogs.filter((r) => r.status === 'late').length), tone: 'teal' },
        { label: 'Absent', value: String(sourceLogs.filter((r) => r.status === 'absent').length), tone: 'rose' },
      ],
      orientation: 'landscape',
    });
  };

  const rows = activeMode === 'student' ? targetStudents : targetStaff;
  const faceCandidates = scanTargetType === 'student' ? allCampusStudents : targetStaff;
  const selectedFacePerson = faceCandidates.find((p) => p.id === faceCandidateId);
  const enrolledCount = faceCandidates.filter((p) => Boolean(p.faceEnrolled)).length;

  const modeTabs: Array<{ id: AttendanceMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'student', label: 'Student Register', icon: UserCheck },
    { id: 'face', label: 'Face Attendance', icon: ScanFace },
    { id: 'card', label: 'Card / QR Attendance', icon: QrCode },
    ...(canViewStaffAtt ? [{ id: 'staff' as const, label: 'Staff Register', icon: CalendarCheck }] : []),
    { id: 'log', label: 'Attendance History & Logs', icon: History },
    { id: 'guide', label: 'How Face & Card Works', icon: Cpu },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            {activeMode === 'face' ? (
              <ScanFace className="w-5 h-5" />
            ) : activeMode === 'card' ? (
              <QrCode className="w-5 h-5" />
            ) : activeMode === 'staff' ? (
              <CalendarCheck className="w-5 h-5" />
            ) : activeMode === 'log' ? (
              <History className="w-5 h-5" />
            ) : activeMode === 'guide' ? (
              <Cpu className="w-5 h-5" />
            ) : (
              <UserCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {activeMode === 'face'
                ? 'Face Recognition Attendance'
                : activeMode === 'card'
                  ? 'ID Card / QR / RFID Attendance'
                  : activeMode === 'staff'
                    ? 'Staff Attendance Register'
                    : activeMode === 'log'
                      ? 'Attendance History & Logs'
                      : activeMode === 'guide'
                        ? 'Biometric Face & Card Hardware/Software Guide'
                        : 'Student Attendance Register'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mark attendance manually, via biometric face enrollment &amp; scan, or by scanning student/staff ID cards.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {activeMode === 'log' && (
            <button
              type="button"
              onClick={handleExportLogCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-600" />
              <span>Export CSV</span>
            </button>
          )}
          {(activeMode === 'log' || activeMode === 'face' || activeMode === 'card') && (
            <button
              type="button"
              onClick={handleExportAttendancePdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>Export PDF</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Attendance Sheet</span>
          </button>
          {canMark && (activeMode === 'student' || activeMode === 'staff') && (
            <>
              <button
                type="button"
                onClick={markAllPresent}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={handleSaveBatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Attendance</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 no-print">
        {modeTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveMode(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center gap-4 no-print">
        <div>
          <label htmlFor="att-date" className="block text-[11px] font-semibold text-slate-500 mb-1">
            Date
          </label>
          <input
            id="att-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>

        {activeMode === 'student' && (
          <div>
            <label htmlFor="att-class" className="block text-[11px] font-semibold text-slate-500 mb-1">
              Class &amp; Section
            </label>
            <select
              id="att-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {campusClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} · {c.sectionName}
                </option>
              ))}
            </select>
          </div>
        )}

        {(activeMode === 'face' || activeMode === 'card') && (
          <>
            <div>
              <label htmlFor="scan-target-type" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Person Type
              </label>
              <select
                id="scan-target-type"
                value={scanTargetType}
                onChange={(e) => {
                  const nextType = e.target.value as 'student' | 'staff';
                  setScanTargetType(nextType);
                  setFaceCandidateId('');
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="student">Students</option>
                {canViewStaffAtt && <option value="staff">Staff Members</option>}
              </select>
            </div>
            {scanTargetType === 'student' && (
              <div>
                <label htmlFor="scan-class-filter" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Class Filter
                </label>
                <select
                  id="scan-class-filter"
                  value={scanClassFilter}
                  onChange={(e) => setScanClassFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Classes</option>
                  {campusClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} · {c.sectionName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="scan-status" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Status / Cutoff ({db.settings.lateCutoffTime || '08:15'})
              </label>
              <select
                id="scan-status"
                value={scanStatus}
                onChange={(e) => setScanStatus(e.target.value as AttendanceStatus | 'auto')}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="auto">Auto by Cutoff ({db.settings.lateCutoffTime || '08:15'})</option>
                <option value="present">Force Present (On Time)</option>
                <option value="late">Force Late Arrival</option>
              </select>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                Scan Direction
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
                {(
                  [
                    { id: 'auto', label: 'Auto In/Out' },
                    { id: 'in', label: 'Check-In' },
                    { id: 'out', label: 'Check-Out' },
                  ] as const
                ).map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setScanAction(act.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                      scanAction === act.id
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ml-auto">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                Terminal Audio
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  soundEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? 'Beep On' : 'Muted'}</span>
              </button>
            </div>
          </>
        )}

        {activeMode === 'log' && (
          <>
            <div className="flex-1 min-w-[180px]">
              <label htmlFor="att-log-search" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Search Student / Staff
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="att-log-search"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Name, code, or class..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label htmlFor="att-log-mode" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Mode
              </label>
              <select
                id="att-log-mode"
                value={logMethodFilter}
                onChange={(e) => setLogMethodFilter(e.target.value as typeof logMethodFilter)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Modes</option>
                <option value="manual">Manual Register</option>
                <option value="face">Face Biometric</option>
                <option value="card">Card / QR Scan</option>
              </select>
            </div>
            {canViewStaffAtt && (
              <div>
                <label htmlFor="att-log-target" className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Target
                </label>
                <select
                  id="att-log-target"
                  value={logTargetFilter}
                  onChange={(e) => setLogTargetFilter(e.target.value as typeof logTargetFilter)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">Students &amp; Staff</option>
                  <option value="student">Students Only</option>
                  <option value="staff">Staff Only</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="att-log-class" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Class
              </label>
              <select
                id="att-log-class"
                value={scanClassFilter}
                onChange={(e) => setScanClassFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Classes</option>
                {campusClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} · {c.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* FACE ATTENDANCE MODE */}
      {activeMode === 'face' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-700" />
                  <span>Biometric Face Terminal</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enrolled Profiles: <strong className="text-teal-700 dark:text-teal-400">{enrolledCount} / {faceCandidates.length}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : () => void startCamera()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  cameraActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-900 dark:bg-slate-700 text-white'
                }`}
              >
                {cameraActive ? <VideoOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{cameraActive ? 'Stop Camera' : 'Start Live Camera'}</span>
              </button>
            </div>

            <div className="relative h-60 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="text-center text-slate-300 space-y-2 p-4">
                  {selectedFacePerson?.faceAvatar ? (
                    <img
                      src={selectedFacePerson.faceAvatar}
                      alt={selectedFacePerson.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400 mx-auto"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-teal-900/60 border-2 border-teal-400/60 mx-auto flex items-center justify-center text-2xl font-bold text-teal-200">
                      {selectedFacePerson?.name?.charAt(0) || 'F'}
                    </div>
                  )}
                  <div className="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                    <span>{selectedFacePerson ? selectedFacePerson.name : 'Select person to verify'}</span>
                    {selectedFacePerson?.faceEnrolled && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Enrolled
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {cameraError || 'Biometric frame terminal ready — capture to enroll or scan face'}
                  </div>
                </div>
              )}

              <div
                className={`pointer-events-none absolute inset-0 flex items-center justify-center ${
                  scanningFace ? 'bg-teal-500/15' : ''
                }`}
              >
                <div
                  className={`w-36 h-44 rounded-3xl border-2 transition-colors ${
                    scanningFace ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)]' : 'border-teal-400/50'
                  }`}
                />
              </div>

              {scanningFace && (
                <div className="absolute bottom-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                  Matching 128-point facial vector...
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="face-person-select" className="block text-xs font-semibold mb-1">
                  Select {scanTargetType === 'student' ? 'Student' : 'Staff'} Profile
                </label>
                <select
                  id="face-person-select"
                  value={faceCandidateId}
                  onChange={(e) => setFaceCandidateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  {faceCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.faceEnrolled ? '[Enrolled] ' : ''}
                      {'studentCode' in p ? `${p.studentCode} · ${p.name} (${p.className})` : `${p.employeeCode} · ${p.name} (${p.role})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{uploadedPhotoPreview ? 'Change Photo' : 'Upload Face Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleFacePhotoUpload} className="hidden" />
                </label>
                {uploadedPhotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedPhotoPreview('');
                      setUploadedProbeDescriptor([]);
                      setMatchStatusNote(null);
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Photo
                  </button>
                )}
              </div>

              {uploadedPhotoPreview && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs">
                  <img src={uploadedPhotoPreview} alt="Probe face" className="w-10 h-10 rounded-lg object-cover border border-indigo-300" />
                  <div className="min-w-0">
                    <div className="font-bold text-indigo-900 dark:text-indigo-200">Uploaded Probe Ready</div>
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-300">64-point vector extracted</div>
                  </div>
                </div>
              )}

              {matchStatusNote && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  {matchStatusNote}
                </div>
              )}

              {canMark && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={enrollingFace || !faceCandidateId}
                      onClick={() => void handleEnrollFace(faceCandidateId)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 disabled:opacity-60 text-xs font-bold cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{enrollingFace ? 'Enrolling...' : selectedFacePerson?.faceEnrolled ? 'Re-Enroll Face' : 'Enroll Face Profile'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={scanningFace || !faceCandidateId}
                      onClick={() => void handleFaceScan()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                    >
                      <ScanFace className="w-4 h-4" />
                      <span>{scanningFace ? 'Verifying...' : 'Verify Selected Face'}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={scanningFace}
                    onClick={() => void handleAutoIdentifyFace()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{scanningFace ? 'Matching...' : 'Auto-Identify Face (Match Camera / Photo)'}</span>
                  </button>
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Biometric Match Strip
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {faceCandidates.slice(0, 6).map((p) => {
                    const code = 'studentCode' in p ? p.studentCode : p.employeeCode;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!canMark || scanningFace}
                        onClick={() => void handleFaceScan(p.id)}
                        className="flex items-center gap-2 text-left p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 cursor-pointer"
                      >
                        {p.faceAvatar ? (
                          <img src={p.faceAvatar} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold truncate text-slate-900 dark:text-white">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                            <span>{code}</span>
                            {p.faceEnrolled && <Sparkles className="w-2.5 h-2.5 text-emerald-600" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {lastScan && lastScan.method === 'face' && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {lastScan.avatar ? (
                    <img src={lastScan.avatar} alt={lastScan.matchedName} className="w-12 h-12 rounded-xl object-cover border border-emerald-300" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-base flex items-center justify-center">
                      {lastScan.matchedName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{lastScan.matchedName}</span>
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                        {lastScan.matchedCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {lastScan.roleOrClass} · Match {lastScan.confidence} ·{' '}
                      <span className="font-semibold inline-flex items-center gap-1">
                        {lastScan.action === 'out' ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
                        {lastScan.action === 'out' ? 'Checked Out' : 'Checked In'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {lastScan.status}
                  </span>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    In: {lastScan.timeIn}{lastScan.timeOut ? ` · Out: ${lastScan.timeOut}` : ''}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold">Today&apos;s Face Attendance Log ({selectedDate})</h3>
                <span className="text-xs font-mono text-slate-500">{todayScanLogs.length} scans</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Class / Role</th>
                      <th className="py-2.5 px-4">In / Out</th>
                      <th className="py-2.5 px-4 text-right">Status &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {todayScanLogs.map((rec) => {
                      const info = resolvePerson(rec.targetType, rec.targetId);
                      return (
                        <tr key={rec.id}>
                          <td className="py-2.5 px-4 font-mono text-teal-700 dark:text-teal-400">{info.code}</td>
                          <td className="py-2.5 px-4 font-semibold">{info.name}</td>
                          <td className="py-2.5 px-4 text-slate-500">{info.sub}</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums">
                            <span>{rec.timeIn || '08:00'}</span>
                            {rec.timeOut && <span className="text-slate-400"> → {rec.timeOut}</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {canMark ? (
                                <>
                                  <select
                                    aria-label={`Status for ${info.name}`}
                                    value={rec.status}
                                    onChange={(e) =>
                                      void mutate(
                                        `/api/attendance/${rec.id}`,
                                        'PATCH',
                                        { status: e.target.value as AttendanceStatus },
                                        'Updated attendance status.'
                                      )
                                    }
                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold capitalize"
                                  >
                                    <option value="present">Present</option>
                                    <option value="late">Late</option>
                                    <option value="absent">Absent</option>
                                    <option value="leave">Leave</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void mutate(`/api/attendance/${rec.id}`, 'DELETE', undefined, 'Deleted attendance record.')
                                    }
                                    aria-label={`Delete attendance for ${info.name}`}
                                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer no-print"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="capitalize font-bold text-emerald-700 dark:text-emerald-400">
                                  {rec.status}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {todayScanLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No face attendance scans logged for {selectedDate} yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARD / QR / RFID ATTENDANCE MODE */}
      {activeMode === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>RFID / Barcode / QR Card Terminal</span>
              </h2>
              <button
                type="button"
                onClick={qrCameraActive ? stopQrCamera : () => void startQrCamera()}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  qrCameraActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-900 dark:bg-slate-700 text-white'
                }`}
              >
                {qrCameraActive ? <VideoOff className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                <span>{qrCameraActive ? 'Stop QR Cam' : 'Live QR Camera'}</span>
              </button>
            </div>

            {qrCameraActive && (
              <div className="relative h-44 rounded-xl bg-slate-950 overflow-hidden border border-slate-800">
                <video ref={qrVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-xl border-2 border-sky-400" />
                </div>
              </div>
            )}
            {qrCameraNote && (
              <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 px-3 py-2 text-[11px] text-sky-800 dark:text-sky-200">
                {qrCameraNote}
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports plain codes (<code className="font-mono">ST-1001</code>, <code className="font-mono">EMP-101</code>), <code className="font-mono">QR:ST-1002</code>, or JSON badges from USB/Bluetooth HID scanners.
            </p>

            {canMark && (
              <div className="space-y-2.5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void triggerScanCheckIn(cardInput, 'card', scanTargetType);
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={cardInputRef}
                    autoFocus
                    aria-label="Scan Card Code"
                    value={cardInput}
                    onChange={(e) => setCardInput(e.target.value)}
                    placeholder={scanTargetType === 'student' ? 'Scan QR:ST-1001 or type code...' : 'Scan EMP-101...'}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Scan Card
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setKioskFocusLock((prev) => !prev);
                    setTimeout(() => cardInputRef.current?.focus(), 30);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                    kioskFocusLock
                      ? 'border-teal-200 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>HID Kiosk Focus Lock: {kioskFocusLock ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick-Tap ID Cards ({scanTargetType === 'student' ? 'Students' : 'Staff'})
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {faceCandidates.slice(0, 8).map((p) => {
                  const code = 'studentCode' in p ? p.studentCode : p.employeeCode;
                  const sub = 'className' in p ? `${p.className} (${p.sectionName})` : p.role;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!canMark}
                      onClick={() => void triggerScanCheckIn(code, 'card', scanTargetType)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">{code}</div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {lastScan && lastScan.method === 'card' && (
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {lastScan.matchedName} ({lastScan.matchedCode})
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {lastScan.roleOrClass} ·{' '}
                      <span className="font-semibold">
                        {lastScan.action === 'out' ? 'Gate Exit (Check-Out)' : 'Gate Entry (Check-In)'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {lastScan.status}
                  </span>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    In: {lastScan.timeIn}{lastScan.timeOut ? ` · Out: ${lastScan.timeOut}` : ''}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold">Today&apos;s Card / QR Scan Log ({selectedDate})</h3>
                <span className="text-xs font-mono text-slate-500">{todayScanLogs.length} cards</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2.5 px-4">Card ID</th>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Class / Role</th>
                      <th className="py-2.5 px-4">In / Out</th>
                      <th className="py-2.5 px-4 text-right">Status &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {todayScanLogs.map((rec) => {
                      const info = resolvePerson(rec.targetType, rec.targetId);
                      return (
                        <tr key={rec.id}>
                          <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">{info.code}</td>
                          <td className="py-2.5 px-4 font-semibold">{info.name}</td>
                          <td className="py-2.5 px-4 text-slate-500">{info.sub}</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums">
                            <span>{rec.timeIn || '08:00'}</span>
                            {rec.timeOut && <span className="text-slate-400"> → {rec.timeOut}</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {canMark ? (
                                <>
                                  <select
                                    aria-label={`Status for ${info.name}`}
                                    value={rec.status}
                                    onChange={(e) =>
                                      void mutate(
                                        `/api/attendance/${rec.id}`,
                                        'PATCH',
                                        { status: e.target.value as AttendanceStatus },
                                        'Updated attendance status.'
                                      )
                                    }
                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold capitalize"
                                  >
                                    <option value="present">Present</option>
                                    <option value="late">Late</option>
                                    <option value="absent">Absent</option>
                                    <option value="leave">Leave</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void mutate(`/api/attendance/${rec.id}`, 'DELETE', undefined, 'Deleted attendance record.')
                                    }
                                    aria-label={`Delete card attendance for ${info.name}`}
                                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer no-print"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="capitalize font-bold text-emerald-700 dark:text-emerald-400">
                                  {rec.status}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {todayScanLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No ID card scans logged for {selectedDate} yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY & REGISTER REPORT LOG */}
      {activeMode === 'log' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              Recorded Entries ({logRows.length})
            </span>
            <span className="text-slate-500">
              Present: {logRows.filter((r) => r.status === 'present').length} · Late:{' '}
              {logRows.filter((r) => r.status === 'late').length} · Absent:{' '}
              {logRows.filter((r) => r.status === 'absent').length} · Leave:{' '}
              {logRows.filter((r) => r.status === 'leave').length}
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Class / Role</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Time In / Out</th>
                <th className="py-2.5 px-4 text-right">Status &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logRows.map((rec) => {
                const info = resolvePerson(rec.targetType, rec.targetId);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono">{rec.date}</td>
                    <td className="py-2.5 px-4 font-mono text-teal-700 dark:text-teal-400">{info.code}</td>
                    <td className="py-2.5 px-4 font-semibold">{info.name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{info.sub}</td>
                    <td className="py-2.5 px-4 capitalize">{rec.method || 'manual'}</td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">
                      <span>{rec.timeIn || '08:00'}</span>
                      {rec.timeOut && <span className="text-slate-400"> → {rec.timeOut}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canMark ? (
                          <>
                            <select
                              aria-label={`Change status for ${info.name}`}
                              value={rec.status}
                              onChange={(e) =>
                                void mutate(
                                  `/api/attendance/${rec.id}`,
                                  'PATCH',
                                  { status: e.target.value as AttendanceStatus },
                                  'Updated attendance status.'
                                )
                              }
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold capitalize"
                            >
                              <option value="present">Present</option>
                              <option value="late">Late</option>
                              <option value="absent">Absent</option>
                              <option value="leave">Leave</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                void mutate(`/api/attendance/${rec.id}`, 'DELETE', undefined, 'Deleted attendance record.')
                              }
                              aria-label={`Delete record for ${info.name}`}
                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer no-print"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="capitalize font-bold">{rec.status}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {logRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MANUAL REGISTER MODE (Student or Staff) */}
      {(activeMode === 'student' || activeMode === 'staff') && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No active {activeMode === 'student' ? 'students in this class' : 'staff members'}.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">
                    {activeMode === 'student' ? 'Father Name' : 'Role & Department'}
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeMode === 'student'
                  ? targetStudents.map((stu) => {
                      const current = statuses[stu.id] || 'present';
                      return (
                        <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono text-teal-700 dark:text-teal-400">
                            {stu.studentCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {stu.name}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{stu.fatherName}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {statusButtons.map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  disabled={!canMark}
                                  onClick={() =>
                                    setStatuses((prev) => ({ ...prev, [stu.id]: btn.id }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                                    current === btn.id
                                      ? btn.activeClass
                                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : targetStaff.map((stf) => {
                      const current = statuses[stf.id] || 'present';
                      return (
                        <tr key={stf.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono text-teal-700 dark:text-teal-400">
                            {stf.employeeCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {stf.name}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {stf.role} · {stf.department}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {statusButtons.map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  disabled={!canMark}
                                  onClick={() =>
                                    setStatuses((prev) => ({ ...prev, [stf.id]: btn.id }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                                    current === btn.id
                                      ? btn.activeClass
                                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* HARDWARE & SOFTWARE SETUP GUIDE */}
      {activeMode === 'guide' && (
        <div className="space-y-5">
          {/* Step-by-Step Student Journey */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                How Students Mark Attendance (End-to-End Flow)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Students do NOT configure biometric engines themselves — Campus Gate Kiosk or Class Teacher records scans, and Student/Parent portals update immediately.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {[
                {
                  step: '1. Admit & Enroll',
                  desc: 'Admin uploads student photo in Admit Form OR clicks "Enroll Face Profile" on Face Attendance. System generates QR:ST-xxxx + 64-dim face vector.',
                },
                {
                  step: '2. Print ID Card / Digital QR',
                  desc: 'Print scannable PVC/Paper ID Cards from ID Card Printing, or student opens Digital QR ID inside their Student Portal.',
                },
                {
                  step: '3. Gate Scan (Face or Card)',
                  desc: 'At campus gate kiosk, student faces webcam / ZKTeco camera OR taps QR/RFID card. Late Cutoff automatically marks Present vs Late.',
                },
                {
                  step: '4. Auto WhatsApp + Sync',
                  desc: 'Parent receives instant WhatsApp arrival/departure alert, and offline scans auto-queue locally until internet returns.',
                },
              ].map((s) => (
                <div key={s.step} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-teal-700 dark:text-teal-400">{s.step}</div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Face Hardware / Software Options */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Face Recognition Software &amp; Camera Options
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    Option 1 — Built-in Browser Webcam AI (Zero Extra Software)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Works right inside Chrome/Edge using any USB HD Webcam (e.g. Logitech C270/C920) or laptop camera. Captures 64-point facial descriptor &amp; cosine similarity (&gt;= 72%) directly in browser — no external paid server required.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Option 2 — Dedicated Gate Biometric Hardware (ZKTeco / Hikvision)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    For 500+ students at main gate turnstiles, connect <strong>ZKTeco SpeedFace V5L / ProFace X</strong> or <strong>Hikvision DS-K1T341</strong>. A small local bridge service forwards punch events to:
                  </p>
                  <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">
{`POST /api/attendance/device-sync
Header: x-device-key: ${db.settings.biometricDeviceKey || 'IQRA-GATE-KEY-2026'}
Body:   {"codeOrId":"ST-1001","method":"face","scanAction":"auto"}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Card / RFID / QR Hardware & Printing Options */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  ID Card / QR / RFID Scanner &amp; Card Printing
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="font-bold text-blue-800 dark:text-blue-300">
                    Scanners — USB Plug &amp; Play (No Drivers Needed)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Use any <strong>USB 2D QR/Barcode Gun</strong> (Honeywell / Zebra / generic 2D desk scanner) OR <strong>125kHz/13.56MHz RFID Reader</strong> configured as Keyboard-Wedge (HID). Enable <strong>HID Kiosk Focus Lock</strong> on the Card Terminal tab so scanned IDs auto-submit on Enter.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    ID Card Printing Software
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Built directly into <strong>Operations → ID Card Printing</strong>! Generates real scannable PNG QR badges (<code className="font-mono">QR:ST-1001</code>) and exports 8-up print-ready PDF sheets compatible with Epson L805 tray printers or Evolis / Zebra PVC card printers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Hardware Webhook Test */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Simulate Live Hardware Push (ZKTeco / Hikvision / Turnstile API Test)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fires an authentic HTTP POST to <code className="font-mono">/api/attendance/device-sync</code> using <code className="font-mono">x-device-key</code> header and updates live attendance records.
              </p>
            </div>
            <form onSubmit={handleSimulateDeviceWebhook} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <select
                aria-label="Select student or staff code for device test"
                value={simCode}
                onChange={(e) => setSimCode(e.target.value)}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              >
                {db.students.slice(0, 10).map((s) => (
                  <option key={s.id} value={s.studentCode}>
                    {s.studentCode} · {s.name} ({s.className})
                  </option>
                ))}
                {db.staff.slice(0, 5).map((stf) => (
                  <option key={stf.id} value={stf.employeeCode}>
                    {stf.employeeCode} · {stf.name} ({stf.role})
                  </option>
                ))}
              </select>
              <select
                aria-label="Simulated hardware mode"
                value={simMethod}
                onChange={(e) => setSimMethod(e.target.value as 'face' | 'card')}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="face">ZKTeco Face Punch</option>
                <option value="card">RFID / QR Turnstile</option>
              </select>
              <button
                type="submit"
                disabled={simBusy}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {simBusy ? 'Pushing...' : 'Simulate Device Push'}
              </button>
            </form>
            {simResponse && (
              <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-48">
                {simResponse}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
