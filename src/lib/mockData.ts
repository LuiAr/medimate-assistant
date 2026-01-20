export interface Patient {
  id: string;
  name: string;
  age: number;
  room: string;
  admissionDate: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  vitals: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
    timestamp: string;
  };
  medicalHistory: string[];
  notes: Array<{
    date: string;
    author: string;
    content: string;
  }>;
  alerts?: Array<{
    type: 'urgent' | 'warning' | 'info';
    message: string;
  }>;
}

export const mockPatients: Patient[] = [
  {
    id: "p1",
    name: "Sarah Johnson",
    age: 34,
    room: "302",
    admissionDate: "2024-11-25",
    diagnosis: "Pneumonia",
    medications: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "Every 8 hours" },
      { name: "Ibuprofen", dosage: "400mg", frequency: "As needed for pain" },
    ],
    vitals: {
      bloodPressure: "118/76",
      heartRate: 78,
      temperature: 37.8,
      oxygenSaturation: 96,
      timestamp: "2024-11-28 08:30",
    },
    medicalHistory: [
      "No known allergies",
      "Previous respiratory infection (2023)",
      "Non-smoker",
    ],
    notes: [
      {
        date: "2024-11-27",
        author: "Dr. Smith",
        content: "Patient showing improvement. Continue current treatment plan.",
      },
      {
        date: "2024-11-26",
        author: "Dr. Johnson",
        content: "Started antibiotic treatment. Monitor for 48 hours.",
      },
    ],
    alerts: [
      {
        type: 'warning',
        message: "Chest X-ray scheduled for tomorrow at 09:00",
      },
    ],
  },
  {
    id: "p2",
    name: "Michael Chen",
    age: 67,
    room: "415",
    admissionDate: "2024-11-23",
    diagnosis: "Post-op cardiac surgery",
    medications: [
      { name: "Aspirin", dosage: "81mg", frequency: "Once daily" },
      { name: "Metoprolol", dosage: "50mg", frequency: "Twice daily" },
      { name: "Atorvastatin", dosage: "40mg", frequency: "Once daily at bedtime" },
    ],
    vitals: {
      bloodPressure: "132/84",
      heartRate: 68,
      temperature: 36.9,
      oxygenSaturation: 98,
      timestamp: "2024-11-28 08:15",
    },
    medicalHistory: [
      "Coronary artery disease",
      "Hypertension",
      "Type 2 Diabetes",
      "Former smoker (quit 5 years ago)",
    ],
    notes: [
      {
        date: "2024-11-27",
        author: "Dr. Williams",
        content: "Post-op day 4. Wound healing well. Patient ambulating with assistance.",
      },
    ],
  },
  {
    id: "p3",
    name: "Emma Williams",
    age: 28,
    room: "208",
    admissionDate: "2024-11-27",
    diagnosis: "Severe dehydration",
    medications: [
      { name: "IV Fluids", dosage: "1000mL", frequency: "Every 6 hours" },
      { name: "Ondansetron", dosage: "4mg", frequency: "Every 8 hours as needed" },
    ],
    vitals: {
      bloodPressure: "108/68",
      heartRate: 92,
      temperature: 37.2,
      oxygenSaturation: 99,
      timestamp: "2024-11-28 07:45",
    },
    medicalHistory: [
      "No significant medical history",
      "Recent gastroenteritis",
    ],
    notes: [
      {
        date: "2024-11-27",
        author: "Dr. Martinez",
        content: "Patient admitted with severe dehydration. Started IV fluid replacement.",
      },
    ],
  },
  {
    id: "p4",
    name: "Robert Martinez",
    age: 52,
    room: "311",
    admissionDate: "2024-11-24",
    diagnosis: "Type 2 Diabetes complications",
    medications: [
      { name: "Insulin Glargine", dosage: "20 units", frequency: "Once daily at bedtime" },
      { name: "Metformin", dosage: "1000mg", frequency: "Twice daily with meals" },
    ],
    vitals: {
      bloodPressure: "142/88",
      heartRate: 76,
      temperature: 37.0,
      oxygenSaturation: 97,
      timestamp: "2024-11-28 08:00",
    },
    medicalHistory: [
      "Type 2 Diabetes (diagnosed 2015)",
      "Hypertension",
      "Obesity (BMI 32)",
    ],
    notes: [
      {
        date: "2024-11-27",
        author: "Dr. Chen",
        content: "Blood sugar levels stabilizing. Continue monitoring glucose levels.",
      },
    ],
    alerts: [
      {
        type: 'urgent',
        message: "⚠️ URGENT: Insulin due at 14:30 (in 15 minutes)",
      },
    ],
  },
  {
    id: "p5",
    name: "Linda Davis",
    age: 45,
    room: "503",
    admissionDate: "2024-11-26",
    diagnosis: "Appendicitis recovery",
    medications: [
      { name: "Ceftriaxone", dosage: "1g", frequency: "Every 12 hours IV" },
      { name: "Morphine", dosage: "5mg", frequency: "Every 4 hours as needed" },
    ],
    vitals: {
      bloodPressure: "124/78",
      heartRate: 72,
      temperature: 37.4,
      oxygenSaturation: 98,
      timestamp: "2024-11-28 08:20",
    },
    medicalHistory: [
      "Allergic to Penicillin",
      "Previous cesarean section (2015)",
    ],
    notes: [
      {
        date: "2024-11-27",
        author: "Dr. Thompson",
        content: "Post-op day 1. Patient recovering well from appendectomy. Pain managed.",
      },
    ],
    alerts: [
      {
        type: 'warning',
        message: "⚠️ NPO (Nothing by mouth) - Surgery scheduled tomorrow 08:00",
      },
    ],
  },
];
