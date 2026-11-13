import { Button } from '../../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { isMultiThreadingAvailable } from '../../services/engine';
import {
  getAverageSearchMs,
  useEngineStatsStore,
} from '../../stores/engineStatsStore';
import {
  ENGINE_LIMITS,
  getMaxThreads,
  useSettingsStore,
} from '../../stores/settingsStore';
import { useAnalysisTranslation } from '../../translations/hooks';

const DEFAULT_ENGINE_NAME = 'Stockfish';
const MILLISECONDS_PER_SECOND = 1000;
const FIELD_IDS = {
  depth: 'engine-depth',
  threads: 'engine-threads',
  hash: 'engine-hash',
  multiPv: 'engine-multi-pv',
} as const;

interface EngineSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface SettingFieldProps {
  fieldId: string;
  label: string;
  value: string;
  hint: string;
  children: React.ReactNode;
}

export const EngineSettingsDialog: React.FC<EngineSettingsDialogProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const { t } = useAnalysisTranslation();
  const { depth, threads, hashMb, multiPv } = useSettingsStore(
    (state) => state.engine
  );
  const updateEngine = useSettingsStore((state) => state.updateEngine);
  const isMultiThreaded = isMultiThreadingAvailable();
  const maxThreads = getMaxThreads();
  const engineName = useEngineStatsStore(
    (state) => state.engineName ?? DEFAULT_ENGINE_NAME
  );
  const averageMs = useEngineStatsStore((state) =>
    getAverageSearchMs(state.timings, { isMultiThreaded, depth, multiPv })
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('EngineSettings')}</DialogTitle>
          <DialogDescription>
            {t('EngineSettingsDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-5'>
          <SettingField
            fieldId={FIELD_IDS.depth}
            label={t('Depth')}
            value={String(depth)}
            hint={t('DepthHint')}
          >
            <Slider
              id={FIELD_IDS.depth}
              aria-label={t('Depth')}
              value={depth}
              min={ENGINE_LIMITS.minDepth}
              max={ENGINE_LIMITS.maxDepth}
              onValueChange={(value) => updateEngine({ depth: value })}
            />
          </SettingField>
          <SettingField
            fieldId={FIELD_IDS.threads}
            label={t('Threads')}
            value={String(isMultiThreaded ? threads : 1)}
            hint={
              isMultiThreaded
                ? t('ThreadsHint', { count: maxThreads })
                : t('ThreadsUnavailableHint')
            }
          >
            <Slider
              id={FIELD_IDS.threads}
              aria-label={t('Threads')}
              value={isMultiThreaded ? Math.min(threads, maxThreads) : 1}
              min={1}
              max={Math.max(maxThreads, 2)}
              disabled={!isMultiThreaded || maxThreads === 1}
              onValueChange={(value) => updateEngine({ threads: value })}
            />
          </SettingField>
          <SettingField
            fieldId={FIELD_IDS.hash}
            label={t('HashSize')}
            value={t('Megabytes', { value: hashMb })}
            hint={t('HashSizeHint')}
          >
            <Select
              id={FIELD_IDS.hash}
              aria-label={t('HashSize')}
              value={String(hashMb)}
              options={ENGINE_LIMITS.hashOptionsMb.map((size) => ({
                value: String(size),
                label: t('Megabytes', { value: size }),
              }))}
              onValueChange={(value) => updateEngine({ hashMb: Number(value) })}
            />
          </SettingField>
          <SettingField
            fieldId={FIELD_IDS.multiPv}
            label={t('MultiPv')}
            value={String(multiPv)}
            hint={t('MultiPvHint')}
          >
            <Slider
              id={FIELD_IDS.multiPv}
              aria-label={t('MultiPv')}
              value={multiPv}
              min={ENGINE_LIMITS.minMultiPv}
              max={ENGINE_LIMITS.maxMultiPv}
              onValueChange={(value) => updateEngine({ multiPv: value })}
            />
          </SettingField>
          <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-dashed px-3 py-2.5 text-xs'>
            <dt className='text-muted-foreground'>{t('EngineInUse')}</dt>
            <dd>{engineName}</dd>
            <dt className='text-muted-foreground'>{t('SpeedOnDevice')}</dt>
            <dd>
              {averageMs === undefined
                ? t('SpeedNotMeasured')
                : t('SecondsPerPosition', {
                    seconds: formatSeconds(averageMs),
                  })}
            </dd>
            <dd className='col-span-2 text-muted-foreground'>
              {t('SpeedHint')}
            </dd>
          </dl>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('Done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SettingField: React.FC<SettingFieldProps> = ({
  fieldId,
  label,
  value,
  hint,
  children,
}) => (
  <div className='flex flex-col gap-2'>
    <div className='flex items-baseline justify-between'>
      <Label htmlFor={fieldId}>{label}</Label>
      <span className='font-mono text-sm tabular-nums'>{value}</span>
    </div>
    {children}
    <p className='text-xs text-muted-foreground'>{hint}</p>
  </div>
);

function formatSeconds(milliseconds: number): string {
  const seconds = milliseconds / MILLISECONDS_PER_SECOND;
  return seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1);
}
