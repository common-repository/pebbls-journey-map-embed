<?php
/*
Plugin Name: Pebbls Journey Map Embed
Description: A plugin to embed Pebbls journey maps using a Gutenberg block.
Version: 1.0.5
Author: Pebbls Travel Tracker
Author URI: https://www.pebbls.com
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Enqueue block editor assets
function pebbls_journey_embed_enqueue_block_editor_assets()
{
    wp_enqueue_script(
        'pebbls-map-embed',
        plugins_url('block.js', __FILE__),
        array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n', 'wp-api'),
        filemtime(plugin_dir_path(__FILE__) . 'block.js'),
        true
    );

    // Localize the script with the plugin URL
    wp_localize_script('pebbls-map-embed', 'PebblsPluginData', array(
        'pluginUrl' => plugins_url('/', __FILE__),
    ));
}
add_action('enqueue_block_editor_assets', 'pebbls_journey_embed_enqueue_block_editor_assets');

// Register the block with the editor script and render callback
function pebbls_journey_register_block()
{
    register_block_type('pebbls/journey-map-embed', array(
        'editor_script'   => 'pebbls-map-embed',
        'render_callback' => 'pebbls_journey_render_map_embed',
    ));
}
add_action('init', 'pebbls_journey_register_block');

// Enqueue custom block styles
function pebbls_journey_enqueue_block_styles()
{
    wp_enqueue_style(
        'pebbls-block-styles',
        plugins_url('css/pebbls-block-styles.css', __FILE__),
        array(),
        '1.1.10'
    );
}
add_action('wp_enqueue_scripts', 'pebbls_journey_enqueue_block_styles');

// Render the block content on the front end
function pebbls_journey_render_map_embed($attributes)
{
    $journey = isset($attributes['pebblsJourney']) ? esc_attr($attributes['pebblsJourney']) : '';
    $height = isset($attributes['pebblsJourneyHeight']) ? intval($attributes['pebblsJourneyHeight']) : 400;
    $showStats = isset($attributes['pebblsShowStats']) ? (bool) $attributes['pebblsShowStats'] : false;
    $showMap = isset($attributes['pebblsShowMap']) ? (bool) $attributes['pebblsShowMap'] : true;
    $roundedCorners = isset($attributes['pebblsRoundedCorners']) ? (bool) $attributes['pebblsRoundedCorners'] : true;
    $outlineBorder = isset($attributes['pebblsOutlineBorder']) ? (bool) $attributes['pebblsOutlineBorder'] : false;


    if (!$journey) {
        return '<p>Please select a journey to embed and ensure your API key is provided.</p>';
    }



    // Fetch the journey data
    $api_url = "https://www.pebbls.com/pebbls-core/api/react/embed-list/v2/";
    $response = wp_remote_get($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $journey,
        ],
    ]);

    if (is_wp_error($response)) {
        return '<p>Unable to retrieve journey data. Please check your API key and try again.</p>';
    }

    $journeys = json_decode(wp_remote_retrieve_body($response), true);
    $selectedJourney = null;

    foreach ($journeys as $j) {
        if (isset($j) && isset($j['id']) && $j['embedKey'] == $journey) {
            $selectedJourney = $j;
            break;
        }
    }

    if (!$selectedJourney) {
        return '<p>Unable to retrieve journey data. Please check your API key and journey ID.</p>';
    }

    // Helper function to format distances
    if (!function_exists('pebbls_journey_format_distance')) {
        function pebbls_journey_format_distance($distance)
        {
            if ($distance < 500) {
                return null; // Ignore distances below 500 meters
            } elseif ($distance >= 1000) {
                if ($distance >= 10000) {
                    return sprintf("%d km", $distance / 1000);
                } else {
                    return sprintf("%.1f km", $distance / 1000);
                }
            } else {
                return sprintf("%d m", $distance);
            }
        }
    }

    // Calculate total distance for the journey
    $total_distance = array_sum($selectedJourney['distance']);
    $formattedTotalDistance = pebbls_journey_format_distance($total_distance);

    // Sort journey distances in descending order
    arsort($selectedJourney['distance']);

    // Build the iframe (only if showMap is true)
    $iframe = '';
    $borderRadius = 0;
    if ($roundedCorners) {
        $borderRadius = "15px";
    }



    if ($showMap) {
        $iframe = sprintf(
            '<div class="pebbls-iframe-container" style="height: %dpx; border-radius: '
                . $borderRadius .
                ' '
                . $borderRadius .
                ' 0 0; overflow: hidden; margin-bottom: 0;">
                <iframe src="https://www.pebbls.com/pebbls-core/embed3.php?embedKey=%s" loading="lazy" title="Pebbls Journey" style="width: 100%%; height: 100%%; border: none;"></iframe>
            </div>',
            $height,
            $journey
        );
    }

    // Build the stats section
    $stats = '';

    if ($showStats) {
        // Container for Journey Totals
        $stats .= sprintf(
            '<a href="%s" target="_blank" style="text-decoration: none; display: block;">',
            esc_url($selectedJourney['link'])
        );

        $stats .= '<div style="background-color: #fff; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">';

        // Journey Name as the Title
        $stats .= sprintf(
            '<h3 style="font-size: 15px; margin-top: 0; margin-bottom: 6px; color: #007bff;">%s</h3>',
            esc_html($selectedJourney['name'])
        );

        // Display the total distance
        if ($formattedTotalDistance) {
            $img_src_total = plugins_url('assets/svg/circle.svg', __FILE__);

            $stats .= sprintf(
                '<div class="pebbls-transport-item" style="margin-bottom: 4px; display: flex; align-items: flex-start;">
        <img src="%s" alt="Total" style="width: 18px; height: 18px; margin-right: 4px;">
        <span style="font-size: 14px; color: #333; font-weight: bold;">Total: %s</span>
    </div>',
                esc_url($img_src_total),
                esc_html($formattedTotalDistance)
            );
        }

        // Transport Modes Summary for Journey Totals
        foreach ($selectedJourney['distance'] as $mode => $distance) {
            $formattedDistance = pebbls_journey_format_distance($distance);
            if ($formattedDistance) {
                $img_src_mode = plugins_url('assets/svg/' . esc_attr($mode) . '.svg', __FILE__);

                $stats .= sprintf(
                    '<div class="pebbls-transport-item" style="margin-bottom: 0; display: flex; align-items: flex-start;">
        <img src="%s" alt="%s" style="width: 18px; height: 18px; margin-right: 4px;">
        <span style="font-size: 14px; color: #333; line-height: 20px;">%s</span>
    </div>',
                    esc_url($img_src_mode),
                    esc_attr($mode),
                    esc_html($formattedDistance)
                );
            }
        }

        $stats .= '</div>'; // Close Journey Totals container
        $stats .= '</a>'; // Close Journey Link

        // Legs Summary (No "Legs" label)
        $stats .= '<div class="pebbls-legs-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px;">';
        foreach ($selectedJourney['legs'] as $leg) {
            // Sort leg distances in descending order
            arsort($leg['distance']);

            $leg_transport_stats = '';
            $leg_total_distance = array_sum($leg['distance']);

            foreach ($leg['distance'] as $mode => $distance) {
                $formattedDistance = pebbls_journey_format_distance($distance);
                if ($formattedDistance) {
                    $img_src_leg_mode = plugins_url('assets/svg/' . esc_attr($mode) . '.svg', __FILE__);

                    $leg_transport_stats .= sprintf(
                        '<div class="pebbls-leg-transport-item" style="margin-bottom: 2px; display: flex; align-items: flex-start;">
        <img src="%s" alt="%s" style="width: 18px; height: 18px; margin-right: 4px;">
        <span style="font-size: 14px; color: #333; line-height: 19px;">%s</span>
    </div>',
                        esc_url($img_src_leg_mode),
                        esc_attr($mode),
                        esc_html($formattedDistance)
                    );
                }
            }

            $formattedLegTotalDistance = pebbls_journey_format_distance($leg_total_distance);
            $leg_url = esc_url($selectedJourney['link'] . '#leg=' . intval($leg['id']));

            $img_src_leg_total = plugins_url('assets/svg/circle.svg', __FILE__);

            $stats .= sprintf(
                '<a href="%s" target="_blank" style="text-decoration: none; flex: 1 1 calc(33.333%% - 8px); box-sizing: border-box; display: flex;">
        <div class="pebbls-leg-summary" style="background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 8px; width: 100%%; transition: box-shadow 0.3s; cursor: pointer;">
            <div style="color: #007bff; font-weight: 600; font-size: 14px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                %s
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 6px;">
                <img src="%s" alt="Leg Total" style="width: 18px; height: 18px; margin-right: 4px;">
                <span style="font-size: 14px; color: #333; font-weight: bold; line-height: 20px;">Total: %s</span>
            </div>
            <div class="pebbls-leg-transport" style="display: flex; flex-direction: column; gap: 0;">
                %s
            </div>
        </div>
    </a>',
                esc_url($leg_url),
                esc_html($leg['name']),
                esc_url($img_src_leg_total),
                esc_html($formattedLegTotalDistance),
                $leg_transport_stats
            );
        }
        $stats .= '</div>'; // Close Legs container
    }

    // Footer with minimal gap for a compact appearance
    $footer = sprintf(
        '<div class="pebbls-footer" style="padding: 0; text-align: right; margin-top: 0;">
            <a href="%s" target="_blank" style="text-decoration: none; font-weight: 400; font-size: 0.8em; color: #0056b3;">
                View this journey on <strong>Pebbls</strong> Travel Tracker →
            </a>
        </div>',
        esc_attr($selectedJourney['link'])
    );

    // Wrap the stats and footer together in a container with a light grey background and rounded bottom corners
    $stats_and_footer = '<div style="background-color: #f1f1f1; border-radius: 0 0 '
        . $borderRadius . ' '
        . $borderRadius . '; padding: 8px 12px;">' . $stats . $footer . '</div>';

    // Wrap the entire content in a container with no padding around the iframe

    $borderWidth = '0';
    if ($outlineBorder) {
        $borderWidth = '2px';
    }
    return '<div style="background-color: #f1f1f1; border-radius: '
        . $borderRadius . '; overflow: hidden;  border: '
        . $borderWidth . ' solid #999;">' . $iframe . $stats_and_footer . '</div>';
}
