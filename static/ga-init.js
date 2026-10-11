// Google Analytics bootstrap. Kept as a static file (not an inline <script> in
// app.html) so the Content Security Policy can allow it via 'self' instead of
// 'unsafe-inline'. Loaded synchronously so `gtag` exists before the app calls it.
window.dataLayer = window.dataLayer || [];
function gtag() {
	dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-5D9VS622GD', { send_page_view: false });
