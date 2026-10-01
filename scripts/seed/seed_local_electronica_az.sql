-- =============================================================================
-- Electrónica Central AZ — seed local (catálogo + apertura + vendedor/cliente)
-- =============================================================================
-- Origen: docs/datos_Electronica_CentralAZ.sql (solo catálogo / proveedores / stock)
-- NO incluye usuarios/roles/permisos del dump (incompatibles con la app).
--
-- Requisitos previos:
--   1. Migraciones aplicadas (001..010)
--   2. Este script crea el admin si falta (no hace falta bootstrap previo)
--
-- Cómo ejecutar (DBeaver / psql):
--   Ejecutar este archivo completo (Execute SQL Script)
--
-- Credenciales demo tras el seed:
--   Admin:    admin@example.test / change-this-admin-password
--   Vendedor: vendedor@example.test / ClaveVendedorSegura123
--
-- Alternativa Node:
--   npm run bootstrap:security
--   npm run seed:local
-- =============================================================================

BEGIN;

SET search_path TO electronica_az, public;

-- Asegura roles mínimos + admin bootstrap (si faltan)
INSERT INTO electronica_az.rol (nombre) VALUES
  ('CLIENTE'), ('VENDEDOR'), ('ADMINISTRADOR'), ('DESARROLLADOR')
ON CONFLICT DO NOTHING;

INSERT INTO electronica_az.usuario (nombre_usuario, correo, hash_contrasena)
SELECT 'admin', 'admin@example.test', 'scrypt$52c315681716e2075160737bac3bd05a$b06c5beebc722a4808a6dcf6c18493ae6b61f5c3cec43bce5cc8a5cb6b0723d9e8682c7bcf5f30bd29a8daa873d0c295683e464222f57698194d37916979ea0a'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test')
);

INSERT INTO electronica_az.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM electronica_az.usuario u
CROSS JOIN electronica_az.rol r
WHERE lower(u.correo) = lower('admin@example.test')
  AND r.nombre = 'ADMINISTRADOR'
  AND NOT EXISTS (
    SELECT 1 FROM electronica_az.usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
  );

-- Catálogo: idempotente (ON CONFLICT DO NOTHING en el origen)
-- categoria (15)
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('6d7e24f4-54ad-45fe-9ec1-cb2adafb99e4', 'Circuitos Integrados Digitales', 'Categoria Circuitos Integrados Digitales') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('6a4f3824-99a5-4f1e-a30b-84985d6222cd', 'Circuitos Integrados Analogicos', 'Categoria Circuitos Integrados Analogicos') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('51c137b2-8e49-4da8-b9f3-ccd1c75a8c72', 'Transistores BJT', 'Categoria Transistores BJT') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('103e9aaa-63a2-4f1a-bb09-956f19a96f4f', 'MOSFET e IGBT', 'Categoria MOSFET e IGBT') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('4ea05076-a36e-4831-bfce-21ea3eb80db3', 'Diodos y Rectificadores', 'Categoria Diodos y Rectificadores') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('d2beafb0-b263-4bf5-9542-d6b1e6c59bf8', 'Microcontroladores', 'Categoria Microcontroladores') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('c8d16c3e-371e-4fe4-a5df-37b7f8dd06e3', 'Placas de Desarrollo', 'Categoria Placas de Desarrollo') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('e255560c-5c85-4386-91f4-905d19b1a6cd', 'Sensores y Modulos Arduino', 'Categoria Sensores y Modulos Arduino') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('3293bb9d-b86d-4d34-8606-c78938e9fb4d', 'Displays y Pantallas', 'Categoria Displays y Pantallas') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('7830e993-e4cd-4e45-b76a-4d4483ebc04f', 'Comunicacion y Conectividad', 'Categoria Comunicacion y Conectividad') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('35a2f6bc-ae1a-43b8-90c7-2e60314fc0b8', 'Drivers de Motores', 'Categoria Drivers de Motores') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('317ea24b-860f-4c11-ba6f-5dc973597836', 'Alimentacion y Carga', 'Categoria Alimentacion y Carga') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('fe000e7d-168b-4b75-bec2-69cb5fcc72f6', 'Relay y Actuadores Arduino', 'Categoria Relay y Actuadores Arduino') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('9605b566-d915-4627-8913-8ec1c715db2d', 'Reguladores de Voltaje', 'Categoria Reguladores de Voltaje') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion) VALUES ('ef120b15-ee1c-4558-a6f1-b8787784f9ef', 'Componentes Pasivos y Accesorios', 'Categoria Componentes Pasivos y Accesorios') ON CONFLICT DO NOTHING;

