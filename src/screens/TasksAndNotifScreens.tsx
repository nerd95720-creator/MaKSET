import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, FlaskConical, Pill } from 'lucide-react';
import { useCareSync } from '../store/useCareSyncStore';
import {
  Card,
  FieldLabel,
  InputField,
  ListRowCard,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  SingleChoiceChips,
} from '../components/UiPrimitives';

export const TasksScreen: React.FC = () => {
  const { state, openTask } = useCareSync();
  const r = state.role;

  return (
    <div>
      <ScreenHeader
        title="Tasks"
        subtitle={
          r === 'lab'
            ? 'Lab investigations waiting'
            : r === 'pharm'
              ? 'Prescriptions to dispense'
              : 'Work inbox'
        }
      />
      <div className="p-3.5">
        {r !== 'pharm' && (
          <div>
            <SectionTitle>Laboratory queue ({state.lab.length})</SectionTitle>
            {state.lab.length ? (
              state.lab.map((task, idx) => (
                <ListRowCard key={task.id} blink onClick={() => openTask('lab', idx)}>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{task.p}</div>
                      <div className="truncate text-xs" style={{ color: 'var(--mu)' }}>
                        {task.t}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
                    >
                      New
                    </span>
                  </div>
                </ListRowCard>
              ))
            ) : (
              <Card>
                <div className="text-sm" style={{ color: 'var(--mu)' }}>
                  Nothing waiting.
                </div>
              </Card>
            )}
          </div>
        )}

        {r !== 'lab' && (
          <div className={r !== 'pharm' ? 'mt-4' : ''}>
            <SectionTitle>Pharmacy queue ({state.ph.length})</SectionTitle>
            {state.ph.length ? (
              state.ph.map((task, idx) => (
                <ListRowCard key={task.id} blink onClick={() => openTask('ph', idx)}>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{task.p}</div>
                      <div className="truncate text-xs" style={{ color: 'var(--mu)' }}>
                        {task.t}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
                    >
                      New
                    </span>
                  </div>
                </ListRowCard>
              ))
            ) : (
              <Card>
                <div className="text-sm" style={{ color: 'var(--mu)' }}>
                  Nothing waiting.
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskDetailScreen: React.FC = () => {
  const { state, completeTask, toast } = useCareSync();
  const isLab = state.taskKind === 'lab';
  const task = (isLab ? state.lab : state.ph)[state.taskIndex];
  const items = task ? task.items || task.t.split(', ') : [];

  const [results, setResults] = useState<string[]>([]);
  const [comments, setComments] = useState<string[]>([]);

  useEffect(() => {
    setResults(items.map(() => ''));
    setComments(items.map(() => ''));
  }, [task?.id]);

  if (!task) {
    return (
      <div>
        <ScreenHeader title="Task completed" showBack />
        <div className="p-3.5">
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              This item has already been processed.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    const out: string[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const choice = results[i] || '';
      const val = (comments[i] || '').trim();
      if (!choice && !(isLab && val)) {
        toast(isLab ? 'Enter a result for every test' : 'Set a status for every drug');
        return;
      }
      if (isLab) {
        out.push(`${items[i]}: ${choice || 'Recorded'}${val ? ` (${val})` : ''}`);
      } else {
        out.push(`${items[i]}: ${choice}`);
      }
    }
    completeTask(out);
  };

  return (
    <div>
      <ScreenHeader title={isLab ? 'Enter results' : 'Dispense medicines'} subtitle={task.p} showBack />
      <div className="p-3.5">
        {items.map((item, j) => (
          <Card key={`${item}-${j}`}>
            <div className="mb-1 text-sm font-bold">{item}</div>
            <FieldLabel>{isLab ? 'Result' : 'Status'}</FieldLabel>
            <SingleChoiceChips
              options={
                isLab
                  ? ['Negative', 'Positive']
                  : ['Fully dispensed', 'Partially dispensed', 'Not available']
              }
              value={results[j] || ''}
              onChange={(val) =>
                setResults((prev) => {
                  const next = [...prev];
                  next[j] = val;
                  return next;
                })
              }
              allowDeselect
            />
            {isLab && (
              <InputField
                className="mt-2.5"
                value={comments[j] || ''}
                onChange={(e) =>
                  setComments((prev) => {
                    const next = [...prev];
                    next[j] = e.target.value;
                    return next;
                  })
                }
                placeholder="Value or comment (e.g. Hb 10.8 g/dL)"
              />
            )}
          </Card>
        ))}

        <PrimaryButton onClick={handleSubmit}>
          {isLab ? 'Send results' : 'Complete dispensing'}
        </PrimaryButton>
      </div>
    </div>
  );
};

export const NotificationsScreen: React.FC = () => {
  const { state, pendingLabsForEncounter, openOpenEncounter, openNotification } = useCareSync();

  const readyEncounters = state.E.filter(
    (e) => e.status === 'open' && pendingLabsForEncounter(e.uid).length === 0,
  );
  const waitingEncounters = state.E.filter(
    (e) => e.status === 'open' && pendingLabsForEncounter(e.uid).length > 0,
  );
  const otherUpdates = state.nt.filter((n) => {
    if (n.k !== 'lab' || !n.encounterUid) return true;
    const enc = state.E.find((e) => e.uid === n.encounterUid);
    return enc?.status !== 'open';
  });

  return (
    <div>
      <ScreenHeader title="Notifications" subtitle="Results and updates" showBack />
      <div className="p-3.5">
        <SectionTitle>Results ready ({readyEncounters.length})</SectionTitle>
        {readyEncounters.length ? (
          readyEncounters.map((enc) => {
            const pName = state.pts[enc.pi]?.n || 'Patient';
            return (
              <ListRowCard key={enc.uid} blink onClick={() => openOpenEncounter(enc.uid)}>
                <FlaskConical className="h-6 w-6 flex-none" style={{ color: 'var(--g)' }} />
                <div>
                  <div className="text-sm font-bold">{pName}</div>
                  <div className="text-xs" style={{ color: 'var(--mu)' }}>
                    {enc.t} • Result ready
                  </div>
                  <div className="text-xs font-medium">{enc.res.join('; ').replace(/Positive/g, 'POSITIVE')}</div>
                  <div className="mt-0.5 text-xs font-semibold" style={{ color: 'var(--g)' }}>
                    Tap to continue the encounter
                  </div>
                </div>
              </ListRowCard>
            );
          })
        ) : (
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              None right now.
            </div>
          </Card>
        )}

        <SectionTitle className="mt-4">Waiting for the lab ({waitingEncounters.length})</SectionTitle>
        {waitingEncounters.length ? (
          waitingEncounters.map((enc) => {
            const pName = state.pts[enc.pi]?.n || 'Patient';
            const awaiting = pendingLabsForEncounter(enc.uid)
              .map((t) => t.t)
              .join(', ');
            return (
              <Card key={enc.uid}>
                <div className="text-sm font-bold">{pName}</div>
                <div className="text-xs" style={{ color: 'var(--mu)' }}>
                  {enc.t} • awaiting {awaiting}
                </div>
              </Card>
            );
          })
        ) : (
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              None.
            </div>
          </Card>
        )}

        <SectionTitle className="mt-4">Other updates</SectionTitle>
        {otherUpdates.length ? (
          otherUpdates.map((n) => (
            <ListRowCard key={n.id} blink={!n.read} onClick={() => openNotification(n.id)}>
              {n.k === 'lab' ? (
                <FlaskConical className="h-5 w-5 flex-none" style={{ color: 'var(--g)' }} />
              ) : n.k === 'ref' ? (
                <ArrowLeftRight className="h-5 w-5 flex-none" style={{ color: 'var(--g)' }} />
              ) : (
                <Pill className="h-5 w-5 flex-none" style={{ color: 'var(--g)' }} />
              )}
              <div>
                <div className="text-sm font-bold">{n.p}</div>
                <div className="text-xs" style={{ color: 'var(--mu)' }}>
                  {n.txt.replace(/Positive/g, 'POSITIVE')}
                </div>
              </div>
            </ListRowCard>
          ))
        ) : (
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              None.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
