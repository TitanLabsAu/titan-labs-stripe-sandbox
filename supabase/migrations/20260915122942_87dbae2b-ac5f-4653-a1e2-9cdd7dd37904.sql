
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT vault.create_secret(
  '036eabf7cf374daa27495db566fae5d75544b86aed1c35bfc3ecc9733da7dcca',
  'auspost_cron_secret',
  'Bearer token for the hourly Australia Post tracking poll'
);

SELECT cron.schedule(
  'auspost-tracking-poll',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--06904455-d4ee-4c47-97ca-4d4f7c6cce48.lovable.app/api/public/auspost-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'auspost_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
