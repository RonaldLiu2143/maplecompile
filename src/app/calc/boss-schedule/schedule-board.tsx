"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AVAILABILITY_LABELS,
  DAY_LABELS,
  DAY_LABELS_FULL,
  formatTimeMinutes,
  newLocalId,
  type AvailabilityStatus,
  type BossScheduleEvent,
  type BossScheduleMember,
  type BossScheduleState,
} from "@/lib/boss-schedule/client";
import { BOSS_CRYSTALS, formatBossLabel } from "@/lib/bosses";

const inputClass =
  "rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

const AVAIL_CYCLE: AvailabilityStatus[] = [
  "available",
  "maybe",
  "unavailable",
];

const AVAIL_STYLE: Record<AvailabilityStatus, string> = {
  available:
    "bg-emerald-600/90 text-white dark:bg-emerald-400 dark:text-zinc-900",
  maybe: "bg-amber-500/90 text-white dark:bg-amber-400 dark:text-zinc-900",
  unavailable: "bg-zinc-500/80 text-white dark:bg-zinc-400 dark:text-zinc-900",
};

type Props = {
  state: BossScheduleState;
  canEdit: boolean;
  onChange: (next: BossScheduleState) => void;
  /** Optional status line under the title (save / share messages). */
  status?: string | null;
};

