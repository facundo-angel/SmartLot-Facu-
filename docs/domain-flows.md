# Flujos de dominio — SmartLot

Recorridos de negocio por rol, con las piezas del frontend que intervienen. Es una vista de comportamiento: los contratos exactos de cada endpoint viven en `src/servicies/API_*.js` y en el backend `SmartLot_API`. Última revisión: 2026-10-09.

## Actores

| Actor | Rol técnico | Objetivo principal |
|---|---|---|
| Empleado | `empleado` (2) | Reservar lugares, gestionar vehículos, ver historial. |
| Garagista | `garagista` (3) | Operar el control de acceso por QR e ingresos/egresos. |
| Admin de empresa/sede | `admin` (1) | Administrar personal, garages contratados, sedes, pagos y reportes. |
| Dueño de garage | `dueño_garage` (5) | Publicar garages, gestionar tratos con empresas y cuentas por cobrar. |
| Superadmin | `superadmin` (4) | Administrar empresas, usuarios, conflictos, caché y herramientas internas. |

## 1. Sesión y acceso

1. **Ingreso**: `vistasLanding/Auth.jsx` envía credenciales; el backend setea la cookie de sesión. Rutas afines: `/register` (`pages/Register.jsx`), `/recuperar-clave` (`pages/ForgotPassword.jsx`), `/auth/callback` (`vistasLanding/AuthCallback.jsx`).
2. **Bootstrap**: al cargar, `AuthProvider` consulta `GET /api/usuario/me` y guarda `usuario`. Mientras carga, `ProtectedRoute` muestra el spinner global.
3. **Expiración en caliente**: ante un 401, `apiClient` renueva (`POST /api/usuario/refresh`) y reintenta la request original. Si el refresh falla, dispara `smartlot:session-expired` y redirige a `/login?redirect=<ruta>`.
4. **Logout**: `/logout` (`pages/Logout.jsx`) llama `POST /api/usuario/logout`; la caché se vacía.
5. **Destino por rol**: `getUserHomeRoute` en `src/helpers/roles.js` decide el home tras login o si se intenta una ruta sin permiso.
6. **Impersonación (superadmin)**: `helpers/superadminSession.js` conserva el usuario impersonado y el backup del superadmin en cookies propias para sobrevivir recargas. Detalle técnico en `docs/architecture.md`.

## 2. Reserva (empleado)

Vistas: `vistasEmpleados/nueva_reserva.jsx`, `empleados_dashboard.jsx`, `historial_reserva.jsx`, `agregar_vehiculo.jsx`. Servicio: `src/servicies/API_Reserva.js`.

1. **Cotización**: el formulario (`componentesEmpleado/form_reserva.jsx`) cotiza disponibilidad y política; muestra vigentes/restantes según el límite de reservas activas del empleado.
2. **Creación**: hay dos caminos según el tipo de reserva (corporativa o con retención de pago). Si el empleado alcanzó su máximo, el backend responde `409 RESERVATION_LIMIT_REACHED` y el front lo traduce con `reservationPolicy` + `erroresMensajes`.
3. **Pago (Mercado Pago)**: cuando hay retención, el flujo deriva al checkout. Al volver del checkout, la vista reutiliza retenciones vigentes en lugar de duplicar reservas.
4. **Retorno de pago**: `/payment/success|failure|pending` (`pages/PaymentStatus.jsx`) envía `payment_id`, `external_reference` y `preference_id` como pistas de correlación. El backend autoriza primero la reserva o preferencia local con la sesión validada y recién después consulta Mercado Pago; los parámetros de la URL no conceden acceso.
5. **Vehículos**: `agregar_vehiculo.jsx` + `API_Vehiculo.js`; marcas/modelos vía `API_Marca.js` / `API_Modelo.js`. Patentes validadas con `helpers/patente.js`.
6. **Historial**: `historial_reserva.jsx` lista reservas pasadas; fechas normalizadas con `helpers/reservaDateTime.js` (las reservas usan hora argentina).

**Reglas de negocio del límite**: documentadas en `docs/reservation-limit.md` (NULL = sin máximo, 0 = bloqueo, conteo de reservas vigentes, endpoint `PATCH /api/usuario/:id/limite-reservas`, concurrencia). Ese documento es la referencia; no duplicar aquí.

### Estados de una reserva (modelo observable)

| Estado | Señales usadas por el frontend |
|---|---|
| Pendiente de pago | Retención vigente (`retencion_pago_hasta`) |
| Confirmada | Pago confirmado, sin ingreso aún |
| En uso | `entro = true`, `salio = false` |
| Finalizada | `salio = true` |
| Cancelada / vencida / borrada | Excluida de conteos y disponibilidad |

## 3. Control de acceso (garagista)

Vistas: `vistasGaragista/garagista_dashboard.jsx` (rutas `/garagista_dashboard` y `/control-acceso`); soporte `LectorQrReserva.jsx`, helpers `qrReserva.js` y `controlAcceso.js`.

