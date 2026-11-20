import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const register = await readFile(new URL('./Register.jsx', import.meta.url), 'utf8');
const empresa = await readFile(new URL('../componentesLanding/auth/RegisterEmpresaForm.jsx', import.meta.url), 'utf8');
const garage = await readFile(new URL('../componentesLanding/auth/RegisterGarageForm.jsx', import.meta.url), 'utf8');
const toggle = await readFile(new URL('../componentesLanding/auth/RegisterRoleToggle.jsx', import.meta.url), 'utf8');
const panel = await readFile(new URL('../componentesLanding/auth/RegisterBrandPanel.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
const gestion = await readFile(new URL('../vistasSuperadmin/gestion_usuarios.jsx', import.meta.url), 'utf8');
const gestionData = await readFile(new URL('../hooks/useGestionUsuariosData.js', import.meta.url), 'utf8');

test('la ruta /register usa la página nueva y redirige con sesión activa', () => {
  assert.match(app, /path="\/register"[\s\S]*<Register/);
  assert.match(register, /if \(usuario\) return <Navigate to=\{getUserHomeRoute\(usuario\)\} replace/);
});

test('el toggle mitad/mitad alterna empresa y garage con roles ARIA', () => {
  assert.match(toggle, /role="tablist"/);
  assert.match(toggle, /role="tab"[\s\S]*aria-selected/);
  assert.match(toggle, /MODO_EMPRESA[\s\S]*MODO_GARAGE/);
  assert.match(toggle, /ArrowRight/);
  assert.match(register, /<RegisterRoleToggle modo=\{modo\} onChange=\{cambiarModo\}/);
});

test('el panel visual alterna Building2 y Car según el modo', () => {
  assert.match(panel, /Building2/);
  assert.match(panel, /<Car /);
  assert.match(panel, /esEmpresa \?/);
  assert.match(register, /<RegisterBrandPanel modo=\{modo\} \/>/);
});

test('empresa envía solicitud con empresa_nombre y no auto-loguea', () => {
  assert.match(empresa, /apiClient\.post\(\s*"\/api\/solicitud-registro"/);
  assert.match(empresa, /empresa_nombre/);
  assert.match(empresa, /empresa_descripcion/);
  assert.match(empresa, /setEnviado\(true\)/);
  assert.match(empresa, /Recibimos tu solicitud\./);
  assert.match(empresa, /Si corresponde procesarla, te contactaremos por correo\./);
  assert.match(empresa, /podés iniciar sesión o recuperar tu contraseña\./);
  assert.doesNotMatch(empresa, /emailEnviado|Un superadmin la validará|avisaremos a/);
  assert.doesNotMatch(empresa, /setUsuario\(/);
});

test('garage usa register-dueno-garage con auto-login y redirect por rol', () => {
  assert.match(garage, /apiClient\.post\(\s*"\/api\/usuario\/register-dueno-garage"/);
  assert.match(garage, /setUsuario\(usuario\)/);
  assert.match(garage, /navigate\(getUserHomeRoute\(usuario\), \{ replace: true \}\)/);
  assert.doesNotMatch(garage, /empresa_nombre/);
});

test('ambos formularios exigen política fuerte, confirmación y cooldown 429', () => {
  for (const source of [empresa, garage]) {
    assert.match(source, /Mínimo 2 caracteres especiales/);
    assert.match(source, /Mínimo 2 números/);
    assert.match(source, /Mínimo 2 mayúsculas/);
    assert.match(source, /Las contraseñas no coinciden/);
    assert.match(source, /retry-after/);
    assert.match(source, /_skipAuthRedirect: true/);
  }
});

test('la bandeja vive en gestión de usuarios con aprobar y rechazar', () => {
  assert.match(gestionData, /SolicitudesRegistroGetAll/);
  assert.match(gestion, /SolicitudesRegistroAprobar/);
  assert.match(gestion, /SolicitudesRegistroRechazar/);
  assert.match(gestion, /setShowSolicitudes\(true\)/);
  assert.match(gestion, /modal-solicitudes-panel/);
  assert.match(gestion, /solicitudes-count-badge/);
});

test('?modo=garage abre el registro en modo garage', () => {
  assert.match(register, /useSearchParams/);
  assert.match(register, /MODO_GARAGE/);
  assert.match(register, /get\("modo"\) === "garage"/);
});

test('el cambio de modo anima altura y respeta reduced motion', () => {
  assert.match(register, /offsetHeight/);
  assert.match(register, /prefers-reduced-motion: reduce/);
  assert.match(register, /prefers-reduced-motion: no-preference/);
});
