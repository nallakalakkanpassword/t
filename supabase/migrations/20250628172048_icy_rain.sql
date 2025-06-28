/*
  # Add set_config function for RLS

  1. New Functions
    - `set_config` - PostgreSQL function to set session variables for RLS policies
      - `setting_name` (text) - The name of the setting to configure
      - `setting_value` (text) - The value to set for the setting
      - `is_local` (boolean) - Whether to set the variable locally (default: true)

  2. Security
    - Function is accessible to authenticated users for setting app.current_user context
    - Required for Row Level Security policies to identify the current user

  3. Notes
    - This function enables the application to set the current user context
    - Used by RLS policies to determine user permissions
    - Essential for proper security enforcement in the application
*/

CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text, is_local boolean DEFAULT true)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF is_local THEN
    EXECUTE format('SET LOCAL %I = %L', setting_name, setting_value);
  ELSE
    EXECUTE format('SET %I = %L', setting_name, setting_value);
  END IF;
  RETURN setting_value;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_config(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config(text, text, boolean) TO anon;