"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Gauge,
  RotateCw,
  Wrench,
  Package,
  Plus,
  Search,
  Bell,
  Settings,
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  LogOut,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Calendar,
  Sliders,
  Move,
  Activity,
  Edit,
  ShieldAlert,
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  db,
  auth,
  googleProvider,
  handleFirestoreError,
  OperationType,
  firebaseConfig,
  testConnection,
} from "../lib/firebase";

// Types
const FILIAIS = [
  { id: "MATRIZ", name: "MATRIZ" },
  { id: "CD_116", name: "CD 116" },
  { id: "CD_88", name: "CD 88" },
  { id: "CD_105", name: "CD 105" },
  { id: "CD_333", name: "CD 333" }
];

interface Rotation {
  id: string;
  veiculo: string;
  pneuRetirado: string;
  pneuInstalado: string;
  fluxo: string;
  data: string;
  status: string;
  fogoPneu?: string;
  branchId?: string;
  branchName?: string;
  createdBy?: string;
  userRole?: string;
}

interface Alignment {
  id: string;
  placa: string;
  tecnico: string;
  status: "Alinhado" | "Em Revisão" | "Pendente";
  autorizadoPor: string;
  defeito: string;
  data: string;
  fogoPneu?: string;
  branchId?: string;
  branchName?: string;
  createdBy?: string;
  userRole?: string;
}

interface Calibration {
  id: string;
  placa: string;
  tecnico: string;
  pneusCalibrados: string;
  pressaoAlvo: number;
  pressaoInicial: number;
  data: string;
  tipoVeiculo?: string;
  fogoPneu?: string;
  branchId?: string;
  branchName?: string;
  createdBy?: string;
  userRole?: string;
}

interface Balancing {
  id: string;
  placa: string;
  tecnico: string;
  pneusBalanceados: string;
  data: string;
  fogoPneu?: string;
  branchId?: string;
  branchName?: string;
  createdBy?: string;
  userRole?: string;
}

interface InventoryItem {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  meta: number;
  alerta: boolean;
  branchId?: string;
  branchName?: string;
  createdBy?: string;
  userRole?: string;
}

interface TreadMeasurement {
  id: string;
  fogoPneu: string;
  placa: string;
  sulco1: number;
  sulco2: number;
  sulco3: number;
  sulco4: number;
  tecnico: string;
  data: string;
  observacoes: string;
  status: string;
  branchId: string;
  branchName: string;
  createdBy: string;
  userRole: string;
}

interface TireMovement {
  id: string;
  fogoPneu: string;
  tecnico: string;
  placa: string;
  posicaoAtual: string;
  posicaoAnterior: string;
  pneuAtual: string;
  pneuAnterior: string;
  posicaoPneuAnterior?: string;
  data: string;
  observacoes: string;
  status: string;
  branchId: string;
  branchName: string;
  createdBy: string;
  userRole: string;
}

