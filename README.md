# Baraka's Portfolio

This is a static HTML, CSS, and JavaScript portfolio. Public content is read from Supabase so updates, projects, photos, videos, and CV changes are shared with every visitor. Posting is available only to the configured administrator account; Supabase row-level security and Storage policies enforce that restriction.

## Supabase setup

1. Create a Supabase Auth user for `tbbbaraka@gmail.com` and set its password. Never put a password or service-role key in this website.
2. In the Supabase SQL Editor, run `supabase-setup.sql`. It marks that existing Auth user with a server-controlled admin claim and creates the public content row, media bucket, read/write policies, and realtime publication. Sign out and back in after running the script so the claim appears in the session.
3. The project URL, publishable/anon key, and admin email are set in `supabase-config.js`. These values are browser-visible; the anon key is safe only because the SQL policies restrict writes.
4. After the SQL script completes successfully, set `setupComplete` to `true` in `supabase-config.js` to enable Supabase requests and the admin login.
5. In Supabase Auth URL Configuration, set the Site URL to the deployed portfolio URL and add that URL plus `http://localhost/portfolio/` to the redirect allow list. The local XAMPP URL works over HTTP; opening the HTML directly as a `file://` URL is not supported for Supabase Auth.
6. Open the deployed site and select **Admin** to sign in. The manager includes password reset and change controls. To change the administrator email, update `adminEmail` in `supabase-config.js`, change the matching email in the SQL policies, and run the SQL again after creating/confirming that Auth user.

Supabase Storage's `portfolio-media` bucket contains public-read images, PDFs, and videos; only the configured administrator can upload or remove them. Do not add a service-role key to frontend files. Visitors see current content on page load and receive live updates while the page is open.

Existing browser-only posts and videos are not automatically copied to Supabase. Re-add them through the admin manager after setup. The CV can be edited as structured text or uploaded as a PDF; videos must be MP4/WebM and smaller than 150 MB. Gallery photos are compressed before upload.

The contact form and updates request form open the visitor's email app. Media files checked into the repository remain under `media/`; see `media/README.md` for details.