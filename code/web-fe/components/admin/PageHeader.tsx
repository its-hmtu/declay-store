'use client';

/**
 * M-48: title block for an admin page.
 *
 * Breadcrumbs are rendered once by the layout, directly above this. Together they
 * are the ONLY way back — the per-page "← Back" buttons were removed because they
 * competed with the breadcrumb and disagreed with it on nested screens (a back
 * button on a product's edit page went to the list; the breadcrumb went to the
 * product).
 */

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  /** Primary controls — "New product", export, and so on. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-bold text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
