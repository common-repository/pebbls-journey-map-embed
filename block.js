const { registerBlockType } = wp.blocks;
const { InspectorControls } = wp.blockEditor;
const {
  PanelBody,
  SelectControl,
  RangeControl,
  Spinner,
  TextControl,
  Notice,
  ToggleControl,
} = wp.components;
const { Fragment, createElement, useState, useEffect } = wp.element;
const apiFetch = wp.apiFetch;

// Register the Pebbls Journey Map Embed block
registerBlockType("pebbls/journey-map-embed", {
  title: "Pebbls Embed Journey Map",
  icon: "location",
  category: "embed",
  attributes: {
    pebblsJourney: {
      type: "string",
      default: "", // Ensure no journey is selected by default
    },
    pebblsJourneyHeight: {
      type: "number",
      default: 400,
    },
    pebblsApiKey: {
      type: "string",
      default: "", // API key to be provided by the user
    },
    pebblsShowMap: {
      type: "boolean",
      default: true, // Enable map display by default
    },
    pebblsShowStats: {
      type: "boolean",
      default: false, // Enable stats display by default
    },
    pebblsRoundedCorners: {
      type: "boolean",
      default: true, // Enable stats display by default
    },
    pebblsOutlineBorder: {
      type: "boolean",
      default: false, // Enable stats display by default
    },
  },
  edit({ attributes, setAttributes, isSelected }) {
    const {
      pebblsJourney,
      pebblsJourneyHeight,
      pebblsApiKey,
      pebblsShowMap,
      pebblsShowStats,
      pebblsRoundedCorners,
      pebblsOutlineBorder,
    } = attributes;
    const [pebblsJourneys, setPebblsJourneys] = useState([]);
    const [pebblsLoading, setPebblsLoading] = useState(false);
    const [pebblsError, setPebblsError] = useState(null);

    // Fetch journeys from the external API using the API key
    useEffect(() => {
      if (pebblsApiKey) {
        setPebblsLoading(true);
        setPebblsError(null); // Reset error state
        apiFetch({
          url: `https://www.pebbls.com/pebbls-core/api/react/embed-list/`,
          headers: {
            Authorization: `Bearer ${pebblsApiKey}`,
          },
        })
          .then((response) => {
            if (Array.isArray(response) && response.length > 0) {
              setPebblsJourneys(response);
            } else {
              setPebblsError("No journeys found. Please check your API key.");
            }
            setPebblsLoading(false);
          })
          .catch((error) => {
            console.error("Error fetching journeys:", error);
            setPebblsError(
              "There was an error fetching your journeys. Please try again."
            );
            setPebblsLoading(false);
          });
      }
    }, [pebblsApiKey]); // Trigger fetch when apiKey changes

    const selectedJourney =
      pebblsJourney && pebblsJourneys.find((j) => j.embedKey == pebblsJourney);

    // Calculate the total distance for the entire journey
    const journeyTotalDistance = selectedJourney?.legs?.reduce((sum, leg) => {
      return (
        sum +
        Object.values(leg.distance).reduce(
          (legSum, distance) => legSum + distance,
          0
        )
      );
    }, 0);

    return createElement(
      Fragment,
      null,
      createElement(
        InspectorControls,
        null,
        createElement(
          PanelBody,
          { title: "Embed Settings" },
          createElement(
            Fragment,
            null,
            createElement(
              "label",
              {
                style: {
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#32373c",
                },
              },
              "API Key",
              createElement(
                "a",
                {
                  href: "https://www.pebbls.com/embed-key/",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    textDecoration: "underline",
                    color: "#007bff",
                    marginLeft: "4px",
                    fontSize: "13px",
                  },
                },
                "(get API key)"
              )
            ),
            createElement(TextControl, {
              value: pebblsApiKey,
              onChange: (newApiKey) => setAttributes({ pebblsApiKey: newApiKey }),
            })
          ),
          pebblsLoading
            ? createElement(Spinner, null)
            : pebblsError
            ? createElement(Notice, { status: "error" }, pebblsError)
            : createElement(SelectControl, {
                label: "Select Journey",
                value: pebblsJourney,
                options: [
                  { label: "Select a journey...", value: "" }, // Placeholder option
                  ...pebblsJourneys.map((j) => ({
                    label: j.name,
                    value: `${j.embedKey}`, // Combine id and user to be split later
                  })),
                ],
                onChange: (newJourney) =>
                  setAttributes({ pebblsJourney: newJourney }),
                disabled: pebblsLoading || !pebblsJourneys.length, // Disable if loading or no journeys
              }),
          createElement(RangeControl, {
            label: "Map Height (px)",
            value: pebblsJourneyHeight,
            onChange: (newHeight) => setAttributes({ pebblsJourneyHeight: newHeight }),
            min: 250,
            max: 800,
          }),
          createElement(ToggleControl, {
            label: "Show Map",
            checked: pebblsShowMap,
            onChange: (newShowMap) => setAttributes({ pebblsShowMap: newShowMap }),
          }),
          createElement(ToggleControl, {
            label: "Show Distance Data",
            checked: pebblsShowStats,
            onChange: (newShowStats) =>
              setAttributes({ pebblsShowStats: newShowStats }),
          }),
          createElement(ToggleControl, {
            label: "Rounded Corners",
            checked: pebblsRoundedCorners,
            onChange: (newRoundedCorners) =>
              setAttributes({ pebblsRoundedCorners: newRoundedCorners }),
          }),
          createElement(ToggleControl, {
            label: "Outline Border",
            checked: pebblsOutlineBorder,
            onChange: (newOutlineBorder) =>
              setAttributes({ pebblsOutlineBorder: newOutlineBorder }),
          })
        )
      ),
      createElement(
        "div",
        {
          style: {
            position: "relative", // Make the parent div the containing block for absolute positioning
            backgroundColor: "#f1f1f1",
            borderRadius: pebblsRoundedCorners ? "15px" : 0,
            overflow: "hidden",
            minHeight: pebblsJourney && (pebblsShowMap || pebblsShowStats) ? "auto" : "50px", // Minimum height when no content is visible
            display: pebblsJourney && (pebblsShowMap || pebblsShowStats) ? "block" : "flex", // Center the message when no content is visible
            alignItems: pebblsJourney && (pebblsShowMap || pebblsShowStats) ? "unset" : "center",
            borderWidth: pebblsOutlineBorder ? "2px" : 0,
            borderStyle: "solid",
            borderColor: "#999999",
            justifyContent:
              pebblsJourney && (pebblsShowMap || pebblsShowStats) ? "unset" : "center",
          },
        },
        // Show message if no journey is selected
        pebblsError
          ? createElement(
              "div",
              {
                style: {
                  padding: "16px",
                  backgroundColor: "#f8d7da",
                  color: "#721c24",
                  borderRadius: "8px",
                  textAlign: "center",
                },
              },
              "Unable to load journeys. Please check your API key and try again."
            )
          : !pebblsJourney
          ? createElement(
              "div",
              {
                style: {
                  padding: "16px",
                  color: "#555",
                  textAlign: "center",
                },
              },
              "Please select a journey to display the map and stats."
            )
          : !pebblsShowMap && !pebblsShowStats
          ? createElement(
              "div",
              {
                style: {
                  padding: "16px",
                  color: "#555",
                  textAlign: "center",
                },
              },
              "Please enable the map or stats to display the content."
            )
          : null,
        // Show Map if enabled and no error
        pebblsShowMap && pebblsJourney && !pebblsError
          ? (() => {
              return createElement("iframe", {
                src: `https://www.pebbls.com/pebbls-core/embed3.php?embedKey=${pebblsJourney}`,
                style: {
                  width: "100%",
                  height: `${pebblsJourneyHeight}px`,
                  border: "none",
                  borderRadius: pebblsShowStats
                    ? pebblsRoundedCorners
                      ? "12px 12px 0 0"
                      : 0
                    : pebblsRoundedCorners
                    ? "12px"
                    : 0,
                },
                title: "Pebbls Journey",
                loading: "lazy",
              });
            })()
          : null,
        // Add an overlay to allow block selection
        !isSelected &&
          createElement("div", {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "transparent",
              zIndex: 1, // Ensure the overlay is above the iframe
            },
          }),
        // Show Stats if enabled and no error
        selectedJourney && pebblsShowStats && !pebblsError
          ? createElement(
              "a",
              {
                href: selectedJourney.link,
                target: "_blank",
                rel: "noopener noreferrer",
                style: {
                  display: "block",
                  backgroundColor: "#f1f1f1",
                  borderRadius: pebblsShowMap ? "0 0 12px 12px" : "12px",
                  padding: "8px 12px",
                  textDecoration: "none",
                },
              },
              // Journey Name as the Title
              createElement(
                "div",
                {
                  style: {
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginBottom: "8px",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  },
                },
                createElement(
                  "h3",
                  {
                    style: {
                      fontSize: "15px",
                      marginTop: "0", // Zero margin-top for journey title
                      marginBottom: "6px",
                      color: "#007bff",
                    },
                  },
                  selectedJourney.name
                ),
                // Journey Total Distance
                createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "4px",
                      fontWeight: "bold", // Bold style for the total line
                    },
                  },
                 createElement("img", {
       src: `${PebblsPluginData.pluginUrl}assets/svg/circle.svg`,
        alt: "Total",
        style: {
          width: "18px",
          height: "18px",
          marginRight: "6px",
        },
      }),

                  createElement(
                    "span",
                    { style: { fontSize: "14px", color: "#333" } },
                    `Total: ${
                      journeyTotalDistance > 10000
                        ? Math.round(journeyTotalDistance / 1000)
                        : journeyTotalDistance > 1000
                        ? (journeyTotalDistance / 1000).toFixed(1)
                        : journeyTotalDistance
                    } ${journeyTotalDistance > 1000 ? "km" : "m"}`
                  )
                ),
                // Total Distance for each transport type, ordered in descending order
                Object.entries(selectedJourney.distance)
                  .sort(([, a], [, b]) => b - a)
                  .map(
                    ([transport, distance]) =>
                      distance > 0 &&
                      createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "4px",
                          },
                        },
                        createElement("img", {
                                   src: `${PebblsPluginData.pluginUrl}assets/svg/${transport}.svg`,
                          alt: transport,
                          style: {
                            width: "18px",
                            height: "18px",
                            marginRight: "6px",
                          },
                        }),
                        createElement(
                          "span",
                          { style: { fontSize: "14px", color: "#333" } },
                          `${
                            distance > 10000
                              ? Math.round(distance / 1000)
                              : distance > 1000
                              ? (distance / 1000).toFixed(1)
                              : distance
                          } ${distance > 1000 ? "km" : "m"}`
                        )
                      )
                  )
              ),
              // Journey Legs Section
              createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "4px",
                  },
                },
                selectedJourney.legs?.map((leg) => {
                  const totalDistance = Object.values(leg.distance).reduce(
                    (sum, distance) => sum + distance,
                    0
                  );

                  return createElement(
                    "a",
                    {
                      href: `${selectedJourney.link}#leg=${leg.id}`,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      style: {
                        textDecoration: "none",
                        flex: "1 1 calc(33.333% - 8px)",
                        boxSizing: "border-box",
                        display: "flex",
                      },
                    },
                    createElement(
                      "div",
                      {
                        style: {
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          padding: "8px",
                          width: "100%",
                          transition: "box-shadow 0.3s",
                          cursor: "pointer",
                        },
                      },
                      createElement(
                        "div",
                        {
                          style: {
                            color: "#007bff",
                            fontWeight: "600",
                            fontSize: "14px",
                            marginBottom: "6px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        },
                        leg.name
                      ),
                      createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "6px",
                            fontWeight: "bold", // Bold style for total line
                          },
                        },
                        createElement("img", {
       src: `${PebblsPluginData.pluginUrl}assets/svg/circle.svg`,
                          alt: "Leg Total",
                          style: {
                            width: "18px",
                            height: "18px",
                            marginRight: "5px",
                          },
                        }),
                        createElement(
                          "span",
                          {
                            style: { fontSize: "14px", color: "#333" },
                          },
                          `Total: ${
                            totalDistance > 10000
                              ? Math.round(totalDistance / 1000)
                              : totalDistance > 1000
                              ? (totalDistance / 1000).toFixed(1)
                              : totalDistance
                          } ${totalDistance > 1000 ? "km" : "m"}`
                        )
                      ),
                      // Display each transport type distance, ordered in descending order
                      Object.entries(leg.distance)
                        .sort(([, a], [, b]) => b - a)
                        .map(
                          ([transport, distance]) =>
                            distance > 0 &&
                            createElement(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  marginBottom: "4px",
                                },
                              },
                              createElement("img", {
                                       src: `${PebblsPluginData.pluginUrl}assets/svg/${transport}.svg`,
                                alt: transport,
                                style: {
                                  width: "18px",
                                  height: "18px",
                                  marginRight: "6px",
                                },
                              }),
                              createElement(
                                "span",
                                {
                                  style: { fontSize: "14px", color: "#333" },
                                },
                                `${
                                  distance > 10000
                                    ? Math.round(distance / 1000)
                                    : distance > 1000
                                    ? (distance / 1000).toFixed(1)
                                    : distance
                                } ${distance > 1000 ? "km" : "m"}`
                              )
                            )
                        )
                    )
                  );
                })
              )
            )
          : null
      )
    );
  },
  save() {
    return null; // Rendered in PHP, so no need to save anything to the post content.
  },
});
