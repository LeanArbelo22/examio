// Estructura de tipos básica de EXAMIO para guiar el desarrollo
export interface Exam {
  id: string;
  carrera: string;
  catedra: string;
  subject: string;
  professor: string;
  dueDate: string;
  duration: string;
  questionsCount: string;
  urgency: "high" | "normal";
  instrucciones: string[];
  recursosPermitidos: string;
  preguntas: {
    id: string;
    enunciado: string;
    opciones: string[];
  }[];
}

export interface AlumnoDashboard {
  promedio: number;
  porcentajeAprobadas: number;
  totalActividadesText: string;
  recentResults: {
    subject: string;
    score: number;
    status: "approved" | "disapproved";
  }[];
}

// ==========================================
// BASE DE DATOS SIMULADA (MOCK STORE)
// ==========================================

export const alumnoDashboardData: AlumnoDashboard = {
  promedio: 7.75,
  porcentajeAprobadas: 66,
  totalActividadesText: "2 de 3 actividades",
  recentResults: [
    { subject: "Historia Contemporánea", score: 8.5, status: "approved" },
    { subject: "Química General", score: 7.0, status: "approved" },
    { subject: "Álgebra Lineal", score: 4.0, status: "disapproved" },
  ],
};

export const examsDatabase: Record<string, Exam> = {
  "mat-2": {
    id: "mat-2",
    carrera: "Ingeniería en Sistemas",
    catedra: "Comisión A",
    subject: "Matemáticas II",
    professor: "Ing. Augusto JH",
    dueDate: "Hoy, 23:59 hs",
    duration: "60 min",
    questionsCount: "15 preguntas",
    urgency: "high",
    instrucciones: [
      "El examen consta de un total de 15 preguntas de opción múltiple.",
      "Una vez iniciado el intento, el temporizador correrá de forma continua y no se podrá pausar.",
      "Asegurate de contar con una conexión a internet estable antes de presionar el botón.",
    ],
    recursosPermitidos: "Para esta actividad no se permite el uso de calculadoras externas ni apuntes digitales.",
    preguntas: [
      {
        id: "1",
        enunciado: "Dada la siguiente función de segundo grado, determine el valor del vértice de la parábola resultante en el eje de las abscisas:",
        opciones: ["Xv = -b / (2a)", "Xv = b^2 - 4ac", "Xv = -c / a", "Xv = 2a / b"],
      },
      {
        id: "2",
        enunciado: "¿Cuál es la derivada de la función f(x) = x^2 respecto a x?",
        opciones: ["f'(x) = 2x", "f'(x) = x", "f'(x) = 2", "f'(x) = 1/2 x"],
      },
    ],
  },
  "fis-1": {
    id: "fis-1",
    carrera: "Ingeniería en Sistemas",
    catedra: "Comisión A",
    subject: "Física I",
    professor: "Dr. Marcos Perez",
    dueDate: "18 de Marzo",
    duration: "90 min",
    questionsCount: "20 preguntas",
    urgency: "normal",
    instrucciones: [
      "El examen consta de un total de 20 preguntas con desarrollo numérico.",
      "Cada intento es registrado por el sistema antifraude de la Institución Cervantes.",
      "Disponés de un único intento para enviar tus respuestas.",
    ],
    recursosPermitidos: "Se autoriza el uso exclusivo de calculadora científica estándar no programable.",
    preguntas: [
      {
        id: "1",
        enunciado: "Un cuerpo se desplaza con una velocidad constante de 20 m/s. Determine la distancia recorrida tras 5 segundos de trayecto lineal:",
        opciones: ["100 metros", "40 metros", "4 metros", "200 metros"],
      },
    ],
  },
};

export interface ProfessorDashboard {
  stats: {
    activeExams: number;
    totalEvaluated: number;
    generalAverage: number;
    fraudAlertsCount: number;
  };
  activeExamsList: {
    id: string;
    subject: string;
    examTitle: string;
    totalStudents: number;
    submittedCount: number;
    dueDate: string;
    status: "active" | "draft" | "closed";
  }[];
  recentAlerts: {
    studentName: string;
    subject: string;
    timestamp: string;
    reason: "fullscreen_exit" | "focus_lost";
  }[];
}

