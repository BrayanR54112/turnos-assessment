package com.accenture.turnos.service;

import com.accenture.turnos.entity.Turno;
import com.accenture.turnos.repository.TurnoRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class TurnoService {

    private final TurnoRepository repository;
    private static final DateTimeFormatter FLEX_FMT = DateTimeFormatter.ofPattern("H:mm");
    private static final DateTimeFormatter OUT_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public TurnoService(TurnoRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void cargarDatosIniciales() {
        if (repository.count() > 0) return;
        try {
            ClassPathResource resource = new ClassPathResource("turnos.csv");
            if (!resource.exists()) return;
            try (BufferedReader br = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String linea;
                boolean primera = true;
                while ((linea = br.readLine()) != null) {
                    if (primera) { primera = false; continue; }
                    if (linea.isBlank()) continue;
                    String[] p = linea.split(",", -1);
                    Integer numero = Integer.parseInt(p[0].trim());
                    String horaSol = p[1].trim();
                    String horaAte = p[2].trim().isEmpty() ? null : p[2].trim();
                    String estado = p[3].trim().toUpperCase();

                    // Ignora cancelados del archivo o números repetidos para que el 7 pendiente (8:34) sea el válido
                    if ("CANCELADO".equals(estado) || repository.existsByNumero(numero)) {
                        continue;
                    }
                    repository.save(new Turno(numero, horaSol, horaAte, estado));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error cargando turnos.csv", e);
        }
    }

    private LocalTime parseHora(String h) {
        return LocalTime.parse(h.trim(), FLEX_FMT);
    }

    public Turno pedirTurno() {
        int siguienteNum = repository.obtenerUltimoNumero() + 1;
        String ahora = LocalTime.now().format(OUT_FMT);
        return repository.save(new Turno(siguienteNum, ahora, null, "PENDIENTE"));
    }

    public List<Turno> listarPorEstado(String estado) {
        String est = (estado == null || estado.isBlank()) ? "PENDIENTE" : estado.toUpperCase();
        return repository.findByEstadoIgnoreCase(est).stream()
                .sorted(Comparator.comparing(t -> parseHora(t.getHoraSolicitud())))
                .toList();
    }

    public Turno llamarSiguiente() {
        List<Turno> pendientes = listarPorEstado("PENDIENTE");
        if (pendientes.isEmpty()) {
            throw new IllegalStateException("No hay turnos en espera");
        }
        Turno siguiente = pendientes.get(0);
        siguiente.setEstado("ATENDIDO");
        siguiente.setHoraAtencion(LocalTime.now().format(OUT_FMT));
        return repository.save(siguiente);
    }

    public Turno cancelarTurno(Integer numero) {
        Turno turno = repository.findByNumero(numero)
                .orElseThrow(() -> new NoSuchElementException("El turno no existe"));
        if (!"PENDIENTE".equalsIgnoreCase(turno.getEstado())) {
            throw new IllegalStateException("No se puede cancelar un turno que no está pendiente");
        }
        turno.setEstado("CANCELADO");
        return repository.save(turno);
    }

    public double calcularPromedioEspera() {
        List<Turno> atendidos = repository.findByEstadoIgnoreCase("ATENDIDO");
        if (atendidos.isEmpty()) return 0.0;
        double suma = atendidos.stream()
                .filter(t -> t.getHoraAtencion() != null && !t.getHoraAtencion().isBlank())
                .mapToLong(t -> Duration.between(parseHora(t.getHoraSolicitud()), parseHora(t.getHoraAtencion())).toMinutes())
                .sum();
        return Math.round((suma / atendidos.size()) * 10.0) / 10.0;
    }
}