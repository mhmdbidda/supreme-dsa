import { ArrowRight, Clock3, type LucideIcon } from "lucide-react";

type PlaceholderPageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Short, honest list of what this module will contain. */
  planned: string[];
};

/**
 * Shared layout for the modules that are not built yet: title, description,
 * planned contents and an explicit "Coming next" state. Static text only —
 * no fake controls.
 */
export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  planned,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">Module</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            {title}
          </h1>
        </div>
        <span className="rounded-full border border-line bg-surface-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          Coming next
        </span>
      </div>

      <section className="panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted">
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="space-y-5">
            <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
              {description}
            </p>

            <div>
              <p className="label">What will live here</p>
              <ul className="mt-3 space-y-2">
                {planned.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink"
                  >
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      className="mt-1 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="panel flex items-start gap-3 p-5">
        <Clock3
          size={16}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0 text-ink-muted"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium tracking-tight text-ink">
            Coming next
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            This module has no interactive content yet — it is queued for the
            next iteration of the lab.
          </p>
        </div>
      </section>
    </div>
  );
}
