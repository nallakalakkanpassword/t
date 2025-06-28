/*
  # Add set_current_user function

  1. New Functions
    - `set_current_user(username text)` - Sets the app.current_user session variable
  
  2. Security
    - Function is accessible to authenticated users
    - Allows setting the session variable needed for RLS policies
*/

CREATE OR REPLACE FUNCTION set_current_user(username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user', username, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_current_user(text) TO authenticated;