-- marca (5)
INSERT INTO electronica_az.marca (id_marca, nombre) VALUES ('751c1167-d738-4e36-abcf-886a24e8ad75', 'ARDUINO') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.marca (id_marca, nombre) VALUES ('4c2be556-4eb9-4bbd-ae77-fbfae8fded28', 'ESPRESSIF') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.marca (id_marca, nombre) VALUES ('e1c1839e-ce58-4cf4-86ab-be5fddada100', 'MICROCHIP') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.marca (id_marca, nombre) VALUES ('ffa65f93-3a0b-431a-95e0-3ce7037d78bd', 'TEXAS INSTRUMENTS') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.marca (id_marca, nombre) VALUES ('45d0e7cf-121c-4d30-b157-2d320d3b515a', 'GENERICA') ON CONFLICT DO NOTHING;

-- modelo (5)
INSERT INTO electronica_az.modelo (id_modelo, nombre, descripcion, id_marca) VALUES ('da3fb491-3fbb-498d-9a96-7980c133247e', 'ARDUINO UNO R3', 'Modelo de referencia', '751c1167-d738-4e36-abcf-886a24e8ad75') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.modelo (id_modelo, nombre, descripcion, id_marca) VALUES ('882dfc16-bf1b-45b5-8d06-59a21477db32', 'ARDUINO NANO', 'Modelo de referencia', '751c1167-d738-4e36-abcf-886a24e8ad75') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.modelo (id_modelo, nombre, descripcion, id_marca) VALUES ('30678e4e-4edd-42d7-a090-dac61cbe12c9', 'ARDUINO MEGA 2560', 'Modelo de referencia', '751c1167-d738-4e36-abcf-886a24e8ad75') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.modelo (id_modelo, nombre, descripcion, id_marca) VALUES ('71ec0da6-caa0-4389-9e28-d57b51c841ca', 'ESP32 DEVKIT', 'Modelo de referencia', '4c2be556-4eb9-4bbd-ae77-fbfae8fded28') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.modelo (id_modelo, nombre, descripcion, id_marca) VALUES ('e720ed7b-f9ad-4108-8bfd-98621ac922a1', 'PIC16F877A', 'Modelo de referencia', 'e1c1839e-ce58-4cf4-86ab-be5fddada100') ON CONFLICT DO NOTHING;

-- unidad_medida (1)
INSERT INTO electronica_az.unidad_medida (id_unidad_medida, nombre, simbolo, permite_fraccion) VALUES ('643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'Unidad', 'UND', false) ON CONFLICT DO NOTHING;

-- ubicacion (15)
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('e6c67c7d-f2fd-4bac-acc0-c14aa8d0e3d2', '1', 'GENERAL', 'EST-1') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('f3f97eb1-9fb4-4c4f-86c1-bfd3156473e9', '2', 'GENERAL', 'EST-2') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('2af9db02-05bf-4738-b0a8-ab3b1c7dd2d2', '3', 'GENERAL', 'EST-3') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('3287d788-3a4d-4d37-a62e-5d23877fa7dd', '4', 'GENERAL', 'EST-4') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('5a37224e-efdd-4b8c-89a5-9fdfd12aaeda', '5', 'GENERAL', 'EST-5') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('2d60ba5e-de2c-44b6-a74c-500c6d343cdb', '6', 'GENERAL', 'EST-6') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('421903ef-cdff-4904-ae1b-538fb8fd9d76', '7', 'GENERAL', 'EST-7') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('02a48f2c-9b85-4b41-a055-672cb06fb4cd', '8', 'GENERAL', 'EST-8') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('1041242e-b199-41c5-b364-6f27673e8f92', '9', 'GENERAL', 'EST-9') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('563f9000-53a0-49b8-8412-76e56c63ffbd', '10', 'GENERAL', 'EST-10') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('f0ac6ad0-e0f1-42d2-aadc-ef2f7acbcb85', '11', 'GENERAL', 'EST-11') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('360ac931-76aa-4efb-9e1d-c8db266923be', '12', 'GENERAL', 'EST-12') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('2d33feab-966e-431e-8503-9270a2cccfff', '13', 'GENERAL', 'EST-13') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('23c8073f-6738-4b46-8874-e990d6fdf65b', '14', 'GENERAL', 'EST-14') ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante) VALUES ('780aff20-5dc6-4512-aa10-d676d0a9ef80', '15', 'GENERAL', 'EST-15') ON CONFLICT DO NOTHING;

