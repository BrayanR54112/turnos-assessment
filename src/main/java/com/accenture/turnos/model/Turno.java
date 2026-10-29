package com.accenture.turnos.model;

import jakarta.persistence.*;

@Entity
@Table(name = "turnos")
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero", nullable = false)
    private Integer numero;

    @Column(name = "hora_solicitud", nullable = false)
    private String horaSolicitud;

    @Column(name = "hora_atencion")
    private String horaAtencion;

    @Column(name = "estado", nullable = false)
    private String estado;

    public Turno() {}

    public Turno(Integer numero, String horaSolicitud, String estado) {
        this.numero = numero;
        this.horaSolicitud = horaSolicitud;
        this.estado = estado;
        this.horaAtencion = null;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public String getHoraSolicitud() { return horaSolicitud; }
    public void setHoraSolicitud(String horaSolicitud) { this.horaSolicitud = horaSolicitud; }

    public String getHoraAtencion() { return horaAtencion; }
    public void setHoraAtencion(String horaAtencion) { this.horaAtencion = horaAtencion; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}