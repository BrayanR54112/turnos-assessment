import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, switchMap, timer } from 'rxjs';
import { Turno } from '../../models/turno';
import { TurnoService } from '../../services/turno.service';

const STORAGE_KEY = 'miTurno'; // Clave para guardar el turno en el navegador
const REFRESCO_MS = 5000;      // Cada cuánto se consulta la fila (5 segundos)

// Vista del cliente: pedir turno, ver cuánto falta y cancelar
@Component({
  selector: 'app-pedir-turno',
  standalone: true,
  imports: [],
  templateUrl: './pedir-turno.component.html',
  styleUrl: './pedir-turno.component.css'
})
export class PedirTurnoComponent implements OnInit, OnDestroy {
  private turnoService = inject(TurnoService);
  private polling?: Subscription; // Consulta periódica de la fila

  miTurno: Turno | null = null;           // Turno del cliente (null = todavía no ha pedido)
  personasAntes: number | null = null;    // Cuántas personas tiene adelante
  personasAlInicio: number | null = null; // Personas adelante al empezar (para la barra de progreso)
  promedioMinutos: number | null = null;  // Promedio de atención, para estimar el tiempo
  mensaje = '';                           // Mensaje de éxito (cancelado / es tu turno)
  error = '';                             // Mensaje de error
  cargando = false;                       // Desactiva los botones mientras espera respuesta

  ngOnInit(): void {
    // Trae el promedio de espera para calcular el tiempo estimado
    this.turnoService.estadisticas().subscribe({
      next: est => (this.promedioMinutos = est.promedioMinutos),
      error: () => (this.promedioMinutos = null)
    });

    // Si el cliente recarga el celular no pierde su turno: lo recuperamos del navegador
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      this.miTurno = JSON.parse(guardado);
      this.seguirTurno();
    }
  }

  // Al salir de la pantalla se detiene la consulta periódica
  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  // Botón "Pedir turno"
  pedirTurno(): void {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    this.turnoService.pedirTurno().subscribe({
      next: turno => {
        this.miTurno = turno;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(turno)); // Lo guardamos por si recarga
        this.cargando = false;
        this.seguirTurno();
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.turnoService.mensajeError(err, 'No se pudo pedir el turno. Intenta de nuevo.');
        this.cargando = false;
      }
    });
  }

  // Botón "Cancelar turno": pide confirmación y avisa al backend
  cancelarTurno(): void {
    if (!this.miTurno || !confirm(`¿Seguro que quieres cancelar el turno ${this.miTurno.numero}?`)) {
      return;
    }
    this.cargando = true;
    this.error = '';
    this.turnoService.cancelar(this.miTurno.numero).subscribe({
      next: () => this.terminar('Tu turno fue cancelado. ¡Gracias por avisar!'),
      error: (err: HttpErrorResponse) => {
        // 409: el asesor lo llamó justo antes de cancelar
        this.error = this.turnoService.mensajeError(err, 'No se pudo cancelar el turno.');
        this.cargando = false;
      }
    });
  }

  // Consulta la fila cada 5 segundos para saber en qué posición va el cliente.
  // timer(0, 5000): dispara de inmediato y luego cada 5 s.
  // switchMap: por cada disparo pide la lista de pendientes al backend.
  private seguirTurno(): void {
    this.polling?.unsubscribe();
    this.polling = timer(0, REFRESCO_MS)
      .pipe(switchMap(() => this.turnoService.pendientes()))
      .subscribe({
        next: pendientes => {
          // La posición en la lista = cuántas personas tiene adelante
          const posicion = pendientes.findIndex(t => t.numero === this.miTurno?.numero);
          if (posicion === -1) {
            // Ya no está PENDIENTE: el asesor lo llamó
            this.terminar('¡Es tu turno! Acércate al asesor.');
          } else {
            this.personasAntes = posicion;
            if (this.personasAlInicio === null) {
              this.personasAlInicio = posicion;
            }
            this.error = '';
          }
        },
        error: () => (this.error = 'Sin conexión con el servidor. Reintentando...')
      });
  }

  // Limpia todo cuando el turno termina (cancelado o llamado)
  private terminar(mensaje: string): void {
    this.polling?.unsubscribe();
    localStorage.removeItem(STORAGE_KEY);
    this.mensaje = mensaje;
    this.miTurno = null;
    this.personasAntes = null;
    this.personasAlInicio = null;
    this.cargando = false;
  }

  // Tiempo estimado = personas adelante x promedio de atención
  get minutosEstimados(): number | null {
    if (this.personasAntes === null || this.promedioMinutos === null) {
      return null;
    }
    return Math.round(this.personasAntes * this.promedioMinutos);
  }

  // Porcentaje de la barra de progreso (mínimo 5% para que siempre se vea algo)
  get progreso(): number {
    if (!this.personasAlInicio || this.personasAntes === null) {
      return this.personasAntes === 0 ? 100 : 5;
    }
    return Math.max(5, Math.round((1 - this.personasAntes / this.personasAlInicio) * 100));
  }
}
