# Migraciones

1. Crear una base PostgreSQL de prueba vacía.
2. Ejecutar `001_schema_reference.sql` una sola vez.
3. Revisar y ejecutar `002_phase0_extensions.sql` una sola vez.

No ejecutar migraciones al iniciar la API, ni contra Supabase productivo, ni ejecutar `docs/datos_Electronica_CentralAZ.sql` como mecanismo de apertura. La ejecución y restauración se validarán antes del piloto.
