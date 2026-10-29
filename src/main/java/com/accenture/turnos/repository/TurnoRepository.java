package com.accenture.turnos.repository;

import com.accenture.turnos.entity.Turno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TurnoRepository extends JpaRepository<Turno, Long> {

    boolean existsByNumero(Integer numero);

    Optional<Turno> findByNumero(Integer numero);

    List<Turno> findByEstadoIgnoreCase(String estado);

    @Query("SELECT COALESCE(MAX(t.numero), 0) FROM Turno t")
    Integer obtenerUltimoNumero();
}