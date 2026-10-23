import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  RefreshCw,
  Trash2,
  AlertCircle,
  Video,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../api/client';
import { MembershipPlan } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDateIN } from '../../utils/formatters';

interface RegisterMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember?: any) => void;
  onOpenReceipt?: (payment: any) => void;
}

export const RegisterMemberModal: React.FC<RegisterMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenReceipt,
}) => {
  const { branches, activeBranch } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    memberId: '',
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'MALE',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    branch: activeBranch?._id || '',
    photoUrl: '',
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    discount: '0',
    amountPaid: '',
    paymentMethod: 'UPI',
  });

  // Camera & Image State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset & load on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCameraError(null);
      setCapturedImage(null);
      setCameraActive(false);

      // Load plans and default to popular/standard plan
      api
        .getPlans(true)
        .then((p) => {
          setPlans(p);
          if (p.length > 0) {
            // Find popular or standard quarterly/monthly plan
            const defaultPlan =
              p.find((pl) => pl.isPopular) ||
              p.find((pl) => pl.type === 'QUARTERLY') ||
              p.find((pl) => pl.type === 'MONTHLY') ||
              p[0];

            setFormData((prev) => ({
              ...prev,
              planId: defaultPlan._id,
              amountPaid: defaultPlan.price.toString(),
            }));
          }
        })
        .catch(console.error);

      // Load next auto-generated member ID
      api
        .getNextMemberId()
        .then((res) => {
          setFormData((prev) => ({ ...prev, memberId: res.nextId }));
        })
        .catch(console.error);

      if (activeBranch) {
        setFormData((prev) => ({ ...prev, branch: activeBranch._id }));
      }
    } else {
      stopCamera();
    }
  }, [isOpen, activeBranch]);

  // Clean camera shutdown
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (targetMode: 'user' | 'environment' = cameraFacingMode) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: { ideal: targetMode },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraFacingMode(targetMode);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera error:', err);
      let msg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. You can upload an image from your device instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system. You can upload an image file instead.';
      } else {
        // Fallback without specific facingMode if constrained
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallbackStream;
          setCameraActive(true);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.play().catch(console.error);
            }
          }, 100);
          return;
        } catch {
          msg = 'Unable to open camera on this device.';
        }
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const flipCamera = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    await startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const size = Math.min(video.videoWidth, video.videoHeight) || 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setCameraError(null);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCameraError('Only JPG/PNG image files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCameraError('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setCameraError(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  // Selected Plan & Expiry Calculations
  const selectedPlan = plans.find((p) => p._id === formData.planId) || plans[0];
  const planPrice = selectedPlan ? selectedPlan.price : 0;
  const discountVal = Math.max(0, Number(formData.discount) || 0);
  const payableAmount = Math.max(0, planPrice - discountVal);

  const startObj = new Date(formData.startDate || Date.now());
  const expiryObj = new Date(startObj);
  if (selectedPlan) {
    expiryObj.setDate(startObj.getDate() + selectedPlan.durationDays);
  }
  const expiryDateFormatted = formatDateIN(expiryObj);

  const amountPaidVal =
    formData.amountPaid !== '' ? Number(formData.amountPaid) : payableAmount;
  const remainingBalance = Math.max(0, payableAmount - amountPaidVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError('Member full name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Mobile number is required.');
      return;
    }
    if (!formData.branch) {
      setError('Please select a home branch.');
      return;
    }

    setLoading(true);

    try {
      let finalPhotoUrl = formData.photoUrl;

      // Upload captured or file base64 image if present
      if (capturedImage && capturedImage.startsWith('data:')) {
        try {
          const uploadRes = await api.uploadPhoto(
            capturedImage,
            `${formData.fullName.replace(/\s+/g, '_')}.jpg`
          );
          finalPhotoUrl = uploadRes.url || capturedImage;
        } catch (uploadErr) {
          console.warn('Photo upload warning, falling back to direct image data:', uploadErr);
          finalPhotoUrl = capturedImage;
        }
      }

      const payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        gender: formData.gender,
        dob: formData.dob || undefined,
        address: formData.address.trim(),
        emergencyContact: {
          name: formData.emergencyName.trim(),
          phone: formData.emergencyPhone.trim(),
          relation: 'Emergency',
        },
        branch: formData.branch,
        customMemberId: formData.memberId.trim(),
        photoUrl: finalPhotoUrl,
        planId: formData.planId,
        startDate: formData.startDate,
        discount: discountVal,
        amountPaid: amountPaidVal,
        paymentMethod: formData.paymentMethod,
      };

      const result = await api.registerMember(payload);
      stopCamera();

      // Trigger automatic UI refresh across all views
      window.dispatchEvent(
        new CustomEvent('fitcore:data-changed', {
          detail: { action: 'MEMBER_ADDED', member: result?.member || result },
        })
      );

      onSuccess(result?.member || result);
      if (result?.payment && onOpenReceipt) {
        onOpenReceipt(result.payment);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Register New Member
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Personal details, photograph, and Indian membership plan assignment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="register-member-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section A: Personal Details */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                  A
                </span>
                Personal Details
              </h3>
              <span className="text-[11px] text-gray-400">Fields marked * are mandatory</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {/* Member ID (Auto-generated) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#202124]">
                    Member ID <span className="text-[10px] text-blue-600 font-normal">(Auto-Generated)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      api.getNextMemberId().then((res) => {
                        if (res?.nextId) {
                          setFormData((prev) => ({ ...prev, memberId: res.nextId }));
                        }
                      });
                    }}
                    title="Refresh to next available unique Member ID"
                    className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  placeholder="e.g. FC-1019"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg font-mono font-medium text-[#202124] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Deshmukh"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-[#E5E7EB] bg-gray-50 text-gray-500 text-xs font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="98220 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-r-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. rohan.deshmukh@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Date of Birth (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Date of Birth <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Gym Location */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Gym Location
                </label>
                <div className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-gray-50 text-slate-800 font-semibold flex items-center justify-between">
                  <span>{activeBranch?.name || 'Sagar Fitness Gym'}</span>
                  <span className="text-xs text-slate-400 font-normal">{activeBranch?.city || 'Pathardi'}</span>
                </div>
              </div>

              {/* Address (Optional) */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Residential Address <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Old Bus Stand, Main Road, Pathardi, Maharashtra 414102"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Emergency Contact Name (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Emergency Contact Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Deshmukh (Father)"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Emergency Contact Phone (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Emergency Contact Phone <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 98220 54321"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Member Photograph */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                  B
                </span>
                Member Photograph <span className="text-gray-400 font-normal capitalize">(Optional)</span>
              </h3>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-start gap-5">
              {/* Photo Display / Camera View */}
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#E5E7EB] bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                {cameraActive ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Floating quick flip button on preview */}
                    <button
                      type="button"
                      onClick={flipCamera}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 shadow-md"
                      title="Flip Camera (Front / Back)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Member Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <Camera className="w-8 h-8 mx-auto mb-1 stroke-1 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-500">No Photo</span>
                  </div>
                )}
              </div>

              {/* Photo Controls */}
              <div className="flex-1 space-y-2.5">
                <p className="text-xs text-[#6B7280]">
                  Capture member photo via webcam or upload an existing image from your computer/phone.
                </p>

                {/* Dismissable camera error banner */}
                {cameraError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p>{cameraError}</p>
                        <p className="mt-1 text-[11px] text-amber-700">
                          Tip: You can use the <strong>Upload Photo</strong> button below to select an image from your files.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCameraError(null)}
                      className="text-amber-700 hover:text-amber-900 text-sm font-bold p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!cameraActive && !capturedImage && (
                    <>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-gray-50 text-xs font-semibold text-[#202124] transition-colors shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        Take Photo
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition-colors shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        Upload Photo
                      </button>
                    </>
                  )}

                  {cameraActive && (
                    <>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Capture Photo
                      </button>

                      <button
                        type="button"
                        onClick={flipCamera}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors border border-slate-300/80 shadow-xs active:scale-95"
                        title="Switch between front selfie and rear back camera"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                        Flip Camera ({cameraFacingMode === 'user' ? 'Front' : 'Back'})
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Cancel Camera
                      </button>
                    </>
                  )}

                  {capturedImage && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedImage(null);
                          startCamera();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-gray-50 text-xs font-semibold text-[#202124] transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                        Retake Photo
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCapturedImage(null);
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-gray-50 text-xs font-semibold text-[#202124] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-gray-600" />
                        Upload Different Photo
                      </button>

                      <button
                        type="button"
                        onClick={() => setCapturedImage(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Photo
                      </button>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Membership & Payment */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                  C
                </span>
                Membership and Payment (₹)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Membership Plan */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Membership Plan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.planId}
                  onChange={(e) => {
                    const planId = e.target.value;
                    const p = plans.find((pl) => pl._id === planId);
                    const newPrice = p ? p.price : 0;
                    setFormData({
                      ...formData,
                      planId,
                      amountPaid: Math.max(0, newPrice - discountVal).toString(),
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none bg-white font-medium"
                >
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{p.price.toLocaleString('en-IN')} ({p.durationDays} Days)
                      {p.isPopular ? ' ★ Popular' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Expiration Date (Calculated in DD/MM/YYYY) */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Expiry Date <span className="text-[10px] text-gray-500 font-normal">(DD/MM/YYYY)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={expiryDateFormatted}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#202124] font-medium font-mono"
                />
              </div>

              {/* Plan Price */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Plan Price
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatINR(planPrice)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#E5E7EB] rounded-lg text-[#202124] font-semibold font-mono"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={planPrice}
                  value={formData.discount}
                  onChange={(e) => {
                    const disc = Math.max(0, Number(e.target.value) || 0);
                    setFormData({
                      ...formData,
                      discount: e.target.value,
                      amountPaid: Math.max(0, planPrice - disc).toString(),
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none font-mono"
                />
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none font-mono font-medium"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:border-blue-600 focus:outline-none bg-white font-medium"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                </select>
              </div>

              {/* Remaining Balance (Calculated) */}
              <div className="sm:col-span-2 lg:col-span-4 p-3 bg-gray-50 border border-[#E5E7EB] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Payment Summary:</span>
                  <div className="text-xs text-[#202124] mt-0.5">
                    Plan Price: <span className="font-semibold">{formatINR(planPrice)}</span>
                    {discountVal > 0 && (
                      <> — Discount: <span className="font-semibold text-red-600">-{formatINR(discountVal)}</span></>
                    )}
                    {' '}| Net Payable: <span className="font-bold">{formatINR(payableAmount)}</span>
                    {' '}| Paid: <span className="font-bold text-blue-700">{formatINR(amountPaidVal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Remaining Balance:</span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                      remainingBalance > 0
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-green-100 text-green-900 border-green-300'
                    }`}
                  >
                    {remainingBalance > 0 ? (
                      <>Due: {formatINR(remainingBalance)}</>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-700" />
                        Fully Paid ({formatINR(0)})
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Fixed Sticky Footer - Always Visible! */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Membership will be activated from {formatDateIN(startObj)} to {expiryDateFormatted}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto ml-auto">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="flex-1 sm:flex-none min-h-[44px] h-11 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="register-member-form"
              disabled={loading}
              className="flex-1 sm:flex-none min-h-[44px] h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registering Member...</span>
                </>
              ) : (
                <span>Register Member</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
