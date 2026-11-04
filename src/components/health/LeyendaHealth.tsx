import { TONO_HEALTH } from '@/components/ui/HealthGauge';

export function LeyendaHealth() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {(
        [
          ['ok', 'Verde ≥ 70'],
          ['warn', 'Amarillo 50–69'],
          ['risk', 'Rojo < 50'],
        ] as const
      ).map(([nivel, texto]) => (
        <span key={nivel} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${TONO_HEALTH[nivel].celda}`} />
          {texto}
        </span>
      ))}
    </div>
  );
}