export function BossScheduleBoard({
  state,
  canEdit,
  onChange,
  status,
}: Props) {
  const [draftTitle, setDraftTitle] = useState(state.title);
  const [memberName, setMemberName] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  useEffect(() => {
    setDraftTitle(state.title);
  }, [state.title]);

  const eventsByDay = useMemo(() => {
    const buckets: BossScheduleEvent[][] = Array.from({ length: 7 }, () => []);
    for (const ev of state.events) {
      buckets[ev.dayOfWeek]?.push(ev);
    }
    for (const list of buckets) {
      list.sort(
        (a, b) =>
          a.startMinutes - b.startMinutes || a.title.localeCompare(b.title),
      );
    }
    return buckets;
  }, [state.events]);

  const patch = (partial: Partial<BossScheduleState>) => {
    onChange({ ...state, ...partial });
  };

  const upsertEvent = (event: BossScheduleEvent) => {
    const exists = state.events.some((e) => e.id === event.id);
    patch({
      events: exists
        ? state.events.map((e) => (e.id === event.id ? event : e))
        : [...state.events, event],
    });
    setEditingEventId(null);
  };

  const removeEvent = (id: string) => {
    patch({
      events: state.events.filter((e) => e.id !== id),
      members: state.members.map((m) => {
        if (!(id in m.availability)) return m;
        const availability = { ...m.availability };
        delete availability[id];
        return { ...m, availability };
      }),
    });
    if (editingEventId === id) setEditingEventId(null);
  };

  const addMember = (e: FormEvent) => {
    e.preventDefault();
    const name = memberName.trim();
    if (!name || !canEdit) return;
    const member: BossScheduleMember = {
      id: newLocalId("mem"),
      name,
      availability: {},
    };
    patch({ members: [...state.members, member] });
    setMemberName("");
  };

  const removeMember = (id: string) => {
    patch({ members: state.members.filter((m) => m.id !== id) });
  };

  const cycleAvailability = (memberId: string, eventId: string) => {
    if (!canEdit) return;
    patch({
      members: state.members.map((m) => {
        if (m.id !== memberId) return m;
        const cur = m.availability[eventId];
        const idx = cur ? AVAIL_CYCLE.indexOf(cur) : -1;
        const next = AVAIL_CYCLE[(idx + 1) % AVAIL_CYCLE.length]!;
        return {
          ...m,
          availability: { ...m.availability, [eventId]: next },
        };
      }),
    });
  };

  const clearAvailability = (memberId: string, eventId: string) => {
    if (!canEdit) return;
    patch({
      members: state.members.map((m) => {
        if (m.id !== memberId) return m;
        if (!(eventId in m.availability)) return m;
        const availability = { ...m.availability };
        delete availability[eventId];
        return { ...m, availability };
      }),
    });
  };

  const editing =
    editingEventId === "new"
      ? null
      : state.events.find((e) => e.id === editingEventId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          {canEdit ? (
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => {
                const t = draftTitle.trim() || "Boss Schedule";
                setDraftTitle(t);
                if (t !== state.title) patch({ title: t });
              }}
              className={`${inputClass} w-full max-w-md font-display text-xl font-semibold`}
              aria-label="Schedule title"
            />
          ) : (
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {state.title}
            </h1>
          )}
          {state.timezone ? (
            <p className="mt-1 text-xs opacity-60">Times · {state.timezone}</p>
          ) : null}
          {status ? (
            <p className="mt-1 text-xs text-accent" role="status">
              {status}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditingEventId("new")}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 dark:text-zinc-900"
          >
            Add run
          </button>
        ) : (
          <p className="rounded-lg border border-border/40 bg-surface/60 px-3 py-1.5 text-xs opacity-70">
            View only — open an edit link to change the schedule
          </p>
        )}
      </div>

      {editingEventId ? (
        <EventEditor
          initial={
            editing ?? {
              id: newLocalId("evt"),
              title: "",
              dayOfWeek: 4,
              startMinutes: 20 * 60,
              durationMinutes: 60,
            }
          }
          isNew={editingEventId === "new"}
          onCancel={() => setEditingEventId(null)}
          onSave={upsertEvent}
          onDelete={
            editing ? () => removeEvent(editing.id) : undefined
          }
        />
      ) : null}

      <section className="overflow-x-auto">
        <div className="grid min-w-[52rem] grid-cols-7 gap-2">
          {DAY_LABELS.map((label, day) => (
            <div
              key={label}
              className="flex min-h-[12rem] flex-col rounded-xl border border-border/40 bg-surface/80"
            >
              <div className="border-b border-border/30 px-2 py-1.5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                  {label}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-1.5">
                {(eventsByDay[day] ?? []).length === 0 ? (
                  <p className="px-1 py-4 text-center text-[11px] opacity-45">
                    —
                  </p>
                ) : (
                  (eventsByDay[day] ?? []).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => canEdit && setEditingEventId(ev.id)}
                      className={[
                        "rounded-lg border border-border/40 bg-background px-2 py-1.5 text-left transition-colors",
                        canEdit
                          ? "hover:border-accent/50 hover:bg-accent-soft/40"
                          : "cursor-default",
                      ].join(" ")}
                    >
                      <p className="text-[11px] font-semibold tabular-nums text-accent">
                        {formatTimeMinutes(ev.startMinutes)}
                      </p>
                      <p className="truncate text-xs font-semibold leading-snug">
                        {ev.title}
                      </p>
                      {ev.notes ? (
                        <p className="mt-0.5 truncate text-[10px] opacity-55">
                          {ev.notes}
                        </p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Availability</h2>
            <p className="text-xs opacity-65">
              Click a cell to cycle available → maybe → unavailable
              {canEdit ? "" : " (view only)"}.
            </p>
          </div>
          {canEdit ? (
            <form onSubmit={addMember} className="flex flex-wrap gap-2">
              <input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Member name"
                maxLength={40}
                className={`${inputClass} w-40`}
              />
              <button
                type="submit"
                className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-semibold hover:bg-accent-soft hover:text-accent"
              >
                Add member
              </button>
            </form>
          ) : null}
        </div>

        {state.members.length === 0 ? (
          <p className="text-sm opacity-60">
            No members yet
            {canEdit ? " — add names so the party can mark availability." : "."}
          </p>
        ) : state.events.length === 0 ? (
          <p className="text-sm opacity-60">
            Add boss runs first, then mark who can make each slot.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] uppercase tracking-wider opacity-55">
                  <th className="p-2 font-semibold">Member</th>
                  {state.events
                    .slice()
                    .sort(
                      (a, b) =>
                        a.dayOfWeek - b.dayOfWeek ||
                        a.startMinutes - b.startMinutes,
                    )
                    .map((ev) => (
                      <th key={ev.id} className="p-2 font-semibold">
                        <span className="block whitespace-nowrap">
                          {DAY_LABELS[ev.dayOfWeek]}{" "}
                          {formatTimeMinutes(ev.startMinutes)}
                        </span>
                        <span className="mt-0.5 block max-w-[7rem] truncate font-normal normal-case tracking-normal opacity-80">
                          {ev.title}
                        </span>
                      </th>
                    ))}
                  {canEdit ? (
                    <th className="p-2 font-semibold">
                      <span className="sr-only">Remove</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {state.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border/15 last:border-0"
                  >
                    <td className="p-2 font-medium">{member.name}</td>
                    {state.events
                      .slice()
                      .sort(
                        (a, b) =>
                          a.dayOfWeek - b.dayOfWeek ||
                          a.startMinutes - b.startMinutes,
                      )
                      .map((ev) => {
                        const status = member.availability[ev.id];
                        return (
                          <td key={ev.id} className="p-1.5">
                            <button
                              type="button"
                              disabled={!canEdit}
                              title={
                                status
                                  ? AVAILABILITY_LABELS[status]
                                  : "Unset — click to set"
                              }
                              onClick={() =>
                                cycleAvailability(member.id, ev.id)
                              }
                              onContextMenu={(e) => {
                                e.preventDefault();
                                clearAvailability(member.id, ev.id);
                              }}
                              className={[
                                "inline-flex min-w-[4.5rem] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                                status
                                  ? AVAIL_STYLE[status]
                                  : "border border-dashed border-border/50 opacity-50 hover:opacity-80",
                                canEdit ? "" : "cursor-default",
                              ].join(" ")}
                            >
                              {status
                                ? AVAILABILITY_LABELS[status].slice(0, 5)
                                : "—"}
                            </button>
                          </td>
                        );
                      })}
                    {canEdit ? (
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="text-xs opacity-55 hover:text-red-500 hover:opacity-100"
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EventEditor({
  initial,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: BossScheduleEvent;
  isNew: boolean;
  onSave: (event: BossScheduleEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [dayOfWeek, setDayOfWeek] = useState(initial.dayOfWeek);
  const [timeValue, setTimeValue] = useState(() => {
    const h = Math.floor(initial.startMinutes / 60);
    const m = initial.startMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });
  const [duration, setDuration] = useState(initial.durationMinutes);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [bossId, setBossId] = useState(initial.bossId ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [hs, ms] = timeValue.split(":").map((x) => Number(x));
    const startMinutes =
      Number.isFinite(hs) && Number.isFinite(ms)
        ? Math.max(0, Math.min(23 * 60 + 59, hs! * 60 + ms!))
        : initial.startMinutes;
    const resolvedTitle =
      title.trim() ||
      (bossId
        ? formatBossLabel(
            BOSS_CRYSTALS.find((b) => b.id === bossId)?.difficulties.at(-1)
              ?.name ?? "",
            BOSS_CRYSTALS.find((b) => b.id === bossId)?.name ?? "Boss",
          )
        : "");
    if (!resolvedTitle) return;
    onSave({
      id: initial.id,
      title: resolvedTitle,
      bossId: bossId || undefined,
      dayOfWeek,
      startMinutes,
      durationMinutes: duration,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/20 p-4"
    >
      <p className="text-sm font-semibold">
        {isNew ? "New boss run" : "Edit boss run"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1 text-xs font-semibold opacity-70 sm:col-span-2">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hard Lucid / Party A"
            className={`${inputClass} w-full font-normal`}
            required={!bossId}
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold opacity-70">
          Day
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className={`${inputClass} w-full font-normal`}
          >
            {DAY_LABELS_FULL.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-semibold opacity-70">
          Start time
          <input
            type="time"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className={`${inputClass} w-full font-normal`}
            required
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold opacity-70">
          Duration (min)
          <input
            type="number"
            min={15}
            max={480}
            step={15}
            value={duration}
            onChange={(e) =>
              setDuration(Math.max(15, Math.floor(Number(e.target.value) || 60)))
            }
            className={`${inputClass} w-full font-normal`}
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold opacity-70 sm:col-span-2">
          Catalog boss (optional)
          <select
            value={bossId}
            onChange={(e) => {
              const id = e.target.value;
              setBossId(id);
              if (id && !title.trim()) {
                const boss = BOSS_CRYSTALS.find((b) => b.id === id);
                if (boss) {
                  const diff = boss.difficulties.at(-1)?.name ?? "";
                  setTitle(formatBossLabel(diff, boss.name));
                }
              }
            }}
            className={`${inputClass} w-full font-normal`}
          >
            <option value="">Custom title only</option>
            {BOSS_CRYSTALS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-semibold opacity-70 sm:col-span-2">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Discord VC / carry / etc."
            maxLength={200}
            className={`${inputClass} w-full font-normal`}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white dark:text-zinc-900"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted"
        >
          Cancel
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-500/10"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