// Seeding helper to pre-fill stock catalog on first login
async function seedDefaultInventory(uid: string) {
  try {
    const defaultItems = [
      { id: "inv-1", nome: "Pneu Goodyear 205/55 R16", quantidade: 24, unidade: "unidades", meta: 10, alerta: false },
      { id: "inv-2", nome: "Pneu Pirelli 175/70 R14", quantidade: 15, unidade: "unidades", meta: 8, alerta: false },
      { id: "inv-3", nome: "Chumbo Balanceamento 5g", quantidade: 120, unidade: "unidades", meta: 50, alerta: false },
      { id: "inv-4", nome: "Válvulas de Ar (Bicos)", quantidade: 8, unidade: "unidades", meta: 20, alerta: true },
      { id: "inv-5", nome: "Graxa de Montagem", quantidade: 2, unidade: "líquidos", meta: 5, alerta: true }
    ];
    for (const item of defaultItems) {
      await setDoc(doc(db, "inventoryItems", item.id), {
        ...item,
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Failed to seed original catalog to Firestore: ", err);
  }
}

export default function BorrachariaProApp() {
  // Firebase Auth states
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authStatusMsg, setAuthStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Corporate login selectors
  const [loginBranchId, setLoginBranchId] = useState("MATRIZ");
  const [registerCargo, setRegisterCargo] = useState("");

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "calibragem" | "rodizio" | "alinhamento" | "sulco" | "movimentacao" | "permissoes"
  >("dashboard");

  // Core App State
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [alignments, setAlignments] = useState<Alignment[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [balancings, setBalancings] = useState<Balancing[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [treadMeasurements, setTreadMeasurements] = useState<TreadMeasurement[]>([]);
  const [tireMovements, setTireMovements] = useState<TireMovement[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Search filter & Period filters
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dashboard Day Filter state
  const [dayFilter, setDayFilter] = useState<"hoje" | "ontem" | "7d" | "15d" | "30d" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Master global branch filter
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("TODAS");

  const [calStartDateFilter, setCalStartDateFilter] = useState("");
  const [calEndDateFilter, setCalEndDateFilter] = useState("");
  const [rotStartDateFilter, setRotStartDateFilter] = useState("");
  const [rotEndDateFilter, setRotEndDateFilter] = useState("");
  const [alignStartDateFilter, setAlignStartDateFilter] = useState("");
  const [alignEndDateFilter, setAlignEndDateFilter] = useState("");

  // New Service modals
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [serviceTypeChoice, setServiceTypeChoice] = useState<
    "rodizio" | "alinhamento" | "calibragem" | "balanceamento"
  >("rodizio");

  // Form states (with fogoPneu)
  const [rotationForm, setRotationForm] = useState({
    placa: "",
    modeloAutomativo: "",
    pneuRetirado: "",
    posicaoRetirado: "Dianteiro Esq",
    novaPosicaoRetirado: "Estepe",
    dataRemocao: "",
    pneuInstalado: "",
    posicaoInstalado: "Estepe",
    novaPosicaoInstalado: "Dianteiro Esq",
    dataInstalacao: "",
    fogoPneu: "",
  });

  const [alignmentForm, setAlignmentForm] = useState({
    placa: "",
    tecnico: "",
    quemAutorizou: "",
    defeito: "",
    status: "Pendente" as "Alinhado" | "Em Revisão" | "Pendente",
    data: "",
    fogoPneu: "",
  });

  const [calibrationForm, setCalibrationForm] = useState<{
    placa: string;
    tecnico: string;
    pressaoAlvo: number | "";
    pressaoInicial: number | "";
    pneusContexto: string;
    tipoVeiculo: string;
    data: string;
    fogoPneu: string;
  }>({
    placa: "",
    tecnico: "Junior Silva",
    pressaoAlvo: "",
    pressaoInicial: "",
    pneusContexto: "",
    tipoVeiculo: "Truck",
    data: "",
    fogoPneu: "",
  });

  const [balancingForm, setBalancingForm] = useState({
    placa: "",
    tecnico: "Junior Silva",
    pneusBalanceados: "Todos os 4",
    data: "",
    fogoPneu: "",
  });

  // Tread Depth measurement forms
  const [treadForm, setTreadForm] = useState({
    fogoPneu: "",
    placa: "",
    sulco1: "8.0",
    sulco2: "8.0",
    sulco3: "8.0",
    sulco4: "8.0",
    tecnico: "",
    data: "",
    observacoes: "",
  });
  const [editingTreadId, setEditingTreadId] = useState<string | null>(null);

  // Tire movement forms
  const [movementForm, setMovementForm] = useState({
    fogoPneu: "",
    tecnico: "",
    placa: "",
    posicaoAtual: "Dianteiro Direito",
    posicaoAnterior: "Dianteiro Esquerdo",
    pneuAtual: "Michelin 295/80",
    pneuAnterior: "Sem Pneu",
    posicaoPneuAnterior: "Sucata",
    data: "",
    observacoes: "",
  });
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);

  // Users Directory form
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    role: "OPERADOR" as "MASTER" | "GERENTE" | "OPERADOR",
    branchId: "MATRIZ",
    cargo: "",
    status: "Ativo" as "Ativo" | "Inativo",
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Gauge state for real-time automatic counting animation
  const [gaugeValue, setGaugeValue] = useState<number | null>(null);
  const [gaugeState, setGaugeState] = useState<"idle" | "calibrating" | "completed">("idle");

  // AI Diagnostic Modal state
  const [selectedAlignment, setSelectedAlignment] = useState<Alignment | null>(
    null
  );
  const [aiDiagnosisText, setAiDiagnosisText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Pagination for tables
  const [alignmentPage, setAlignmentPage] = useState(1);
  const [treadPage, setTreadPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [treadStartDateFilter, setTreadStartDateFilter] = useState("");
  const [treadEndDateFilter, setTreadEndDateFilter] = useState("");
  const [movementStartDateFilter, setMovementStartDateFilter] = useState("");
  const [movementEndDateFilter, setMovementEndDateFilter] = useState("");
  const itemsPerPage = 4;  // Initialize with original Mock Data from Screenshots
  // Listen to Auth State
  useEffect(() => {
    // Validate Firestore connection on boot
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // A. Local user profile management and post-login verification guards
  useEffect(() => {
    if (!currentUser) {
      const timer = setTimeout(() => {
        setUserProfile(null);
        setAllUsers([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    // 1. Subscribe to active user profile
    const unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), async (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        setUserProfile(profileData);
      } else {
        // Automatically bootstrap profile on first registration
        const isMasterEmail = currentUser.email === "andreandersoncarvalhorocha1@gmail.com";
        const regBranchId = sessionStorage.getItem("registerBranchId") || "MATRIZ";
        const regCargo = sessionStorage.getItem("registerCargo") || "Operador Técnico";
        
        const defaultProf = {
          uid: currentUser.uid,
          email: currentUser.email || "",
          role: isMasterEmail ? "MASTER" : "OPERADOR",
          branchId: isMasterEmail ? "MATRIZ" : regBranchId,
          branchName: FILIAIS.find(f => f.id === (isMasterEmail ? "MATRIZ" : regBranchId))?.name || "MATRIZ",
          cargo: isMasterEmail ? "Master Global" : regCargo,
          status: "Ativo",
        };
        await setDoc(doc(db, "users", currentUser.uid), {
          ...defaultProf,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setUserProfile(defaultProf);
      }
    });

    return () => unsubProfile();
  }, [currentUser]);

  // B. Verification Guard for status and allowed branch login
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const verifyAccess = async () => {
      if (userProfile.status === "Inativo") {
        alert("Acesso Negado: Sua conta foi inativada por um administrador MASTER.");
        await signOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        return;
      }

      const savedLoginBranch = sessionStorage.getItem("loginBranchId") || userProfile.branchId;
      if (userProfile.role !== "MASTER" && userProfile.branchId !== savedLoginBranch) {
        alert(`Acesso Negado: Seu perfil pertence à filial ${userProfile.branchName} e não à filial de login (${savedLoginBranch}).`);
        await signOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        return;
      }

      if (userProfile.role === "MASTER" && savedLoginBranch) {
        setSelectedBranchFilter(savedLoginBranch);
      }
    };

    verifyAccess();
  }, [currentUser, userProfile]);

  // C. Sync state data from Firestore based on roles and branch boundaries
  useEffect(() => {
    if (!currentUser || !userProfile) {
      const timer = setTimeout(() => {
        setRotations([]);
        setAlignments([]);
        setCalibrations([]);
        setBalancings([]);
        setInventoryItems([]);
        setTreadMeasurements([]);
        setTireMovements([]);
        setAllUsers([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const { role, branchId } = userProfile;
    const isMasterUser = role === "MASTER";

    // Build branch-restricted or master-consolidated queries
    const rotationsQuery = isMasterUser 
      ? collection(db, "rotations")
      : query(collection(db, "rotations"), where("branchId", "==", branchId));

    const alignmentsQuery = isMasterUser 
      ? collection(db, "alignments")
      : query(collection(db, "alignments"), where("branchId", "==", branchId));

    const calibrationsQuery = isMasterUser 
      ? collection(db, "calibrations")
      : query(collection(db, "calibrations"), where("branchId", "==", branchId));

    const balancingsQuery = isMasterUser 
      ? collection(db, "balancings")
      : query(collection(db, "balancings"), where("branchId", "==", branchId));

    const inventoryQuery = isMasterUser 
      ? collection(db, "inventoryItems")
      : query(collection(db, "inventoryItems"), where("branchId", "==", branchId));

    const treadQuery = isMasterUser 
      ? collection(db, "treadMeasurements")
      : query(collection(db, "treadMeasurements"), where("branchId", "==", branchId));

    const movementsQuery = isMasterUser 
      ? collection(db, "tireMovements")
      : query(collection(db, "tireMovements"), where("branchId", "==", branchId));

    // Listeners setup
    const unsubRotations = onSnapshot(rotationsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as Rotation[];
      list.sort((a, b) => b.id.localeCompare(a.id));
      setRotations(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "rotations"));

    const unsubAlignments = onSnapshot(alignmentsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as Alignment[];
      list.sort((a, b) => b.id.localeCompare(a.id));
      setAlignments(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "alignments"));

    const unsubCalibrations = onSnapshot(calibrationsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as Calibration[];
      list.sort((a, b) => b.id.localeCompare(a.id));
      setCalibrations(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "calibrations"));

    const unsubBalancings = onSnapshot(balancingsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as Balancing[];
      list.sort((a, b) => b.id.localeCompare(a.id));
      setBalancings(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "balancings"));

    const unsubTread = onSnapshot(treadQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as TreadMeasurement[];
      list.sort((a, b) => b.id.localeCompare(a.id));
      setTreadMeasurements(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "treadMeasurements"));

    const unsubMovements = onSnapshot(movementsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as TireMovement[];
      list.sort((a, b) => b.id.localeCompare(a.id));
      setTireMovements(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "tireMovements"));

    // Inventory synchronization (Auto seed if branch-specific list is empty)
    const unsubInventory = onSnapshot(inventoryQuery, async (snapshot) => {
      if (snapshot.empty) {
        await seedDefaultInventory(currentUser.uid);
        return;
      }
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as InventoryItem[];
      setInventoryItems(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "inventoryItems"));

    // MASTER-only Users snapshot stream
    let unsubUsers = () => {};
    if (isMasterUser) {
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllUsers(list);
      }, (err) => handleFirestoreError(err, OperationType.LIST, "users"));
    }

    return () => {
      unsubRotations();
      unsubAlignments();
      unsubCalibrations();
      unsubBalancings();
      unsubTread();
      unsubMovements();
      unsubInventory();
      unsubUsers();
    };
  }, [currentUser, userProfile]);

  // Set today's date in form fields with default values
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const timer = setTimeout(() => {
      setRotationForm((prev) => ({
        ...prev,
        dataRemocao: todayStr,
        dataInstalacao: todayStr,
      }));
      setAlignmentForm((prev) => ({
        ...prev,
        data: todayStr,
      }));
      setCalibrationForm((prev) => ({
        ...prev,
        data: todayStr,
      }));
      setBalancingForm((prev) => ({
        ...prev,
        data: todayStr,
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // Save states helper
  const updateLocalStorage = (
    key: string,
    data: any,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    setter(data);
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Plate validation regex utility standard (AAA-0000 or AAA0A00 / AAA-0A00)
  const validateAndFormatPlate = (
    rawPlate: string,
    serviceType: "rodizio" | "alinhamento" | "calibragem" | "balanceamento",
    serviceDate: string
  ): { isValid: boolean; formattedPlate: string; errorMsg: string | null } => {
    const clean = rawPlate.trim().toUpperCase();
    
    // Pattern designed to match Brazilian standard (AAA-1234) and Mercosul plates (AAA1A23), allowing optional hyphen
    const plateRegex = /^([A-Z]{3})-?([0-9])([A-Z0-9])([0-9]{2})$/;
    const match = clean.match(plateRegex);
    
    if (!match) {
      return {
        isValid: false,
        formattedPlate: clean,
        errorMsg: "Placa inválida! Insira no formato padrão nacional (ex: AAA-0000) ou Mercosul (ex: AAA-1A23).",
      };
    }
    
    // Normalize into standard formatted layout (e.g., AAA-0000 or AAA-0A00)
    const formattedPlate = `${match[1]}-${match[2]}${match[3]}${match[4]}`;
    const targetDate = serviceDate || new Date().toISOString().split("T")[0];

    // Double registration check for same service on the same day
    let isDuplicated = false;
    if (serviceType === "calibragem") {
      isDuplicated = calibrations.some(
        (c) => c.placa.toUpperCase() === formattedPlate && c.data === targetDate
      );
    } else if (serviceType === "rodizio") {
      isDuplicated = rotations.some(
        (r) => r.veiculo.toUpperCase() === formattedPlate && r.data === targetDate
      );
    } else if (serviceType === "alinhamento") {
      isDuplicated = alignments.some(
        (a) => a.placa.toUpperCase() === formattedPlate && a.data === targetDate
      );
    } else if (serviceType === "balanceamento") {
      isDuplicated = balancings.some(
        (b) => b.placa.toUpperCase() === formattedPlate && b.data === targetDate
      );
    }

    if (isDuplicated) {
      return {
        isValid: false,
        formattedPlate,
        errorMsg: `Este veículo (${formattedPlate}) já foi registrado no serviço de ${serviceType} hoje (${targetDate.split("-").reverse().join("/")})!`,
      };
    }

    return {
      isValid: true,
      formattedPlate,
      errorMsg: null,
    };
  };

  // Custom interactive states for deletion confirmation modal & system toasted status
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "calibration" | "rotation" | "alignment" | null;
    targetId: string | null;
    label: string;
    plate: string;
  }>({
    isOpen: false,
    type: null,
    targetId: null,
    label: "",
    plate: "",
  });

  const [isDeleting, setIsDeleting] = useState(false);

  // High-performance Toast Notifications state engine
  interface ToastMessage {
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Safe orchestrators to trigger confirmation workflows
  const handleDeleteCalibration = (id: string) => {
    const target = calibrations.find((c) => c.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: "calibration",
      targetId: id,
      plate: target ? target.placa : "Desconhecida",
      label: "Serviço de Calibragem",
    });
  };

  const handleDeleteRotation = (id: string) => {
    const target = rotations.find((r) => r.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: "rotation",
      targetId: id,
      plate: target ? target.veiculo : "Desconhecida",
      label: "Rodízio de Pneus / Estepe",
    });
  };

  const handleDeleteAlignment = (id: string) => {
    const target = alignments.find((a) => a.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: "alignment",
      targetId: id,
      plate: target ? target.placa : "Desconhecida",
      label: "Alinhamento de Geometria",
    });
  };

  // Execution engine: applies dynamic mutations, handles rollbacks, saves to DB/localStorage and notifies realtime loops
  const executeExclusion = async () => {
    if (!deleteConfirm.targetId || !deleteConfirm.type) return;
    setIsDeleting(true);

    try {
      const { type, targetId, plate } = deleteConfirm;
      const colName = type === "calibration" ? "calibrations" : type === "rotation" ? "rotations" : "alignments";

      await deleteDoc(doc(db, colName, targetId));

      if (type === "calibration") {
        addToast(`Calibragem do veículo ${plate} excluída. Indicadores e totais recalculados!`, "success");
      } else if (type === "rotation") {
        addToast(`Registro de rodízios do veículo ${plate} removido com sucesso de todos os painéis.`, "success");
      } else if (type === "alignment") {
        addToast(`Serviço de alinhamento ${plate} deletado permanentemente. Grafos atualizados.`, "success");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${deleteConfirm.type}s/${deleteConfirm.targetId}`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({
        isOpen: false,
        type: null,
        targetId: null,
        label: "",
        plate: "",
      });
    }
  };

  // Month selector for the dashboard
  const [selectedMonth, setSelectedMonth] = useState<string>("Todos");
  const [hoveredWeekIdx, setHoveredWeekIdx] = useState<number | null>(null);

  // Date range checker relative to selected global Day Filter
  const dateWithinRange = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const recordDate = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dayFilter === "hoje") {
      const startOfToday = new Date(today);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      return recordDate >= startOfToday && recordDate <= endOfToday;
    }
    if (dayFilter === "ontem") {
      const startOfYesterday = new Date(yesterday);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return recordDate >= startOfYesterday && recordDate <= endOfYesterday;
    }
    if (dayFilter === "7d") {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return recordDate >= start;
    }
    if (dayFilter === "15d") {
      const start = new Date(today);
      start.setDate(start.getDate() - 15);
      return recordDate >= start;
    }
    if (dayFilter === "30d") {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return recordDate >= start;
    }
    if (dayFilter === "custom") {
      const start = customStartDate ? new Date(customStartDate + "T00:00:00") : null;
      const end = customEndDate ? new Date(customEndDate + "T23:59:59") : null;
      if (start && end) return recordDate >= start && recordDate <= end;
      if (start) return recordDate >= start;
      if (end) return recordDate <= end;
      return true;
    }
    return true;
  };

  const isBranchAllowed = (bId: string | undefined): boolean => {
    if (!bId) return true; // fallback
    if (userProfile?.role === "MASTER") {
      if (selectedBranchFilter === "TODAS") return true;
      return bId === selectedBranchFilter;
    }
    return bId === userProfile?.branchId;
  };

  const filteredAlignmentsByMonth = alignments.filter((a) => {
    if (!dateWithinRange(a.data)) return false;
    if (!isBranchAllowed(a.branchId)) return false;
    if (selectedMonth === "Todos") return true;
    if (!a.data) return false;
    const parts = a.data.split("-");
    return parts[1] === selectedMonth;
  });

  const filteredRotationsByMonth = rotations.filter((r) => {
    if (!dateWithinRange(r.data)) return false;
    if (!isBranchAllowed(r.branchId)) return false;
    if (selectedMonth === "Todos") return true;
    if (!r.data) return false;
    const parts = r.data.split("-");
    return parts[1] === selectedMonth;
  });

  const filteredCalibrationsByMonth = calibrations.filter((c) => {
    if (!dateWithinRange(c.data)) return false;
    if (!isBranchAllowed(c.branchId)) return false;
    if (selectedMonth === "Todos") return true;
    if (!c.data) return false;
    const parts = c.data.split("-");
    return parts[1] === selectedMonth;
  });

  const filteredBalancingsByMonth = balancings.filter((b) => {
    if (!dateWithinRange(b.data)) return false;
    if (!isBranchAllowed(b.branchId)) return false;
    if (selectedMonth === "Todos") return true;
    if (!b.data) return false;
    const parts = b.data.split("-");
    return parts[1] === selectedMonth;
  });

  const filteredTreadsByMonth = treadMeasurements.filter((t) => {
    if (!dateWithinRange(t.data)) return false;
    if (!isBranchAllowed(t.branchId)) return false;
    if (selectedMonth === "Todos") return true;
    if (!t.data) return false;
    const parts = t.data.split("-");
    return parts[1] === selectedMonth;
  });

  const filteredMovementsByMonth = tireMovements.filter((m) => {
    if (!dateWithinRange(m.data)) return false;
    if (!isBranchAllowed(m.branchId)) return false;
    if (selectedMonth === "Todos") return true;
    if (!m.data) return false;
    const parts = m.data.split("-");
    return parts[1] === selectedMonth;
  });

  // KPI calculations (100% dynamic, based strictly on direct saved inputs and filtered by selected month)
  const totalServices = filteredCalibrationsByMonth.length + filteredRotationsByMonth.length + filteredAlignmentsByMonth.length + filteredBalancingsByMonth.length + filteredTreadsByMonth.length + filteredMovementsByMonth.length;
  const totalAlignmentsCount = filteredAlignmentsByMonth.length;
  const totalRotationsCount = filteredRotationsByMonth.length;
  const totalCalibrationsCount = filteredCalibrationsByMonth.length;
  const totalBalancingsCount = filteredBalancingsByMonth.length;
  const totalTreadsCount = filteredTreadsByMonth.length;
  const totalMovementsCount = filteredMovementsByMonth.length;

  // Calculate tires calibrated dynamically from the input description
  const totalTiresCalibrated = filteredCalibrationsByMonth.reduce((sum, c) => {
    const text = (c.pneusCalibrados || "").toLowerCase();
    const match = text.match(/\d+/);
    if (match) {
      return sum + parseInt(match[0], 10);
    }
    if (text.includes("todos") || text.includes("completo") || text.includes("all")) {
      return sum + 4;
    }
    if (text.includes("dianteir") || text.includes("traseir") || text.includes("par") || text.includes("dois") || text.includes("duas")) {
      return sum + 2;
    }
    if (text.includes("estepe") || text.includes("um") || text.includes("uma")) {
      return sum + 1;
    }
    return sum + 4;
  }, 0);

  // Total de pneus calibrados em todo o histórico (sem filtro de mês)
  const totalTiresCalibratedAll = calibrations.reduce((sum, c) => {
    const text = (c.pneusCalibrados || "").toLowerCase();
    const match = text.match(/\d+/);
    if (match) return sum + parseInt(match[0], 10);
    if (text.includes("todos") || text.includes("completo") || text.includes("all")) {
      return sum + 4;
    }
    if (text.includes("dianteir") || text.includes("traseir") || text.includes("par") || text.includes("dois") || text.includes("duas")) {
      return sum + 2;
    }
    if (text.includes("estepe") || text.includes("um") || text.includes("uma")) {
      return sum + 1;
    }
    return sum + 4;
  }, 0);

  // Função auxiliar para contar pneus de veículos por tipo
  const getTiresByVehicleType = (type: string) => {
    return calibrations
      .filter((c) => c.tipoVeiculo === type)
      .reduce((sum, c) => {
        const text = (c.pneusCalibrados || "").toLowerCase();
        const match = text.match(/\d+/);
        if (match) return sum + parseInt(match[0], 10);
        if (text.includes("todos") || text.includes("completo") || text.includes("all")) return sum + 4;
        if (text.includes("dianteir") || text.includes("traseir") || text.includes("par") || text.includes("dois") || text.includes("duas")) return sum + 2;
        if (text.includes("estepe") || text.includes("um") || text.includes("uma")) return sum + 1;
        return sum + 4;
      }, 0);
  };

  // Total de pneus calibrados hoje especificamente
  const tiresCalibratedToday = calibrations
    .filter((c) => c.data === new Date().toISOString().split("T")[0])
    .reduce((sum, c) => {
      const text = (c.pneusCalibrados || "").toLowerCase();
      const match = text.match(/\d+/);
      if (match) return sum + parseInt(match[0], 10);
      if (text.includes("todos") || text.includes("completo") || text.includes("all")) return sum + 4;
      if (text.includes("dianteir") || text.includes("traseir") || text.includes("par") || text.includes("dois") || text.includes("duas")) return sum + 2;
      if (text.includes("estepe") || text.includes("um") || text.includes("uma")) return sum + 1;
      return sum + 4;
    }, 0);

  const pneusMovimentadosCount = totalMovementsCount;
  const carrosEmRodizioCount = filteredRotationsByMonth.length;
  const veiculosAlinhadosHojeCount = filteredAlignmentsByMonth.filter(
    (a) =>
      a.data === new Date().toISOString().split("T")[0] &&
      a.status === "Alinhado"
  ).length;

  const calibragensHojeCount = filteredCalibrationsByMonth.filter(
    (c) => c.data === new Date().toISOString().split("T")[0]
  ).length;

  // Financial Ledger revenue calculation
  const revCal = filteredCalibrationsByMonth.length * 10;
  const revRot = filteredRotationsByMonth.length * 60;
  const revAlign = filteredAlignmentsByMonth.length * 90;
  const totalFinancialRevenue = revCal + revRot + revAlign;

  const pctAlign = totalFinancialRevenue > 0 ? Math.round((revAlign / totalFinancialRevenue) * 100) : 0;
  const pctRot = totalFinancialRevenue > 0 ? Math.round((revRot / totalFinancialRevenue) * 100) : 0;
  const pctCal = totalFinancialRevenue > 0 ? Math.round((revCal / totalFinancialRevenue) * 100) : 0;

  // Inventory logic: count critical items
  const alertInventoryCount = inventoryItems.filter((item) => item.quantidade <= item.meta * 0.2).length;

  // Inventory state and handlers
  const [newInventoryForm, setNewInventoryForm] = useState({
    nome: "",
    quantidade: "",
    meta: "",
    unidade: "unidades",
  });

  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryForm.nome.trim()) return alert("Por favor, preencha o nome do item!");
    const qty = parseInt(newInventoryForm.quantidade);
    const targetMeta = parseInt(newInventoryForm.meta);
    if (isNaN(qty) || qty < 0) return alert("Quantidade inicial inválida!");
    if (isNaN(targetMeta) || targetMeta <= 0) return alert("Meta de segurança inválida!");

    const newItem: InventoryItem = {
      id: "inv-" + Date.now(),
      nome: newInventoryForm.nome.trim(),
      quantidade: qty,
      unidade: newInventoryForm.unidade,
      meta: targetMeta,
      alerta: qty <= targetMeta * 0.2,
    };

    if (!currentUser) return alert("Por favor, realize login para salvar itens no estoque.");

    try {
      await setDoc(doc(db, "inventoryItems", newItem.id), {
        ...newItem,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inventoryItems/${newItem.id}`);
    }
    
    setNewInventoryForm({
      nome: "",
      quantidade: "",
      meta: "",
      unidade: "unidades",
    });
    alert("Item adicionado ao estoque!");
  };

  // Service submit handlers
  const validateAndDecrementStock = async (tireName: string, serviceLabel: string): Promise<{ success: boolean; errorMsg?: string }> => {
    if (!tireName || !tireName.trim() || tireName.toLowerCase() === "sem pneu" || tireName.toLowerCase() === "sucata") {
      return { success: true };
    }

    const targetName = tireName.toLowerCase().trim();

    // Find custom match
    // 1. Exact or direct inclusion
    let matchedItem = inventoryItems.find((i) => {
      const name = i.nome.toLowerCase().trim();
      return name === targetName || name.includes(targetName) || targetName.includes(name);
    });

    // 2. Word overlapping match if not matched yet
    if (!matchedItem) {
      const ignoreWords = ["pneu", "pneus", "de", "com", "sem", "marca", "unidades", "unidade"];
      const searchWords = targetName.split(/[\s/\-R]+/).filter((w) => w.length > 2 && !ignoreWords.includes(w));
      
      if (searchWords.length > 0) {
        matchedItem = inventoryItems.find((i) => {
          const name = i.nome.toLowerCase().trim();
          return searchWords.every((word) => name.includes(word));
        });
        
        if (!matchedItem) {
          matchedItem = inventoryItems.find((i) => {
            const name = i.nome.toLowerCase().trim();
            return searchWords.some((word) => {
              const isBrandOrMeasure = /^[a-zA-Z]{4,}$/.test(word) || /\d+/.test(word);
              return isBrandOrMeasure && name.includes(word);
            });
          });
        }
      }
    }

    if (!matchedItem) {
      const availableTires = inventoryItems
        .filter((i) => i.nome.toLowerCase().includes("pneu"))
        .map((i) => `"${i.nome}" (Saldo: ${i.quantidade})`)
        .join("\n- ");
      
      const listMsg = availableTires.length > 0
        ? `\nPneus atualmente cadastrados no estoque:\n- ${availableTires}`
        : "\nNão há pneus cadastrados no Estoque atualmente.";

      return {
        success: false,
        errorMsg: `❌ O item "${tireName}" não foi encontrado no estoque para o serviço de ${serviceLabel}.${listMsg}\n\nPor favor, cadastre este pneu no Estoque com quantidade positiva ou clique em nossas sugestões do estoque!`,
      };
    }

    if (matchedItem.quantidade < 1) {
      return {
        success: false,
        errorMsg: `❌ O pneu "${matchedItem.nome}" está esgotado no estoque (Saldo: 0). Reabasteça o estoque antes de salvar o serviço de ${serviceLabel}!`,
      };
    }

    // Decrement the quantity securely on Firestore
    try {
      const nextQuantity = matchedItem.quantidade - 1;
      await updateDoc(doc(db, "inventoryItems", matchedItem.id), {
        quantidade: nextQuantity,
        alerta: nextQuantity <= matchedItem.meta * 0.2,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (err) {
      console.error("Erro ao decrementar estoque de pneu:", err);
      return {
        success: false,
        errorMsg: "❌ Ocorreu um erro ao atualizar a quantidade do pneu no estoque. Tente novamente.",
      };
    }
  };

  const handleAddRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotationForm.placa) return alert("Por favor, preencha a placa!");

    const serviceDate = rotationForm.dataRemocao || new Date().toISOString().split("T")[0];
    const validation = validateAndFormatPlate(rotationForm.placa, "rodizio", serviceDate);
    if (!validation.isValid) {
      return alert(validation.errorMsg);
    }

    if (!currentUser) return alert("Por favor, faça login para registrar serviços.");

    // Validate if required tire exists in stock and automatically decrement it if available
    const stockCheck = await validateAndDecrementStock(rotationForm.pneuInstalado, "rodízio");
    if (!stockCheck.success) {
      return alert(stockCheck.errorMsg);
    }

    const newRot: Rotation = {
      id: `rot-${Date.now()}`,
      veiculo: validation.formattedPlate,
      pneuRetirado: rotationForm.pneuRetirado,
      pneuInstalado: rotationForm.pneuInstalado,
      fluxo: `${rotationForm.posicaoRetirado.toUpperCase()} → ${rotationForm.novaPosicaoRetirado.toUpperCase()}`,
      data: serviceDate,
      status: "CONCLUÍDO",
    };

    try {
      await setDoc(doc(db, "rotations", newRot.id), {
        ...newRot,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rotations/${newRot.id}`);
    }

    setIsNewServiceModalOpen(false);
    // Reset alert inventory if item is used or increase counters
    // Success feedback
    setRotationForm({
      placa: "",
      modeloAutomativo: "",
      pneuRetirado: "Goodyear 205/55",
      posicaoRetirado: "Dianteiro Esq",
      novaPosicaoRetirado: "Estepe",
      dataRemocao: new Date().toISOString().split("T")[0],
      pneuInstalado: "Michelin LTX Force 215/65",
      posicaoInstalado: "Estepe",
      novaPosicaoInstalado: "Dianteiro Esq",
      dataInstalacao: new Date().toISOString().split("T")[0],
      fogoPneu: "",
    });
    alert("Rodízio de pneus registrado com sucesso!");
  };

  const handleAddAlignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alignmentForm.placa) return alert("Por favor, informe a placa!");

    if (!alignmentForm.tecnico || !alignmentForm.tecnico.trim()) {
      return alert("Por favor, preencha o técnico responsável!");
    }

    const serviceDate = alignmentForm.data || new Date().toISOString().split("T")[0];
    const validation = validateAndFormatPlate(alignmentForm.placa, "alinhamento", serviceDate);
    if (!validation.isValid) {
      return alert(validation.errorMsg);
    }

    const newAlign: Alignment = {
      id: `align-${Date.now()}`,
      placa: validation.formattedPlate,
      tecnico: alignmentForm.tecnico,
      status: alignmentForm.status,
      autorizadoPor: alignmentForm.quemAutorizou || "Cliente Direto",
      defeito: alignmentForm.defeito || "Nenhum defeito relatado (revisão preventiva).",
      data: serviceDate,
    };

    if (!currentUser) return alert("Por favor, faça login para registrar serviços de alinhamento.");

    try {
      await setDoc(doc(db, "alignments", newAlign.id), {
        ...newAlign,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `alignments/${newAlign.id}`);
    }

    setIsNewServiceModalOpen(false);

    // Reset Form
    setAlignmentForm({
      placa: "",
      tecnico: "",
      quemAutorizou: "",
      defeito: "",
      status: "Pendente",
      data: new Date().toISOString().split("T")[0],
      fogoPneu: "",
    });
    alert("Registro de alinhamento salvo com sucesso!");
  };

  const handleAddTread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treadForm.fogoPneu || !treadForm.fogoPneu.trim()) return alert("Por favor, preencha o FOGO DO PNEU!");
    if (!treadForm.placa || !treadForm.placa.trim()) return alert("Por favor, preencha a placa!");
    if (!treadForm.tecnico || !treadForm.tecnico.trim()) return alert("Por favor, informe o responsável pela medição!");

    const serviceDate = treadForm.data || new Date().toISOString().split("T")[0];
    
    if (!currentUser || !userProfile) {
      return alert("Realize login para registrar medições de sulco.");
    }

    const { branchId, branchName, role, email } = userProfile;

    const treadId = editingTreadId || `tread-${Date.now()}`;
    const entry: TreadMeasurement = {
      id: treadId,
      fogoPneu: treadForm.fogoPneu.trim().toUpperCase(),
      placa: treadForm.placa.trim().toUpperCase(),
      sulco1: parseFloat(treadForm.sulco1) || 0,
      sulco2: parseFloat(treadForm.sulco2) || 0,
      sulco3: parseFloat(treadForm.sulco3) || 0,
      sulco4: parseFloat(treadForm.sulco4) || 0,
      tecnico: treadForm.tecnico,
      data: serviceDate,
      observacoes: treadForm.observacoes || "",
      status: "Medido",
      branchId: branchId || "MATRIZ",
      branchName: branchName || "MATRIZ",
      createdBy: email || currentUser.email || "",
      userRole: role || "OPERADOR",
    };

    try {
      await setDoc(doc(db, "treadMeasurements", entry.id), {
        ...entry,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert(editingTreadId ? "Medição de sulco atualizada com sucesso!" : "Medição de sulco registrada com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `treadMeasurements/${entry.id}`);
    }

    // Reset Form
    setTreadForm({
      fogoPneu: "",
      placa: "",
      sulco1: "8.0",
      sulco2: "8.0",
      sulco3: "8.0",
      sulco4: "8.0",
      tecnico: "",
      data: new Date().toISOString().split("T")[0],
      observacoes: "",
    });
    setEditingTreadId(null);
  };

  const handleDeleteTread = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta medição de sulco?")) return;
    try {
      await deleteDoc(doc(db, "treadMeasurements", id));
      alert("Medição excluída com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `treadMeasurements/${id}`);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm.fogoPneu || !movementForm.fogoPneu.trim()) return alert("Informe o campo FOGO DO PNEU!");
    if (!movementForm.placa || !movementForm.placa.trim()) return alert("Informe a placa do veículo!");
    if (!movementForm.tecnico || !movementForm.tecnico.trim()) return alert("Informe o responsável técnico!");

    const serviceDate = movementForm.data || new Date().toISOString().split("T")[0];

    if (!currentUser || !userProfile) {
      return alert("Realize login para poder registrar movimentações de pneus.");
    }

    // Validate if required tire exists in stock and automatically decrement it if available
    if (!editingMovementId) {
      const stockCheck = await validateAndDecrementStock(movementForm.pneuAtual, "movimentação");
      if (!stockCheck.success) {
        return alert(stockCheck.errorMsg);
      }
    }

    const { branchId, branchName, role, email } = userProfile;

    const moveId = editingMovementId || `move-${Date.now()}`;
    const entry: TireMovement = {
      id: moveId,
      fogoPneu: movementForm.fogoPneu.trim().toUpperCase(),
      tecnico: movementForm.tecnico,
      placa: movementForm.placa.trim().toUpperCase(),
      posicaoAtual: movementForm.posicaoAtual,
      posicaoAnterior: movementForm.posicaoAnterior,
      pneuAtual: movementForm.pneuAtual,
      pneuAnterior: movementForm.pneuAnterior,
      posicaoPneuAnterior: movementForm.posicaoPneuAnterior,
      data: serviceDate,
      observacoes: movementForm.observacoes || "",
      status: "Movimentado",
      branchId: branchId || "MATRIZ",
      branchName: branchName || "MATRIZ",
      createdBy: email || currentUser.email || "",
      userRole: role || "OPERADOR",
    };

    try {
      await setDoc(doc(db, "tireMovements", entry.id), {
        ...entry,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert(editingMovementId ? "Movimentação de pneus atualizada com sucesso!" : "Movimentação de pneus registrada com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tireMovements/${entry.id}`);
    }

    setMovementForm({
      fogoPneu: "",
      tecnico: "",
      placa: "",
      posicaoAtual: "Dianteiro Direito",
      posicaoAnterior: "Dianteiro Esquerdo",
      pneuAtual: "Michelin 295/80",
      pneuAnterior: "Sem Pneu",
      posicaoPneuAnterior: "Sucata",
      data: new Date().toISOString().split("T")[0],
      observacoes: "",
    });
    setEditingMovementId(null);
  };

  const handleDeleteMovement = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta movimentação de pneus?")) return;
    try {
      await deleteDoc(doc(db, "tireMovements", id));
      alert("Movimentação de pneu excluída!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tireMovements/${id}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email || !userForm.email.trim()) return alert("Informe o email!");
    if (!userForm.cargo || !userForm.cargo.trim()) return alert("Informe o cargo corporativo!");

    const userId = editingUserId || `user-${Date.now()}`;
    const branchName = FILIAIS.find(f => f.id === userForm.branchId)?.name || "MATRIZ";

    const entry = {
      uid: userId,
      email: userForm.email.trim(),
      role: userForm.role,
      branchId: userForm.branchId,
      branchName: branchName,
      cargo: userForm.cargo,
      status: userForm.status,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "users", userId), entry, { merge: true });
      alert(editingUserId ? "Perfil de acesso atualizado com sucesso!" : "Novo usuário cadastrado com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}`);
    }

    setUserForm({
      email: "",
      password: "",
      role: "OPERADOR",
      branchId: "MATRIZ",
      cargo: "",
      status: "Ativo",
    });
    setEditingUserId(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.uid) {
      return alert("Erro: Você não pode excluir seu próprio perfil administrativo!");
    }
    if (!window.confirm("Deseja realmente remover os privilégios deste usuário?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      alert("Usuário removido com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const handleAddCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calibrationForm.placa) return alert("Por favor, preencha a placa!");
    if (!calibrationForm.tecnico || !calibrationForm.tecnico.trim()) {
      return alert("Por favor, informe o técnico responsável!");
    }
    if (!calibrationForm.pneusContexto) {
      return alert("Por favor, preencha o conjunto ou quantidade de pneus!");
    }
    if (calibrationForm.pressaoAlvo === "") {
      return alert("Por favor, preencha a pressão final (libras)!");
    }
    if (calibrationForm.pressaoInicial === "") {
      return alert("Por favor, preencha a pressão inicial (libras)!");
    }

    const targetPressure = Number(calibrationForm.pressaoAlvo);
    const initialPressure = Number(calibrationForm.pressaoInicial);

    if (targetPressure <= initialPressure) {
      return alert("A Pressão Final Desejada deve ser maior que a Pressão Inicial Encontrada.");
    }

    const serviceDate = calibrationForm.data || new Date().toISOString().split("T")[0];
    const validation = validateAndFormatPlate(calibrationForm.placa, "calibragem", serviceDate);
    if (!validation.isValid) {
      return alert(validation.errorMsg);
    }

    const newCal: Calibration = {
      id: `cal-${Date.now()}`,
      placa: validation.formattedPlate,
      tecnico: calibrationForm.tecnico,
      pneusCalibrados: calibrationForm.pneusContexto,
      pressaoAlvo: targetPressure,
      pressaoInicial: initialPressure,
      data: serviceDate,
      tipoVeiculo: calibrationForm.tipoVeiculo,
    };

    if (!currentUser) return alert("Por favor, faça login para registrar calibragens.");

    try {
      await setDoc(doc(db, "calibrations", newCal.id), {
        ...newCal,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `calibrations/${newCal.id}`);
    }

    setIsNewServiceModalOpen(false);

    // 2. Iniciar contagem automática e simulação no pressostato
    setGaugeState("calibrating");
    let currentTemp = initialPressure;
    setGaugeValue(currentTemp);

    const stepTime = Math.max(30, Math.min(120, 800 / (Math.abs(targetPressure - initialPressure) || 1))); // Ajustado para demorar por volta de 1 a 1.5 segundos
    
    const interval = setInterval(() => {
      if (currentTemp < targetPressure) {
        currentTemp += 1;
        setGaugeValue(currentTemp);
      } else if (currentTemp > targetPressure) {
        currentTemp -= 1;
        setGaugeValue(currentTemp);
      } else {
        // Chegou exatamente ao valor final/alvo
        clearInterval(interval);
        setGaugeState("completed");
        
        // Mantém indicação de Concluído por 2 segundos, depois volta a idle
        setTimeout(() => {
          setGaugeState("idle");
          setGaugeValue(null);
        }, 2200);
      }
    }, stepTime);

    // Reset Form
    setCalibrationForm({
      placa: "",
      tecnico: "Junior Silva",
      pressaoAlvo: "",
      pressaoInicial: "",
      pneusContexto: "",
      tipoVeiculo: "Truck",
      data: new Date().toISOString().split("T")[0],
      fogoPneu: "",
    });
  };

  const handleAddBalancing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balancingForm.placa) return alert("Por favor, preencha a placa!");
    if (!balancingForm.tecnico || !balancingForm.tecnico.trim()) {
      return alert("Por favor, informe o técnico responsável!");
    }

    const serviceDate = balancingForm.data || new Date().toISOString().split("T")[0];
    const validation = validateAndFormatPlate(balancingForm.placa, "balanceamento", serviceDate);
    if (!validation.isValid) {
      return alert(validation.errorMsg);
    }

    const newBal: Balancing = {
      id: `bal-${Date.now()}`,
      placa: validation.formattedPlate,
      tecnico: balancingForm.tecnico,
      pneusBalanceados: balancingForm.pneusBalanceados,
      data: serviceDate,
    };

    if (!currentUser) return alert("Por favor, faça login para registrar balanceamentos.");

    try {
      await setDoc(doc(db, "balancings", newBal.id), {
        ...newBal,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `balancings/${newBal.id}`);
    }

    setIsNewServiceModalOpen(false);

    setBalancingForm({
      placa: "",
      tecnico: "Junior Silva",
      pneusBalanceados: "Todos os 4",
      data: new Date().toISOString().split("T")[0],
      fogoPneu: "",
    });
    alert("Registro de balanceamento salvo com sucesso!");
  };

  // Call Gemini API Route for diagnostic
  const fetchAiDiagnosis = async (align: Alignment) => {
    setSelectedAlignment(align);
    setIsAiLoading(true);
    setAiDiagnosisText(null);

    try {
      const response = await fetch("/api/gemini/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defeito: align.defeito,
          placa: align.placa,
          tecnico: align.tecnico,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAiDiagnosisText(data.diagnosis);
      } else {
        setAiDiagnosisText(`Erro do Gemini: ${data.error || "Tente novamente."}`);
      }
    } catch (e: any) {
      setAiDiagnosisText("Sem conexão com o servidor de IA. Por favor, configure a chave de segrego GEMINI_API_KEY no painel de Secrets se necessário.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Replenish stock (Action from Alerts)
  const replenishStock = async (id: string) => {
    const item = inventoryItems.find((i) => i.id === id);
    if (!item) return;

    try {
      await updateDoc(doc(db, "inventoryItems", id), {
        quantidade: item.meta,
        alerta: false,
        updatedAt: serverTimestamp(),
      });
      alert("Estoque reabastecido para 100%!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventoryItems/${id}`);
    }
  };

  // Signout handler for standard active session
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addToast("Sessão encerrada com sucesso!", "info");
    } catch (err: any) {
      addToast("Erro ao encerrar sessão: " + (err.message || "Tente novamente"), "error");
    }
  };

  // Filters search terms and dates
  const filteredCalibrations = calibrations.filter((cal) => {
    const matchesSearch =
      cal.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.pneusCalibrados.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cal.tipoVeiculo && cal.tipoVeiculo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesDate = true;
    if (calStartDateFilter) {
      matchesDate = matchesDate && cal.data >= calStartDateFilter;
    }
    if (calEndDateFilter) {
      matchesDate = matchesDate && cal.data <= calEndDateFilter;
    }
    return matchesSearch && matchesDate;
  });

  const filteredRotations = rotations.filter((r) => {
    const matchesSearch =
      r.veiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pneuRetirado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fluxo.toLowerCase().includes(searchTerm.toLowerCase());
      
    let matchesDate = true;
    if (rotStartDateFilter) {
      matchesDate = matchesDate && r.data >= rotStartDateFilter;
    }
    if (rotEndDateFilter) {
      matchesDate = matchesDate && r.data <= rotEndDateFilter;
    }
    return matchesSearch && matchesDate;
  });

  const filteredAlignments = alignments.filter((a) => {
    const matchesSearch =
      a.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.autorizadoPor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.defeito.toLowerCase().includes(searchTerm.toLowerCase());
      
    let matchesDate = true;
    if (alignStartDateFilter) {
      matchesDate = matchesDate && a.data >= alignStartDateFilter;
    }
    if (alignEndDateFilter) {
      matchesDate = matchesDate && a.data <= alignEndDateFilter;
    }
    return matchesSearch && matchesDate;
  });

  const paginatedAlignments = filteredAlignments.slice(
    (alignmentPage - 1) * itemsPerPage,
    alignmentPage * itemsPerPage
  );

  const totalAlignmentPages = Math.ceil(filteredAlignments.length / itemsPerPage);

  const filteredTreads = treadMeasurements.filter((tm) => {
    const matchesSearch =
      tm.fogoPneu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tm.observacoes || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    let matchesDate = true;
    if (treadStartDateFilter) {
      matchesDate = matchesDate && tm.data >= treadStartDateFilter;
    }
    if (treadEndDateFilter) {
      matchesDate = matchesDate && tm.data <= treadEndDateFilter;
    }
    return matchesSearch && matchesDate;
  });

  const paginatedTreads = filteredTreads.slice(
    (treadPage - 1) * itemsPerPage,
    treadPage * itemsPerPage
  );

  const totalTreadPages = Math.ceil(filteredTreads.length / itemsPerPage);

  const filteredMovements = tireMovements.filter((tm) => {
    const matchesSearch =
      tm.fogoPneu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.posicaoAtual.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.posicaoAnterior.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tm.pneuAtual.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tm.observacoes || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    let matchesDate = true;
    if (movementStartDateFilter) {
      matchesDate = matchesDate && tm.data >= movementStartDateFilter;
    }
    if (movementEndDateFilter) {
      matchesDate = matchesDate && tm.data <= movementEndDateFilter;
    }
    return matchesSearch && matchesDate;
  });

  const paginatedMovements = filteredMovements.slice(
    (movementPage - 1) * itemsPerPage,
    movementPage * itemsPerPage
  );

  const totalMovementPages = Math.ceil(filteredMovements.length / itemsPerPage);

  const filteredUsers = allUsers.filter((u) => {
    const queryStr = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(queryStr) ||
      (u.cargo || "").toLowerCase().includes(queryStr) ||
      (u.role || "").toLowerCase().includes(queryStr) ||
      (u.branchName || "").toLowerCase().includes(queryStr)
    );
  });

  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * itemsPerPage,
    usersPage * itemsPerPage
  );

  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Dynamic weekly mapping for the chart
  const getWeeklyStats = () => {
    const stats = [
      { semana: "Semana 1", alinhamentos: 0, balanceamentos: 0, calibragens: 0, rodizios: 0 },
      { semana: "Semana 2", alinhamentos: 0, balanceamentos: 0, calibragens: 0, rodizios: 0 },
      { semana: "Semana 3", alinhamentos: 0, balanceamentos: 0, calibragens: 0, rodizios: 0 },
      { semana: "Semana 4", alinhamentos: 0, balanceamentos: 0, calibragens: 0, rodizios: 0 },
    ];

    const getWeekIndex = (dateStr: string) => {
      try {
        const dt = new Date(dateStr);
        if (isNaN(dt.getTime())) return 3;
        const day = dt.getDate();
        if (day <= 7) return 0;
        if (day <= 14) return 1;
        if (day <= 21) return 2;
        return 3;
      } catch {
        return 3;
      }
    };

    filteredAlignmentsByMonth.forEach((a) => {
      const w = getWeekIndex(a.data);
      stats[w].alinhamentos++;
    });
    filteredBalancingsByMonth.forEach((b) => {
      const w = getWeekIndex(b.data);
      stats[w].balanceamentos++;
    });
    filteredCalibrationsByMonth.forEach((c) => {
      const w = getWeekIndex(c.data);
      stats[w].calibragens++;
    });
    filteredRotationsByMonth.forEach((r) => {
      const w = getWeekIndex(r.data);
      stats[w].rodizios++;
    });

    return stats.map((s) => {
      const totalServicesInWeek = s.alinhamentos + s.balanceamentos + s.calibragens + s.rodizios;
      
      const pctAlign = totalServicesInWeek > 0 ? (s.alinhamentos / totalServicesInWeek) * 100 : 0;
      const pctBal = totalServicesInWeek > 0 ? (s.balanceamentos / totalServicesInWeek) * 100 : 0;
      const pctCal = totalServicesInWeek > 0 ? (s.calibragens / totalServicesInWeek) * 100 : 0;
      const pctRot = totalServicesInWeek > 0 ? (s.rodizios / totalServicesInWeek) * 100 : 0;

      return {
        semana: s.semana,
        alinhamentos: s.alinhamentos,
        balanceamentos: s.balanceamentos,
        calibragens: s.calibragens,
        rodizios: s.rodizios,
        pctAlign: Number(pctAlign.toFixed(1)),
        pctBal: Number(pctBal.toFixed(1)),
        pctCal: Number(pctCal.toFixed(1)),
        pctRot: Number(pctRot.toFixed(1)),
        total: totalServicesInWeek,
      };
    });
  };

  const weeklyStats = getWeeklyStats();

  // Month-over-month comparison
  const getMoMComparison = () => {
    const currentMonthServices = totalServices;
    
    const getPrevMonth = (mStr: string) => {
      if (mStr === "Todos") return "Todos";
      const num = parseInt(mStr, 10);
      if (isNaN(num)) return "Todos";
      const prevNum = num === 1 ? 12 : num - 1;
      return prevNum < 10 ? `0${prevNum}` : `${prevNum}`;
    };

    const prevMonthStr = getPrevMonth(selectedMonth);
    if (prevMonthStr === "Todos") {
      return { pct: 0, text: "Geral", textCompare: "Exibe o total acumulado de todos os meses" };
    }

    const prevAlignments = alignments.filter(a => a.data && a.data.split("-")[1] === prevMonthStr).length;
    const prevRotations = rotations.filter(r => r.data && r.data.split("-")[1] === prevMonthStr).length;
    const prevCalibrations = calibrations.filter(c => c.data && c.data.split("-")[1] === prevMonthStr).length;
    const prevBalancings = balancings.filter(b => b.data && b.data.split("-")[1] === prevMonthStr).length;
    const prevTotal = prevAlignments + prevRotations + prevCalibrations + prevBalancings;

    if (prevTotal === 0) {
      return { pct: 100, text: "+100%", textCompare: "Sem registros históricos no mês anterior" };
    }

    const diff = currentMonthServices - prevTotal;
    const pctDiff = Math.round((diff / prevTotal) * 100);
    return {
      pct: pctDiff,
      text: pctDiff >= 0 ? `+${pctDiff}%` : `${pctDiff}%`,
      textCompare: `Comparado a ${prevTotal} atendimentos no mês anterior`
    };
  };

  const momCompare = getMoMComparison();

  // Configuration for 4 analytical charts
  const chartsConfig = [
    {
      title: "Alinhamento",
      strokeColor: "#0f172a", // slate-900 (brand-primary)
      colorHex: "#0f172a",
      bgColor: "rgba(15, 23, 42, 0.05)",
      getPct: (w: any) => w.pctAlign,
      getCount: (w: any) => w.alinhamentos,
      totalCount: totalAlignmentsCount,
      description: "Serviço de Alinhamento 3D",
    },
    {
      title: "Balanceamento",
      strokeColor: "#f97316", // orange-500
      colorHex: "#f97316",
      bgColor: "rgba(249, 115, 22, 0.05)",
      getPct: (w: any) => w.pctBal,
      getCount: (w: any) => w.balanceamentos,
      totalCount: totalBalancingsCount,
      description: "Serviço de Balanceamento Ativo",
    },
    {
      title: "Calibragem",
      strokeColor: "#6b7280", // gray-500
      colorHex: "#6b7280",
      bgColor: "rgba(107, 114, 128, 0.05)",
      getPct: (w: any) => w.pctCal,
      getCount: (w: any) => w.calibragens,
      totalCount: totalCalibrationsCount,
      description: "Calibragem de Pressão (Libras)",
    },
    {
      title: "Rodízio",
      strokeColor: "#10b981", // emerald-500 (brand-secondary)
      colorHex: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.05)",
      getPct: (w: any) => w.pctRot,
      getCount: (w: any) => w.rodizios,
      totalCount: totalRotationsCount,
      description: "Rodízio de Pneus e Estepe",
    },
  ];

  // Dynamic technician stats
  const computeTechStats = () => {
    const allTechsSet = new Set<string>();
    
    // Default techs from original screenshot for elegant/immediate fallback
    const defaultTechs = ["Junior Silva", "Ricardo Souza", "Marcos Oliveira"];
    
    calibrations.forEach((c) => {
      if (c.tecnico && c.tecnico.trim()) {
        allTechsSet.add(c.tecnico.trim());
      }
    });
    alignments.forEach((a) => {
      if (a.tecnico && a.tecnico.trim()) {
        allTechsSet.add(a.tecnico.trim());
      }
    });
    balancings.forEach((b) => {
      if (b.tecnico && b.tecnico.trim()) {
        allTechsSet.add(b.tecnico.trim());
      }
    });

    // If there are registered techs, use them. Otherwise, fall back to default screenshot techs
    const techs = allTechsSet.size > 0 ? Array.from(allTechsSet).sort() : defaultTechs;

    return techs.map((tech) => {
      const calCount = filteredCalibrationsByMonth.filter((c) => c.tecnico?.trim() === tech).length;
      const alignCount = filteredAlignmentsByMonth.filter((a) => a.tecnico?.trim() === tech).length;
      const balCount = filteredBalancingsByMonth.filter((b) => b.tecnico?.trim() === tech).length;
      
      const totalTechServices = calCount + alignCount + balCount;
      const efficiency = totalTechServices > 0 ? Math.min(100, 75 + totalTechServices * 5) : 0;
      return {
        nome: tech,
        servicos: totalTechServices,
        eficiencia: efficiency,
        status: totalTechServices > 0 ? (efficiency >= 90 ? "META ATINGIDA" : "EM PROGRESSO") : "AGUARDANDO",
      };
    });
  };

  const techStats = computeTechStats();

  // Authentication action controllers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthStatusMsg({ text: "E-mail e Senha são de preenchimento obrigatório.", isError: true });
      return;
    }
    setIsAuthSubmitting(true);
    setAuthStatusMsg(null);

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        addToast("Sessão iniciada com sucesso!", "success");
      } else if (authMode === "register") {
        if (authPassword.length < 6) {
          setAuthStatusMsg({ text: "Sua senha de cadastro deve conter pelo menos 6 dígitos.", isError: true });
          setIsAuthSubmitting(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        addToast("Sua conta foi criada e autenticada com sucesso!", "success");
      }
    } catch (err: any) {
      console.error(err);
      let localizedMsg = "Falha de autenticação. Verifique suas credenciais.";
      if (err.code === "auth/operation-not-allowed") {
        localizedMsg = `O login por E-mail e Senha não está ativado no seu projeto Firebase. Por favor, acesse o Console do Firebase (https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers), ative o provedor 'E-mail/senha' e salve as alterações.`;
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        localizedMsg = "E-mail ou Senha incorretos. Por favor, verifique.";
      } else if (err.code === "auth/weak-password") {
        localizedMsg = "A senha deve conter no mínimo 6 caracteres.";
      } else if (err.code === "auth/email-already-in-use") {
        localizedMsg = "Este e-mail já está sendo utilizado por outra conta.";
      } else if (err.code === "auth/invalid-email") {
        localizedMsg = "O formato do e-mail inserido é inválido.";
      }
      setAuthStatusMsg({ text: localizedMsg, isError: true });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!authEmail.trim()) {
      setAuthStatusMsg({ text: "Por favor, digite seu e-mail para receber o link de recuperação.", isError: true });
      return;
    }
    setIsAuthSubmitting(true);
    setAuthStatusMsg(null);

    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthStatusMsg({
        text: "E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.",
        isError: false,
      });
    } catch (err: any) {
      console.error(err);
      let localizedMsg = "Erro ao enviar e-mail de recuperação: " + (err.message || "Tente novamente");
      if (err.code === "auth/operation-not-allowed") {
        localizedMsg = `O login por E-mail e Senha não está ativado no seu projeto Firebase. Por favor, acesse o Console do Firebase (https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers), ative o provedor 'E-mail/senha' e salve as alterações.`;
      }
      setAuthStatusMsg({
        text: localizedMsg,
        isError: true,
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthStatusMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Acesso via Google autenticado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        let localizedMsg = "Falha de acesso via Google: " + (err.message || "Tente novamente");
        if (err.code === "auth/operation-not-allowed") {
          localizedMsg = `O login com Google não está ativado no seu projeto Firebase. Por favor, acesse o Console do Firebase (https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers), ative o provedor 'Google' e salve as alterações.`;
        } else if (err.code === "auth/unauthorized-domain") {
          localizedMsg = `O domínio atual não está autorizado na lista do Firebase Authentication. Por favor, acesse o Console do Firebase (https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings -> Domínios autorizados) e adicione o domínio ATUAL ou da Vercel ('painel-da-borracharia.vercel.app') para habilitar o login.`;
        }
        setAuthStatusMsg({
          text: localizedMsg,
          isError: true,
        });
      }
    }
  };

  // 1. Session checker loader screen
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-neutral-950 text-white">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <RotateCw className="absolute top-5 text-amber-500 w-6 h-6 animate-pulse" />
          <h1 className="mt-8 font-extrabold text-2xl tracking-tight uppercase text-amber-500">
            Borracharia Pro
          </h1>
          <p className="mt-2 text-xs text-neutral-400 font-medium animate-pulse">
            Carregando sua oficina digital...
          </p>
        </div>
      </div>
    );
  }

  // 2. Premium Authentication Gateway Card View
  if (!currentUser) {
    return (
      <div className="flex min-h-screen bg-neutral-950 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-8 bg-neutral-900 border border-neutral-800 p-8 sm:p-10 rounded-2xl shadow-2xl relative overflow-hidden">
          
          {/* Subtle Ambient Light Effect */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-600/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-amber-500 flex items-center justify-center rounded-xl shadow-lg shadow-amber-500/10">
              <RotateCw className="text-black w-6 h-6 animate-spin-slow" />
            </div>
            
            <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white uppercase">
              Borracharia Pro
            </h2>
            <p className="mt-2 text-center text-xs text-neutral-400 font-semibold tracking-widest uppercase">
              {authMode === "login" && "Acesse sua oficina"}
              {authMode === "register" && "Ative seu painel operacional"}
              {authMode === "forgot" && "Recuperação de Credenciais"}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleAuthSubmit}>
            <div className="space-y-4 rounded-md">
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  E-mail do Operador
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="exemplo@borracharia.com"
                  className="appearance-none relative block w-full px-4 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>

              {authMode !== "forgot" && (
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Senha de Segurança
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••"
                    className="appearance-none relative block w-full px-4 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  />
                </div>
              )}
            </div>

            {authStatusMsg && (
              <div className={`p-4 rounded-xl text-xs font-semibold leading-relaxed border flex items-start gap-2.5 ${
                authStatusMsg.isError 
                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authStatusMsg.text}</span>
              </div>
            )}

            {authMode === "login" && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("forgot");
                    setAuthStatusMsg(null);
                  }}
                  className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline uppercase tracking-wider transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <div className="space-y-3">
              {authMode !== "forgot" ? (
                <button
                  type="submit"
                  disabled={isAuthSubmitting}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-extrabold rounded-xl text-black bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-amber-500 active:scale-98 transition-all uppercase tracking-wider disabled:opacity-50"
                >
                  {isAuthSubmitting ? "Autenticando..." : authMode === "login" ? "Entrar no Sistema" : "Registrar Nova Conta"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isAuthSubmitting}
                  onClick={handlePasswordRecovery}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-extrabold rounded-xl text-black bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-amber-500 active:scale-98 transition-all uppercase tracking-wider disabled:opacity-50"
                >
                  {isAuthSubmitting ? "Processando..." : "Redefinir Senha"}
                </button>
              )}

              {/* Federated Login (Google) */}
              {authMode !== "forgot" && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-bold text-white bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 transition-colors uppercase tracking-wider"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Acessar com o Google
                </button>
              )}
            </div>
          </form>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            {authMode === "login" && (
              <p className="text-xs text-neutral-400 font-medium">
                Novo por aqui?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthStatusMsg(null);
                  }}
                  className="text-amber-500 font-bold hover:underline"
                >
                  Crie sua conta
                </button>
              </p>
            )}
            {authMode === "register" && (
              <p className="text-xs text-neutral-400 font-medium">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthStatusMsg(null);
                  }}
                  className="text-amber-500 font-bold hover:underline"
                >
                  Faça login
                </button>
              </p>
            )}
            {authMode === "forgot" && (
              <p className="text-xs text-neutral-400 font-medium">
                Lembrou a senha?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthStatusMsg(null);
                  }}
                  className="text-amber-500 font-bold hover:underline"
                >
                  Voltar ao login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-brand-primary bg-surface-bg flex-col md:flex-row">
      
      {/* SideNavBar (Desktop Only) */}
      <aside className="hidden md:flex flex-col h-full py-6 bg-white border-r-2 border-border-custom w-64 shrink-0 transition-all">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary flex items-center justify-center rounded-lg shadow-sm">
              <RotateCw className="text-white w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight text-brand-primary tracking-tight">
                Borracharia Pro
              </h1>
              <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                Workshop Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation items mimicking the mockup style */}
        <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setSearchTerm("");
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 ${
              activeTab === "dashboard"
                ? "bg-brand-secondary text-white shadow-md shadow-amber-900/15"
                : "text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => {
              setActiveTab("calibragem");
              setSearchTerm("");
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 ${
              activeTab === "calibragem"
                ? "bg-brand-secondary text-white shadow-md shadow-amber-900/15"
                : "text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
            }`}
          >
            <Gauge className="w-4 h-4" />
            Calibragem
          </button>

          <button
            onClick={() => {
              setActiveTab("rodizio");
              setSearchTerm("");
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 ${
              activeTab === "rodizio"
                ? "bg-brand-orange text-white shadow-md shadow-orange-950/15"
                : "text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
            }`}
          >
            <RotateCw className="w-4 h-4" />
            Rodízio de Estepe
          </button>

          <button
            onClick={() => {
              setActiveTab("alinhamento");
              setSearchTerm("");
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 ${
              activeTab === "alinhamento"
                ? "bg-brand-orange text-white shadow-md shadow-orange-950/15"
                : "text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Alinhamento
          </button>

          <button
            onClick={() => {
              setActiveTab("sulco");
              setSearchTerm("");
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 ${
              activeTab === "sulco"
                ? "bg-brand-orange text-white shadow-md shadow-orange-950/15"
                : "text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Medição de Sulco
          </button>

          <button
            onClick={() => {
              setActiveTab("movimentacao");
              setSearchTerm("");
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 ${
              activeTab === "movimentacao"
                ? "bg-brand-orange text-white shadow-md shadow-orange-950/15"
                : "text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
            }`}
          >
            <Move className="w-4 h-4" />
            Movimentação
          </button>

          {userProfile?.role === "MASTER" && (
            <button
              onClick={() => {
                setActiveTab("permissoes");
                setSearchTerm("");
              }}
              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-150 border border-transparent ${
                activeTab === "permissoes"
                  ? "bg-brand-secondary text-stone-950 font-black shadow-md border-amber-500/20"
                  : "text-amber-500 hover:bg-amber-50 hover:text-amber-900 font-bold"
              }`}
            >
              <Users className="w-4 h-4" />
              Permissões & Acessos
            </button>
          )}
        </nav>

        {/* CTA "Novo Serviço" imitating specific button styling */}
        <div className="px-6 mb-4">
          <button
            onClick={() => {
              setServiceTypeChoice(
                activeTab === "alinhamento"
                  ? "alinhamento"
                  : activeTab === "calibragem"
                  ? "calibragem"
                  : "rodizio"
              );
              setIsNewServiceModalOpen(true);
            }}
            className="w-full bg-brand-orange text-white font-bold py-3 px-4 rounded-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-900/10 text-xs tracking-wider uppercase"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </button>
        </div>

        {/* Lower footer profile section */}
        <div className="border-t border-border-custom pt-4 px-3 space-y-1">
          <a
            onClick={() =>
              alert(
                "Suporte Técnico Borracharia Pro: Ligue para 0800-PNEU-PRO ou mande email para suporte@borrachariapro.com.br"
              )
            }
            className="flex items-center gap-4 px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer uppercase tracking-wider"
          >
            <HelpCircle className="w-4 h-4" />
            Suporte
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer text-left uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center w-full px-6 py-4 bg-white border-b-2 border-border-custom shrink-0 gap-3 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 bg-brand-primary flex items-center justify-center rounded">
              <RotateCw className="text-white w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-bold text-xl md:text-2xl text-brand-primary tracking-tight">
                {activeTab === "dashboard" && "Dashboard Mensal"}
                {activeTab === "calibragem" && "Controle de Calibragem"}
                {activeTab === "rodizio" && "Rodízio de Estepe"}
                {activeTab === "alinhamento" && "Alinhamento de Geometria"}
                {activeTab === "sulco" && "Medição de Profundidade de Sulco"}
                {activeTab === "movimentacao" && "Movimentação Operacional de Pneus"}
                {activeTab === "permissoes" && "Portal de Permissões & Controles"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeTab === "dashboard" && "Painel de operações gerais e eficiência"}
                {activeTab === "calibragem" && "Ajuste preciso de pressão de pneus"}
                {activeTab === "rodizio" && "Controle de fluxo de rodízios e substituição de estepe"}
                {activeTab === "alinhamento" && "Gestão de geometria e precisão veicular com diagnóstico por IA"}
                {activeTab === "sulco" && "Medição precisa mm e diagnóstico de desgaste e durabilidade útil"}
                {activeTab === "movimentacao" && "Tratamento de montagem, movimentação interna e eixos de frotas"}
                {activeTab === "permissoes" && "Criação de usuários, definição de cargos e barreiras por filial em tempo real"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto md:justify-end">
            {/* Global Branch Filter Selector for Master Users, safe read-only label for branch operators */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest whitespace-nowrap">Visualização:</span>
              {userProfile?.role === "MASTER" ? (
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-stone-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-stone-900 font-extrabold focus:ring-1 focus:ring-brand-secondary focus:outline-none cursor-pointer"
                >
                  <option value="TODAS">Consolidado (Todas as Filiais)</option>
                  {FILIAIS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-amber-100 text-stone-950 font-black text-xs px-2.5 py-1.5 rounded border border-amber-300 whitespace-nowrap">
                  📍 {userProfile?.branchName || "MATRIZ"}
                </span>
              )}
            </div>

            {/* Search filter in header */}
            <div className="relative hidden lg:block">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar registros..."
                className="bg-gray-100 border-none rounded-lg pl-10 pr-4 py-2 w-48 focus:ring-2 focus:ring-brand-secondary focus:outline-none text-xs text-brand-primary font-medium"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            </div>

            {/* Notification alert */}
            <div className="relative">
              <button
                onClick={() => {
                  alert("Tudo certo no painel de controle e sem novas notificações urgentes.");
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors relative cursor-pointer text-gray-400"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile Info dynamically displaying profile metrics */}
            <div className="flex items-center gap-3 border-l border-border-custom pl-4">
              <Image
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"
                alt="Profile"
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border object-cover"
              />
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold text-brand-primary tracking-wider uppercase leading-none">
                  {userProfile?.email ? userProfile.email.split("@")[0] : currentUser?.email?.split("@")[0] || "Operador"}
                </p>
                <p className="text-[9px] font-extrabold text-brand-orange uppercase tracking-wider mt-0.5">
                  {userProfile?.cargo || "Operador Técnico"} • {userProfile?.role || "OPERADOR"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-20 md:pb-6">
          
          {searchTerm && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center justify-between text-xs text-orange-950 font-medium">
              <span>Filtrado por busca: <strong>&ldquo;{searchTerm}&rdquo;</strong></span>
              <button
                onClick={() => setSearchTerm("")}
                className="text-orange-900 underline hover:no-underline font-bold"
              >
                Limpar Busca
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
               {/* Filtros de Período Corporativos ("FILTRAR POR DIA" e "FILTRAR POR MÊS") */}
              <div id="filter-meses-container" className="bg-white border-2 border-border-custom px-6 py-5 rounded-lg shadow-sm flex flex-col gap-4 mb-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-3 gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-brand-primary tracking-tight uppercase flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-brand-secondary" />
                      Filtro de Períodos & Rastreabilidade Geral
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Selecione o filtro por dias e meses desejado para atualizar todos os dados e rankings do dashboard em tempo real</p>
                  </div>

                  {/* Month filter select in container */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Mês de Ref:</span>
                    <select
                      id="select-filtro-mes"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-brand-primary font-bold focus:ring-1 focus:ring-brand-secondary focus:outline-none cursor-pointer"
                    >
                      <option value="Todos">Todos os Meses (Geral)</option>
                      <option value="01">Janeiro</option>
                      <option value="02">Fevereiro</option>
                      <option value="03">Março</option>
                      <option value="04">Abril</option>
                      <option value="05">Maio</option>
                      <option value="06">Junho</option>
                      <option value="07">Julho</option>
                      <option value="08">Agosto</option>
                      <option value="09">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Quick period selectors row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mr-1">Filtrar por Dia:</span>
                    {[
                      { id: "hoje", label: "Hoje" },
                      { id: "ontem", label: "Ontem" },
                      { id: "7d", label: "Últimos 7 dias" },
                      { id: "15d", label: "Últimos 15 dias" },
                      { id: "30d", label: "Últimos 30 dias" },
                      { id: "custom", label: "Personalizado 📅" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDayFilter(opt.id as any);
                          if (opt.id !== "custom") {
                            setCustomStartDate("");
                            setCustomEndDate("");
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-all duration-150 uppercase tracking-wider ${
                          dayFilter === opt.id
                            ? "bg-brand-secondary text-stone-950 font-black shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom date range display */}
                  {dayFilter === "custom" && (
                    <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200 w-full lg:w-auto animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-gray-500 uppercase">Início:</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => {
                            if (customEndDate && e.target.value > customEndDate) {
                              alert("A data inicial não pode ser maior que a data final!");
                              return;
                            }
                            setCustomStartDate(e.target.value);
                          }}
                          className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-brand-primary font-bold focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-gray-500 uppercase">Fim:</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => {
                            if (customStartDate && e.target.value < customStartDate) {
                              alert("A data final não pode ser menor que a data inicial!");
                              return;
                            }
                            setCustomEndDate(e.target.value);
                          }}
                          className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-brand-primary font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary KPIs Row showing customized monthly active cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* Card 1: Total Serviços (The ONLY interactive card as requested) */}
                <div
                  id="card-total-servicos"
                  onClick={() => {
                    setSelectedMonth("Todos");
                    setDayFilter("30d");
                  }}
                  title="Clique para redefinir o filtro e ver os últimos 30 dias"
                  className="bg-white border-2 border-border-custom hover:border-brand-secondary cursor-pointer hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 rounded-lg p-4 flex flex-col justify-between group shadow-sm active:scale-98"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none">
                      Total de Serviços
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="relative group/tooltip inline-block">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-brand-secondary cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-stone-900 border border-neutral-700 text-white rounded p-3 text-xs shadow-xl w-64 pointer-events-none transition-all duration-200">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">Cálculo & Origem</p>
                          <p className="text-[11px] leading-relaxed text-neutral-300">
                            <strong>Indicador:</strong> Volume consolidado geral de serviços.<br />
                            <strong>Cálculo:</strong> Soma de calibragens, alinhamentos, rodízios, balanceamentos, sulcos e movimentações no período filtrado.<br />
                            <strong>Origem:</strong> Todas as coleções do banco Firestore sincronizadas em tempo real.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-stone-900 border-r border-b border-neutral-700 rotate-45"></div>
                        </div>
                      </div>
                      <Wrench className="w-5 h-5 text-brand-secondary group-hover:scale-105 transition-transform" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                      {totalServices}
                    </h3>
                    <p className="text-[9px] text-brand-secondary font-extrabold mt-1 flex items-center gap-0.5">
                      Atualizado em tempo real • Clique para reset
                    </p>
                  </div>
                </div>
 
                {/* Card 2: Quantidade de Alinhamentos */}
                <div id="card-alinhamentos" className="bg-white border-2 border-border-custom rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none">
                      Alinhamentos
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="relative group/tooltip inline-block">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-brand-secondary cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-stone-900 border border-neutral-700 text-white rounded p-3 text-xs shadow-xl w-64 pointer-events-none transition-all duration-200">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">Cálculo & Origem</p>
                          <p className="text-[11px] leading-relaxed text-neutral-300">
                            <strong>Indicador:</strong> Processos geométricos de alinhamentos.<br />
                            <strong>Cálculo:</strong> Contagem de registros individuais da coleção `alignments` no período filtrado.<br />
                            <strong>Sincronização:</strong> Real-time automatizado Firestore.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-stone-900 border-r border-b border-neutral-700 rotate-45"></div>
                        </div>
                      </div>
                      <Activity className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                      {totalAlignmentsCount}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">
                      Correções e testes computados
                    </p>
                  </div>
                </div>

                {/* Card 3: Quantidade de Rodízios */}
                <div id="card-rodizios" className="bg-white border-2 border-border-custom rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none">
                      Rodízios Realizados
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="relative group/tooltip inline-block">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-brand-secondary cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-stone-900 border border-neutral-700 text-white rounded p-3 text-xs shadow-xl w-64 pointer-events-none transition-all duration-200">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">Cálculo & Origem</p>
                          <p className="text-[11px] leading-relaxed text-neutral-300">
                            <strong>Indicador:</strong> Rodízio estratégico de pneus frotas.<br />
                            <strong>Cálculo:</strong> Quantitativo absoluto de registros na coleção `rotations` para a filial atual.<br />
                            <strong>Sincronização:</strong> Real-time ativa.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-stone-900 border-r border-b border-neutral-700 rotate-45"></div>
                        </div>
                      </div>
                      <RotateCw className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                      {totalRotationsCount}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">
                      Eixos e rodízios modificados
                    </p>
                  </div>
                </div>

                {/* Card 4: Pneus Medidos Sulco */}
                <div id="card-pneus-medidos-sulco" className="bg-white border-2 border-border-custom rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none">
                      Pneus Medidos Sulco
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="relative group/tooltip inline-block">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-brand-secondary cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-stone-900 border border-neutral-700 text-white rounded p-3 text-xs shadow-xl w-64 pointer-events-none transition-all duration-200">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">Cálculo & Origem</p>
                          <p className="text-[11px] leading-relaxed text-neutral-300">
                            <strong>Indicador:</strong> Total de pneus medidos milimetricamente.<br />
                            <strong>Cálculo:</strong> Soma de registros de medição de profundidade de sulco na coleção `treadMeasurements`.<br />
                            <strong>Sincronização:</strong> Atualizado instantaneamente.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-stone-900 border-r border-b border-neutral-700 rotate-45"></div>
                        </div>
                      </div>
                      <Sliders className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                      {totalTreadsCount}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">
                      Monitorização de pneu útil mm
                    </p>
                  </div>
                </div>

                {/* Card 5: Pneus Movimentados */}
                <div id="card-pneus-movimentados" className="bg-white border-2 border-border-custom rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none">
                      Pneus Movimentados
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="relative group/tooltip inline-block">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-brand-secondary cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-stone-900 border border-neutral-700 text-white rounded p-3 text-xs shadow-xl w-64 pointer-events-none transition-all duration-200">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">Cálculo & Origem</p>
                          <p className="text-[11px] leading-relaxed text-neutral-300">
                            <strong>Indicador:</strong> Histórico de montagem e movimentação física.<br />
                            <strong>Cálculo:</strong> Registros absolutos inseridos na tabela `tireMovements` no período.<br />
                            <strong>Sincronização:</strong> Em tempo real.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-stone-900 border-r border-b border-neutral-700 rotate-45"></div>
                        </div>
                      </div>
                      <Move className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                      {totalMovementsCount}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">
                      Movimentações de pneus rastreadas
                    </p>
                  </div>
                </div>

                {/* Card 6: Quantidade de Pneus Calibrados */}
                <div id="card-calibragens-pneus" className="bg-white border-2 border-border-custom rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none">
                      Pneus Calibrados
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="relative group/tooltip inline-block">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-brand-secondary cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-stone-900 border border-neutral-700 text-white rounded p-3 text-xs shadow-xl w-64 pointer-events-none transition-all duration-200">
                          <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">Cálculo & Origem</p>
                          <p className="text-[11px] leading-relaxed text-neutral-300">
                            <strong>Indicador:</strong> Quantitativo unitário de calibragem de pneus.<br />
                            <strong>Cálculo:</strong> Soma ponderada dos pneus efetuada a partir da entrada de texto de cada registro de calibragem.<br />
                            <strong>Origem:</strong> Ativo na coleção `calibrations`.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-stone-900 border-r border-b border-neutral-700 rotate-45"></div>
                        </div>
                      </div>
                      <Gauge className="w-5 h-5 text-gray-400 rotate-90" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                      {totalTiresCalibrated}
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">
                      unidades infladas e aferidas
                    </p>
                  </div>
                </div>

              </div>

              {/* NOVO DASHBOARD ANALÍTICO: 4 GRÁFICOS DE LINHAS SEPARADOS */}
              <div id="analytics-section" className="space-y-6 mt-6">
                
                {/* Panel de Comparativos e Filtros Rápidos */}
                <div id="analytics-comparative-panel" className="bg-white border-2 border-border-custom rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-brand-primary tracking-tight uppercase flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-secondary" />
                        Desempenho Comparativo & Filtro de Períodos
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">Evolução do engajamento dos serviços e indicadores de crescimento operacional</p>
                    </div>

                    {/* Quick KPIs / Comparison values */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-left">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Crescimento Mensal (MoM)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {momCompare.pct >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-500" />
                          )}
                          <span className={`text-sm font-black ${momCompare.pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {momCompare.text}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400 block mt-0.5 max-w-[190px] truncate">{momCompare.textCompare}</span>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-left">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Período Selecionado</span>
                        <span className="text-sm font-black text-brand-primary block mt-0.5">
                          {selectedMonth === "Todos" ? "Todo o Histórico" : `Mês de Referência: ${selectedMonth}`}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">Faturamento Total Estimado: R$ {totalFinancialRevenue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Informative Note */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
                      <span>Dados atualizados em tempo real de acordo com as operações da borracharia.</span>
                    </div>
                    {hoveredWeekIdx !== null && (
                      <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px]">
                        Visualizando Detalhes: <strong>Semana {hoveredWeekIdx + 1}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid de Gráficos Individuais */}
                <div id="analytics-charts-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {chartsConfig.map((cfg) => {
                    // Let's find the global maximum volume of any service across all 4 weeks to keep charts compared on a shared intuitive scale
                    const maxGlobalCount = Math.max(
                      ...weeklyStats.map(w => Math.max(w.alinhamentos || 0, w.balanceamentos || 0, w.calibragens || 0, w.rodizios || 0)),
                      4 // default ceiling to keep a balanced line curve even when database counts are low
                    );

                    // Calculate and map the coordinates
                    const xCoords = [35, 105, 175, 245];
                    const coords = weeklyStats.map((w, idx) => {
                      const count = cfg.getCount(w);
                      // Y axis mapping: 15 for maxGlobalCount, 85 for 0 count
                      const y = 85 - (count / maxGlobalCount) * 70;
                      return { x: xCoords[idx], y, count, semana: w.semana, pct: cfg.getPct(w) };
                    });

                    // Generate paths
                    const linePath = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y} L ${coords[2].x} ${coords[2].y} L ${coords[3].x} ${coords[3].y}`;
                    const fillPath = `M ${coords[0].x} 95 L ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y} L ${coords[2].x} ${coords[2].y} L ${coords[3].x} ${coords[3].y} L ${coords[3].x} 95 Z`;

                    // Growth calculation week-over-week (Week 4 vs Week 3)
                    const currentWeekPct = coords[3].pct;
                    const prevWeekPct = coords[2].pct;
                    const diffPct = currentWeekPct - prevWeekPct;

                    return (
                      <div
                        key={cfg.title}
                        id={`chart-card-${cfg.title.toLowerCase()}`}
                        className="bg-white border-2 border-border-custom rounded-lg p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-200"
                        onMouseLeave={() => setHoveredWeekIdx(null)}
                      >
                        {/* Soft background glow decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 pointer-events-none" style={{ backgroundColor: cfg.strokeColor }} />

                        {/* Card Header information */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.strokeColor }} />
                              <h4 className="font-extrabold text-sm text-brand-primary uppercase tracking-tight">
                                {cfg.title}
                              </h4>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{cfg.description}</p>
                          </div>

                          {/* Trend indicators */}
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider leading-none">Participação Acumulada</span>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <h3 className="text-xl font-black text-brand-primary leading-none">
                                {totalServices > 0 ? Math.round((cfg.totalCount / totalServices) * 100) : 0}%
                              </h3>
                              <span className="text-xs text-gray-405 leading-none">({cfg.totalCount})</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Graph Canvas */}
                        <div className="h-44 relative bg-gray-50 border border-gray-150 rounded-lg p-3 flex flex-col justify-between mb-4">
                          {totalServices === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                              <p className="text-xs font-bold text-gray-500">Sem Informações</p>
                              <p className="text-[10px] text-gray-400 mt-1">Adicione atendimentos na aba para gerar curvas</p>
                            </div>
                          ) : (
                            <>
                              {/* Background grid indicators showing real counts */}
                              <div className="absolute inset-x-0 top-3 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
                                <span className="text-[8px] font-extrabold text-gray-500 border-b border-dashed border-gray-300 pb-0.5">{maxGlobalCount} serv.</span>
                                <span className="text-[8px] font-extrabold text-gray-500 border-b border-dashed border-gray-300 pb-0.5">{Math.round(maxGlobalCount / 2)} serv.</span>
                                <span className="text-[8px] font-extrabold text-gray-500">0 serv.</span>
                              </div>

                              {/* Interactive Cursor line */}
                              {hoveredWeekIdx !== null && (
                                <div
                                  className="absolute top-2 bottom-8 border-l border-dashed pointer-events-none transition-all duration-150"
                                  style={{
                                    left: `${(hoveredWeekIdx * 70) + 35}px`,
                                    borderColor: cfg.strokeColor,
                                    opacity: 0.5
                                  }}
                                />
                              )}

                              {/* Styled SVG Chart */}
                              <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 280 110" preserveAspectRatio="none">
                                {/* Defs containing gradient fills for a modern sleek aesthetic */}
                                <defs>
                                  <linearGradient id={`grad-${cfg.title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={cfg.strokeColor} stopOpacity="0.25" />
                                    <stop offset="100%" stopColor={cfg.strokeColor} stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>

                                {/* Closed Area Fill */}
                                <path d={fillPath} fill={`url(#grad-${cfg.title})`} className="transition-all duration-300" />

                                {/* Interactive connection line */}
                                <path d={linePath} fill="none" stroke={cfg.strokeColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />

                                {/* Interactive Data Nodes */}
                                {coords.map((pt, idx) => {
                                  const isSelected = hoveredWeekIdx === idx;
                                  return (
                                    <g key={idx} className="cursor-pointer">
                                      {/* High-visibility SVG data label background stroke */}
                                      <text
                                        x={pt.x}
                                        y={pt.y - (isSelected ? 15 : 11)}
                                        textAnchor="middle"
                                        stroke="#ffffff"
                                        strokeWidth={4.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={`font-black select-none pointer-events-none opacity-95 transition-all duration-150 ${
                                          isSelected ? 'text-[13px]' : 'text-[11px]'
                                        }`}
                                      >
                                        {pt.count}
                                      </text>

                                      {/* High-visibility SVG data label foreground text */}
                                      <text
                                        x={pt.x}
                                        y={pt.y - (isSelected ? 15 : 11)}
                                        textAnchor="middle"
                                        className={`font-black select-none pointer-events-none transition-all duration-150 ${
                                          isSelected ? 'text-[13px]' : 'text-[11px]'
                                        }`}
                                        fill={cfg.strokeColor}
                                      >
                                        {pt.count}
                                      </text>

                                      {/* Outer hover expanded ring */}
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={isSelected ? 8 : 4}
                                        fill="#ffffff"
                                        stroke={cfg.strokeColor}
                                        strokeWidth={isSelected ? 4 : 2.5}
                                        onMouseEnter={() => setHoveredWeekIdx(idx)}
                                        className="transition-all duration-150"
                                      />
                                      {/* Invisible hit targeted area for easy hovering */}
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={20}
                                        fill="transparent"
                                        onMouseEnter={() => setHoveredWeekIdx(idx)}
                                      />
                                    </g>
                                  );
                                })}
                              </svg>

                              {/* X Axis Labels */}
                              <div className="flex justify-between items-center px-4 pt-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider relative z-10">
                                {coords.map((pt, idx) => (
                                  <span
                                    key={idx}
                                    onMouseEnter={() => setHoveredWeekIdx(idx)}
                                    className={`cursor-pointer transition-all ${hoveredWeekIdx === idx ? 'text-brand-primary scale-110' : 'text-gray-400'}`}
                                  >
                                    Sem 0{idx + 1}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Interactive Tooltip showing counts and specific breakdown when hovered */}
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs flex justify-between items-center">
                          {hoveredWeekIdx !== null && totalServices > 0 ? (
                            <>
                              <div>
                                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Semana 0{hoveredWeekIdx + 1}</span>
                                <span className="font-extrabold text-brand-primary mt-0.5 block">{coords[hoveredWeekIdx].count} serviços executados</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Participação</span>
                                <span className="text-sm font-black mt-0.5 block" style={{ color: cfg.strokeColor }}>
                                  {coords[hoveredWeekIdx].pct}%
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Mudança Sem 3 → Sem 4</span>
                                <span className={`font-bold block mt-0.5 ${diffPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {diffPct >= 0 ? `Cresceu +${diffPct.toFixed(1)}%` : `Caiu ${diffPct.toFixed(1)}%`}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Evolução</span>
                                <span className="text-xs font-semibold text-gray-500 block mt-0.5">Passe o mouse p/ detalhes</span>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Lower parts: Table */}
              <div className="pb-6 col-span-full">
                
                {/* Technician productivity Table from Image 3 */}
                <div className="bg-white border-2 border-border-custom rounded-lg overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="px-6 py-4 border-b border-border-custom flex justify-between items-center bg-gray-50">
                    <h4 className="font-bold text-base text-brand-primary tracking-tight">
                      Produtividade de Técnicos
                    </h4>
                    <Users className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-105 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Técnico</th>
                          <th className="px-6 py-3">Serviços</th>
                          <th className="px-6 py-3">Eficiência</th>
                          <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {techStats.map((tech) => (
                          <tr key={tech.nome} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-brand-primary">{tech.nome}</td>
                            <td className="px-6 py-4">{tech.servicos}</td>
                            <td className="px-6 py-4">
                              <div className="w-28 bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-brand-secondary h-full rounded-full" style={{ width: `${tech.eficiencia}%` }} />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                                tech.status === "META ATINGIDA"
                                  ? "border-brand-secondary text-brand-secondary"
                                  : tech.status === "EM PROGRESSO"
                                  ? "border-brand-primary text-brand-primary"
                                  : "border-gray-300 text-gray-400"
                              }`}>
                                {tech.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t text-[11px] text-gray-500 italic bg-gray-50 text-right">
                    Metas atualizadas a cada início de Expediente
                  </div>
                </div>

              </div>
            </>
          )}

          {/* TAB 2: CALIBRAGEM */}
          {activeTab === "calibragem" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Form: Nova Calibragem */}
              <div className="lg:col-span-2 bg-white border-2 border-border-custom rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start border-b pb-3 mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-brand-primary">Novo Registro de Calibragem</h3>
                    <p className="text-xs text-gray-400 mt-1">Informe os dados para calibrar os pneus na meta de pressão.</p>
                  </div>
                </div>

                <form onSubmit={handleAddCalibration} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">CÓDIGO / PLACA DO VEÍCULO</label>
                      <input
                        type="text"
                        value={calibrationForm.placa}
                        onChange={(e) => setCalibrationForm({ ...calibrationForm, placa: e.target.value })}
                        placeholder="ABC-1234"
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">TÉCNICO RESPONSÁVEL</label>
                      <input
                        type="text"
                        value={calibrationForm.tecnico}
                        onChange={(e) => setCalibrationForm({ ...calibrationForm, tecnico: e.target.value })}
                        placeholder="Ex: Junior Silva"
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">TIPO DE VEÍCULO</label>
                      <select
                        value={calibrationForm.tipoVeiculo}
                        onChange={(e) => setCalibrationForm({ ...calibrationForm, tipoVeiculo: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      >
                        <option value="Truck">Truck</option>
                        <option value="3/4">3/4</option>
                        <option value="Toco">Toco</option>
                        <option value="Carreta">Carreta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">CONJUNTO / QUANTIDADE DE PNEUS</label>
                      <input
                        type="text"
                        value={calibrationForm.pneusContexto}
                        onChange={(e) => setCalibrationForm({ ...calibrationForm, pneusContexto: e.target.value })}
                        placeholder="Ex: 4, Dianteiros, Estepe..."
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">PRESSÃO FINAL DESEJADA (LIBRAS)</label>
                      <input
                        type="number"
                        value={calibrationForm.pressaoAlvo}
                        onChange={(e) => setCalibrationForm({ ...calibrationForm, pressaoAlvo: e.target.value === "" ? "" : isNaN(parseInt(e.target.value)) ? "" : parseInt(e.target.value) })}
                        placeholder="Ex: 32"
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">PRESSÃO INICIAL ENCONTRADA (LIBRAS)</label>
                      <input
                        type="number"
                        value={calibrationForm.pressaoInicial}
                        onChange={(e) => setCalibrationForm({ ...calibrationForm, pressaoInicial: e.target.value === "" ? "" : isNaN(parseInt(e.target.value)) ? "" : parseInt(e.target.value) })}
                        placeholder="Ex: 26"
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1">DATA DO REGISTRO</label>
                    <input
                      type="date"
                      value={calibrationForm.data}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, data: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-brand-secondary text-white font-bold rounded hover:brightness-110 shadow cursor-pointer text-xs uppercase tracking-wider text-center"
                  >
                    Gravar Serviço de Calibragem
                  </button>
                </form>
              </div>

              {/* Right Widget: Total de Pneus Calibrados */}
              <div className="bg-white border-2 border-border-custom rounded-lg p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="border-b pb-3 mb-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-base text-brand-primary">Total de Pneus Calibrados</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Métricas consolidadas de calibragem</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-105">
                      LIVE
                    </div>
                  </div>

                  {/* Main BIG numerical indicator */}
                  <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 border border-neutral-150 rounded-lg p-5 text-center my-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-secondary/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Histórico Acumulado</span>
                    <h3 className="text-4xl font-extrabold tracking-tight text-brand-primary mt-1.5 mb-1">
                      {totalTiresCalibratedAll} <span className="text-sm font-semibold text-gray-400">pneus</span>
                    </h3>
                    
                    {/* Badge displaying Today's contribution */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{tiresCalibratedToday} calibrados hoje</span>
                    </div>
                  </div>

                  {/* Category breakdown progress indicators */}
                  <div className="space-y-3.5 mt-5">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Distribuição por Categoria</h5>
                    
                    {[
                      { label: "Carreta", value: getTiresByVehicleType("Carreta"), color: "#1e3a8a", bg: "bg-blue-600" },
                      { label: "Truck", value: getTiresByVehicleType("Truck"), color: "#0d9488", bg: "bg-teal-600" },
                      { label: "Toco", value: getTiresByVehicleType("Toco"), color: "#f59e0b", bg: "bg-amber-500" },
                      { label: "Leve / 3/4", value: getTiresByVehicleType("3/4"), color: "#6b7280", bg: "bg-gray-500" }
                    ].map((item) => {
                      // Compute percentage of the total for the progress bar
                      const barPercentage = totalTiresCalibratedAll > 0 
                        ? Math.min((item.value / totalTiresCalibratedAll) * 100, 100) 
                        : 0;

                      return (
                        <div key={item.label} className="text-xs">
                          <div className="flex justify-between items-center font-semibold mb-1 text-gray-600">
                            <span>{item.label}</span>
                            <span className="font-bold text-gray-900">{item.value} pneus</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${item.bg} rounded-full transition-all duration-500`}
                              style={{ width: `${barPercentage || 8}%` }} // fallback visual indicator width so empty state looks clean
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card footer details with goals */}
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <div className="bg-stone-50 rounded-lg border border-gray-150 p-3.5 flex justify-between text-xs font-semibold">
                    <div className="text-left">
                      <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block">Calibrados Hoje</span>
                      <p className="text-base font-extrabold text-stone-900 mt-0.5">{filteredCalibrationsByMonth.filter(c => c.data === new Date().toISOString().split("T")[0]).length} veículos</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block">Meta Recomendada</span>
                      <p className="text-base font-extrabold text-emerald-600 mt-0.5">32 libras</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Calibrations History list */}
              <div className="lg:col-span-3 bg-white border-2 border-border-custom rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border-custom flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 bg-gray-50">
                  <h4 className="font-bold text-base text-brand-primary tracking-tight">Histórico de Calibragem</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500">Filtrar por período:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={calStartDateFilter}
                        onChange={(e) => setCalStartDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                      <span className="text-xs text-gray-400 font-bold">até</span>
                      <input
                        type="date"
                        value={calEndDateFilter}
                        onChange={(e) => setCalEndDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                    {(calStartDateFilter || calEndDateFilter) && (
                      <button
                        onClick={() => {
                          setCalStartDateFilter("");
                          setCalEndDateFilter("");
                        }}
                        className="text-xs font-bold text-brand-orange hover:underline cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Veículo</th>
                        <th className="px-6 py-3">Técnico</th>
                        <th className="px-6 py-3">Pneus Calibrados</th>
                        <th className="px-6 py-3">Meta (Libras)</th>
                        <th className="px-6 py-3">Inicial (Libras)</th>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-brand-primary">
                      {filteredCalibrations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                            Nenhum registro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        filteredCalibrations.map((cal) => (
                          <tr key={cal.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="font-bold text-brand-primary text-sm">{cal.placa}</div>
                              {cal.tipoVeiculo && (
                                <div className="text-[9px] text-brand-secondary font-bold mt-1 tracking-wider uppercase bg-orange-50 py-0.5 px-1.5 rounded inline-block border border-orange-100/60 leading-none">
                                  {cal.tipoVeiculo}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">{cal.tecnico}</td>
                            <td className="px-6 py-4">{cal.pneusCalibrados}</td>
                            <td className="px-6 py-4 font-bold text-brand-secondary">{cal.pressaoAlvo} libras</td>
                            <td className="px-6 py-4">
                              <span className="text-red-600 bg-red-50 border border-red-100 font-bold px-1.5 py-0.5 rounded">
                                {cal.pressaoInicial} libras
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 font-mono font-medium">{cal.data}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteCalibration(cal.id)}
                                className="p-1 px-2 border rounded border-rose-100 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: RODÍZIO DE ESTEPE (Image 1 style) */}
          {activeTab === "rodizio" && (
            <div className="space-y-6">
              
              {/* Header metrics card Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Carros em Rodízio */}
                <div className="bg-gradient-to-br from-neutral-900 to-amber-950 text-white rounded-lg p-5 border shadow-sm">
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest block mb-2">
                    Carros em Rodízio
                  </span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-4xl font-extrabold tracking-tight">{carrosEmRodizioCount}</h3>
                    <TrendingUp className="w-5 h-5 text-amber-500 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold block mt-1.5">
                    Fluxo Ativo de Hoje
                  </span>
                </div>

                {/* Pneus Movimentados */}
                <div className="bg-white border-2 border-border-custom rounded-lg p-5 shadow-sm">
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest block mb-1">
                    Pneus Movimentados
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-4xl font-extrabold tracking-tight text-brand-primary">{pneusMovimentadosCount}</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Últimas 24 horas de oficina
                  </span>
                </div>

                {/* Meta de Eficiência */}
                <div className="bg-white border-2 border-border-custom rounded-lg p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-500">Meta de Eficiência</span>
                    <span className="font-extrabold text-brand-secondary">85%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-3 rounded overflow-hidden mt-3">
                    <div className="bg-brand-secondary h-full rounded-full" style={{ width: "85%" }} />
                  </div>
                </div>

              </div>

              {/* Workflow entry inputs panel */}
              <div className="bg-white border-2 border-border-custom rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start border-b pb-3 mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-brand-primary">Workflow de Rodízio de Pneu</h3>
                    <p className="text-xs text-gray-400 mt-1">Siga as instruções para registrar o fluxo de rotação e estepe.</p>
                  </div>
                </div>

                <form onSubmit={handleAddRotation} className="space-y-6 text-xs">
                  
                  {/* Veículo block */}
                  <div className="bg-stone-50 border-2 rounded p-5">
                    <h4 className="font-bold text-sm text-brand-secondary tracking-tight mb-3 flex items-center gap-1.5 border-b pb-1.5">
                      <LayoutDashboard className="w-4 h-4" />
                      1. Dados do Veículo
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">PLACA DO VEÍCULO</label>
                        <input
                          type="text"
                          required
                          value={rotationForm.placa}
                          onChange={(e) => setRotationForm({ ...rotationForm, placa: e.target.value })}
                          placeholder="ABC-1234"
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">MODELO AUTOMÁTICO (OPCIONAL)</label>
                        <input
                          type="text"
                          value={rotationForm.modeloAutomativo}
                          onChange={(e) => setRotationForm({ ...rotationForm, modeloAutomativo: e.target.value })}
                          placeholder="Ex: Identificado via Placa..."
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Retire / Installed Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Retire */}
                    <div className="bg-stone-50 border-2 rounded p-5">
                      <h4 className="font-bold text-sm text-brand-secondary mb-3 flex items-center gap-1.5 border-b pb-1.5 uppercase tracking-wide">
                        <TrendingUp className="w-4 h-4 rotate-45" />
                        2. Pneu Retirado
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block font-bold text-gray-600 mb-1">POSIÇÃO ANTERIOR</label>
                          <select
                            value={rotationForm.posicaoRetirado}
                            onChange={(e) => setRotationForm({ ...rotationForm, posicaoRetirado: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          >
                            <option value="Dianteiro Esq">Dianteiro Esq</option>
                            <option value="Dianteiro Dir">Dianteiro Dir</option>
                            <option value="Traseiro Esq">Traseiro Esq</option>
                            <option value="Traseiro Dir">Traseiro Dir</option>
                            <option value="Estepe">Estepe</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-gray-600 mb-1">NOVA POSIÇÃO</label>
                          <select
                            value={rotationForm.novaPosicaoRetirado}
                            onChange={(e) => setRotationForm({ ...rotationForm, novaPosicaoRetirado: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          >
                            <option value="Estepe">Estepe</option>
                            <option value="Dianteiro Esq">Dianteiro Esq</option>
                            <option value="Dianteiro Dir">Dianteiro Dir</option>
                            <option value="Traseiro Esq">Traseiro Esq</option>
                            <option value="Traseiro Dir">Traseiro Dir</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">DATA DA REMOÇÃO</label>
                        <input
                          type="date"
                          value={rotationForm.dataRemocao}
                          onChange={(e) => setRotationForm({ ...rotationForm, dataRemocao: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                        />
                      </div>
                    </div>

                    {/* Installed */}
                    <div className="bg-stone-55 border-2 border-dashed border-gray-300 rounded p-5 bg-stone-50">
                      <h4 className="font-bold text-sm text-brand-secondary mb-3 flex items-center gap-1.5 border-b pb-1.5 uppercase tracking-wide">
                        <Plus className="w-4 h-4" />
                        3. Pneu Instalado
                      </h4>
                      <div className="mb-3">
                        <label className="block font-bold text-gray-600 mb-1">MARCA E MEDIDA DO NOVO PNEU</label>
                        <input
                          type="text"
                          value={rotationForm.pneuInstalado}
                          onChange={(e) => setRotationForm({ ...rotationForm, pneuInstalado: e.target.value })}
                          placeholder="Ex: Michelin LTX Force 215/65"
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                        {inventoryItems.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">T pneus em estoque:</span>
                            {inventoryItems
                              .filter((i) => i.nome.toLowerCase().includes("pneu") && i.quantidade > 0)
                              .map((i) => (
                                <button
                                  key={i.id}
                                  type="button"
                                  onClick={() => setRotationForm({ ...rotationForm, pneuInstalado: i.nome })}
                                  className="text-[10px] bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25 rounded px-2 py-0.5 font-semibold transition cursor-pointer"
                                >
                                  {i.nome} ({i.quantidade})
                                </button>
                              ))
                            }
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block font-bold text-gray-600 mb-1">POSIÇÃO ANTERIOR</label>
                          <select
                            value={rotationForm.posicaoInstalado}
                            onChange={(e) => setRotationForm({ ...rotationForm, posicaoInstalado: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          >
                            <option value="Estepe">Estepe</option>
                            <option value="Dianteiro Esq">Dianteiro Esq</option>
                            <option value="Dianteiro Dir">Dianteiro Dir</option>
                            <option value="Traseiro Esq">Traseiro Esq</option>
                            <option value="Traseiro Dir">Traseiro Dir</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-gray-600 mb-1">NOVA POSIÇÃO</label>
                          <select
                            value={rotationForm.novaPosicaoInstalado}
                            onChange={(e) => setRotationForm({ ...rotationForm, novaPosicaoInstalado: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          >
                            <option value="Dianteiro Esq">Dianteiro Esq</option>
                            <option value="Dianteiro Dir">Dianteiro Dir</option>
                            <option value="Traseiro Esq">Traseiro Esq</option>
                            <option value="Traseiro Dir">Traseiro Dir</option>
                            <option value="Estepe">Estepe</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">DATA DE INSTALAÇÃO</label>
                        <input
                          type="date"
                          value={rotationForm.dataInstalacao}
                          onChange={(e) => setRotationForm({ ...rotationForm, dataInstalacao: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                        />
                      </div>
                    </div>

                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-brand-secondary text-white font-extrabold rounded-lg hover:brightness-110 shadow-lg cursor-pointer text-xs uppercase tracking-widest text-center"
                  >
                    Confirmar Rodízio de Pneu
                  </button>
                </form>
              </div>

              {/* Historic de Rodízio Detalhado */}
              <div className="bg-white border-2 border-border-custom rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-gray-50 border-b border-border-custom flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h4 className="font-bold text-base text-brand-primary tracking-tight">Histórico de Rodízio Detalhado</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500">Filtrar por período:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={rotStartDateFilter}
                        onChange={(e) => setRotStartDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                      <span className="text-xs text-gray-400 font-bold">até</span>
                      <input
                        type="date"
                        value={rotEndDateFilter}
                        onChange={(e) => setRotEndDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                    {(rotStartDateFilter || rotEndDateFilter) && (
                      <button
                        onClick={() => {
                          setRotStartDateFilter("");
                          setRotEndDateFilter("");
                        }}
                        className="text-xs font-bold text-brand-orange hover:underline cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto text-brand-primary">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Veículo</th>
                        <th className="px-6 py-3">Pneu Retirado</th>
                        <th className="px-6 py-3">Pneu Instalado</th>
                        <th className="px-6 py-3">Fluxo (De → Para)</th>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRotations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                            Nenhum registro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        filteredRotations.map((rot) => (
                          <tr key={rot.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold">{rot.veiculo}</td>
                            <td className="px-6 py-4 text-gray-550">{rot.pneuRetirado}</td>
                            <td className="px-6 py-4 font-medium">{rot.pneuInstalado}</td>
                            <td className="px-6 py-4">
                              <span className="bg-gray-150 border px-2 py-1 rounded text-[10px] font-bold uppercase text-stone-700 bg-stone-100/80 inline-block font-mono">
                                {rot.fluxo}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 font-mono font-medium">{rot.data}</td>
                            <td className="px-6 py-4">
                              <span className="border border-brand-orange text-brand-orange text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                {rot.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteRotation(rot.id)}
                                className="p-1 px-2 border rounded border-rose-100 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ALINHAMENTO */}
          {activeTab === "alinhamento" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Alinhamentos hoje stat block & creation form */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Visual Registration Form */}
                <div className="bg-white border-2 border-border-custom rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start border-b pb-3 mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-brand-primary">Novo Registro de Alinhamento</h3>
                      <p className="text-xs text-gray-400 mt-1">Gere relatórios de geometria automotiva de precisão preventiva.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddAlignment} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">PLACA DO VEÍCULO</label>
                        <input
                          type="text"
                          required
                          value={alignmentForm.placa}
                          onChange={(e) => setAlignmentForm({ ...alignmentForm, placa: e.target.value })}
                          placeholder="ABC-1234"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">TÉCNICO ENCARREGADO</label>
                        <input
                          type="text"
                          required
                          value={alignmentForm.tecnico}
                          onChange={(e) => setAlignmentForm({ ...alignmentForm, tecnico: e.target.value })}
                          placeholder="Ex: Ricardo Souza"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">QUEM AUTORIZOU O SERVIÇO</label>
                        <input
                          type="text"
                          value={alignmentForm.quemAutorizou}
                          onChange={(e) => setAlignmentForm({ ...alignmentForm, quemAutorizou: e.target.value })}
                          placeholder="Nome do cliente ou gerente..."
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">SITUAÇÃO DO REGISTRO</label>
                        <select
                          value={alignmentForm.status}
                          onChange={(e) => setAlignmentForm({ ...alignmentForm, status: e.target.value as any })}
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none font-bold"
                        >
                          <option value="Pendente" className="text-red-650">Pendente de Confirmação</option>
                          <option value="Em Revisão" className="text-amber-650">Aprovado e Em Revisão</option>
                          <option value="Alinhado" className="text-emerald-650">Serviço Concluído (Alinhado)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 mb-1">DEFEITO ENCONTRADO / SINTOMAS</label>
                      <textarea
                        rows={3}
                        value={alignmentForm.defeito}
                        onChange={(e) => setAlignmentForm({ ...alignmentForm, defeito: e.target.value })}
                        placeholder="Ex: Desvio para a direita, folga na barra de direção, trepidação no volante, desgaste irregular de banda..."
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 mb-1">DATA DO REGISTRO</label>
                      <input
                        type="date"
                        value={alignmentForm.data}
                        onChange={(e) => setAlignmentForm({ ...alignmentForm, data: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-brand-secondary text-white font-extrabold rounded-lg hover:brightness-110 transition-all shadow cursor-pointer text-xs uppercase tracking-widest text-center"
                    >
                      Salvar Registro de Alinhamento
                    </button>
                  </form>
                </div>

                {/* Relatório table list */}
                <div className="bg-white border-2 border-border-custom rounded-lg overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="px-6 py-4 bg-gray-50 border-b border-border-custom flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h4 className="font-bold text-base text-brand-primary tracking-tight">Relatório de Alinhamento</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500">Filtrar por período:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={alignStartDateFilter}
                        onChange={(e) => setAlignStartDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                      <span className="text-xs text-gray-400 font-bold">até</span>
                      <input
                        type="date"
                        value={alignEndDateFilter}
                        onChange={(e) => setAlignEndDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                      />
                    </div>
                    {(alignStartDateFilter || alignEndDateFilter) && (
                      <button
                        onClick={() => {
                          setAlignStartDateFilter("");
                          setAlignEndDateFilter("");
                        }}
                        className="text-xs font-bold text-brand-orange hover:underline cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  </div>
                  <div className="overflow-x-auto text-brand-primary">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Placa</th>
                          <th className="px-6 py-3">Técnico</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Autorizado Por</th>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3 text-right">Análise de IA (Gemini)</th>
                          <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedAlignments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                              Nenhum registro encontrado para os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          paginatedAlignments.map((align) => (
                            <tr key={align.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-bold">{align.placa}</td>
                              <td className="px-6 py-4">{align.tecnico}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                    align.status === "Alinhado"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : align.status === "Em Revisão"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {align.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium">{align.autorizadoPor}</td>
                              <td className="px-6 py-4 text-gray-400 font-mono font-medium">{align.data || "—"}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => fetchAiDiagnosis(align)}
                                  className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-250 font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Diagnosticar Defeito
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteAlignment(align.id)}
                                  className="p-1 px-2 border rounded border-rose-100 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title="Excluir Registro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control mimicing original design */}
                  <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500">
                    <span>Mostrando {paginatedAlignments.length} de {filteredAlignments.length} registros</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAlignmentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={alignmentPage === 1}
                        className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2.5 py-1 bg-brand-primary text-white font-extrabold rounded text-xs select-none">
                        {alignmentPage}
                      </span>
                      <button
                        onClick={() => setAlignmentPage((prev) => Math.min(prev + 1, totalAlignmentPages))}
                        disabled={alignmentPage === totalAlignmentPages || totalAlignmentPages === 0}
                        className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: MEDIÇÃO DE SULCO */}
          {activeTab === "sulco" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Form Cadastro */}
                <div className="bg-white border-2 border-border-custom rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start border-b pb-3 mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-brand-primary">Nova Medição de Profundidade de Sulco</h3>
                      <p className="text-xs text-gray-400 mt-1">Monitore o desgaste de pneus para evitar multas e garantir a segurança operacional.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddTread} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">🔥 FOGO DO PNEU (OBRIGATÓRIO)</label>
                        <input
                          type="text"
                          required
                          value={treadForm.fogoPneu}
                          onChange={(e) => setTreadForm({ ...treadForm, fogoPneu: e.target.value })}
                          placeholder="EX: FG-8829"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary font-bold focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">PLACA DO VEÍCULO</label>
                        <input
                          type="text"
                          required
                          value={treadForm.placa}
                          onChange={(e) => setTreadForm({ ...treadForm, placa: e.target.value })}
                          placeholder="ABC-1234"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">RESPONSÁVEL PELA MEDIÇÃO</label>
                        <input
                          type="text"
                          required
                          value={treadForm.tecnico}
                          onChange={(e) => setTreadForm({ ...treadForm, tecnico: e.target.value })}
                          placeholder="Ricardo Souza"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="font-bold text-brand-primary mb-3 uppercase tracking-wider text-[10px]">Medições de Profundidade (mm)</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-gray-500 font-semibold mb-1">SULCO 1 (Externo)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="25"
                            required
                            value={treadForm.sulco1}
                            onChange={(e) => setTreadForm({ ...treadForm, sulco1: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary font-mono focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 font-semibold mb-1">SULCO 2 (Interno Esq)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="25"
                            required
                            value={treadForm.sulco2}
                            onChange={(e) => setTreadForm({ ...treadForm, sulco2: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary font-mono focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 font-semibold mb-1">SULCO 3 (Interno Dir)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="25"
                            required
                            value={treadForm.sulco3}
                            onChange={(e) => setTreadForm({ ...treadForm, sulco3: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary font-mono focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 font-semibold mb-1">SULCO 4 (Externo Dir)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="25"
                            required
                            value={treadForm.sulco4}
                            onChange={(e) => setTreadForm({ ...treadForm, sulco4: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary font-mono focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">DATA DA MEDIÇÃO</label>
                        <input
                          type="date"
                          value={treadForm.data}
                          onChange={(e) => setTreadForm({ ...treadForm, data: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">OBSERVAÇÕES ADICIONAIS</label>
                        <input
                          type="text"
                          value={treadForm.observacoes}
                          onChange={(e) => setTreadForm({ ...treadForm, observacoes: e.target.value })}
                          placeholder="Focos de desgaste desigual, desgaste dente de serra..."
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      {editingTreadId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTreadId(null);
                            setTreadForm({
                              fogoPneu: "",
                              placa: "",
                              sulco1: "8.0",
                              sulco2: "8.0",
                              sulco3: "8.0",
                              sulco4: "8.0",
                              tecnico: "",
                              data: new Date().toISOString().split("T")[0],
                              observacoes: "",
                            });
                          }}
                          className="px-4 py-2 border rounded text-stone-700 hover:bg-stone-50 transition-colors uppercase font-bold text-[10px]"
                        >
                          Cancelar Edição
                        </button>
                      )}
                      <button
                        type="submit"
                        className="bg-brand-orange hover:bg-opacity-90 text-white font-extrabold px-6 py-2.5 rounded shadow-sm hover:shadow transition-all uppercase tracking-wider text-[10px]"
                      >
                        {editingTreadId ? "Atualizar Medição" : "Registrar Nova Medição"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Histórico Tabela */}
                <div className="bg-white border-2 border-border-custom rounded-lg shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-brand-primary uppercase tracking-tight">Histórico de Medições de Sulcos</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Filtro de busca e paginação ativos para toda a base</p>
                    </div>
                    {/* Period Pickers for Sulco */}
                    <div className="flex gap-2 text-[10px] mt-2 sm:mt-0">
                      <input
                        type="date"
                        value={treadStartDateFilter}
                        onChange={(e) => setTreadStartDateFilter(e.target.value)}
                        className="bg-gray-50 border rounded px-2 py-1 text-xs"
                      />
                      <span className="self-center">até</span>
                      <input
                        type="date"
                        value={treadEndDateFilter}
                        onChange={(e) => setTreadEndDateFilter(e.target.value)}
                        className="bg-gray-50 border rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-brand-primary">
                      <thead className="bg-gray-100 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">🔥 Fogo</th>
                          <th className="px-6 py-3">Placa</th>
                          <th className="px-6 py-3">Profundidades (S1•S2•S3•S4)</th>
                          <th className="px-6 py-3">Média</th>
                          <th className="px-6 py-3">Estado</th>
                          <th className="px-6 py-3">Medido Por</th>
                          <th className="px-6 py-3">Filial</th>
                          <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedTreads.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                              Sem registros de medição correspondentes para esta filial e período.
                            </td>
                          </tr>
                        ) : (
                          paginatedTreads.map((tm) => {
                            const media = ((tm.sulco1 + tm.sulco2 + tm.sulco3 + tm.sulco4) / 4).toFixed(1);
                            const mediaNum = parseFloat(media);
                            // 1.6mm is the legal limit in BR, 3mm is warning
                            const isCareca = mediaNum <= 1.6;
                            const isAlerta = mediaNum <= 3.0 && mediaNum > 1.6;

                            return (
                              <tr key={tm.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-black text-brand-orange">{tm.fogoPneu}</td>
                                <td className="px-6 py-4 font-bold">{tm.placa}</td>
                                <td className="px-6 py-4 font-mono font-semibold">
                                  {tm.sulco1}mm • {tm.sulco2}mm • {tm.sulco3}mm • {tm.sulco4}mm
                                </td>
                                <td className="px-6 py-4 font-bold font-mono">{media} mm</td>
                                <td className="px-6 py-4">
                                  {isCareca ? (
                                    <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase animate-pulse">
                                      Perigo (Careca)
                                    </span>
                                  ) : isAlerta ? (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase">
                                      Alerta (Trocar)
                                    </span>
                                  ) : (
                                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase">
                                      Excelente (OK)
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-500">{tm.tecnico}</td>
                                <td className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400">{tm.branchName}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-1.5 pt-4">
                                  <button
                                    onClick={() => {
                                      setEditingTreadId(tm.id);
                                      setTreadForm({
                                        fogoPneu: tm.fogoPneu,
                                        placa: tm.placa,
                                        sulco1: String(tm.sulco1),
                                        sulco2: String(tm.sulco2),
                                        sulco3: String(tm.sulco3),
                                        sulco4: String(tm.sulco4),
                                        tecnico: tm.tecnico,
                                        data: tm.data,
                                        observacoes: tm.observacoes || "",
                                      });
                                    }}
                                    className="p-1 px-2 border rounded border-gray-200 hover:bg-gray-100 text-stone-700 transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTread(tm.id)}
                                    className="p-1 px-2 border rounded border-rose-100 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500">
                    <span>Mostrando {paginatedTreads.length} de {filteredTreads.length} medições</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTreadPage((prev) => Math.max(prev - 1, 1))}
                        disabled={treadPage === 1}
                        className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2.5 py-1 bg-brand-primary text-white font-extrabold rounded text-xs select-none">
                        {treadPage}
                      </span>
                      <button
                        onClick={() => setTreadPage((prev) => Math.min(prev + 1, totalTreadPages))}
                        disabled={treadPage === totalTreadPages || totalTreadPages === 0}
                        className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar Sulco Stats Card */}
              <div className="space-y-6">
                <div className="bg-brand-orange text-white rounded-lg p-6 flex flex-col justify-between shadow-md h-64">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">
                      Medições no Período
                    </span>
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-6xl font-black tracking-tight">{filteredTreads.length}</h1>
                    <p className="text-[10px] text-orange-100 font-bold mt-2">
                      Sincronizado em tempo real • Todas as coletas registradas
                    </p>
                  </div>
                </div>

                <div className="bg-white border-2 border-border-custom rounded-lg p-5 shadow-sm text-xs font-semibold">
                  <div className="flex items-center gap-2 border-b pb-2.5 mb-3 text-stone-900">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>Importância da Inspeção de Sulco</span>
                  </div>
                  <p className="text-stone-650 leading-relaxed font-medium font-sans">
                    Pneus com sulco abaixo de <strong>1.6mm</strong> estão fora de conformidade jurídica internacional (Tread Wear Indicator - TWI). A verificação protege o frotista contra penalidades e reduz derrapagens.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MOVIMENTAÇÃO DE PNEUS */}
          {activeTab === "movimentacao" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Visual Registration Form */}
                <div className="bg-white border-2 border-border-custom rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start border-b pb-3 mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-brand-primary">Novo Registro de Movimentação</h3>
                      <p className="text-xs text-gray-400 mt-1">Monitore montagens, troca de eixos e movimentação física de vulcanização de frotas.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddMovement} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">🔥 FOGO DO PNEU (OBRIGATÓRIO)</label>
                        <input
                          type="text"
                          required
                          value={movementForm.fogoPneu}
                          onChange={(e) => setMovementForm({ ...movementForm, fogoPneu: e.target.value })}
                          placeholder="EX: FG-9382"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary font-bold focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">PLACA DO VEÍCULO</label>
                        <input
                          type="text"
                          required
                          value={movementForm.placa}
                          onChange={(e) => setMovementForm({ ...movementForm, placa: e.target.value })}
                          placeholder="EX: KJD-8839"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm uppercase text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">TÉCNICO / RESPONSÁVEL</label>
                        <input
                          type="text"
                          required
                          value={movementForm.tecnico}
                          onChange={(e) => setMovementForm({ ...movementForm, tecnico: e.target.value })}
                          placeholder="Gabriel Andrade"
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                      <div>
                        <h4 className="font-bold text-brand-primary mb-2 text-[10px] uppercase">Posições Operacionais</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-gray-500 font-bold mb-1">POSIÇÃO ANTERIOR</label>
                            <select
                              value={movementForm.posicaoAnterior}
                              onChange={(e) => setMovementForm({ ...movementForm, posicaoAnterior: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                            >
                              <option value="Estoque">Estoque Interno</option>
                              <option value="Dianteiro Direito">Dianteiro Direito</option>
                              <option value="Dianteiro Esquerdo">Dianteiro Esquerdo</option>
                              <option value="Traseiro Esquerdo Externo">Traseiro Esquerdo Externo</option>
                              <option value="Traseiro Esquerdo Interno">Traseiro Esquerdo Interno</option>
                              <option value="Traseiro Direito Externo">Traseiro Direito Externo</option>
                              <option value="Traseiro Direito Interno">Traseiro Direito Interno</option>
                              <option value="Estepe">Estepe</option>
                              <option value="Vulcanização">Recapadora / Vulcanização</option>
                              <option value="Sucata">Sucata / Descarte</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-gray-500 font-bold mb-1">POSIÇÃO ATUAL</label>
                            <select
                              value={movementForm.posicaoAtual}
                              onChange={(e) => setMovementForm({ ...movementForm, posicaoAtual: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary font-bold"
                            >
                              <option value="Dianteiro Direito">Dianteiro Direito</option>
                              <option value="Dianteiro Esquerdo">Dianteiro Esquerdo</option>
                              <option value="Traseiro Esquerdo Externo">Traseiro Esquerdo Externo</option>
                              <option value="Traseiro Esquerdo Interno">Traseiro Esquerdo Interno</option>
                              <option value="Traseiro Direito Externo">Traseiro Direito Externo</option>
                              <option value="Traseiro Direito Interno">Traseiro Direito Interno</option>
                              <option value="Estepe">Estepe</option>
                              <option value="Estoque">Estoque Interno</option>
                              <option value="Vulcanização">Recapadora / Vulcanização</option>
                              <option value="Sucata">Sucata / Descarte</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-brand-primary mb-2 text-[10px] uppercase">Rastreamento de Pneu</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-gray-500 font-semibold mb-1">PNEU ANTERIOR</label>
                            <input
                              type="text"
                              value={movementForm.pneuAnterior}
                              onChange={(e) => setMovementForm({ ...movementForm, pneuAnterior: e.target.value })}
                              placeholder="Fogo antigo ou 'Sem Pneu'..."
                              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 font-bold mb-1 uppercase">POSIÇÃO DO PNEU ANTERIOR</label>
                            <select
                              value={movementForm.posicaoPneuAnterior}
                              onChange={(e) => setMovementForm({ ...movementForm, posicaoPneuAnterior: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-brand-primary focus:ring-1 focus:ring-brand-secondary font-bold"
                            >
                              <option value="Sucata">Sucata / Descarte</option>
                              <option value="Estoque">Estoque Interno</option>
                              <option value="Vulcanização">Recapadora / Vulcanização</option>
                              <option value="Estepe">Estepe</option>
                              <option value="Dianteiro Direito">Dianteiro Direito</option>
                              <option value="Dianteiro Esquerdo">Dianteiro Esquerdo</option>
                              <option value="Traseiro Esquerdo Externo">Traseiro Esquerdo Externo</option>
                              <option value="Traseiro Esquerdo Interno">Traseiro Esquerdo Interno</option>
                              <option value="Traseiro Direito Externo">Traseiro Direito Externo</option>
                              <option value="Traseiro Direito Interno">Traseiro Direito Interno</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-gray-500 font-semibold mb-1">PNEU ATUAL (Marca/Modelo)</label>
                            <input
                              type="text"
                              value={movementForm.pneuAtual}
                              onChange={(e) => setMovementForm({ ...movementForm, pneuAtual: e.target.value })}
                              placeholder="Michelin 295/80 R22.5..."
                              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                            />
                            {inventoryItems.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">T pneus em estoque:</span>
                                {inventoryItems
                                  .filter((i) => i.nome.toLowerCase().includes("pneu") && i.quantidade > 0)
                                  .map((i) => (
                                    <button
                                      key={i.id}
                                      type="button"
                                      onClick={() => setMovementForm({ ...movementForm, pneuAtual: i.nome })}
                                      className="text-[10px] bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/25 rounded px-2 py-0.5 font-semibold transition cursor-pointer"
                                    >
                                      {i.nome} ({i.quantidade})
                                    </button>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                      <div>
                        <label className="block font-bold text-gray-650 mb-1">DATA DA MOVIMENTAÇÃO</label>
                        <input
                          type="date"
                          value={movementForm.data}
                          onChange={(e) => setMovementForm({ ...movementForm, data: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-650 mb-1">OBSERVAÇÕES ADICIONAIS</label>
                        <input
                          type="text"
                          value={movementForm.observacoes}
                          onChange={(e) => setMovementForm({ ...movementForm, observacoes: e.target.value })}
                          placeholder="Ex: Rodízio preventivo realizado por cansaço lateral."
                          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-brand-primary focus:ring-1 focus:ring-brand-secondary"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      {editingMovementId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMovementId(null);
                            setMovementForm({
                              fogoPneu: "",
                              tecnico: "",
                              placa: "",
                              posicaoAtual: "Dianteiro Direito",
                              posicaoAnterior: "Dianteiro Esquerdo",
                              pneuAtual: "Michelin 295/85",
                              pneuAnterior: "Sem Pneu",
                              posicaoPneuAnterior: "Sucata",
                              data: new Date().toISOString().split("T")[0],
                              observacoes: "",
                            });
                          }}
                          className="px-4 py-2 border rounded text-stone-700 hover:bg-stone-50 uppercase font-bold text-[10px]"
                        >
                          Cancelar Edição
                        </button>
                      )}
                      <button
                        type="submit"
                        className="bg-brand-primary hover:bg-opacity-90 text-white font-extrabold px-6 py-2.5 rounded shadow transition-all uppercase tracking-wider text-[10px]"
                      >
                        {editingMovementId ? "Atualizar Movimentação" : "Lançar Movimentação"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* History Log Table */}
                <div className="bg-white border-2 border-border-custom rounded-lg shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-brand-primary uppercase tracking-tight">Rastreabilidade Operacional de Movimentação</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Sincronização imediata em tempo real focado em eixos e eixos de apoio</p>
                    </div>
                    {/* Period Pickers for Movements */}
                    <div className="flex gap-2 text-[10px] mt-2 sm:mt-0">
                      <input
                        type="date"
                        value={movementStartDateFilter}
                        onChange={(e) => setMovementStartDateFilter(e.target.value)}
                        className="bg-gray-50 border rounded px-2 py-1 text-xs"
                      />
                      <span className="self-center">até</span>
                      <input
                        type="date"
                        value={movementEndDateFilter}
                        onChange={(e) => setMovementEndDateFilter(e.target.value)}
                        className="bg-gray-50 border rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-brand-primary">
                      <thead className="bg-gray-100 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">🔥 Fogo</th>
                          <th className="px-6 py-3">Veículo Placa</th>
                          <th className="px-6 py-3">Flutuabilidade (Anterior → Atual)</th>
                          <th className="px-6 py-3">Pneu Reposicionado</th>
                          <th className="px-6 py-3">Operador</th>
                          <th className="px-6 py-3">Filial</th>
                          <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedMovements.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                              Sem registros de movimentações nesta filial ou seleção de período.
                            </td>
                          </tr>
                        ) : (
                          paginatedMovements.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-black text-brand-primary">{m.fogoPneu}</td>
                              <td className="px-6 py-4 font-bold">{m.placa}</td>
                              <td className="px-6 py-4">
                                <span className="font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded text-[10px] border">
                                  {m.posicaoAnterior}
                                </span>
                                <span className="px-1.5 font-bold">➔</span>
                                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px] border border-indigo-200">
                                  {m.posicaoAtual}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-600">
                                <div className="font-bold text-gray-850">{m.pneuAtual}</div>
                                {m.pneuAnterior && (
                                  <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    Anterior: <span className="font-bold">{m.pneuAnterior}</span>
                                    {m.posicaoPneuAnterior && (
                                      <span className="ml-1 px-1 bg-stone-100 border text-[9px] text-stone-600 rounded">
                                        ➔ {m.posicaoPneuAnterior}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-400">{m.tecnico}</td>
                              <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">{m.branchName}</td>
                              <td className="px-6 py-4 text-right flex justify-end gap-1.5 pt-4">
                                <button
                                  onClick={() => {
                                    setEditingMovementId(m.id);
                                    setMovementForm({
                                      fogoPneu: m.fogoPneu,
                                      tecnico: m.tecnico,
                                      placa: m.placa,
                                      posicaoAtual: m.posicaoAtual,
                                      posicaoAnterior: m.posicaoAnterior,
                                      pneuAtual: m.pneuAtual,
                                      pneuAnterior: m.pneuAnterior || "",
                                      posicaoPneuAnterior: m.posicaoPneuAnterior || "Sucata",
                                      data: m.data,
                                      observacoes: m.observacoes || "",
                                    });
                                  }}
                                  className="p-1 px-2 border rounded border-gray-200 hover:bg-gray-100 text-stone-700 transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMovement(m.id)}
                                  className="p-1 px-2 border rounded border-rose-100 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500">
                    <span>Mostrando {paginatedMovements.length} de {filteredMovements.length} registros</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <button
                        onClick={() => setMovementPage((prev) => Math.max(prev - 1, 1))}
                        disabled={movementPage === 1}
                        className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2.5 py-1 bg-brand-primary text-white rounded text-xs select-none">
                        {movementPage}
                      </span>
                      <button
                        onClick={() => setMovementPage((prev) => Math.min(prev + 1, totalMovementPages))}
                        disabled={movementPage === totalMovementPages || totalMovementPages === 0}
                        className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar Stats Panel */}
              <div className="space-y-6">
                <div className="bg-brand-primary text-white rounded-lg p-6 flex flex-col justify-between shadow-md h-64">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                      Movimentações Totais
                    </span>
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h1 className="text-6xl font-black tracking-tight">{filteredMovements.length}</h1>
                    <p className="text-[10px] text-amber-300 font-bold mt-2">
                      Sincronizado instantaneamente por filial
                    </p>
                  </div>
                </div>

                <div className="bg-white border-2 border-border-custom rounded-lg p-5 shadow-sm text-xs font-semibold">
                  <div className="flex items-center gap-2 border-b pb-2.5 mb-2.5 text-stone-900">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>Conceito de Movimentação</span>
                  </div>
                  <p className="text-stone-600 font-medium font-sans leading-relaxed">
                    A movimentação interna traça o histórico de recapagens físicas e rodízio de pneus entre rodas e eixos, salvaguardando a durabilidade útil ideal do patrimônio mecânico da transportadora.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PERMISSÕES & CONTROLE DE ACESSO */}
          {activeTab === "permissoes" && (
            <>
              {userProfile?.role !== "MASTER" ? (
                <div className="bg-white border-2 border-border-custom rounded-lg p-10 max-w-xl mx-auto text-center shadow-lg">
                  <ShieldAlert className="w-16 h-16 text-red-650 mx-auto mb-4 animate-bounce" />
                  <h3 className="font-extrabold text-xl text-brand-primary uppercase tracking-tight">Acesso Restrito ao Usuário Master</h3>
                  <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                    O console de controle &quot;Permissões &amp; Acessos&quot; é exclusivo do Usuário Master Global Administrador do sistema. Operadores de filiais e gerentes regionais não possuem autorização de visualização ou adição de novas contas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Formulário Admin User Creation */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border-2 border-border-custom rounded-lg p-6 shadow-sm">
                      <div className="border-b pb-3 mb-5">
                        <h3 className="font-extrabold text-base text-brand-primary uppercase">Cadastro Administrativo</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">Gerencie os perfis com Email, Cargo, Filial e Nível de Acesso.</p>
                      </div>

                      <form onSubmit={handleAddUser} className="space-y-4 text-xs font-semibold font-sans">
                        <div>
                          <label className="block text-gray-500 mb-1 font-bold">EMAIL CORPORATIVO</label>
                          <input
                            type="email"
                            required
                            disabled={!!editingUserId}
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            placeholder="ex: operador@borrachariapro.com.br"
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-stone-900 focus:ring-1 focus:ring-brand-secondary focus:outline-none disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1 font-bold">CARGO CORPORATIVO</label>
                          <input
                            type="text"
                            required
                            value={userForm.cargo}
                            onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })}
                            placeholder="Ex: Gerente Geral de Operações"
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-stone-900 focus:ring-1 focus:ring-brand-secondary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1 font-bold">FILIAL RESPONSÁVEL</label>
                          <select
                            value={userForm.branchId}
                            onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-stone-900 focus:ring-1 focus:ring-brand-secondary"
                          >
                            {FILIAIS.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1 font-bold">CARGO / ROLE DE CONTROLE</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                            className="w-full bg-stone-50 border border-orange-200 rounded px-3 py-2 text-sm text-stone-950 font-black focus:ring-1 focus:ring-brand-orange"
                          >
                            <option value="OPERADOR">OPERADOR (Acesso estrito à sua própria filial)</option>
                            <option value="GERENTE">GERENTE (Leitura/Escrita unicamente da filial configurada)</option>
                            <option value="MASTER">MASTER (Console global consolidado total)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1 font-bold">ESTADO DA CONTA</label>
                          <select
                            value={userForm.status}
                            onChange={(e) => setUserForm({ ...userForm, status: e.target.value as any })}
                            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-stone-900 focus:ring-1 focus:ring-brand-secondary font-bold"
                          >
                            <option value="Ativo">Ativo (Acesso Liberado)</option>
                            <option value="Inativo">Inativo (Bloqueio Total)</option>
                          </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                          {editingUserId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(null);
                                setUserForm({
                                  email: "",
                                  password: "",
                                  role: "OPERADOR",
                                  branchId: "MATRIZ",
                                  cargo: "",
                                  status: "Ativo",
                                });
                              }}
                              className="w-1/2 border px-3 py-2.5 rounded font-black text-[10px] uppercase text-gray-600"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            className="w-full bg-brand-orange hover:bg-opacity-90 text-white font-extrabold px-4 py-2.5 rounded shadow text-[10px] uppercase tracking-wider"
                          >
                            {editingUserId ? "Salvar Perfil" : "Salvar & Conceder"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Usuários Directory List Table */}
                  <div className="lg:col-span-2 space-y-6 font-sans">
                    <div className="bg-white border-2 border-border-custom rounded-lg shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b flex justify-between items-center">
                        <div>
                          <h4 className="font-extrabold text-sm text-brand-primary uppercase">Diretório Corporativo de Colaboradores</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Sincronização em tempo real de permissões e chaves por filial</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-brand-primary">
                          <thead className="bg-gray-100 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th className="px-6 py-3">Email de Acesso</th>
                              <th className="px-6 py-3">Cargo Corporativo</th>
                              <th className="px-6 py-3">Filial Atribuída</th>
                              <th className="px-6 py-3">Permissão</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right font-bold">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {paginatedUsers.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                                  Nenhum usuário cadastrado ou correspondente no diretório.
                                </td>
                              </tr>
                            ) : (
                              paginatedUsers.map((u) => (
                                <tr key={u.uid} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-extrabold text-gray-800">{u.email}</td>
                                  <td className="px-6 py-4 font-semibold text-gray-500">{u.cargo || "Operador Técnico"}</td>
                                  <td className="px-6 py-4">
                                    <span className="bg-stone-50 border border-gray-300 font-extrabold text-[9px] px-2.5 py-1 rounded">
                                      📍 {u.branchName || "Consolidado"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${
                                      u.role === "MASTER"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : u.role === "GERENTE"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-green-50 text-green-700 border-green-200"
                                    }`}>
                                      {u.role || "OPERADOR"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                                      u.status === "Inativo"
                                        ? "bg-neutral-100 text-neutral-500 border border-neutral-350"
                                        : "bg-emerald-50 text-emerald-850 border border-emerald-350"
                                    }`}>
                                      {u.status || "Ativo"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-1.5 pt-4">
                                    <button
                                      onClick={() => {
                                        setEditingUserId(u.uid);
                                        setUserForm({
                                          email: u.email,
                                          password: "",
                                          role: u.role || "OPERADOR",
                                          branchId: u.branchId || "MATRIZ",
                                          cargo: u.cargo || "",
                                          status: (u.status as any) || "Ativo",
                                        });
                                      }}
                                      className="p-1 px-2 border rounded border-gray-200 hover:bg-gray-100 text-stone-700 transition-colors inline-flex items-center justify-center cursor-pointer"
                                      title="Editar Perfil"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.uid)}
                                      className="p-1 px-2 border rounded border-rose-100 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                      title="Suspender Conta"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginação */}
                      <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500">
                        <span>Mostrando {paginatedUsers.length} de {filteredUsers.length} colaboradores</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <button
                            onClick={() => setUsersPage((prev) => Math.max(prev - 1, 1))}
                            disabled={usersPage === 1}
                            className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="px-2.5 py-1 bg-brand-primary text-white rounded text-xs select-none">
                            {usersPage}
                          </span>
                          <button
                            onClick={() => setUsersPage((prev) => Math.min(prev + 1, totalUserPages))}
                            disabled={usersPage === totalUserPages || totalUserPages === 0}
                            className="p-1 px-2 border rounded hover:bg-gray-100 disabled:opacity-40"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </section>

        {/* BottomNavBar (Mobile Only) identical to design specification */}
        <nav className="md:hidden flex overflow-x-auto gap-2 bg-white py-2 px-3 border-t-2 border-border-custom fixed bottom-0 left-0 right-0 z-40 justify-around font-bold text-[8px] text-gray-500 uppercase tracking-widest bg-stone-50 scrollbar-none shadow-lg">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setSearchTerm("");
            }}
            className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
              activeTab === "dashboard" ? "text-brand-secondary" : "text-gray-400"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 mb-0.5" />
            HOME
          </button>
          <button
            onClick={() => {
              setActiveTab("calibragem");
              setSearchTerm("");
            }}
            className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
              activeTab === "calibragem" ? "text-brand-secondary" : "text-gray-400"
            }`}
          >
            <Gauge className="w-3.5 h-3.5 mb-0.5" />
            CALIB.
          </button>
          <button
            onClick={() => {
              setActiveTab("rodizio");
              setSearchTerm("");
            }}
            className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
              activeTab === "rodizio" ? "text-brand-orange" : "text-gray-400"
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 mb-0.5" />
            RODÍZIO
          </button>
          <button
            onClick={() => {
              setActiveTab("alinhamento");
              setSearchTerm("");
            }}
            className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
              activeTab === "alinhamento" ? "text-brand-orange" : "text-gray-400"
            }`}
          >
            <Wrench className="w-3.5 h-3.5 mb-0.5" />
            ALINH.
          </button>
          <button
            onClick={() => {
              setActiveTab("sulco");
              setSearchTerm("");
            }}
            className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
              activeTab === "sulco" ? "text-brand-orange" : "text-gray-400"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 mb-0.5" />
            SULCO
          </button>
          <button
            onClick={() => {
              setActiveTab("movimentacao");
              setSearchTerm("");
            }}
            className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
              activeTab === "movimentacao" ? "text-brand-orange" : "text-gray-400"
            }`}
          >
            <Move className="w-3.5 h-3.5 mb-0.5" />
            MOVIM.
          </button>
          {userProfile?.role === "MASTER" && (
            <button
              onClick={() => {
                setActiveTab("permissoes");
                setSearchTerm("");
              }}
              className={`flex flex-col items-center justify-center cursor-pointer min-w-[50px] shrink-0 ${
                activeTab === "permissoes" ? "text-brand-secondary" : "text-gray-400"
              }`}
            >
              <Users className="w-3.5 h-3.5 mb-0.5" />
              PERMISS.
            </button>
          )}
        </nav>

        {/* Floating action button on mobile */}
        <button
          onClick={() => {
            setServiceTypeChoice(activeTab === "alinhamento" ? "alinhamento" : activeTab === "calibragem" ? "calibragem" : "rodizio");
            setIsNewServiceModalOpen(true);
          }}
          className="md:hidden fixed bottom-16 right-4 w-12 h-12 bg-brand-orange text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all text-center border cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>

      </main>

      {/* MODAL 1: Create New Service of Selected Type */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full border-2 border-border-custom shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewServiceModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-brand-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-brand-primary mb-2 uppercase tracking-wide">
              Registrar Novo Atendimento
            </h3>
            <p className="text-xs text-gray-400 mb-4">Escolha a categoria do serviço abaixo:</p>

            {/* Choose category style buttons */}
            <div className="grid grid-cols-3 gap-2 mb-6 text-xs">
              <button
                type="button"
                onClick={() => setServiceTypeChoice("rodizio")}
                className={`py-2 border font-bold rounded cursor-pointer transition-colors ${
                  serviceTypeChoice === "rodizio"
                    ? "bg-brand-secondary border-brand-secondary text-white shadow-sm"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Rodízio
              </button>
              <button
                type="button"
                onClick={() => setServiceTypeChoice("alinhamento")}
                className={`py-2 border font-bold rounded cursor-pointer transition-colors ${
                  serviceTypeChoice === "alinhamento"
                    ? "bg-brand-orange border-brand-orange text-white shadow-sm"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Alinhamento
              </button>
              <button
                type="button"
                onClick={() => setServiceTypeChoice("calibragem")}
                className={`py-2 border font-bold rounded cursor-pointer transition-colors ${
                  serviceTypeChoice === "calibragem"
                    ? "bg-brand-secondary border-brand-secondary text-white shadow-sm"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Calibragem
              </button>
            </div>

            {/* Sub-form based on selection */}
            {serviceTypeChoice === "rodizio" && (
              <form onSubmit={handleAddRotation} className="space-y-4 text-xs font-medium">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-500 uppercase">Dados de Rodízio Rápido</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Placa do Veículo</label>
                    <input
                      type="text"
                      required
                      value={rotationForm.placa}
                      onChange={(e) => setRotationForm({ ...rotationForm, placa: e.target.value })}
                      placeholder="ABC-1234"
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 uppercase font-semibold text-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Medida do Pneu</label>
                    <input
                      type="text"
                      value={rotationForm.pneuInstalado}
                      onChange={(e) => setRotationForm({ ...rotationForm, pneuInstalado: e.target.value })}
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    />
                    {inventoryItems.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        {inventoryItems
                          .filter((i) => i.nome.toLowerCase().includes("pneu") && i.quantidade > 0)
                          .map((i) => (
                            <button
                              key={i.id}
                              type="button"
                              onClick={() => setRotationForm({ ...rotationForm, pneuInstalado: i.nome })}
                              className="text-[10px] bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/25 rounded px-1.5 py-0.5 transition cursor-pointer"
                            >
                              {i.nome} ({i.quantidade})
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">De (Posição)</label>
                    <select
                      value={rotationForm.posicaoRetirado}
                      onChange={(e) => setRotationForm({ ...rotationForm, posicaoRetirado: e.target.value })}
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    >
                      <option value="Dianteiro Esq">Dianteiro Esq</option>
                      <option value="Dianteiro Dir">Dianteiro Dir</option>
                      <option value="Traseiro Esq">Traseiro Esq</option>
                      <option value="Traseiro Dir">Traseiro Dir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Para (Posição)</label>
                    <select
                      value={rotationForm.novaPosicaoRetirado}
                      onChange={(e) => setRotationForm({ ...rotationForm, novaPosicaoRetirado: e.target.value })}
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    >
                      <option value="Estepe">Estepe</option>
                      <option value="Dianteiro Esq">Dianteiro Esq</option>
                      <option value="Dianteiro Dir">Dianteiro Dir</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-secondary text-white font-bold rounded hover:brightness-110 shadow"
                >
                  Confirmar Rodízio
                </button>
              </form>
            )}

            {serviceTypeChoice === "alinhamento" && (
              <form onSubmit={handleAddAlignment} className="space-y-4 text-xs font-medium">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-500 uppercase">Dados de Alinhamento Rápido</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Placa do Veículo</label>
                    <input
                      type="text"
                      required
                      value={alignmentForm.placa}
                      onChange={(e) => setAlignmentForm({ ...alignmentForm, placa: e.target.value })}
                      placeholder="ABC-1234"
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 uppercase font-semibold text-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Aprovado Por</label>
                    <input
                      type="text"
                      value={alignmentForm.quemAutorizou}
                      onChange={(e) => setAlignmentForm({ ...alignmentForm, quemAutorizou: e.target.value })}
                      placeholder="Direto ou Cliente..."
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Defeito ou Anomalia Encontrada</label>
                  <textarea
                    rows={2}
                    value={alignmentForm.defeito}
                    onChange={(e) => setAlignmentForm({ ...alignmentForm, defeito: e.target.value })}
                    placeholder="Desvios de direção, trepidações..."
                    className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Data do Registro</label>
                  <input
                    type="date"
                    value={alignmentForm.data}
                    onChange={(e) => setAlignmentForm({ ...alignmentForm, data: e.target.value })}
                    className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-orange text-white font-bold rounded hover:brightness-110 shadow"
                >
                  Salvar Registro
                </button>
              </form>
            )}

            {serviceTypeChoice === "calibragem" && (
              <form onSubmit={handleAddCalibration} className="space-y-4 text-xs font-medium">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-500 uppercase">Dados de Calibragem</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Tipo de Veículo</label>
                    <select
                      value={calibrationForm.tipoVeiculo}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, tipoVeiculo: e.target.value })}
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    >
                      <option value="Truck">Truck</option>
                      <option value="3/4">3/4</option>
                      <option value="Toco">Toco</option>
                      <option value="Carreta">Carreta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Placa do Veículo</label>
                    <input
                      type="text"
                      required
                      value={calibrationForm.placa}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, placa: e.target.value })}
                      placeholder="ABC-1234"
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 uppercase font-semibold text-brand-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Conjunto de Pneus</label>
                    <input
                      type="text"
                      value={calibrationForm.pneusContexto}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, pneusContexto: e.target.value })}
                      placeholder="Ex: 4, Dianteiros, Estepe..."
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Técnico Responsável</label>
                    <input
                      type="text"
                      value={calibrationForm.tecnico}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, tecnico: e.target.value })}
                      placeholder="Ex: Junior Silva"
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-secondary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Pressão Final (Libras)</label>
                    <input
                      type="number"
                      value={calibrationForm.pressaoAlvo}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, pressaoAlvo: e.target.value === "" ? "" : isNaN(parseInt(e.target.value)) ? "" : parseInt(e.target.value) })}
                      placeholder="Ex: 32"
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Pressão Inicial (Libras)</label>
                    <input
                      type="number"
                      value={calibrationForm.pressaoInicial}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, pressaoInicial: e.target.value === "" ? "" : isNaN(parseInt(e.target.value)) ? "" : parseInt(e.target.value) })}
                      placeholder="Ex: 26"
                      className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Data do Registro</label>
                  <input
                    type="date"
                    value={calibrationForm.data}
                    onChange={(e) => setCalibrationForm({ ...calibrationForm, data: e.target.value })}
                    className="w-full bg-gray-50 border rounded px-3 py-1.5 text-brand-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-secondary text-white font-bold rounded hover:brightness-110 shadow"
                >
                  Registrar Calibragem
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL 2: Gemini Diagnosis Response Details */}
      {selectedAlignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full border-2 border-border-custom shadow-xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setSelectedAlignment(null)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-brand-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-4 mb-4 flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-indigo-650 shrink-0" />
              <div>
                <h3 className="font-extrabold text-brand-primary uppercase tracking-wide text-sm">
                  Diagnóstico Inteligente via IA
                </h3>
                <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                  Borracharia Pro • Veículo {selectedAlignment.placa}
                </p>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 space-y-4 text-xs font-semibold scrollbar-thin">
              
              {/* Defect description original view */}
              <div className="bg-slate-50 border rounded p-4">
                <span className="text-[9px] font-black text-gray-400 block uppercase mb-1">Sintoma Detetado pelo Técnico ({selectedAlignment.tecnico}):</span>
                <p className="text-stone-850 font-medium text-[13px] leading-relaxed italic">
                  &ldquo;{selectedAlignment.defeito}&rdquo;
                </p>
              </div>

              {/* Gemini response representation */}
              <div className="space-y-3 pt-3">
                <span className="text-[9px] font-black text-indigo-650 block uppercase tracking-wider">Laudo AI e Recomendações de Geometria:</span>
                
                {isAiLoading ? (
                  <div className="py-12 flex flex-col justify-center items-center gap-3 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-650 rounded-full animate-spin" />
                    <p className="text-xs text-indigo-700 font-bold uppercase animate-pulse">
                      Gemini analisando geometria do veículo...
                    </p>
                    <p className="text-[10px] text-gray-450 italic">Compilando possíveis causas e riscos...</p>
                  </div>
                ) : aiDiagnosisText ? (
                  <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-lg text-indigo-950 font-medium leading-relaxed text-xs space-y-2 whitespace-pre-wrap">
                    {aiDiagnosisText}
                  </div>
                ) : (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded text-orange-900 text-xs font-medium">
                    Nenhum diagnóstico gerado ou falha na solicitação. Verifique se sua chave GEMINI_API_KEY foi devidamente configurada.
                  </div>
                )}
              </div>

            </div>

            <div className="border-t pt-4 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAlignment(null)}
                className="px-5 py-2.5 bg-brand-primary text-white font-extrabold rounded text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-colors cursor-pointer"
              >
                Concluir Leitura e Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCLUSION CONFIRMATION MODAL (PREMIUM ENTERPRISE DESIGN) */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <div 
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => {
              if (!isDeleting) {
                setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
              }
            }}
          />
          
          {/* Content Card with Elegant SaaS Crimson Motif */}
          <div className="relative bg-white rounded-xl border border-stone-200 shadow-2xl max-w-sm w-full overflow-hidden p-6 text-left z-10 animate-in fade-in scale-in duration-200">
            {/* Top caution visual bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />
            
            <div className="flex gap-4 items-start mt-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-extrabold text-stone-900 tracking-tight leading-snug">
                  Confirmar Exclusão Crítica
                </h4>
                <p className="text-[10px] text-rose-600 uppercase font-black tracking-widest mt-0.5">
                  Operação Irreversível
                </p>
              </div>
            </div>

            <div className="my-5 bg-stone-50 border border-stone-200/60 rounded-lg p-4 text-xs leading-relaxed text-stone-700 space-y-2">
              <p>
                Deseja realmente remover o registro relacionado a <strong className="text-brand-primary">{deleteConfirm.label}</strong> do veículo com placa de identificação <strong className="font-mono bg-stone-200/60 px-1.5 py-0.5 rounded border border-stone-300/30 text-stone-905 text-[11px] font-bold">{deleteConfirm.plate}</strong>?
              </p>
              <p className="text-[10px] text-gray-500 italic leading-snug border-t pt-2 mt-2 border-gray-200/50">
                Esta ação apagará permanentemente o histórico. Todos os dashboards, gráficos operacionais semanais, indicadores de rodízios e KPIs consolidados serão recalculados dinamicamente em tempo real.
              </p>
            </div>

            {/* Modal actions panel */}
            <div className="flex gap-3 justify-end items-center mt-4">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border rounded border-gray-300 font-bold text-xs text-gray-650 uppercase tracking-wider hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeExclusion}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-350 text-white font-extrabold rounded text-xs uppercase tracking-wider shadow-md shadow-rose-900/10 inline-flex items-center gap-2 justify-center min-w-[140px] h-10 transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT FLOATING TOASTS NOTIFICATIONS PORTAL */}
      <div className="fixed bottom-6 right-6 z-[120] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-lg shadow-xl border-l-[6px] translate-y-0 opacity-100 flex justify-between items-start gap-4 transition-all duration-300 transform scale-100 bg-white border border-gray-150 animate-in slide-in-from-right duration-250`}
            style={{
              borderLeftColor: t.type === "success" ? "#10b981" : t.type === "error" ? "#f43f5e" : "#3b82f6"
            }}
          >
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span 
                  className={`w-2 h-2 rounded-full ${
                    t.type === "success" ? "bg-emerald-500" : t.type === "error" ? "bg-rose-500" : "bg-blue-500"
                  }`} 
                />
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-gray-450">
                  {t.type === "success" ? "Notificação Geral" : t.type === "error" ? "Erro Crítico" : "Aviso"}
                </span>
              </div>
              <p className="font-bold text-gray-800 leading-normal">{t.message}</p>
            </div>
            
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 font-extrabold cursor-pointer p-0.5 text-sm leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
