import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  Send,
  Edit,
  FileText,
  Activity,
  Pill,
  AlertCircle,
  Users,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Phone,
  Calendar,
  Clock,
  Mic,
  Heart,
  File,
  User,
  X,
  Maximize,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import mockPatientData from "@/lib/mockPatient.json";
import mockPatientUpdateData from "@/lib/mockPatientUpdate.json";
import seraLogo from "@/assets/sera-logo.png";
const MOCK_DOCTOR_NOTE = `Patient reports he feels well, slept well. He reports the pain in the left epigastrium has gotten better, but now a he complains baout pain in his right hypogastrium, itensity varies over the day, no dependency on food or change of body position. No iradiation. He reports nausea, loss of appetite and a general sense of weekness.
-> measure temperature
-> take blood tests
-> take urine`;
interface Task {
  task_id: string;
  task_type: string;
  description: string;
  department: string;
  status: string;
  priority: string;
  details?: string;
  assignee_name?: string;
  assignee_phone?: string;
  created_at: string;
  updated_at: string;
}
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}
interface PatientFollow {
  patient_id: string;
  user_id: string;
  profiles?: Profile;
}
interface PatientView {
  last_viewed_at: string;
}

// Task type options and their specific details
const TASK_TYPE_OPTIONS: Record<string, string[]> = {
  "Blood test": [
    "Complete Blood Count (CBC)",
    "Basic Metabolic Panel",
    "Liver Function Tests",
    "Kidney Function Tests",
    "Lipid Panel",
    "HbA1c (Diabetes)",
    "Thyroid Function Tests",
  ],
  "Lab test": [
    "Liver Function Tests",
    "Kidney Function Tests",
    "Lipid Panel",
    "HbA1c (Diabetes)",
    "Thyroid Function Tests",
    "Electrolyte Panel",
    "Comprehensive Metabolic Panel",
  ],
  "Urine test": ["Urinalysis", "Urine Culture", "24-hour Urine Collection", "Urine Protein"],
  Imaging: ["X-Ray", "CT Scan", "MRI", "Ultrasound", "PET Scan"],
  "Temperature measurement": ["Oral", "Rectal", "Axillary", "Tympanic"],
};
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const DEPARTMENT_OPTIONS = [
  "Laboratory",
  "Radiology",
  "Cardiology",
  "Neurology",
  "Surgery",
  "Emergency",
  "ICU",
  "Pharmacy",
  "Physical Therapy",
];
const TASK_TYPE_LIST = [
  "Blood test",
  "Urine test",
  "Lab test",
  "Imaging",
  "Temperature measurement",
  "Consultation",
  "Medication administration",
  "Vital signs monitoring",
];
interface MockPatient {
  patient: {
    subject_id: string;
    name: string;
    gender: string;
    DOB: string;
    phone_number: string;
  };
  measurements: {
    height: string;
    weight: string;
    BMI: number;
  };
  history: {
    past_medical_history: string[];
    family_history: string[];
    social_history: string[];
    work_history: string[];
    medication: string[];
    allergies: string[];
  };
  note: string;
  tasks: Task[];
}

