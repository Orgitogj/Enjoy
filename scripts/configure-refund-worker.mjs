import { spawnSync } from 'node:child_process';

const FUNCTIONS_URL = process.env.ENJOY_FUNCTIONS_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.SUPABASE_DB_URL;

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

if (!DATABASE_URL) {
  fail(
    [
      'Set SUPABASE_DB_URL to the target database connection string before running this script.',
      '',
      'It prints nothing secret and stores the worker credentials in Supabase Vault, so they never',
      'reach a committed migration, a log line or the client bundle.',
      '',
      'Required environment:',
      '  SUPABASE_DB_URL            postgres connection string for the target project',
      '  ENJOY_FUNCTIONS_URL        https://<project-ref>.supabase.co/functions/v1',
      '  SUPABASE_SERVICE_ROLE_KEY  the project service role key',
    ].join('\n')
  );
}

if (!FUNCTIONS_URL || !SERVICE_ROLE_KEY) {
  fail('Set ENJOY_FUNCTIONS_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const statement = `
do $$
declare
  v_url text := current_setting('enjoy.functions_url');
  v_key text := current_setting('enjoy.service_role_key');
begin
  if to_regnamespace('vault') is null then
    raise exception 'Supabase Vault is not available on this database';
  end if;

  if exists (select 1 from vault.secrets where name = 'enjoy_functions_url') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'enjoy_functions_url'), v_url);
  else
    perform vault.create_secret(v_url, 'enjoy_functions_url', 'Edge function base url');
  end if;

  if exists (select 1 from vault.secrets where name = 'enjoy_service_role_key') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'enjoy_service_role_key'), v_key);
  else
    perform vault.create_secret(v_key, 'enjoy_service_role_key', 'Service role key for workers');
  end if;
end
$$;

select case
  when exists (select 1 from cron.job where jobname = 'enjoy-reconcile-payments')
    then 'enjoy-reconcile-payments is scheduled'
  else 'enjoy-reconcile-payments is NOT scheduled: apply migrations 0026 and 0032 first'
end as schedule_state;
`;

const result = spawnSync(
  'psql',
  [
    DATABASE_URL,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `set local enjoy.functions_url = '${FUNCTIONS_URL.replace(/'/g, "''")}';
     set local enjoy.service_role_key = '${SERVICE_ROLE_KEY.replace(/'/g, "''")}';
     ${statement}`,
  ],
  { encoding: 'utf8' }
);

if (result.status !== 0) {
  console.error(result.stderr ?? '');
  fail('Could not configure the refund worker.');
}

console.log(result.stdout ?? '');
console.log('Refund worker secrets stored in Vault. Nothing was printed to logs.\n');