export const professorDashboardData: ProfessorDashboard = {
  stats: {
    activeExams: 2,
    totalEvaluated: 148,
    generalAverage: 7.2,
    fraudAlertsCount: 3,
  },
  activeExamsList: [
    {
      id: "mat-2",
      subject: "Matemáticas II",
      examTitle: "Examen Parcial N°1",
      totalStudents: 60,
      submittedCount: 45,
      dueDate: "Hoy, 23:59 hs",
      status: "active",
    },
    {
      id: "fis-1",
      subject: "Física I",
      examTitle: "Recuperatorio unidad 1",
      totalStudents: 45,
      submittedCount: 12,
      dueDate: "18 de Marzo",
      status: "active",
    },
  ],
  recentAlerts: [
    { studentName: "Leandro Arbelo", subject: "Matemáticas II", timestamp: "Hace 5 min", reason: "fullscreen_exit" },
    { studentName: "Martín Gómez", subject: "Física I", timestamp: "Hace 22 min", reason: "focus_lost" },
  ],
};

// Actualizá esta sección al final de src/lib/db-mock.ts

export const examCategoriesMock = {
  types: [
    { id: "mixed", title: "Examen mixto", icon: "🧬", desc: "Permite combinar múltiples tipos de preguntas en la misma evaluación." },
    { id: "choice", title: "Múltiple Opción", icon: "📋", desc: "Opciones fijas con única respuesta correcta." },
    { id: "text", title: "A desarrollar", icon: "✍️", desc: "Campo de texto libre para respuestas redactadas o ensayos." },
    { id: "code", title: "Programación", icon: "💻", desc: "Consola integrada para evaluar lógica de código." }
  ],
  securityMeasures: [
    { id: "fullscreen", label: "Pantalla completa obligatoria", desc: "Entorno bloqueado. Salir anula el intento.", default: true },
    { id: "clipboard", label: "Bloquear portapapeles", desc: "Deshabilita copiar enunciados o pegar respuestas.", default: true },
    { id: "random_order", label: "Orden aleatorio de preguntas", desc: "Altera el orden de las preguntas para cada alumno.", default: true },
    { id: "random_variants", label: "Variantes aleatorias por pregunta", desc: "Selecciona una consigna distinta al azar de un grupo de variantes.", default: true }
  ]
};

// Banco de preguntas simulación para reutilizar
export const bancoPreguntasMock = [
  { id: "banco-1", subject: "Matemáticas II", topic: "Límites", text: "Calcule el límite cuando x tiende a infinito de...", type: "math" },
  { id: "banco-2", subject: "Matemáticas II", topic: "Derivadas", text: "Encontrá la derivada primera de f(x) = ln(x)...", type: "choice" },
  { id: "banco-3", subject: "Programación I", topic: "SQL", text: "Escriba una sentencia SELECT con INNER JOIN para...", type: "code" }
];

export interface InstitucionStats {
  globalKPIs: {
    carrerasCount: number;
    alumnosActivos: number;
    docentesCount: number;
    comisionesCount: number;
    tasaFraudeGlobal: string;
    promedioGeneralInstitucional: number;
  };
  criticas: {
    catedra: string;
    profesor: string;
    alertaType: "bajo_promedio" | "alto_fraude";
    valor: string;
  }[];
}

export const institucionMockData: InstitucionStats = {
  globalKPIs: {
    carrerasCount: 4,
    alumnosActivos: 1240,
    docentesCount: 48,
    comisionesCount: 16,
    tasaFraudeGlobal: "0.2%", // Un número bajo gracias al FullscreenWrapper
    promedioGeneralInstitucional: 7.1
  },
  criticas: [
    { catedra: "Álgebra Lineal", profesor: "Dr. Marcos Perez", alertaType: "bajo_promedio", valor: "Nota Prom: 4.2" },
    { catedra: "Sistemas de Procesos", profesor: "Ing. Juan Gómez", alertaType: "alto_fraude", valor: "5 Intentos Anulados" }
  ]
};