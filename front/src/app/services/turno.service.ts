import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Estadisticas, Turno } from '../models/turno';

// Único punto de comunicación con el backend: un método por endpoint.
// Las vistas nunca llaman a HttpClient directamente.
@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private http = inject(HttpClient);
  private api = '/api/turnos';

  // POST /api/turnos -> crea un turno nuevo en estado PENDIENTE
  pedirTurno(): Observable<Turno> {
    return this.http.post<Turno>(this.api, {});
  }

  // GET /api/turnos?estado=PENDIENTE -> fila de espera ordenada por llegada.
  // Los cancelados no vienen aquí, por eso desaparecen solos de la fila.
  pendientes(): Observable<Turno[]> {
    return this.http.get<Turno[]>(this.api, { params: { estado: 'PENDIENTE' } });
  }

  // GET /api/turnos?estado=CANCELADO -> turnos que el cliente canceló
  cancelados(): Observable<Turno[]> {
    return this.http.get<Turno[]>(this.api, { params: { estado: 'CANCELADO' } });
  }

  // POST /api/turnos/siguiente -> el asesor llama al PENDIENTE más antiguo.
  // Responde 409 si no hay nadie esperando.
  llamarSiguiente(): Observable<Turno> {
    return this.http.post<Turno>(`${this.api}/siguiente`, {});
  }

  // POST /api/turnos/{numero}/cancelar -> el cliente cancela su turno (pasa a CANCELADO).
  // Si el turno ya no está PENDIENTE (por ejemplo, ya lo llamaron) el backend responde con error.
  cancelar(numero: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.api}/${numero}/cancelar`, {});
  }

  // GET /api/turnos/estadisticas -> tiempo promedio de espera
  estadisticas(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(`${this.api}/estadisticas`);
  }

  // El backend responde los errores como {"error": "mensaje"}.
  // Si trae mensaje lo mostramos; si no, usamos uno genérico.
  mensajeError(err: HttpErrorResponse, porDefecto: string): string {
    return err.error?.error ?? porDefecto;
  }
}
