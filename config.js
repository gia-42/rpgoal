// RPGoal settings. This is the only file you need to edit to turn on accounts.
// Leave supabaseUrl empty and the game runs as before, saving on each device only.
//
// Where to find these values: Supabase dashboard > Project Settings > Data API (Project URL)
// and Project Settings > API Keys (the "anon" "public" key). The anon key is safe to publish:
// the database rules in supabase-setup.sql make sure each player can only read their own save.
window.RPGOAL_CONFIG = {
  supabaseUrl: "https://ucbiisgpmfxdriwzirmh.supabase.co",        // e.g. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "sb_publishable_kHpxPPAMKsWEyuFj5kS87Q_JvEocltc",    // the "publishable" key, starts with sb_publishable_
  googleClientId: "980448163382-votfvsi7mmki4ksg58rkr8geue0g9ag5.apps.googleusercontent.com",     // e.g. "1234-abc.apps.googleusercontent.com"

  // Turn Google login off by setting google: false. Email login (6-digit code) is always on.
  providers: { google: true }
};