-- producto (41)
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('12e1b168-cddc-411f-94b3-21835d50fe6f', '1N4007', 'Diodo rectificador 1N4007', '1000V/1A', 0.5000, true, '4ea05076-a36e-4831-bfce-21ea3eb80db3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f0ac6ad0-e0f1-42d2-aadc-ef2f7acbcb85', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('8968a0f1-5755-4caf-a008-f09d41a9deb7', '1N4148', 'Diodo señal 1N4148', '100V/200mA', 0.5000, true, '4ea05076-a36e-4831-bfce-21ea3eb80db3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f3f97eb1-9fb4-4c4f-86c1-bfd3156473e9', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('04c30756-ad93-4b47-99b4-f82b22f15a6c', 'BC547', 'Transistor NPN BC547', NULL, 1.0000, true, '51c137b2-8e49-4da8-b9f3-ccd1c75a8c72', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'e6c67c7d-f2fd-4bac-acc0-c14aa8d0e3d2', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('651c6767-0adf-42a7-abd7-6c81261a3972', 'BC557', 'Transistor PNP BC557', NULL, 1.0000, true, '51c137b2-8e49-4da8-b9f3-ccd1c75a8c72', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '360ac931-76aa-4efb-9e1d-c8db266923be', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('183d633f-1af9-439d-a69d-c333195bdebc', 'TIP41C', 'Transistor NPN TIP41C', NULL, 4.0000, true, '51c137b2-8e49-4da8-b9f3-ccd1c75a8c72', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '5a37224e-efdd-4b8c-89a5-9fdfd12aaeda', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('d0922570-bae4-4fac-8702-c53b85c45e94', 'IRF540N', 'MOSFET N IRF540N', '100V/28A', 12.5000, true, '103e9aaa-63a2-4f1a-bb09-956f19a96f4f', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '3287d788-3a4d-4d37-a62e-5d23877fa7dd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('837ec9d9-c48f-42f9-ae0b-459496ebd1bc', 'IRFZ44N', 'MOSFET N IRFZ44N', '60V/46A', 6.0000, true, '103e9aaa-63a2-4f1a-bb09-956f19a96f4f', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '3287d788-3a4d-4d37-a62e-5d23877fa7dd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('2c28e6e8-a2df-4ad9-8471-f08458724113', '7805', 'Regulador 5V 1A', NULL, 4.5000, true, '9605b566-d915-4627-8913-8ec1c715db2d', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '2af9db02-05bf-4738-b0a8-ab3b1c7dd2d2', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('127c700b-ddeb-41ff-8e2d-2e51e68575d3', 'LM317', 'Regulador ajustable', NULL, 5.0000, true, '9605b566-d915-4627-8913-8ec1c715db2d', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '360ac931-76aa-4efb-9e1d-c8db266923be', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('ac5b20d0-b555-45c9-b129-b3d2792fe424', 'NE555', 'Timer NE555', NULL, 4.0000, true, '6d7e24f4-54ad-45fe-9ec1-cb2adafb99e4', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f3f97eb1-9fb4-4c4f-86c1-bfd3156473e9', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('bd11df3f-ce7b-4b29-93d6-11b6e7197dc8', 'CMOS 4017', 'Contador CMOS 4017', NULL, 5.0000, true, '6d7e24f4-54ad-45fe-9ec1-cb2adafb99e4', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f0ac6ad0-e0f1-42d2-aadc-ef2f7acbcb85', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('4bba75d8-04f0-4191-b986-0bfcd85946e6', 'LM358', 'Amplificador operacional doble', NULL, 5.0000, true, '6a4f3824-99a5-4f1e-a30b-84985d6222cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '360ac931-76aa-4efb-9e1d-c8db266923be', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('bf046ec6-b3e2-48fb-8f95-92011218d136', 'LM741', 'Amplificador operacional', NULL, 4.5000, true, '6a4f3824-99a5-4f1e-a30b-84985d6222cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '780aff20-5dc6-4512-aa10-d676d0a9ef80', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('297aa045-590a-4606-8d8f-1dc456685925', 'PIC16F877A', 'Microcontrolador PIC16F877A', NULL, 50.0000, true, 'd2beafb0-b263-4bf5-9542-d6b1e6c59bf8', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '1041242e-b199-41c5-b364-6f27673e8f92', 'e1c1839e-ce58-4cf4-86ab-be5fddada100', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('cec2d529-2069-49e9-a3d3-9d8b11a0359d', 'ATMEGA328P', 'Microcontrolador ATMEGA328P', NULL, 40.0000, true, 'd2beafb0-b263-4bf5-9542-d6b1e6c59bf8', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f3f97eb1-9fb4-4c4f-86c1-bfd3156473e9', '751c1167-d738-4e36-abcf-886a24e8ad75', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('4115405f-85d9-4887-bb31-496c42305036', 'ARDUINO UNO R3', 'Placa Arduino UNO R3', NULL, 55.0000, true, 'c8d16c3e-371e-4fe4-a5df-37b7f8dd06e3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '563f9000-53a0-49b8-8412-76e56c63ffbd', '751c1167-d738-4e36-abcf-886a24e8ad75', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('a12297a1-d8c1-4ded-a6af-59a6f8c616ba', 'ARDUINO NANO', 'Placa Arduino NANO', NULL, 40.0000, true, 'c8d16c3e-371e-4fe4-a5df-37b7f8dd06e3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '421903ef-cdff-4904-ae1b-538fb8fd9d76', '751c1167-d738-4e36-abcf-886a24e8ad75', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('9a6a7e34-79fa-433a-8805-47b8407a2d62', 'ARDUINO MEGA 2560', 'Placa Arduino MEGA 2560', NULL, 95.0000, true, 'c8d16c3e-371e-4fe4-a5df-37b7f8dd06e3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'e6c67c7d-f2fd-4bac-acc0-c14aa8d0e3d2', '751c1167-d738-4e36-abcf-886a24e8ad75', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('26d1b7b9-d3fc-48e3-ad1d-7f3d482018c4', 'ESP32 DEVKIT', 'Placa ESP32 DevKit', NULL, 70.0000, true, 'c8d16c3e-371e-4fe4-a5df-37b7f8dd06e3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'e6c67c7d-f2fd-4bac-acc0-c14aa8d0e3d2', '4c2be556-4eb9-4bbd-ae77-fbfae8fded28', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('39c9f75f-c7a5-4207-aaea-d03ce9fcba13', 'ESP8266 NODEMCU', 'Placa ESP8266 NodeMCU', NULL, 45.0000, true, 'c8d16c3e-371e-4fe4-a5df-37b7f8dd06e3', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f3f97eb1-9fb4-4c4f-86c1-bfd3156473e9', '4c2be556-4eb9-4bbd-ae77-fbfae8fded28', NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('dd5f8aeb-827f-4104-bbab-508965223256', 'DHT11', 'Sensor de temperatura y humedad', NULL, 22.0000, true, 'e255560c-5c85-4386-91f4-905d19b1a6cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '3287d788-3a4d-4d37-a62e-5d23877fa7dd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('d66d5fa0-c24d-4879-aad0-136e19cafaac', 'DHT22', 'Sensor de temperatura y humedad', NULL, 45.0000, true, 'e255560c-5c85-4386-91f4-905d19b1a6cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '3287d788-3a4d-4d37-a62e-5d23877fa7dd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('94b25497-0bdd-4842-bbdf-5982c9ffcc15', 'HC-SR04', 'Sensor ultrasonico de distancia', NULL, 20.0000, true, 'e255560c-5c85-4386-91f4-905d19b1a6cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '1041242e-b199-41c5-b364-6f27673e8f92', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('446d8331-08d3-49b7-a487-e0930aaf862b', 'MPU6050', 'Giroscopio/Acelerometro', NULL, 30.0000, true, 'e255560c-5c85-4386-91f4-905d19b1a6cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '563f9000-53a0-49b8-8412-76e56c63ffbd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('871456cb-488b-49b9-92d0-1138dc00e9de', 'LDR', 'Fotoresistor LDR', NULL, 3.0000, true, 'e255560c-5c85-4386-91f4-905d19b1a6cd', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'e6c67c7d-f2fd-4bac-acc0-c14aa8d0e3d2', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('c653a65d-65ab-44ab-a75d-73822b42fc9b', 'LCD 1602', 'Pantalla LCD 16x2', NULL, 25.0000, true, '3293bb9d-b86d-4d34-8606-c78938e9fb4d', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '1041242e-b199-41c5-b364-6f27673e8f92', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('e2741f46-ddec-4c6e-8902-ccf3825beba7', 'OLED 0.96', 'Pantalla OLED 0.96 pulgadas', NULL, 30.0000, true, '3293bb9d-b86d-4d34-8606-c78938e9fb4d', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '3287d788-3a4d-4d37-a62e-5d23877fa7dd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('6441118f-ffc1-4a52-bb4c-309aa69d358b', 'MAX7219', 'Driver display matriz LED', NULL, 18.0000, true, '3293bb9d-b86d-4d34-8606-c78938e9fb4d', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '360ac931-76aa-4efb-9e1d-c8db266923be', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('cd7dcc83-c76d-4353-9d49-93898c7198a1', 'HC-05', 'Modulo Bluetooth HC-05', NULL, 50.0000, true, '7830e993-e4cd-4e45-b76a-4d4483ebc04f', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'f0ac6ad0-e0f1-42d2-aadc-ef2f7acbcb85', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('2a45def2-0dd7-4b64-a2d2-dd0b3c112ccc', 'NRF24L01', 'Modulo RF 2.4GHz con antena', NULL, 35.0000, true, '7830e993-e4cd-4e45-b76a-4d4483ebc04f', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '360ac931-76aa-4efb-9e1d-c8db266923be', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('6e63a039-f53c-4b6f-ab66-6e360064fb6e', 'SIM800L', 'Modulo GSM SIM800L', NULL, 65.0000, true, '7830e993-e4cd-4e45-b76a-4d4483ebc04f', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '1041242e-b199-41c5-b364-6f27673e8f92', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('1d7f90b3-9ff2-4a47-9883-c724e43f0456', 'L298N', 'Driver de motor doble puente H', NULL, 25.0000, true, '35a2f6bc-ae1a-43b8-90c7-2e60314fc0b8', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '421903ef-cdff-4904-ae1b-538fb8fd9d76', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('c13a364c-1faa-4721-b059-0032e79f467f', 'L293D', 'Driver de motor L293D', NULL, 15.0000, true, '35a2f6bc-ae1a-43b8-90c7-2e60314fc0b8', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '3287d788-3a4d-4d37-a62e-5d23877fa7dd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('18968484-35e2-49f7-9cf9-d0e2eeaf4890', 'A4988', 'Driver motor paso a paso', NULL, 20.0000, true, '35a2f6bc-ae1a-43b8-90c7-2e60314fc0b8', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '02a48f2c-9b85-4b41-a055-672cb06fb4cd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('4bd66fbd-1b02-4baa-9141-8277a543a62c', 'LM2596', 'Modulo Step Down regulable', NULL, 20.0000, true, '317ea24b-860f-4c11-ba6f-5dc973597836', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '563f9000-53a0-49b8-8412-76e56c63ffbd', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('4dfdbb6f-3b10-4a3e-92e0-fa08b67baf24', 'TP4056', 'Modulo cargador de litio', NULL, 15.0000, true, '317ea24b-860f-4c11-ba6f-5dc973597836', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '5a37224e-efdd-4b8c-89a5-9fdfd12aaeda', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('89e85e6a-9b80-44b9-b534-f1efc5cc8832', 'MODULO RELE 1CH', 'Modulo rele 1 canal 5V', NULL, 15.0000, true, 'fe000e7d-168b-4b75-bec2-69cb5fcc72f6', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '2d33feab-966e-431e-8503-9270a2cccfff', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('99767e2f-9a9b-46d1-8158-0be070ec729f', 'MODULO RELE 4CH', 'Modulo rele 4 canales 5V', NULL, 40.0000, true, 'fe000e7d-168b-4b75-bec2-69cb5fcc72f6', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '23c8073f-6738-4b46-8874-e990d6fdf65b', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('c9af381d-9291-400a-8053-cef02a0bb5bb', 'SERVOMOTOR SG90', 'Servomotor SG90 1.5kg', NULL, 25.0000, true, 'fe000e7d-168b-4b75-bec2-69cb5fcc72f6', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', 'e6c67c7d-f2fd-4bac-acc0-c14aa8d0e3d2', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('3e0cc82c-ab54-456d-abad-9138f2e29594', 'BUZZER PASIVO', 'Buzzer pasivo', NULL, 5.0000, true, 'ef120b15-ee1c-4558-a6f1-b8787784f9ef', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '2d33feab-966e-431e-8503-9270a2cccfff', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;
INSERT INTO electronica_az.producto (id_producto, codigo, nombre, descripcion, precio_venta, activo, id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo) VALUES ('4d38dfc0-bd6b-4506-b4ea-22d43c67ac53', 'TRIMPOT 10K', 'Trimpot 10K', NULL, 3.0000, true, 'ef120b15-ee1c-4558-a6f1-b8787784f9ef', '643fe0a8-d95d-42eb-bb98-c82f738d6c84', '2d33feab-966e-431e-8503-9270a2cccfff', NULL, NULL) ON CONFLICT (codigo) DO NOTHING;

-- proveedor (5)
INSERT INTO electronica_az.proveedor (id_proveedor, razon_social, documento, telefono, correo, direccion, activo) VALUES ('e1c7d307-2b41-4d9b-906f-3a648fcde84b', 'Electronica Bolivia S.R.L.', 'PROV-1001', '71000001', 'proveedor1@tienda.local', 'Av. Comercial 101, Santa Cruz', true) ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.proveedor (id_proveedor, razon_social, documento, telefono, correo, direccion, activo) VALUES ('ddfddf0b-905c-4157-8600-63a59d2e8c97', 'Importadora Andina S.R.L.', 'PROV-1002', '71000002', 'proveedor2@tienda.local', 'Av. Comercial 102, Santa Cruz', true) ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.proveedor (id_proveedor, razon_social, documento, telefono, correo, direccion, activo) VALUES ('55710cf5-b94e-496d-b399-5bf372de0b4c', 'Componentes del Oriente', 'PROV-1003', '71000003', 'proveedor3@tienda.local', 'Av. Comercial 103, Santa Cruz', true) ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.proveedor (id_proveedor, razon_social, documento, telefono, correo, direccion, activo) VALUES ('7eb61d97-61e9-4072-9b81-581286add6f2', 'TecnoPartes Bolivia', 'PROV-1004', '71000004', 'proveedor4@tienda.local', 'Av. Comercial 104, Santa Cruz', true) ON CONFLICT DO NOTHING;
INSERT INTO electronica_az.proveedor (id_proveedor, razon_social, documento, telefono, correo, direccion, activo) VALUES ('ee5e0645-113d-4345-85bd-c5544b8beb39', 'Distribuidora Electron', 'PROV-1005', '71000005', 'proveedor5@tienda.local', 'Av. Comercial 105, Santa Cruz', true) ON CONFLICT DO NOTHING;

-- compatibilidad (0)


-- Existencias en 0 para todos los productos
INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
SELECT p.id_producto, 0, 3, 0
FROM electronica_az.producto p
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.existencia e WHERE e.id_producto = p.id_producto
);

-- Cliente walk-in
INSERT INTO electronica_az.cliente (nombre, documento, telefono, correo)
SELECT 'Cliente Mostrador', 'N/A', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.cliente WHERE nombre = 'Cliente Mostrador' AND documento = 'N/A'
);

-- Vendedor demo (scrypt, compatible con login API)
INSERT INTO electronica_az.usuario (nombre_usuario, correo, hash_contrasena)
SELECT 'vendedor.demo', 'vendedor@example.test', 'scrypt$a592f01088126bc88d01650d352b9d4b$60fa55844d6bd53b1f7bb1d282a52481db533d94dba285c3fa9f0aceabc35377a907fff0211f26ff37023e099c59f89e9dce738ac92bd3cb8e6b1b921a15acfe'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.usuario WHERE lower(correo) = lower('vendedor@example.test')
);

INSERT INTO electronica_az.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM electronica_az.usuario u
CROSS JOIN electronica_az.rol r
WHERE lower(u.correo) = lower('vendedor@example.test')
  AND r.nombre = 'VENDEDOR'
  AND NOT EXISTS (
    SELECT 1 FROM electronica_az.usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
  );

COMMIT;

-- =============================================================================
-- Apertura de stock (ENTRADA) — costo = PRECIO × 0.65
-- Idempotente por producto (motivo ILIKE 'Apertura stock demo%')
-- =============================================================================
-- 7805 qty=22

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = '7805';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: 7805';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: 7805';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 22, 2.925,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 22,
      costo_promedio = CASE
        WHEN v_stock + 22 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (22 * 2.925))
             / (v_stock + 22)
      END
  WHERE id_producto = v_prod;
END $$;

-- ARDUINO MEGA 2560 qty=83

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'ARDUINO MEGA 2560';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: ARDUINO MEGA 2560';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: ARDUINO MEGA 2560';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 83, 61.75,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 83,
      costo_promedio = CASE
        WHEN v_stock + 83 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (83 * 61.75))
             / (v_stock + 83)
      END
  WHERE id_producto = v_prod;
END $$;

-- ARDUINO UNO R3 qty=16

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'ARDUINO UNO R3';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: ARDUINO UNO R3';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: ARDUINO UNO R3';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 16, 35.75,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 16,
      costo_promedio = CASE
        WHEN v_stock + 16 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (16 * 35.75))
             / (v_stock + 16)
      END
  WHERE id_producto = v_prod;
END $$;

-- ATMEGA328P qty=35

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'ATMEGA328P';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: ATMEGA328P';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: ATMEGA328P';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 35, 26,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 35,
      costo_promedio = CASE
        WHEN v_stock + 35 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (35 * 26))
             / (v_stock + 35)
      END
  WHERE id_producto = v_prod;
END $$;

-- BC557 qty=45

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'BC557';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: BC557';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: BC557';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 45, 0.65,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 45,
      costo_promedio = CASE
        WHEN v_stock + 45 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (45 * 0.65))
             / (v_stock + 45)
      END
  WHERE id_producto = v_prod;
END $$;

-- BUZZER PASIVO qty=42

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'BUZZER PASIVO';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: BUZZER PASIVO';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: BUZZER PASIVO';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 42, 3.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 42,
      costo_promedio = CASE
        WHEN v_stock + 42 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (42 * 3.25))
             / (v_stock + 42)
      END
  WHERE id_producto = v_prod;
END $$;

-- CMOS 4017 qty=33

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'CMOS 4017';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: CMOS 4017';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: CMOS 4017';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 33, 3.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 33,
      costo_promedio = CASE
        WHEN v_stock + 33 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (33 * 3.25))
             / (v_stock + 33)
      END
  WHERE id_producto = v_prod;
END $$;

-- DHT11 qty=35

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'DHT11';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: DHT11';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: DHT11';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 35, 14.3,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 35,
      costo_promedio = CASE
        WHEN v_stock + 35 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (35 * 14.3))
             / (v_stock + 35)
      END
  WHERE id_producto = v_prod;
END $$;

-- DHT22 qty=34

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'DHT22';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: DHT22';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: DHT22';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 34, 29.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 34,
      costo_promedio = CASE
        WHEN v_stock + 34 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (34 * 29.25))
             / (v_stock + 34)
      END
  WHERE id_producto = v_prod;
END $$;

-- ESP32 DEVKIT qty=34

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'ESP32 DEVKIT';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: ESP32 DEVKIT';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: ESP32 DEVKIT';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 34, 45.5,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 34,
      costo_promedio = CASE
        WHEN v_stock + 34 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (34 * 45.5))
             / (v_stock + 34)
      END
  WHERE id_producto = v_prod;
END $$;

-- ESP8266 NODEMCU qty=30

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'ESP8266 NODEMCU';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: ESP8266 NODEMCU';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: ESP8266 NODEMCU';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 30, 29.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 30,
      costo_promedio = CASE
        WHEN v_stock + 30 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (30 * 29.25))
             / (v_stock + 30)
      END
  WHERE id_producto = v_prod;
END $$;

-- IRF540N qty=122

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'IRF540N';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: IRF540N';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: IRF540N';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 122, 8.125,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 122,
      costo_promedio = CASE
        WHEN v_stock + 122 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (122 * 8.125))
             / (v_stock + 122)
      END
  WHERE id_producto = v_prod;
END $$;

-- IRFZ44N qty=60

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'IRFZ44N';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: IRFZ44N';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: IRFZ44N';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 60, 3.9,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 60,
      costo_promedio = CASE
        WHEN v_stock + 60 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (60 * 3.9))
             / (v_stock + 60)
      END
  WHERE id_producto = v_prod;
END $$;

-- L293D qty=46

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'L293D';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: L293D';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: L293D';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 46, 9.75,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 46,
      costo_promedio = CASE
        WHEN v_stock + 46 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (46 * 9.75))
             / (v_stock + 46)
      END
  WHERE id_producto = v_prod;
END $$;

-- L298N qty=50

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'L298N';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: L298N';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: L298N';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 50, 16.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 50,
      costo_promedio = CASE
        WHEN v_stock + 50 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (50 * 16.25))
             / (v_stock + 50)
      END
  WHERE id_producto = v_prod;
END $$;

-- LDR qty=108

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'LDR';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: LDR';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: LDR';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 108, 1.95,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 108,
      costo_promedio = CASE
        WHEN v_stock + 108 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (108 * 1.95))
             / (v_stock + 108)
      END
  WHERE id_producto = v_prod;
END $$;

-- LM2596 qty=22

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'LM2596';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: LM2596';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: LM2596';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 22, 13,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 22,
      costo_promedio = CASE
        WHEN v_stock + 22 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (22 * 13))
             / (v_stock + 22)
      END
  WHERE id_producto = v_prod;
END $$;

-- LM317 qty=24

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'LM317';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: LM317';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: LM317';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 24, 3.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 24,
      costo_promedio = CASE
        WHEN v_stock + 24 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (24 * 3.25))
             / (v_stock + 24)
      END
  WHERE id_producto = v_prod;
END $$;

-- MODULO RELE 1CH qty=51

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'MODULO RELE 1CH';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: MODULO RELE 1CH';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: MODULO RELE 1CH';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 51, 9.75,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 51,
      costo_promedio = CASE
        WHEN v_stock + 51 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (51 * 9.75))
             / (v_stock + 51)
      END
  WHERE id_producto = v_prod;
END $$;

-- MPU6050 qty=16

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'MPU6050';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: MPU6050';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: MPU6050';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 16, 19.5,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 16,
      costo_promedio = CASE
        WHEN v_stock + 16 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (16 * 19.5))
             / (v_stock + 16)
      END
  WHERE id_producto = v_prod;
END $$;

-- NRF24L01 qty=71

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'NRF24L01';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: NRF24L01';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: NRF24L01';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 71, 22.75,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 71,
      costo_promedio = CASE
        WHEN v_stock + 71 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (71 * 22.75))
             / (v_stock + 71)
      END
  WHERE id_producto = v_prod;
END $$;

-- PIC16F877A qty=30

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'PIC16F877A';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: PIC16F877A';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: PIC16F877A';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 30, 32.5,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 30,
      costo_promedio = CASE
        WHEN v_stock + 30 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (30 * 32.5))
             / (v_stock + 30)
      END
  WHERE id_producto = v_prod;
END $$;

-- SERVOMOTOR SG90 qty=29

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'SERVOMOTOR SG90';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: SERVOMOTOR SG90';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: SERVOMOTOR SG90';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 29, 16.25,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 29,
      costo_promedio = CASE
        WHEN v_stock + 29 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (29 * 16.25))
             / (v_stock + 29)
      END
  WHERE id_producto = v_prod;
END $$;

-- TIP41C qty=26

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'TIP41C';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: TIP41C';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: TIP41C';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 26, 2.6,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 26,
      costo_promedio = CASE
        WHEN v_stock + 26 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (26 * 2.6))
             / (v_stock + 26)
      END
  WHERE id_producto = v_prod;
END $$;

-- TP4056 qty=33

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'TP4056';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: TP4056';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: TP4056';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 33, 9.75,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 33,
      costo_promedio = CASE
        WHEN v_stock + 33 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (33 * 9.75))
             / (v_stock + 33)
      END
  WHERE id_producto = v_prod;
END $$;

-- TRIMPOT 10K qty=79

DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = 'TRIMPOT 10K';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: TRIMPOT 10K';
    RETURN;
  END IF;
  SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('admin@example.test') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('admin@example.test') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: TRIMPOT 10K';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', 79, 1.95,
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + 79,
      costo_promedio = CASE
        WHEN v_stock + 79 = 0 THEN 0
        ELSE ((v_stock * v_costo) + (79 * 1.95))
             / (v_stock + 79)
      END
  WHERE id_producto = v_prod;
END $$;

-- Resumen
SELECT
  (SELECT count(*) FROM electronica_az.producto) AS productos,
  (SELECT count(*) FROM electronica_az.proveedor) AS proveedores,
  (SELECT coalesce(sum(stock_actual),0) FROM electronica_az.existencia) AS stock_total_unidades,
  (SELECT count(*) FROM electronica_az.movimiento_inventario WHERE motivo ILIKE 'Apertura stock demo%') AS movs_apertura;
