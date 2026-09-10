<?php
/**
 * ALTERNATIVE to the HTML snippets — for people who prefer PHP.
 * Paste into a PHP snippet in WPCode / Code Snippets, or into your
 * child theme's functions.php. Do NOT use this AND the HTML snippets
 * at the same time, or the banner will load twice.
 *
 * Files that must exist at your web root first:
 *   /manifest.webmanifest
 *   /sw.js
 *   /offline.html
 *   /assets/icons/icon-192.png, icon-512.png, icon-maskable-512.png,
 *                 apple-touch-icon-180.png
 */

// ---- 1. head tags -----------------------------------------------------
add_action( 'wp_head', function () {
	?>
	<link rel="manifest" href="<?php echo esc_url( home_url( '/manifest.webmanifest' ) ); ?>">
	<meta name="theme-color" content="#0d7a4f">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-title" content="Tax Calculator">
	<link rel="apple-touch-icon" href="<?php echo esc_url( home_url( '/assets/icons/apple-touch-icon-180.png' ) ); ?>">
	<?php
}, 5 );

// ---- 2. service worker registration ------------------------------------
add_action( 'wp_footer', function () {
	if ( is_admin() || is_user_logged_in() ) {
		return; // keep editors out of the cache while they work
	}
	?>
	<script>
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function () {
			navigator.serviceWorker.register('<?php echo esc_url( home_url( '/sw.js' ) ); ?>', { scope: '/' })
				.catch(function (e) { console.warn('SW failed', e); });
		});
	}
	</script>
	<?php
}, 20 );

// ---- 3. the install banner ---------------------------------------------
add_action( 'wp_footer', function () {
	if ( is_admin() || is_user_logged_in() ) {
		return;
	}
	// Point this at the snippet file you uploaded to your theme/uploads dir,
	// or simply paste the contents of snippets/install-banner-snippet.html here.
	$snippet = get_stylesheet_directory() . '/ptc-install-banner.html';
	if ( file_exists( $snippet ) ) {
		echo file_get_contents( $snippet ); // phpcs:ignore
	}
}, 30 );

// ---- 4. serve /sw.js and /manifest.webmanifest if you can't drop files
//         at the web root (e.g. managed hosting). Optional. ---------------
add_action( 'init', function () {
	add_rewrite_rule( '^sw\.js$', 'index.php?ptc_pwa=sw', 'top' );
	add_rewrite_rule( '^manifest\.webmanifest$', 'index.php?ptc_pwa=manifest', 'top' );
} );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'ptc_pwa';
	return $vars;
} );

add_action( 'template_redirect', function () {
	$what = get_query_var( 'ptc_pwa' );
	if ( ! $what ) {
		return;
	}
	$map = array(
		'sw'       => array( 'ptc-pwa/sw.js', 'application/javascript' ),
		'manifest' => array( 'ptc-pwa/manifest.webmanifest', 'application/manifest+json' ),
	);
	if ( ! isset( $map[ $what ] ) ) {
		return;
	}
	list( $rel, $mime ) = $map[ $what ];
	$path = get_stylesheet_directory() . '/' . $rel;
	if ( ! file_exists( $path ) ) {
		return;
	}
	header( 'Content-Type: ' . $mime . '; charset=utf-8' );
	header( 'Service-Worker-Allowed: /' );
	header( 'Cache-Control: max-age=0, no-cache' );
	echo file_get_contents( $path ); // phpcs:ignore
	exit;
} );