// Fixed patient ID for the mock patient
const MOCK_PATIENT_ID = "mock-patient-001";
const PatientDetail = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [noteText, setNoteText] = useState(MOCK_DOCTOR_NOTE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentData, setCurrentData] = useState<MockPatient>(mockPatientData as MockPatient);
  const [updatedData, setUpdatedData] = useState<MockPatient | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showClinicalNotes, setShowClinicalNotes] = useState(true);
  const [isValidated, setIsValidated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<PatientFollow[]>([]);
  const [lastUpdater, setLastUpdater] = useState<Profile | null>(null);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [showUpdatesPanel, setShowUpdatesPanel] = useState(false);

  // Editable fields for updated data
  const [editedNote, setEditedNote] = useState("");
  const [editedMedications, setEditedMedications] = useState<string[]>([]);
  const [editedTasks, setEditedTasks] = useState<Task[]>([]);

  // Edit mode state for each section
  const [isEditingBackground, setIsEditingBackground] = useState(false);
  const [isEditingMedicalHistory, setIsEditingMedicalHistory] = useState(false);
  const [isEditingCurrentMeds, setIsEditingCurrentMeds] = useState(false);
  const [isEditingPastMeds, setIsEditingPastMeds] = useState(false);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingClinicalNote, setIsEditingClinicalNote] = useState(false);
  const [clinicalNoteTimestamp, setClinicalNoteTimestamp] = useState(new Date().toISOString());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // New task state
  const [newTask, setNewTask] = useState<Partial<Task>>({
    task_type: "Blood test",
    description: "",
    department: "Laboratory",
    priority: "Medium",
    status: "pending",
  });

  // Temporary edit state
  const [tempSocialHistory, setTempSocialHistory] = useState<string[]>([]);
  const [tempFamilyHistory, setTempFamilyHistory] = useState<string[]>([]);
  const [tempWorkHistory, setTempWorkHistory] = useState<string[]>([]);
  const [tempAllergies, setTempAllergies] = useState<string[]>([]);
  const [tempPastMedicalHistory, setTempPastMedicalHistory] = useState<string[]>([]);
  const [tempCurrentMedications, setTempCurrentMedications] = useState<string[]>([]);
  const [tempPastMedications, setTempPastMedications] = useState<string[]>([]);
  const [tempTasks, setTempTasks] = useState<Task[]>([]);
  const [tempClinicalNote, setTempClinicalNote] = useState("");

  // Collapsible state for sections
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(true);
  const [isMedicalHistoryOpen, setIsMedicalHistoryOpen] = useState(true);
  const [isCurrentMedsOpen, setIsCurrentMedsOpen] = useState(true);
  const [isPastMedsOpen, setIsPastMedsOpen] = useState(false); // Collapsed by default
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  const [showBloodTestAnalysis, setShowBloodTestAnalysis] = useState(false);
  useEffect(() => {
    // Check for demo mode first
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      const user = JSON.parse(demoUser);
      setSession({
        user: {
          id: user.id,
          email: user.email,
        } as any,
      } as any);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });
    }
  }, []);
  useEffect(() => {
    if (session?.user) {
      loadFollowStatus();
      loadFollowers();
      loadLastUpdater();
      checkForNewUpdates();
    }
  }, [session]);

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRecording) {
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);
  const loadFollowers = async () => {
    // Demo mode - use localStorage
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      const user = JSON.parse(demoUser);
      const demoFollows = localStorage.getItem("demo_follows");
      if (demoFollows) {
        const followsMap = JSON.parse(demoFollows);
        if (followsMap[MOCK_PATIENT_ID]) {
          setFollowers([
            {
              patient_id: MOCK_PATIENT_ID,
              user_id: user.id,
              profiles: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: "Doctor",
              },
            },
            {
              patient_id: MOCK_PATIENT_ID,
              user_id: "nurse-001",
              profiles: {
                id: "nurse-001",
                full_name: "Sarah Johnson",
                email: "sarah.johnson@hospital.com",
                role: "Nurse",
              },
            },
            {
              patient_id: MOCK_PATIENT_ID,
              user_id: "nurse-002",
              profiles: {
                id: "nurse-002",
                full_name: "Emily Rodriguez",
                email: "emily.rodriguez@hospital.com",
                role: "Nurse",
              },
            },
          ]);
        }
      }
      return;
    }
    const { data, error } = await supabase
      .from("patient_follows")
      .select("patient_id, user_id")
      .eq("patient_id", MOCK_PATIENT_ID);
    if (error) {
      console.error("Error loading followers:", error);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(data?.map((f) => f.user_id) || [])];

    // Fetch profiles for these users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds);
    const profilesMap: Record<string, Profile> = {};
    profilesData?.forEach((profile) => {
      profilesMap[profile.id] = profile;
    });
    const followersWithProfiles =
      data?.map((follow) => ({
        ...follow,
        profiles: profilesMap[follow.user_id],
      })) || [];
    setFollowers(followersWithProfiles);
  };
  const loadLastUpdater = async () => {
    // For demo mode, set a mock last updater
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      setLastUpdater({
        id: "mock-updater",
        full_name: "Dr. Michael Chen",
        email: "michael.chen@hospital.com",
        role: "General Practitioner",
      });
      return;
    }

    // In real mode, we'd fetch from the patients table's updated_by field
    // For now, since we're still using mock data, set a placeholder
    setLastUpdater({
      id: "mock-updater",
      full_name: "Dr. Michael Chen",
      email: "michael.chen@hospital.com",
      role: "General Practitioner",
    });
  };
  const checkForNewUpdates = async () => {
    if (!session?.user) return;
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      // In demo mode, check if user has viewed updates before
      const lastViewedKey = `patient_${MOCK_PATIENT_ID}_last_viewed`;
      const lastViewed = localStorage.getItem(lastViewedKey);
      if (!lastViewed) {
        setHasNewUpdates(true);
        setShowUpdatesPanel(true);
      }
      return;
    }

    // In real mode, check against patient_views table
    const { data: viewData, error } = await supabase
      .from("patient_views")
      .select("last_viewed_at")
      .eq("patient_id", MOCK_PATIENT_ID)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.error("Error checking updates:", error);
      return;
    }
    if (!viewData) {
      // First time viewing this patient
      setHasNewUpdates(true);
      setShowUpdatesPanel(true);
    } else {
      // Check if there were updates since last view
      const lastViewed = new Date(viewData.last_viewed_at);
      const mockUpdateTime = new Date("2025-01-29T14:30:00"); // Mock last update time

      if (mockUpdateTime > lastViewed) {
        setHasNewUpdates(true);
        setShowUpdatesPanel(true);
      }
    }
  };
  const dismissUpdates = async () => {
    if (!session?.user) return;
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      const lastViewedKey = `patient_${MOCK_PATIENT_ID}_last_viewed`;
      localStorage.setItem(lastViewedKey, new Date().toISOString());
      setShowUpdatesPanel(false);
      setHasNewUpdates(false);
      return;
    }
    const { error } = await supabase.from("patient_views").upsert(
      {
        patient_id: MOCK_PATIENT_ID,
        user_id: session.user.id,
        last_viewed_at: new Date().toISOString(),
      },
      {
        onConflict: "patient_id,user_id",
      },
    );
    if (error) {
      console.error("Error dismissing updates:", error);
      return;
    }
    setShowUpdatesPanel(false);
    setHasNewUpdates(false);
    toast({
      title: "Updates dismissed",
      description: "You won't see these updates again",
    });
  };
  const loadFollowStatus = async () => {
    if (!session?.user) return;

    // Demo mode - use localStorage
    if (session.user.id.startsWith("demo-")) {
      const demoFollows = localStorage.getItem("demo_follows");
      if (demoFollows) {
        const followsMap = JSON.parse(demoFollows);
        setIsFollowing(!!followsMap[MOCK_PATIENT_ID]);
      }
      return;
    }
    const { data } = await supabase
      .from("patient_follows")
      .select("patient_id")
      .eq("user_id", session.user.id)
      .eq("patient_id", MOCK_PATIENT_ID)
      .maybeSingle();
    setIsFollowing(!!data);
  };
  const handleFollowToggle = async () => {
    if (!session?.user) return;

    // Demo mode - use localStorage
    if (session.user.id.startsWith("demo-")) {
      const demoFollows = localStorage.getItem("demo_follows");
      const followsMap = demoFollows ? JSON.parse(demoFollows) : {};
      followsMap[MOCK_PATIENT_ID] = !isFollowing;
      localStorage.setItem("demo_follows", JSON.stringify(followsMap));
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing ? "You are no longer following this patient" : "You are now following this patient",
      });
      await loadFollowers();
      return;
    }
    if (isFollowing) {
      const { error } = await supabase
        .from("patient_follows")
        .delete()
        .eq("patient_id", MOCK_PATIENT_ID)
        .eq("user_id", session.user.id);
      if (!error) {
        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: "You are no longer following this patient",
        });
        await loadFollowers();
      }
    } else {
      const { error } = await supabase.from("patient_follows").insert({
        patient_id: MOCK_PATIENT_ID,
        user_id: session.user.id,
      });
      if (!error) {
        setIsFollowing(true);
        toast({
          title: "Following",
          description: "You are now following this patient",
        });
        await loadFollowers();
      }
    }
  };
  const handleProcessNotes = async () => {
    if (!noteText.trim()) {
      toast({
        title: "Note required",
        description: "Please enter some notes before processing",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);

    // Simulate 3 second delay
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const updated = mockPatientUpdateData as MockPatient;
    setUpdatedData(updated);
    setEditedNote(updated.note);
    setEditedMedications([...updated.history.medication]);
    setEditedTasks(
      updated.tasks.map((task) => ({
        ...task,
        status: "pending",
      })),
    );
    setClinicalNoteTimestamp(new Date().toISOString());
    setShowUpdates(true);
    setShowClinicalNotes(false); // Hide clinical notes panel after processing
    setIsProcessing(false);
    toast({
      title: "Notes processed",
      description: "AI has generated updates for review",
    });
  };
  const handleValidateAll = () => {
    if (!updatedData) return;

    // Merge existing tasks with new edited tasks (keep existing, add new ones)
    const existingTasks = currentData.tasks || [];
    const mergedTasks = [...existingTasks, ...editedTasks];

    // Apply all edited changes
    const finalData = {
      ...updatedData,
      note: editedNote,
      history: {
        ...updatedData.history,
        medication: editedMedications,
      },
      tasks: mergedTasks,
    };
    setCurrentData(finalData);
    setIsValidated(true);
    setShowUpdates(false); // Hide review panel after validation

    toast({
      title: "Changes validated",
      description: "All updates have been approved and saved",
    });
  };
  const handleStartAllTasks = () => {
    // Update all pending tasks to "Requested" status
    const updatedTasks = currentData.tasks.map((task) => ({
      ...task,
      status: task.status === "pending" ? "Requested" : task.status,
    }));
    setCurrentData({
      ...currentData,
      tasks: updatedTasks,
    });
    toast({
      title: "Tasks initiated",
      description: `${updatedTasks.length} tasks sent to respective departments`,
    });
  };
  const handleTaskDetailChange = (index: number, detail: string) => {
    const updated = [...editedTasks];
    updated[index] = {
      ...updated[index],
      details: detail,
    };
    setEditedTasks(updated);
  };
  const handleTaskFieldChange = (index: number, field: keyof Task, value: string) => {
    const updated = [...editedTasks];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setEditedTasks(updated);
  };

  // Edit handlers for each section
  const handleEditBackground = () => {
    setTempSocialHistory([...currentData.history.social_history]);
    setTempFamilyHistory([...currentData.history.family_history]);
    setTempWorkHistory([...currentData.history.work_history]);
    setTempAllergies([...currentData.history.allergies]);
    setIsEditingBackground(true);
  };
  const handleValidateBackground = () => {
    setCurrentData({
      ...currentData,
      history: {
        ...currentData.history,
        social_history: tempSocialHistory,
        family_history: tempFamilyHistory,
        work_history: tempWorkHistory,
        allergies: tempAllergies,
      },
    });
    setIsEditingBackground(false);
    toast({
      title: "Background updated successfully",
    });
  };
  const handleEditMedicalHistory = () => {
    setTempPastMedicalHistory([...currentData.history.past_medical_history]);
    setIsEditingMedicalHistory(true);
  };
  const handleValidateMedicalHistory = () => {
    setCurrentData({
      ...currentData,
      history: {
        ...currentData.history,
        past_medical_history: tempPastMedicalHistory,
      },
    });
    setIsEditingMedicalHistory(false);
    toast({
      title: "Medical history updated successfully",
    });
  };
  const handleEditCurrentMeds = () => {
    setTempCurrentMedications([...currentData.history.medication]);
    setIsEditingCurrentMeds(true);
  };
  const handleValidateCurrentMeds = () => {
    setCurrentData({
      ...currentData,
      history: {
        ...currentData.history,
        medication: tempCurrentMedications,
      },
    });
    setIsEditingCurrentMeds(false);
    toast({
      title: "Current medications updated successfully",
    });
  };
  const handleEditPastMeds = () => {
    setTempPastMedications([...((currentData.history as any).past_medication || [])]);
    setIsEditingPastMeds(true);
  };
  const handleValidatePastMeds = () => {
    setCurrentData({
      ...currentData,
      history: {
        ...currentData.history,
        past_medication: tempPastMedications,
      } as any,
    });
    setIsEditingPastMeds(false);
    toast({
      title: "Past medications updated successfully",
    });
  };
  const handleEditClinicalNote = () => {
    setTempClinicalNote(currentData.note);
    setIsEditingClinicalNote(true);
  };
  const handleValidateClinicalNote = () => {
    setCurrentData({
      ...currentData,
      note: tempClinicalNote,
    });
    setClinicalNoteTimestamp(new Date().toISOString());
    setIsEditingClinicalNote(false);
    toast({
      title: "Clinical note updated successfully",
    });
  };
  const handleAddTask = () => {
    if (!newTask.description?.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a task description",
        variant: "destructive",
      });
      return;
    }
    const task: Task = {
      task_id: `task-${Date.now()}`,
      task_type: newTask.task_type || "Blood test",
      description: newTask.description,
      department: newTask.department || "Laboratory",
      status: "pending",
      priority: newTask.priority || "Medium",
      details: newTask.details,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCurrentData({
      ...currentData,
      tasks: [...currentData.tasks, task],
    });
    setNewTask({
      task_type: "Blood test",
      description: "",
      department: "Laboratory",
      priority: "Medium",
      status: "pending",
    });
    setIsAddingTask(false);
    toast({
      title: "Task added successfully",
    });
  };
  const handleEditTasks = () => {
    setTempTasks([...currentData.tasks]);
    setIsEditingTasks(true);
  };
  const handleValidateTasks = () => {
    setCurrentData({
      ...currentData,
      tasks: tempTasks,
    });
    setIsEditingTasks(false);
    toast({
      title: "Tasks updated successfully",
    });
  };
  const handleTempTaskFieldChange = (index: number, field: keyof Task, value: string) => {
    const updated = [...tempTasks];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTempTasks(updated);
  };
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "secondary";
    }
  };
  const sortTasksByStatus = (tasks: Task[]) => {
    const statusOrder = {
      pending: 1,
      Requested: 2,
      Completed: 3,
    };
    const priorityOrder = {
      High: 1,
      Medium: 2,
      Low: 3,
    };
    return [...tasks].sort((a, b) => {
      const statusOrderA = statusOrder[a.status as keyof typeof statusOrder] || 999;
      const statusOrderB = statusOrder[b.status as keyof typeof statusOrder] || 999;

      // First sort by status
      if (statusOrderA !== statusOrderB) {
        return statusOrderA - statusOrderB;
      }

      // Then sort by priority within the same status
      const priorityOrderA = priorityOrder[a.priority as keyof typeof priorityOrder] || 999;
      const priorityOrderB = priorityOrder[b.priority as keyof typeof priorityOrder] || 999;
      return priorityOrderA - priorityOrderB;
    });
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-primary">MediMate</span>
            </div>
          </div>
          {session && (
            <Button variant={isFollowing ? "default" : "outline"} onClick={handleFollowToggle}>
              <Heart className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>

        {/* Care Team Section */}
        {followers.length > 0 && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Care Team</h3>
              {lastUpdater && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Last updated by {lastUpdater.full_name || lastUpdater.email}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {followers.map((follower) => (
                <div
                  key={follower.user_id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-xs"
                >
                  <User className="h-3 w-3 text-primary" />
                  <span className="font-medium text-foreground">
                    {follower.profiles?.full_name || follower.profiles?.email || "Unknown"}
                  </span>
                  {follower.profiles?.role && <span className="text-muted-foreground">({follower.profiles.role})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient Overview */}
        <Card className="p-6 mb-6 shadow-lg border-2">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{currentData.patient.name}</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span> {currentData.patient.subject_id}
                </div>
                <div>
                  <span className="font-medium">Gender:</span> {currentData.patient.gender}
                </div>
                <div>
                  <span className="font-medium">DOB:</span> {currentData.patient.DOB}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {currentData.patient.phone_number}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-3 border-t text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Height:</span>
                <span className="font-semibold text-foreground">{currentData.measurements.height}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Weight:</span>
                <span className="font-semibold text-foreground">{currentData.measurements.weight}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">BMI:</span>
                <span className="font-semibold text-foreground">{currentData.measurements.BMI}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Updates Section */}
        {showUpdatesPanel && hasNewUpdates && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Recent Updates</h2>
                    <p className="text-sm text-muted-foreground">Changes since your last shift</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={dismissUpdates} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {lastUpdater && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Patient record updated</p>
                        <p className="text-sm text-muted-foreground">
                          January 29, 2025 at 2:30 PM by {lastUpdater.full_name || lastUpdater.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {currentData.tasks.filter((t) => t.status === "Completed").length > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm font-medium mb-2">
                      {currentData.tasks.filter((t) => t.status === "Completed").length} task(s) completed
                    </p>
                    <ul className="space-y-1">
                      {currentData.tasks
                        .filter((t) => t.status === "Completed")
                        .slice(0, 3)
                        .map((task) => (
                          <li key={task.task_id} className="text-sm text-muted-foreground">
                            • {task.description}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {currentData.history.medication.length > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm font-medium mb-2">Current medications</p>
                    <ul className="space-y-1">
                      {currentData.history.medication.slice(0, 3).map((med, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {med}
                        </li>
                      ))}
                      {currentData.history.medication.length > 3 && (
                        <li className="text-sm text-muted-foreground">
                          ...and {currentData.history.medication.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Medical Records
          </h2>

          {/* Background Section */}
          <Collapsible open={isBackgroundOpen} onOpenChange={setIsBackgroundOpen} className="mb-6 pb-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Background</h3>
                {isBackgroundOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              {!isEditingBackground ? (
                <Button size="sm" variant="outline" onClick={handleEditBackground}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleValidateBackground}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Validate
                </Button>
              )}
            </div>
            <CollapsibleContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Social History
                  </h4>
                  {isEditingBackground ? (
                    <div className="space-y-2">
                      {tempSocialHistory.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => {
                            const updated = [...tempSocialHistory];
                            updated[i] = e.target.value;
                            setTempSocialHistory(updated);
                          }}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {currentData.history.social_history.map((item, i) => (
                        <li key={i} className="text-sm">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Family History
                  </h4>
                  {isEditingBackground ? (
                    <div className="space-y-2">
                      {tempFamilyHistory.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => {
                            const updated = [...tempFamilyHistory];
                            updated[i] = e.target.value;
                            setTempFamilyHistory(updated);
                          }}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {currentData.history.family_history.map((item, i) => (
                        <li key={i} className="text-sm">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Work History
                  </h4>
                  {isEditingBackground ? (
                    <div className="space-y-2">
                      {tempWorkHistory.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => {
                            const updated = [...tempWorkHistory];
                            updated[i] = e.target.value;
                            setTempWorkHistory(updated);
                          }}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {currentData.history.work_history.map((item, i) => (
                        <li key={i} className="text-sm">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Allergies
                  </h4>
                  {isEditingBackground ? (
                    <div className="space-y-2">
                      {tempAllergies.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => {
                            const updated = [...tempAllergies];
                            updated[i] = e.target.value;
                            setTempAllergies(updated);
                          }}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {currentData.history.allergies.map((item, i) => (
                        <li key={i} className="text-sm">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Past Medical History */}
          <Collapsible
            open={isMedicalHistoryOpen}
            onOpenChange={setIsMedicalHistoryOpen}
            className="mb-6 pb-6 border-b"
          >
            <div className="flex items-center justify-between mb-3">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Past Medical History
                </h3>
                {isMedicalHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              {!isEditingMedicalHistory ? (
                <Button size="sm" variant="outline" onClick={handleEditMedicalHistory}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleValidateMedicalHistory}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Validate
                </Button>
              )}
            </div>
            <CollapsibleContent>
              {isEditingMedicalHistory ? (
                <div className="space-y-2">
                  {tempPastMedicalHistory.map((item, i) => (
                    <Input
                      key={i}
                      value={item}
                      onChange={(e) => {
                        const updated = [...tempPastMedicalHistory];
                        updated[i] = e.target.value;
                        setTempPastMedicalHistory(updated);
                      }}
                      className="text-sm"
                    />
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {currentData.history.past_medical_history.map((item, i) => (
                    <li key={i} className="text-sm">
                      • {item}
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Clinical Note */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Clinical Note
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {format(new Date(clinicalNoteTimestamp), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {!isEditingClinicalNote ? (
                <Button size="sm" variant="outline" onClick={handleEditClinicalNote}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleValidateClinicalNote}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Validate
                </Button>
              )}
            </div>
            {isEditingClinicalNote ? (
              <Textarea
                value={tempClinicalNote}
                onChange={(e) => setTempClinicalNote(e.target.value)}
                className="min-h-[120px] bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                placeholder="Enter clinical note..."
              />
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentData.note}</p>
              </div>
            )}
          </div>

          {/* Current Medications - Better Formatted */}
          <Collapsible open={isCurrentMedsOpen} onOpenChange={setIsCurrentMedsOpen} className="mb-6 pb-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Current Medications
                </h3>
                {isCurrentMedsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              {!isEditingCurrentMeds ? (
                <Button size="sm" variant="outline" onClick={handleEditCurrentMeds}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleValidateCurrentMeds}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Validate
                </Button>
              )}
            </div>
            <CollapsibleContent>
              <div className="space-y-2">
                {isEditingCurrentMeds
                  ? tempCurrentMedications.map((item, i) => (
                      <Input
                        key={i}
                        value={item}
                        onChange={(e) => {
                          const updated = [...tempCurrentMedications];
                          updated[i] = e.target.value;
                          setTempCurrentMedications(updated);
                        }}
                        className="text-sm"
                      />
                    ))
                  : currentData.history.medication.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge variant="success" className="text-xs">
                            Active
                          </Badge>
                        </div>
                      </div>
                    ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Past Medications */}
          <Collapsible open={isPastMedsOpen} onOpenChange={setIsPastMedsOpen}>
            <div className="flex items-center justify-between mb-3">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Past Medications
                </h3>
                {isPastMedsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              {!isEditingPastMeds ? (
                <Button size="sm" variant="outline" onClick={handleEditPastMeds}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleValidatePastMeds}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Validate
                </Button>
              )}
            </div>
            <CollapsibleContent>
              <div className="space-y-2">
                {isEditingPastMeds
                  ? tempPastMedications.map((item, i) => (
                      <Input
                        key={i}
                        value={item}
                        onChange={(e) => {
                          const updated = [...tempPastMedications];
                          updated[i] = e.target.value;
                          setTempPastMedications(updated);
                        }}
                        className="text-sm"
                      />
                    ))
                  : (currentData.history as any).past_medication?.map((item: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">{item}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            Discontinued
                          </Badge>
                        </div>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">No past medications recorded</p>}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Tasks Section */}
        <Collapsible open={isTasksOpen} onOpenChange={setIsTasksOpen}>
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Tasks
                </h2>
                {isTasksOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <div className="flex gap-2">
                {!isAddingTask && (
                  <Button size="sm" variant="default" onClick={() => setIsAddingTask(true)}>
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                )}
                {!isEditingTasks &&
                  currentData.tasks &&
                  currentData.tasks.some((task) => task.status === "pending") && (
                    <Button size="sm" variant="outline" onClick={handleEditTasks}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Pending Tasks
                    </Button>
                  )}
                {isEditingTasks && (
                  <Button size="sm" onClick={handleValidateTasks}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Validate
                  </Button>
                )}
              </div>
            </div>

            <CollapsibleContent>
              {/* Add New Task Form */}
              {isAddingTask && (
                <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
                  <h3 className="font-semibold mb-3">Add New Task</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Priority</label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value) =>
                            setNewTask({
                              ...newTask,
                              priority: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Task Type</label>
                        <Select
                          value={newTask.task_type}
                          onValueChange={(value) =>
                            setNewTask({
                              ...newTask,
                              task_type: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {TASK_TYPE_LIST.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <Textarea
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            description: e.target.value,
                          })
                        }
                        placeholder="Enter task description..."
                        className="min-h-[60px]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Department</label>
                      <Select
                        value={newTask.department}
                        onValueChange={(value) =>
                          setNewTask({
                            ...newTask,
                            department: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {DEPARTMENT_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newTask.task_type && TASK_TYPE_OPTIONS[newTask.task_type] && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Details</label>
                        <Select
                          value={newTask.details || ""}
                          onValueChange={(value) =>
                            setNewTask({
                              ...newTask,
                              details: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select specific test/procedure" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {TASK_TYPE_OPTIONS[newTask.task_type].map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleAddTask} className="flex-1">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {currentData.tasks && currentData.tasks.length > 0 ? (
                <div className="space-y-3">
                  {sortTasksByStatus(isEditingTasks ? tempTasks : currentData.tasks).map((task, i) => {
                    const isPending = task.status === "pending";
                    const isEditable = isEditingTasks && isPending;
                    return (
                      <Card key={i} className="p-4 bg-card border">
                        <div className="space-y-2">
                          {isEditable ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Select
                                  value={task.priority}
                                  onValueChange={(value) => handleTempTaskFieldChange(i, "priority", value)}
                                >
                                  <SelectTrigger className="w-32 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover z-50">
                                    {PRIORITY_OPTIONS.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={task.task_type}
                                  onChange={(e) => handleTempTaskFieldChange(i, "task_type", e.target.value)}
                                  className="text-sm"
                                  placeholder="Task type"
                                />
                                <Badge variant="outline" className="text-xs">
                                  Pending
                                </Badge>
                              </div>
                              <Textarea
                                value={task.description}
                                onChange={(e) => handleTempTaskFieldChange(i, "description", e.target.value)}
                                className="min-h-[60px]"
                              />
                              <Input
                                value={task.department}
                                onChange={(e) => handleTempTaskFieldChange(i, "department", e.target.value)}
                                placeholder="Department"
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={
                                      task.status === "Completed"
                                        ? "success"
                                        : task.status === "Requested"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {task.status}
                                  </Badge>
                                  <span className="text-sm font-medium">{task.task_type}</span>
                                </div>
                                <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                              </div>
                              <p className="text-sm">{task.description}</p>

                              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>Created: {format(new Date(task.created_at), "MMM dd, yyyy HH:mm")}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Updated: {format(new Date(task.updated_at), "MMM dd, yyyy HH:mm")}</span>
                                  </div>
                                </div>

                                {task.assignee_name && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                      <Users className="h-3 w-3" />
                                      <span className="font-medium">{task.assignee_name}</span>
                                    </div>
                                    {task.assignee_phone && (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <a href={`tel:${task.assignee_phone}`} className="hover:text-primary">
                                          {task.assignee_phone}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                                <span>Department: {task.department}</span>
                                {task.details && <span>Details: {task.details}</span>}
                              </div>

                              {/* Files section for completed blood test */}
                              {task.status === "Completed" && task.task_type === "Blood test" && (
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center gap-2 mb-3">
                                    <File className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">Attached Files</span>
                                  </div>
                                  <div className="space-y-3">
                                    <Dialog open={showBloodTestAnalysis} onOpenChange={setShowBloodTestAnalysis}>
                                      <DialogTrigger asChild>
                                        <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">
                                          <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded bg-red-500/10 flex items-center justify-center">
                                              <FileText className="h-5 w-5 text-red-600" />
                                            </div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground">
                                              Blood_Test_Results_CBC.pdf
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Uploaded Nov 26, 2025 • 245 KB
                                            </p>
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            PDF
                                          </Badge>
                                        </div>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                                        <DialogHeader className="p-6 pb-0">
                                          <DialogTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Blood Test Results - CBC
                                          </DialogTitle>
                                        </DialogHeader>

                                        <div className="w-full h-[calc(90vh-80px)] p-6 pt-4">
                                          <iframe
                                            src="/bloodtestresults.pdf"
                                            className="w-full h-full rounded-lg border"
                                            title="Blood Test Results"
                                          />
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No tasks recorded yet</p>
                </div>
              )}

              {/* Start All Tasks Button */}
              {!isEditingTasks && currentData.tasks && currentData.tasks.some((task) => task.status === "pending") && (
                <div className="mt-4 pt-4 border-t">
                  <Button onClick={handleStartAllTasks} className="w-full" size="lg">
                    <Send className="mr-2 h-4 w-4" />
                    Start All Tasks
                  </Button>
                </div>
              )}

              {/* Help text */}
              <div className="mt-4 pt-4 border-t gap-2 text-xs text-muted-foreground py-0 my-0 flex items-center justify-start">
                <AlertCircle className="h-3 w-3" />
                <span>Click on files to get rapid insights</span>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Add New Information */}
        {showClinicalNotes && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Clinical Notes</h2>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your clinical notes here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[150px]"
                disabled={isProcessing}
              />

              {/* Upload Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className={`w-full transition-all ${isRecording ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900 text-red-600 dark:text-red-400" : ""}`}
                  disabled={isProcessing}
                  onClick={() => {
                    if (!isRecording) {
                      // Start recording
                      setIsRecording(true);
                      toast({
                        title: "Recording started",
                        description: "Speak your notes...",
                      });
                    } else {
                      // Stop recording and append text
                      setIsRecording(false);
                      setNoteText((prev) => prev + (prev ? "\n" : "") + "oh, and also do an ultrasound");
                      toast({
                        title: "Recording stopped",
                        description: "Audio transcribed to notes",
                      });
                    }
                  }}
                >
                  <Mic className={`mr-2 h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
                  {isRecording ? (
                    <span className="flex items-center gap-2">
                      Stop Recording
                      <span className="font-mono text-sm">
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                      </span>
                    </span>
                  ) : (
                    "Upload Audio Recording"
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing}
                  onClick={() => {
                    // Placeholder - no functionality yet
                    console.log("File upload clicked");
                  }}
                >
                  <Maximize className="mr-2 h-4 w-4" />
                  Scan Patient Record
                </Button>
              </div>

              <Button
                onClick={handleProcessNotes}
                disabled={isProcessing}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-base font-semibold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                    Process Notes
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Updated Information Review */}
        {showUpdates && updatedData && (
          <>
            <Card className="p-6 mb-6 border-2 border-primary">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Review AI-Generated Updates</h2>
                {isValidated && (
                  <Badge variant="success" className="text-base px-4 py-2">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Validated
                  </Badge>
                )}
              </div>

              {/* Updated Clinical Note */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Updated Clinical Note
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Previous Note</p>
                    <div className="p-3 bg-muted/30 rounded border">
                      <p className="text-sm">{currentData.note || "No previous note"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">New Note (Editable)</p>
                    <Textarea
                      value={editedNote}
                      onChange={(e) => setEditedNote(e.target.value)}
                      className="min-h-[100px]"
                      disabled={isValidated}
                    />
                  </div>
                </div>
              </div>

              {/* Updated Medications */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Medications Comparison</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Current Medications</p>
                    <div className="space-y-2">
                      {currentData.history.medication.map((med, i) => (
                        <div key={i} className="p-2 bg-muted/30 rounded text-sm">
                          {med}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Updated Medications (Editable)</p>
                    <div className="space-y-2">
                      {editedMedications.map((med, i) => (
                        <Input
                          key={i}
                          value={med}
                          onChange={(e) => {
                            const updated = [...editedMedications];
                            updated[i] = e.target.value;
                            setEditedMedications(updated);
                          }}
                          disabled={isValidated}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Tasks */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Generated Tasks</h3>
                <div className="space-y-3">
                  {editedTasks.map((task, i) => (
                    <Card key={i} className="p-4 bg-card border">
                      <div className="space-y-3">
                        {/* Priority and Task Type Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Priority</label>
                            <Select
                              value={task.priority}
                              onValueChange={(value) => handleTaskFieldChange(i, "priority", value)}
                              disabled={isValidated}
                            >
                              <SelectTrigger className="w-full bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                {PRIORITY_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={getPriorityColor(option)} className="text-xs">
                                        {option}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Task Type</label>
                            <Select
                              value={task.task_type}
                              onValueChange={(value) => handleTaskFieldChange(i, "task_type", value)}
                              disabled={isValidated}
                            >
                              <SelectTrigger className="w-full bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                {TASK_TYPE_LIST.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Description</label>
                          <Textarea
                            value={task.description}
                            onChange={(e) => handleTaskFieldChange(i, "description", e.target.value)}
                            disabled={isValidated}
                            className="min-h-[60px]"
                          />
                        </div>

                        {/* Department */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Department</label>
                          <Select
                            value={task.department}
                            onValueChange={(value) => handleTaskFieldChange(i, "department", value)}
                            disabled={isValidated}
                          >
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {DEPARTMENT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Task-specific details selector */}
                        {TASK_TYPE_OPTIONS[task.task_type] && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Specify details</label>
                            <Select
                              value={task.details || ""}
                              onValueChange={(value) => handleTaskDetailChange(i, value)}
                              disabled={isValidated}
                            >
                              <SelectTrigger className="w-full bg-background">
                                <SelectValue placeholder="Select specific test/procedure" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                {TASK_TYPE_OPTIONS[task.task_type].map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleValidateAll} className="flex-1" size="lg">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Validate All Changes
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Validated Tasks Section */}
        {/* Tasks are now displayed in the main Tasks section above */}
      </div>
    </div>
  );
};
export default PatientDetail;
