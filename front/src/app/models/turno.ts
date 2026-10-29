// Estados posibles de un turno. CANCELADO es el estado nuevo:
// el cliente se fue y el asesor ya no debe llamarlo.
export type EstadoTurno = 'PENDIENTE' | 'ATENDIDO' | 'CANCELADO';

// Turno tal como lo devuelve el backend
export interface Turno {
  numero: number;               // Identifica el turno y es el número que ve el cliente (ej. 11)
  estado: EstadoTurno;
  horaSolicitud: string;        // Cuándo pidió el turno
  horaAtencion?: string | null; // Cuándo lo llamó el asesor (solo si fue ATENDIDO)
}

// Respuesta de GET /api/turnos/estadisticas
export interface Estadisticas {
  promedioMinutos: number; // Minutos promedio entre que se pide y se atiende un turno
}
