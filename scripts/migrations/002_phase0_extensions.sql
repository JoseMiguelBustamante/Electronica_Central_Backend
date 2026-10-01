-- Extensiones aprobadas durante Fase 0.
-- Ejecutar solamente después de 001_schema_reference.sql y solo en una base de prueba revisada.
-- Esta migración no se ejecuta desde la API.

BEGIN;

CREATE TABLE electronica_az.sesion_usuario (
    id_sesion uuid NOT NULL DEFAULT gen_random_uuid(),
    token_hash text NOT NULL,
    creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en timestamptz NOT NULL,
    ultima_actividad_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revocada_en timestamptz,
    id_usuario uuid NOT NULL,
    CONSTRAINT pk_sesion_usuario PRIMARY KEY (id_sesion),
    CONSTRAINT uq_sesion_usuario_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_sesion_usuario_usuario FOREIGN KEY (id_usuario)
        REFERENCES electronica_az.usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE electronica_az.restablecimiento_acceso (
    id_restablecimiento uuid NOT NULL DEFAULT gen_random_uuid(),
    hash_contrasena_temporal text NOT NULL,
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en timestamptz NOT NULL,
    usado_en timestamptz,
    id_usuario_objetivo uuid NOT NULL,
    id_usuario_responsable uuid NOT NULL,
    CONSTRAINT pk_restablecimiento_acceso PRIMARY KEY (id_restablecimiento),
    CONSTRAINT fk_restablecimiento_objetivo FOREIGN KEY (id_usuario_objetivo)
        REFERENCES electronica_az.usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_restablecimiento_responsable FOREIGN KEY (id_usuario_responsable)
        REFERENCES electronica_az.usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE electronica_az.idempotencia_operacion (
    id_idempotencia uuid NOT NULL DEFAULT gen_random_uuid(),
    clave varchar(255) NOT NULL,
    operacion varchar(120) NOT NULL,
    hash_solicitud text NOT NULL,
    estado_http integer NOT NULL,
    respuesta jsonb NOT NULL,
    creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario uuid NOT NULL,
    CONSTRAINT pk_idempotencia_operacion PRIMARY KEY (id_idempotencia),
    CONSTRAINT uq_idempotencia_operacion UNIQUE (id_usuario, operacion, clave),
    CONSTRAINT fk_idempotencia_usuario FOREIGN KEY (id_usuario)
        REFERENCES electronica_az.usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE electronica_az.entrega (
    id_entrega uuid NOT NULL DEFAULT gen_random_uuid(),
    fecha_hora timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_venta uuid NOT NULL,
    id_usuario uuid NOT NULL,
    CONSTRAINT pk_entrega PRIMARY KEY (id_entrega),
    CONSTRAINT uq_entrega_venta UNIQUE (id_venta),
    CONSTRAINT fk_entrega_venta FOREIGN KEY (id_venta)
        REFERENCES electronica_az.venta (id_venta)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_entrega_usuario FOREIGN KEY (id_usuario)
        REFERENCES electronica_az.usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX ix_sesion_usuario_activa
    ON electronica_az.sesion_usuario (id_usuario, expira_en)
    WHERE revocada_en IS NULL;
CREATE INDEX ix_restablecimiento_acceso_objetivo
    ON electronica_az.restablecimiento_acceso (id_usuario_objetivo, expira_en)
    WHERE usado_en IS NULL;

COMMENT ON TABLE electronica_az.entrega IS
    'Una entrega completa por venta; el backend validará venta confirmada y saldo cero.';
COMMENT ON TABLE electronica_az.idempotencia_operacion IS
    'Protección persistida para operaciones críticas; un cambio de contenido con la misma clave se rechaza en el backend.';

COMMIT;
