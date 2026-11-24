# Feature: Reportes por voz con IA (GLM 5.3 Flash vía nan.builders)

El usuario habla, el navegador transcribe, el backend interpreta con un LLM
OpenAI-compatible y consume los endpoints /api/reportes/* existentes.
Resultado: dashboard en pantalla + respuesta hablada + exportación PDF/Excel/CSV.

## Specs

S1: "voz decir generame reportes de ventas de esta semana / ano / mes y cualquier
reporte que tengamos y este consuma el endpoint de los reportes" — micrófono en
la página /reportes: Web Speech API del navegador transcribe y envía el TEXTO a
POST /api/reportes/interpretar.

S2 (usuario): intérprete = "IA (LLM)" con "nan.builders ... GLM 5.3 Flash".
Env vars: NAN_BUILDERS_BASE_URL (default https://api.nan.builders/v1),
NAN_BUILDERS_API_KEY, NAN_BUILDERS_MODEL (default glm5.3-flash). Llamada
chat/completions, temperature 0, max_tokens 300, output SOLO JSON
{tipo, desde, hasta, fechaCorte, titulo} validado con Zod; fechas ISO
YYYY-MM-DD en America/La_Paz calculadas por el LLM (se le pasa la fecha de hoy
en el system prompt); desde<=hasta y rango máximo 2 años (clamp/cut).

S3 (usuario): resultado "Ambos (completo)" — el frontend recibe el JSON, completa
el formulario (tipo/fechas), genera el dashboard que ya existe, habla el resumen
por speechSynthesis (es), y los botones PDF/Excel/CSV quedan como están.

S4: endpoint con authenticate + requirePermissions('REPORTES_CONSULTAR') +
validateQuery/zod; el LLM NO toca la BD: solo mapea texto→parámetros.

S5: errores del backend: 503 AI_NOT_CONFIGURED (sin key), 502 AI_INVALID_RESPONSE
(LLM respondió JSON inválido), 503 AI_UNAVAILABLE (fetch falló/timeout 15s);
401/403 auth; 400 VALIDATION_ERROR entrada. Frontend: navegador sin
SpeechRecognition → mic oculto y formulario normal (degradación).

S6: frases cubiertas (mínimo): " esta semana" (lunes→hoy), "este mes", "este año",
"hoy", "ayer", "últimos 30 días", fechas explícitas; tipos: ventas, ganancias,
inventario (con fecha de corte), rotación/demanda.

## Tasks

T1 [S2,S4] backend env + errorCodes + DTO + ruta POST /api/reportes/interpretar +
service voiceInterpreterService (fetch→LLM→Zod) + openapi — commit
T2 [S2,S5,R] tests backend: unit (mock fetch: parse ok, JSON inválido, API caída,
timeout) + integration (401/403/400/happy) — commit
T3 [S1,S5] frontend: interpretarReporteVoz() en reporteService.ts + hook de mic
(webkitSpeechRecognition es-419, estado escuchando/error) — commit
T4 [S1,S3,S5] frontend: botón mic en Reportes + dispara generar() + TTS resumen +
degradación sin SpeechRecognition + README — commit
T5 [S2] usuario agrega NAN_BUILDERS_API_KEY a .env local y a Dokploy; smoke E2E
con voz real; verificar deploy — bloqueado hasta T5 keys [DONE: key puesta,
bugfix max_tokens f01dd09, e2e validado por el usuario]
T6 [S7] contexto conversacional sin estado: el frontend reenvía la última
interpretación; el LLM resuelve referencias relativas (el mes anterior, esa
misma semana) contra ese contexto — commit
T7 [S8] voz natural: selección de la mejor voz es disponible (Google español /
Natural > es-*), cadencia con puntuación, montos en palabras + "bolivianos";
el frontend pasa contexto — commit

## Log

L3 (2026-11-23, pedido del usuario): "Si quiero que sea interactivo como
tendría que ser? Y también cambiar el tipo de voz que sea más natural".
Decisión: contexto sin estado (cliente reenvía contexto; el server no guarda
memoria), follow-up permite cambiar de tipo conservando el periodo; voz local
mejorada (no se agregan proveedores TTS nuevos).

L1 (petición original): "oki ahora lko que tenemos que haces es agregar la
generacion de reportes por ai con vos, que nos ayude en la generacion de
reportes la idea es tener la voz decir  generame reportes de ventas de esta
semana / ano / mes y cualquier reporte que tengamos y este consuma el endpoint
de los reportes algo asi voz-> recopila la instruccion_> genera reporte con el
endpoint /reportes me dejo entender?"
L2 (decisión usuario, 2026-11-22): captura=Navegador(Web Speech); intérprete=
IA(LLM) proveedor nan.builders modelo GLM 5.3 Flash; resultado=Ambos(dashboard+
voz+export); docs nan: base https://api.nan.builders/v1, OpenAI-compatible,
id modelo glm5.3-flash.
