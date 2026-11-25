import { AlertTriangle, Info } from 'lucide-react';
import { Banner } from './ui';

/**
 * Shown when the Supabase tables do not exist yet (migrations not applied).
 * The dashboard stays usable but read-only until the reviewed SQL is applied.
 */
export function MigrationNotice() {
  return (
    <Banner kind="warning" className="mb-5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Database not prepared yet</p>
          <p className="mt-0.5 leading-relaxed">
            The Supabase tables are not available in this project. Apply the reviewed files
            (<code>supabase/migrations/001_initial_schema.sql</code>,{' '}
            <code>002_rls_policies.sql</code>, <code>003_storage_policies.sql</code>, then{' '}
            <code>supabase/seed.sql</code>) in the Supabase SQL editor, then reload this page.
          </p>
        </div>
      </div>
    </Banner>
  );
}

/** Generic inline error notice. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <Banner kind="error" className="mb-4">
      {message}
    </Banner>
  );
}

/** Informational notice. */
export function InfoNotice({ children }: { children: React.ReactNode }) {
  return (
    <Banner kind="info" className="mb-4">
      <span className="inline-flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </span>
    </Banner>
  );
}
