import { Routes } from '@angular/router';
import { AsesorComponent } from './pages/asesor/asesor.component';
import { PedirTurnoComponent } from './pages/pedir-turno/pedir-turno.component';

// Cada URL muestra una pantalla
export const routes: Routes = [
  { path: 'pedir-turno', component: PedirTurnoComponent },   // Vista del cliente (celular)
  { path: 'asesor', component: AsesorComponent },            // Vista del asesor
  { path: '', redirectTo: 'pedir-turno', pathMatch: 'full' }, // Por defecto: vista del cliente
  { path: '**', redirectTo: 'pedir-turno' }                   // Cualquier URL desconocida
];