1. El garagista escanea el QR de la reserva (`html5-qrcode`).
2. El QR se valida contra la API (`API_Reserva.js` normaliza payload y errores de QR); con reserva válida se registra ingreso y luego egreso.
3. El dashboard muestra reservas próximas, autos dentro y últimos movimientos; los filtros de búsqueda y los estados vacíos siguen `docs/estados-vacios.md`.
4. Un admin (`roles [1,3]` en `/control-acceso`) también puede operar esta vista.

## 4. Admin de empresa/sede

Área `vistasAdmin/`, servicios `API_Usuario.js`, `API_Garage.js`, `API_Sede.js`, `API_Empresa.js`, `API_TratoEmpresaGarage.js`, `API_Pagos.js`, `API_Conflicto.js`.

- **Personal**: alta/edición/baja de empleados y garajistas (`gestion_de_empleados.jsx`, `agregar_empleado.jsx`), incluida la configuración del límite de reservas activas.
- **Garages**: búsqueda y contratación de garages de terceros, garage propio y zonas (`gestion_garages.jsx`, `agregar_garage_propio.jsx`, `agregar_zona.jsx`, `editar_zona.jsx`). Los tratos con garages se gestionan desde `componentesCompartidos/GestionTratosGarage.jsx`.
- **Sedes** (solo admin de empresa, `requireEmpresaAdmin`): `gestion_sedes.jsx`, `agregar_sede.jsx`, `agregar_admin_sede.jsx`. Un admin con sede no administra sedes.
- **Operación**: panel de control (reservas + conflictos + papelera), reportes y análisis, pagos (`admin_panel_de_control.jsx`, `admin_reportes_analisis.jsx`, `admin_pagos.jsx`). Las consultas generales de pagos quedan acotadas a la empresa y, si corresponde, a la sede autenticada.
- **Exportaciones**: Excel/PDF desde `src/util/`.

## 5. Dueño de garage

Área `vistasDueñoGarage/`.

- **Alta y edición de garages**: `crear_garage_dueño.jsx`, `editar_garage_dueño.jsx`, dashboard con tabs Activos/Borrador.
- **Tratos con empresas**: `tratos_empresa_garage.jsx` (solicitudes pendientes, cambios, tratos vigentes) sobre `API_SolicitudEmpresaGarage.js` / `API_TratoEmpresaGarage.js`.
- **Cuentas por cobrar**: `cuentas_por_cobrar.jsx` con filtros y exportación (`util/exportar_cuentas_corrientes.js`, `util/exportar_deudas_garage.js`).

## 6. Superadmin

Área `vistasSuperadmin/`, la más amplia:

- **Usuarios y empresas**: `gestion_usuarios.jsx`, `agregar_usuario.jsx`, `gestion_empresas.jsx` (también sirve `/superadmin/gestion_sedes`), `agregar_empresa.jsx`, `agregar_sede.jsx`; alta de superadmins.
- **Garages**: `superadmin_gestion_garages.jsx` (vista global, incluye garages sin empresa).
- **Conflictos**: `superadmin_conflictos.jsx` con papelera y restauración.
- **Reservas globales**: `superadmin_reservas.jsx`.
- **Pagos de prueba**: `superadmin_pagos_test.jsx` (Mercado Pago con `VITE_MP_PUBLIC_KEY`); el listado global y el diagnóstico de webhooks son capacidades exclusivas del superadmin.
- **Caché**: `superadmin_cache.jsx` sobre `getCacheStats`/`getCacheEntries`; permite inspeccionar y repoblar la caché en memoria.
- **Plantillas de email**: `superadmin_email_templates.jsx`; los enlaces usan `VITE_FRONTEND_URL`.
- **Solicitudes de registro**: `ConfirmarSolicitud.jsx` + `API_SolicitudRegistro.js`.
- **Impersonación**: permite operar como otro usuario; el estado se guarda en cookies propias (ver `helpers/superadminSession.js`).

## 7. Transversales

- **Notificaciones**: campana compartida en `componentesCompartidos/CampanaNotificaciones.jsx` + `hooks/useNotificaciones.js` + `API_Notificacion.js`; se reutiliza en los headers de admin, superadmin, empleado y dueño de garage (los garagistas no la ven). El dropdown invalida el prefijo `notificaciones:` al marcarse como leídas.
- **Auditoría**: `componentesCompartidos/AuditoriaPanel.jsx`.
- **Estados vacíos**: toda pantalla con contenedores vacíos debe seguir la especificación `docs/estados-vacios.md` (componente `EmptyState.jsx`).
- **Errores de usuario**: mensajes accionables en español desde `helpers/erroresMensajes.js`; nunca mostrar crudos del backend.
- **Roles y permisos**: cualquier regla nueva debe apoyarse en `helpers/roles.js` (nombres canónicos) y en `ProtectedRoute`; ver el gotcha de roles mixtos en `docs/architecture.md`.

## Referencias

- `docs/architecture.md` — capas, sesión, caché, mapa de rutas.
- `docs/reservation-limit.md` — regla completa del límite de reservas.
- `docs/estados-vacios.md` — comportamiento de contenedores vacíos.
- `docs/pendientes-audit-ui.md` — inventario de las 48 vistas routeadas y auditoría UI en curso.
