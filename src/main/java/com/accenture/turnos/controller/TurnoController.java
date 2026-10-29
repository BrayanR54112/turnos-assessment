package com.accenture.turnos.controller;

import com.accenture.turnos.entity.Turno;
import com.accenture.turnos.service.TurnoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/turnos")
@CrossOrigin(origins = "*")
public class TurnoController {

    private final TurnoService service;

    public TurnoController(TurnoService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Turno> pedirTurno() {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.pedirTurno());
    }

    @GetMapping
    public ResponseEntity<List<Turno>> listarTurnos(@RequestParam(defaultValue = "PENDIENTE") String estado) {
        return ResponseEntity.ok(service.listarPorEstado(estado));
    }

    @PostMapping("/siguiente")
    public ResponseEntity<?> llamarSiguiente() {
        try {
            return ResponseEntity.ok(service.llamarSiguiente());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{numero}/cancelar")
    public ResponseEntity<?> cancelarTurno(@PathVariable Integer numero) {
        try {
            return ResponseEntity.ok(service.cancelarTurno(numero));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<?> estadisticas() {
        return ResponseEntity.ok(Map.of("promedioMinutos", service.calcularPromedioEspera()));
    }
}