// RPGoal settings. This is the only file you need to edit to turn on accounts.
// Leave supabaseUrl empty and the game runs as before, saving on each device only.
//
// Where to find these values: Supabase dashboard > Project Settings > Data API (Project URL)
// and Project Settings > API Keys (the "anon" "public" key). The anon key is safe to publish:
// the database rules in supabase-setup.sql make sure each player can only read their own save.
window.RPGOAL_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  // Optional: the same Google "Web client ID" used for Daily Dharma. With it, the login shows
  // Google's own button and your app's name. Without it, Google login still works through Supabase.
  googleClientId: "",

  // Turn Google login off by setting google: false. Email login (6-digit code) is always on.
  providers: { google: true }
};
