import type { EscuelaDemo } from '@/lib/demo/escuelasDemo';
import type { RolContacto } from '@/lib/types';

interface CampoPlantilla {
  campo: string;
  valor: (e: EscuelaDemo) => string;
}

interface SeccionPlantilla {
  seccion: string;
  critica: boolean;
  campos: CampoPlantilla[];
}

export interface FilaFichaDemo {
  id: string;
  escuela_id: string;
  seccion: string;
  grupo: string | null;
  campo: string;
  valor: string | null;
  critico: boolean;
  orden: number;
}

const esES = (e: EscuelaDemo) => e.idioma === 'ES';

const SECCIONES: SeccionPlantilla[] = [
  {
    seccion: 'Identidad institucional',
    critica: true,
    campos: [
      { campo: 'Nombre legal', valor: (e) => e.nombre },
      { campo: 'Dirección', valor: (e) => (esES(e) ? 'Av. Principal 1450' : 'Main Road 1450') },
      { campo: 'País', valor: (e) => (esES(e) ? 'Argentina' : 'Brasil') },
      { campo: 'Zona horaria', valor: (e) => (esES(e) ? 'America/Argentina/Buenos_Aires' : 'America/Sao_Paulo') },
      { campo: 'Idioma principal', valor: (e) => (esES(e) ? 'Español' : 'Inglés') },
      { campo: 'Sede principal', valor: (e) => e.sedes?.split(' y ')[0] ?? e.nombre },
    ],
  },
  { seccion: 'Contactos clave', critica: true, campos: [] },
  {
    seccion: 'Alumnos y docentes',
    critica: true,
    campos: [
      { campo: 'Cantidad de alumnos', valor: (e) => String(e.docentes * 11) },
      { campo: 'Cantidad de docentes', valor: (e) => String(e.docentes) },
      { campo: 'Grados o cursos incluidos', valor: (e) => (esES(e) ? 'Primaria y secundaria' : 'Primary and Secondary') },
      { campo: 'Docentes a invitar', valor: (e) => String(e.docentes) },
    ],
  },
  {
    seccion: 'Calendario académico',
    critica: true,
    campos: [
      { campo: 'Inicio de año lectivo', valor: () => 'Marzo' },
      { campo: 'Fin de año lectivo', valor: () => 'Diciembre' },
      { campo: 'Períodos de reporte', valor: () => '3 trimestres' },
      { campo: 'Feriados cargados', valor: () => '12 feriados' },
    ],
  },
  {
    seccion: 'Alcance del piloto',
    critica: true,
    campos: [
      { campo: 'Objetivo del piloto', valor: () => 'Adopción de observaciones durante el primer trimestre' },
      { campo: 'Materias incluidas', valor: (e) => (esES(e) ? 'Lengua, matemática y ciencias' : 'Literacy, maths and science') },
      { campo: 'Fecha de go-live', valor: () => '15 de marzo' },
      { campo: 'Responsable de éxito', valor: (e) => e.owner },
    ],
  },
  {
    seccion: 'Contexto de ventas',
    critica: false,
    campos: [
      { campo: 'Motivo de compra', valor: () => 'Observaciones de calidad para docentes' },
      { campo: 'Competidor actual', valor: () => 'Ninguno' },
      { campo: 'Presupuesto aprobado', valor: () => 'Sí' },
    ],
  },
  {
    seccion: 'Bloque comercial',
    critica: false,
    campos: [
      { campo: 'Plan contratado', valor: () => 'Anual' },
      { campo: 'Precio por alumno', valor: () => 'USD 4,50' },
      { campo: 'Fecha de firma', valor: () => 'Febrero' },
      { campo: 'Condiciones de pago', valor: () => 'Trimestral' },
    ],
  },
  {
    seccion: 'Configuración de plataforma',
    critica: false,
    campos: [
      { campo: 'Idioma de la plataforma', valor: (e) => (esES(e) ? 'Español' : 'Inglés') },
      { campo: 'Currículo base', valor: () => 'IB PYP' },
      { campo: 'Métricas activas', valor: () => 'Health completo' },
      { campo: 'Integraciones activas', valor: () => 'Google Calendar' },
    ],
  },
  {
    seccion: 'Compliance',
    critica: false,
    campos: [
      { campo: 'Acuerdo de datos firmado', valor: () => 'Sí' },
      { campo: 'DPA vigente', valor: () => 'Sí' },
      { campo: 'Responsable de datos', valor: (e) => e.contactos.find((c) => c.rol === 'decisor')?.nombre ?? e.owner },
    ],
  },
];

const GRUPOS_CONTACTO: { grupo: string; rol: RolContacto }[] = [
  { grupo: 'Decisor', rol: 'decisor' },
  { grupo: 'Champion', rol: 'champion' },
  { grupo: 'Liaison', rol: 'liaison' },
  { grupo: 'Admin', rol: 'admin' },
];

const CAMPOS_CONTACTO = [
  { campo: 'Nombre', critico: true },
  { campo: 'Cargo', critico: false },
  { campo: 'Email', critico: true },
];

export function fichaDemo(e: EscuelaDemo, escuelaId: string, nuevoId: () => string): FilaFichaDemo[] {
  const filas: FilaFichaDemo[] = [];
  let orden = 0;

  for (const seccion of SECCIONES) {
    if (seccion.seccion === 'Contactos clave') {
      for (const { grupo, rol } of GRUPOS_CONTACTO) {
        const contacto = e.contactos.find((c) => c.rol === rol);
        const valores = [contacto?.nombre ?? null, contacto?.cargo ?? null, contacto ? `${contacto.local}@${e.dominio}` : null];
        CAMPOS_CONTACTO.forEach((plantilla, indice) => {
          filas.push({
            id: nuevoId(),
            escuela_id: escuelaId,
            seccion: seccion.seccion,
            grupo,
            campo: plantilla.campo,
            valor: valores[indice],
            critico: seccion.critica && plantilla.critico,
            orden,
          });
          orden += 1;
        });
      }
      continue;
    }

    for (const campo of seccion.campos) {
      filas.push({
        id: nuevoId(),
        escuela_id: escuelaId,
        seccion: seccion.seccion,
        grupo: null,
        campo: campo.campo,
        valor: e.vacios.includes(campo.campo) ? null : campo.valor(e),
        critico: seccion.critica,
        orden,
      });
      orden += 1;
    }
  }

  return filas;
}
