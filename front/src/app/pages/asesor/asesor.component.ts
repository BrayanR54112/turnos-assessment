import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, catchError, forkJoin, of, switchMap, timer } from 'rxjs';
import { Turno } from '../../models/turno';
import { TurnoService } from '../../services/turno.service';

const REFRESCO_MS = 5000; // Cada cuánto se refresca la fila (5 segundos)

// Vista del asesor: ver cuántas personas esperan, llamar al siguiente y ver los cancelados
@Component({
  selector: 'app-asesor',
  standalone: true,
  imports: [],
  templateUrl: './asesor.component.html',
  styleUrl: './asesor.component.css'
})
export class AsesorComponent implements OnInit, OnDestroy {
  private turnoService = inject(TurnoService);
  private polling?: Subscription; // Consulta periódica de la fila

  pendientes: Turno[] = [];         // Fila de espera (solo PENDIENTES)
  cancelados: Turno[] = [];         // Turnos que el cliente canceló (no se llaman)
  turnoActual: Turno | null = null; // Turno que se está atendiendo
  error = '';                       // Mensaje de error
  cargando = false;                 // Desactiva el botón mientras espera respuesta

  ngOnInit(): void {
    // Cada 5 s pide al mismo tiempo los pendientes y los cancelados (forkJoin).
    // Si un cliente cancela, su turno pasa de una lista a la otra.
    this.polling = timer(0, REFRESCO_MS)
      .pipe(
        switchMap(() =>
          forkJoin({
            pendientes: this.turnoService.pendientes(),
            // Si fallan los cancelados, la fila de pendientes sigue funcionando
            cancelados: this.turnoService.cancelados().pipe(catchError(() => of([])))
          })
        )
      )
      .subscribe({
        next: ({ pendientes, cancelados }) => {
          this.pendientes = pendientes;
          this.cancelados = cancelados;
          this.error = '';
        },
        error: () => (this.error = 'Sin conexión con el servidor.')
      });
  }

  // Al salir de la pantalla se detiene la consulta periódica
  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  // Botón "Llamar siguiente": el backend elige el PENDIENTE más antiguo,
  // así que nunca se llama a un turno cancelado
  llamarSiguiente(): void {
    this.cargando = true;
    this.error = '';
    this.turnoService.llamarSiguiente().subscribe({
      next: turno => {
        this.turnoActual = turno;
        // Lo quitamos de la fila sin esperar al siguiente refresco
        this.pendientes = this.pendientes.filter(t => t.numero !== turno.numero);
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        // 409: no hay turnos en espera
        this.error = this.turnoService.mensajeError(err, 'No se pudo llamar al siguiente turno.');
        this.cargando = false;
      }
    });
  }
}
