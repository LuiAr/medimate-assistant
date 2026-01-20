import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, User, Home, Calendar, Stethoscope, AlertCircle, Clock, MapPin, ChevronDown, Heart, Users, LogOut, X, CheckCircle2, ArrowRight, Sun, Bell, MessageCircle, Sparkles, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import seraLogo from "@/assets/sera-logo.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import mockPatientData from "@/lib/mockPatient.json";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
interface PatientData {
  age: number;
  room: string;
  admittedAt: string;
  diagnosis: string;
  priority?: "High" | "Medium" | "Low";
  medications?: any[];
  vitals?: any;
  medicalHistory?: string[];
  notes?: any[];
  tasks?: any[];
}
interface Patient {
  id: string;
  name: string;
  data: PatientData;
}
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}
interface PatientFollow {
  patient_id: string;
  user_id: string;
  profiles?: Profile;
}

// Fixed patient ID for the mock patient
const MOCK_PATIENT_ID = "mock-patient-001";
const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"proximity" | "priority">("proximity");
  const [showOnlyFollowing, setShowOnlyFollowing] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [patientFollowers, setPatientFollowers] = useState<Record<string, PatientFollow[]>>({});
  const [showDailyWelcome, setShowDailyWelcome] = useState(false);
  const [showNotification, setShowNotification] = useState(true);
  const [showMotivationalNotification, setShowMotivationalNotification] = useState(true);
  const [showLabResultNotification, setShowLabResultNotification] = useState(true);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  const [showMotivationalMessage, setShowMotivationalMessage] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Check for demo mode first
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      // Create a fake session for demo mode
      const user = JSON.parse(demoUser);
      setSession({
        user: {
          id: user.id,
          email: user.email
        } as any
      } as any);
      return;
    }

    // Check authentication
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    if (session?.user) {
      loadFollows();
      loadPatientFollowers();
      checkDailyWelcome();
      // Ensure notifications are always visible on dashboard load
      setShowNotification(true);
      setShowMotivationalNotification(true);
      setShowLabResultNotification(true);
    }
  }, [session]);
  const checkDailyWelcome = () => {
    const today = new Date().toDateString();
    const lastWelcomeDate = localStorage.getItem("last_welcome_date");
    if (lastWelcomeDate !== today) {
      // Show welcome for the first time today
      setShowDailyWelcome(true);
    }
  };
  const dismissDailyWelcome = () => {
    const today = new Date().toDateString();
    localStorage.setItem("last_welcome_date", today);
    setShowDailyWelcome(false);
  };
  const loadFollows = async () => {
    if (!session?.user) return;

    // Demo mode - use localStorage
    if (session.user.id.startsWith("demo-")) {
      const demoFollows = localStorage.getItem("demo_follows");
      if (demoFollows) {
        setFollows(JSON.parse(demoFollows));
      } else {
        // Set default follows for demo user
        const defaultFollows = {
          [MOCK_PATIENT_ID]: true,
          "placeholder-001": true
        };
        localStorage.setItem("demo_follows", JSON.stringify(defaultFollows));
        setFollows(defaultFollows);
      }
      return;
    }
    const {
      data,
      error
    } = await supabase.from("patient_follows").select("patient_id").eq("user_id", session.user.id);
    if (error) {
      console.error("Error loading follows:", error);
      return;
    }
    const followsMap: Record<string, boolean> = {};
    data?.forEach(follow => {
      followsMap[follow.patient_id] = true;
    });
    setFollows(followsMap);
  };
  const loadPatientFollowers = async () => {
    // Demo mode - use localStorage
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      const user = JSON.parse(demoUser);
      const demoFollows = localStorage.getItem("demo_follows");
      if (demoFollows) {
        const followsMap = JSON.parse(demoFollows);
        const followersMap: Record<string, PatientFollow[]> = {};

        // Create demo followers for followed patients
        Object.keys(followsMap).forEach(patientId => {
          if (followsMap[patientId]) {
            followersMap[patientId] = [{
              patient_id: patientId,
              user_id: user.id,
              profiles: {
                id: user.id,
                full_name: user.full_name,
                email: user.email
              }
            }];
          }
        });
        setPatientFollowers(followersMap);
      } else {
        // Set default followers for demo user if no follows exist
        const defaultFollowersMap: Record<string, PatientFollow[]> = {
          [MOCK_PATIENT_ID]: [{
            patient_id: MOCK_PATIENT_ID,
            user_id: user.id,
            profiles: {
              id: user.id,
              full_name: user.full_name,
              email: user.email
            }
          }],
          "placeholder-001": [{
            patient_id: "placeholder-001",
            user_id: user.id,
            profiles: {
              id: user.id,
              full_name: user.full_name,
              email: user.email
            }
          }]
        };
        setPatientFollowers(defaultFollowersMap);
      }
      return;
    }
    const {
      data,
      error
    } = await supabase.from("patient_follows").select("patient_id, user_id");
    if (error) {
      console.error("Error loading followers:", error);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(data?.map(f => f.user_id) || [])];

    // Fetch profiles for these users
    const {
      data: profilesData
    } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
    const profilesMap: Record<string, Profile> = {};
    profilesData?.forEach(profile => {
      profilesMap[profile.id] = profile;
    });
    const followersMap: Record<string, PatientFollow[]> = {};
    data?.forEach(follow => {
      if (!followersMap[follow.patient_id]) {
        followersMap[follow.patient_id] = [];
      }
      followersMap[follow.patient_id].push({
        ...follow,
        profiles: profilesMap[follow.user_id]
      });
    });
    setPatientFollowers(followersMap);
  };
  const handleFollowToggle = async (patientId: string) => {
    if (!session?.user) return;
    const isFollowing = follows[patientId];

    // Demo mode - use localStorage
    if (session.user.id.startsWith("demo-")) {
      const newFollows = {
        ...follows,
        [patientId]: !isFollowing
      };
      setFollows(newFollows);
      localStorage.setItem("demo_follows", JSON.stringify(newFollows));
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing ? "You are no longer following this patient" : "You are now following this patient"
      });
      await loadPatientFollowers();
      return;
    }
    if (isFollowing) {
      // Unfollow
      const {
        error
      } = await supabase.from("patient_follows").delete().eq("patient_id", patientId).eq("user_id", session.user.id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to unfollow patient",
          variant: "destructive"
        });
        return;
      }
      setFollows({
        ...follows,
        [patientId]: false
      });
      toast({
        title: "Unfollowed",
        description: "You are no longer following this patient"
      });
    } else {
      // Follow
      const {
        error
      } = await supabase.from("patient_follows").insert({
        patient_id: patientId,
        user_id: session.user.id
      });
      if (error) {
        toast({
          title: "Error",
          description: "Failed to follow patient",
          variant: "destructive"
        });
        return;
      }
      setFollows({
        ...follows,
        [patientId]: true
      });
      toast({
        title: "Following",
        description: "You are now following this patient"
      });
    }

    // Reload followers
    await loadPatientFollowers();
  };
  const handleLogout = async () => {
    // Clear demo mode
    localStorage.removeItem("demo_user");
    localStorage.removeItem("demo_follows");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Create a single patient from the mock data
  const mockPatient: Patient = {
    id: MOCK_PATIENT_ID,
    name: mockPatientData.patient.name,
    data: {
      age: 75,
      room: mockPatientData.patient.room || "N/A",
      admittedAt: mockPatientData.patient.admission_date || "Current admission",
      diagnosis: "Chronic conditions",
      priority: (mockPatientData.patient as any).priority as "High" | "Medium" | "Low" | undefined,
      medications: mockPatientData.history.medication,
      vitals: undefined,
      medicalHistory: mockPatientData.history.past_medical_history,
      notes: [],
      tasks: []
    }
  };
  const getAdmissionStatus = (admissionDate: string) => {
    try {
      const date = new Date(admissionDate);
      const daysSince = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return {
        text: `Admitted ${formatDistanceToNow(date, {
          addSuffix: true
        })}`,
        variant: (daysSince < 3 ? "success" : daysSince < 7 ? "secondary" : "outline") as "success" | "secondary" | "outline",
        days: daysSince
      };
    } catch {
      return {
        text: "Current admission",
        variant: "outline" as const,
        days: 0
      };
    }
  };

  // Add placeholder patients
  const placeholderPatients: Patient[] = [{
    id: "placeholder-001",
    name: "Maria Schmidt",
    data: {
      age: 62,
      room: "142",
      admittedAt: "2025-11-27",
      diagnosis: "Post-operative care",
      priority: "Medium",
      medications: [],
      vitals: undefined,
      medicalHistory: [],
      notes: [],
      tasks: []
    }
  }, {
    id: "placeholder-002",
    name: "Hans Mueller",
    data: {
      age: 58,
      room: "145",
      admittedAt: "2025-11-26",
      diagnosis: "Cardiac monitoring",
      priority: "Low",
      medications: [],
      vitals: undefined,
      medicalHistory: [],
      notes: [],
      tasks: []
    }
  }, {
    id: "placeholder-003",
    name: "Anna Weber",
    data: {
      age: 71,
      room: "150",
      admittedAt: "2025-11-24",
      diagnosis: "Respiratory observation",
      priority: "Medium",
      medications: [],
      vitals: undefined,
      medicalHistory: [],
      notes: [],
      tasks: []
    }
  }];
  const patientDistances: Record<string, number> = {
    [MOCK_PATIENT_ID]: 0,
    "placeholder-001": 85,
    "placeholder-002": 120,
    "placeholder-003": 156
  };
  const patients = [mockPatient, ...placeholderPatients];
  let filteredPatients = patients.filter(patient => patient.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Filter by following status if enabled
  if (showOnlyFollowing) {
    filteredPatients = filteredPatients.filter(patient => follows[patient.id]);
  }

  // Sort patients based on selected sort option
  const sortedPatients = [...(searchQuery || showOnlyFollowing ? filteredPatients : patients)].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = {
        High: 0,
        Medium: 1,
        Low: 2
      };
      const aPriority = a.data.priority || "Low";
      const bPriority = b.data.priority || "Low";
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    }
    return 0;
  });
  const handlePatientClick = (patientId: string) => {
    if (patientId.startsWith("placeholder-")) return;
    navigate(`/patient/${patientId}`);
  };
  if (!session) {
    return null;
  }
  const getUserName = () => {
    if (session?.user?.email) {
      return session.user.email.split("@")[0];
    }
    return "Doctor";
  };
  const getGreeting = () => {
    return "Good morning";
  };

  // Get followed patients with updates
  const followedPatients = patients.filter(p => follows[p.id]);
  return <div className="min-h-screen bg-background">
      {/* Motivational Message Overlay */}
      {showMotivationalMessage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowMotivationalMessage(false)}
        >
          <div 
            className="bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-green-950/20 dark:via-background dark:to-green-950/20 p-8 rounded-2xl shadow-2xl max-w-md mx-4 border-2 border-green-200 dark:border-green-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Heart className="h-8 w-8 text-green-600 dark:text-green-400 fill-current animate-pulse" />
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">
                From Mrs. Elisabeth Weber
              </h3>
              <div className="p-4 bg-white/80 dark:bg-card/50 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-foreground text-lg leading-relaxed italic">
                  "Thank you so much for your excellent care during my stay. Your dedication and compassion made all the difference in my recovery. You are truly a wonderful doctor!"
                </p>
              </div>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                Keep up the amazing work, Doctor!
              </p>
            </div>
            
            <Button 
              onClick={() => setShowMotivationalMessage(false)}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white"
            >
              Close Message
            </Button>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {/* Notification Button */}
          <Popover open={notificationPopoverOpen} onOpenChange={setNotificationPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {(showNotification || showMotivationalNotification || showLabResultNotification) && <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                    {(showNotification ? 1 : 0) + (showMotivationalNotification ? 1 : 0) + (showLabResultNotification ? 1 : 0)}
                  </span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                {showNotification && <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <Bell className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-orange-500">Reminder</h4>
                      <p className="text-sm text-foreground">
                        Don't forget to order the <span className="font-medium">CT Scanner</span> for Uwe Meyer that you noted 3 hours ago.
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                  setShowNotification(false);
                  if (!showMotivationalNotification) {
                    setNotificationPopoverOpen(false);
                  }
                }} className="h-6 w-6 hover:bg-orange-500/20 flex-shrink-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>}
                
                {showMotivationalNotification && <div 
                  className="flex items-start justify-between gap-3 cursor-pointer p-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => {
                    setShowMotivationalMessage(true);
                    setShowMotivationalNotification(false);
                    setNotificationPopoverOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2 flex-1">
                    <MessageCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-green-500">Patient Message</h4>
                      <p className="text-sm text-foreground">
                        One of your discharged patients left you a message
                      </p>
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-green-500 animate-pulse flex-shrink-0 mt-1" />
                </div>}

                {showLabResultNotification && <div 
                  className="flex items-start justify-between gap-3 cursor-pointer p-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => {
                    navigate('/patient/mock-patient-001');
                    setShowLabResultNotification(false);
                    setNotificationPopoverOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2 flex-1">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-blue-500">Lab Results</h4>
                      <p className="text-sm text-foreground">
                        Blood test results ready for Uwe Meyer
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />
                </div>}
              </div>
            </PopoverContent>
          </Popover>

          <div className="text-center flex-1 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-2">
              
              <h1 className="text-4xl font-bold text-primary">MediMate</h1>
            </div>
            <p className="text-muted-foreground text-lg">Medical Assistant for Patient Records & Task Management</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>


        {/* Daily Welcome Section */}
        {showDailyWelcome && <Card className="mb-8 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 via-background to-primary/10 animate-fade-in overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-primary" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Sun className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      {getGreeting()}, Dr. {getUserName()}!
                    </h2>
                    <p className="text-sm text-muted-foreground">Here's what happened since your last shift</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={dismissDailyWelcome} className="h-8 w-8 hover:bg-primary/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {followedPatients.length > 0 ? <div className="space-y-3">
                  {followedPatients.map((patient, index) => {
              const hasUpdates = patient.id === MOCK_PATIENT_ID || patient.id === "placeholder-001";
              return <div key={patient.id} className="group p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer animate-scale-in" style={{
                animationDelay: `${index * 100}ms`
              }} onClick={() => handlePatientClick(patient.id)}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-foreground text-lg">{patient.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                Room {patient.data.room}
                              </Badge>
                            </div>

                            {hasUpdates ? patient.id === MOCK_PATIENT_ID ? <div className="space-y-2">
                                  <div className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      <span className="font-medium text-foreground">3 tasks completed</span> - Blood
                                      test, Ultrasound, Temperature measurement
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Record updated</span> by Dr. Michael
                                      Chen at 2:30 PM
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Medications updated</span> - Current
                                      treatment plan revised
                                    </span>
                                  </div>
                                </div> : <div className="space-y-2">
                                  <div className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Surgery completed</span> - Post-op
                                      recovery progressing well
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Vital signs stable</span> - BP
                                      120/80, HR 72 bpm
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Pain management adjusted</span> -
                                      Updated by Dr. Sarah Johnson at 11:45 AM
                                    </span>
                                  </div>
                                </div> : <p className="text-sm text-muted-foreground">No new updates since your last shift</p>}
                          </div>

                          <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-sm font-medium">View details</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>;
            })}
                </div> : <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">You're not following any patients yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click the heart icon on a patient card to start following
                  </p>
                </div>}
            </div>
          </Card>}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="text" placeholder="Search patient by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-14 text-lg shadow-lg border-2" />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">Patient List</h2>
          <div className="flex items-center gap-2">
            <Button variant={showOnlyFollowing ? "default" : "outline"} size="sm" onClick={() => setShowOnlyFollowing(!showOnlyFollowing)} className="gap-2">
              <Heart className={`h-3.5 w-3.5 ${showOnlyFollowing ? "fill-current" : ""}`} />
              {showOnlyFollowing ? "Showing followed" : "Show followed"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {sortBy === "proximity" ? <>
                      <MapPin className="h-3.5 w-3.5" />
                      Sorted by proximity
                    </> : <>
                      <AlertCircle className="h-3.5 w-3.5" />
                      Sorted by priority
                    </>}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background border-border z-50">
                <DropdownMenuItem onClick={() => setSortBy("proximity")} className="cursor-pointer">
                  <MapPin className="h-4 w-4 mr-2" />
                  Sort by proximity
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("priority")} className="cursor-pointer">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Sort by priority
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-4">
          {sortedPatients.length === 0 ? <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                {showOnlyFollowing ? "You are not following any patients yet" : `No patients found matching "${searchQuery}"`}
              </p>
            </Card> : <>
              {sortedPatients.map((patient, index) => {
            const isPlaceholder = patient.id.startsWith("placeholder-");
            const isClosest = sortBy === "proximity" && index === 0 && !isPlaceholder;
            const distance = patientDistances[patient.id] || 0;
            const isFollowing = follows[patient.id];
            const followers = patientFollowers[patient.id] || [];
            return <Card key={patient.id} className={`p-6 transition-all border-2 relative ${isPlaceholder ? "opacity-60 cursor-not-allowed hover:border-border" : "hover:shadow-xl hover:border-primary"}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => handlePatientClick(patient.id)}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                              {patient.name}
                              {isFollowing && <span className="h-2.5 w-2.5 rounded-full bg-green-500" title="You are following this patient" />}
                            </h2>
                            {sortBy === "proximity" && isClosest && <Badge variant="default" className="gap-1 bg-blue-600 hover:bg-blue-700 relative">
                                <MapPin className="h-3 w-3 animate-pulse" />
                                Closest
                                <span className="absolute -inset-1 bg-blue-400/20 rounded-full animate-ping" />
                              </Badge>}
                            {sortBy === "proximity" && !isClosest && <Badge variant="outline" className="gap-1">
                                <MapPin className="h-3 w-3" />
                                {distance}m away
                              </Badge>}
                            {sortBy === "priority" && patient.data.priority === "High" && <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                High Priority
                              </Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground mb-3">
                            <User className="h-4 w-4" />
                            <span>
                              Age {patient.data.age} • {mockPatientData.patient.gender === "M" ? "Male" : "Female"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Home className="h-4 w-4 text-primary" />
                              <span className="text-muted-foreground">Room:</span>
                              <span className="font-medium">{patient.data.room}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-primary" />
                              <Badge variant={getAdmissionStatus(patient.data.admittedAt).variant} className="gap-1">
                                <Calendar className="h-3 w-3" />
                                {getAdmissionStatus(patient.data.admittedAt).text}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 rounded-lg border border-primary/20 cursor-pointer w-64" onClick={() => handlePatientClick(patient.id)}>
                          <Stethoscope className="h-5 w-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Reason of admission</p>
                            <p className="font-semibold text-foreground">{patient.data.diagnosis}</p>
                          </div>
                        </div>
                      </div>

                      {/* Followers section */}
                      {followers.length > 0 && <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
                          <Users className="h-4 w-4" />
                          <span>
                            Followed by:{" "}
                            {followers.map(f => f.profiles?.full_name || f.profiles?.email || "Unknown").join(", ")}
                          </span>
                        </div>}
                    </div>
                  </Card>;
          })}
            </>}
        </div>
      </div>
    </div>;
};
export default Index;