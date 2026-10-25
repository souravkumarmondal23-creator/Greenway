// ==========================================
// ROUTELEAF - MAP SETUP
// ==========================================

let map =
    L.map("map").setView(
        [22.5726, 88.3639],
        12
    );


L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,

        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


let routeLayer =
    L.layerGroup().addTo(map);


// ==========================================
// LOAD SAVED DATA
// ==========================================

let journeyData =
    JSON.parse(
        localStorage.getItem(
            "routeLeafJourneys"
        ) || "[]"
    );


let greenPoints =
    Number(
        localStorage.getItem(
            "routeLeafPoints"
        ) || 0
    );


// ==========================================
// FIND ROUTE
// ==========================================

async function findRoute() {


    let from =
        document
            .getElementById("from")
            .value
            .trim();


    let to =
        document
            .getElementById("to")
            .value
            .trim();


    let transport =
        document
            .getElementById("transport")
            .value;


    // ==========================================
    // VALIDATE
    // ==========================================

    if (
        from === "" ||
        to === ""
    ) {

        document.getElementById(
            "result"
        ).innerHTML = `

            <div class="route-result">

                <h2>
                    ⚠️ Missing Location
                </h2>

                <p style="text-align:center;">

                    Please enter both
                    starting point and destination.

                </p>

            </div>

        `;

        return;

    }


    // ==========================================
    // LOADING
    // ==========================================

    document.getElementById(
        "result"
    ).innerHTML = `

        <div class="route-result">

            <h2>
                🗺️ Finding Route...
            </h2>

            <p style="text-align:center;">

                RouteLeaf is calculating
                your journey.

            </p>

        </div>

    `;


    try {


        // ==========================================
        // GEOCODING
        // ==========================================

        let startLocation =
            await geocodeLocation(from);


        let endLocation =
            await geocodeLocation(to);


        if (
            !startLocation ||
            !endLocation
        ) {

            throw new Error(
                "One or both locations could not be found."
            );

        }


        // ==========================================
        // ROUTING
        // ==========================================

        let route =
            await getRoute(
                startLocation,
                endLocation
            );


        if (!route) {

            throw new Error(
                "No route could be found."
            );

        }


        // ==========================================
        // DISTANCE
        // ==========================================

        let distance =
            Number(
                (
                    route.distance /
                    1000
                ).toFixed(2)
            );


        // ==========================================
        // CLEAR MAP
        // ==========================================

        routeLayer.clearLayers();


        // ==========================================
        // MARKERS
        // ==========================================

        L.marker([
            startLocation.lat,
            startLocation.lon
        ])
        .bindPopup(
            "📍 Start: " + from
        )
        .addTo(routeLayer);


        L.marker([
            endLocation.lat,
            endLocation.lon
        ])
        .bindPopup(
            "🏁 Destination: " + to
        )
        .addTo(routeLayer);


        // ==========================================
        // ROUTE LINE
        // ==========================================

        let routeLine =
            L.geoJSON(
                route.geometry,
                {

                    style: {

                        color:
                            "#1f7a45",

                        weight: 6,

                        opacity: 0.85

                    }

                }
            );


        routeLine.addTo(
            routeLayer
        );


        map.fitBounds(
            routeLine.getBounds(),
            {
                padding:
                    [30, 30]
            }
        );


        // ==========================================
        // TRANSPORT DATA
        // ==========================================

        let transportData = {

            walk: {

                name:
                    "Walking",

                icon:
                    "🚶",

                speed:
                    5,

                emission:
                    0

            },


            cycle: {

                name:
                    "Bicycle",

                icon:
                    "🚲",

                speed:
                    15,

                emission:
                    0

            },


            bus: {

                name:
                    "Bus",

                icon:
                    "🚌",

                speed:
                    30,

                emission:
                    80

            },


            bike: {

                name:
                    "Motorcycle",

                icon:
                    "🏍️",

                speed:
                    40,

                emission:
                    100

            },


            car: {

                name:
                    "Car",

                icon:
                    "🚗",

                speed:
                    45,

                emission:
                    150

            }

        };


        // ==========================================
        // CALCULATE OPTIONS
        // ==========================================

        let options = [];


        for (
            let mode in
            transportData
        ) {


            let data =
                transportData[
                    mode
                ];


            let time =
                Math.round(
                    (
                        distance /
                        data.speed
                    ) * 60
                );


            let co2 =
                (
                    distance *
                    data.emission
                ) / 1000;


            options.push({

                mode:
                    mode,

                name:
                    data.name,

                icon:
                    data.icon,

                time:
                    time,

                co2:
                    co2

            });

        }


        // ==========================================
        // SMART ECO SCORE
        // ==========================================

        let maxTime =
            Math.max(
                ...options.map(
                    option =>
                        option.time
                )
            );


        let maxCO2 =
            Math.max(
                ...options.map(
                    option =>
                        option.co2
                )
            );


        options.forEach(
            option => {


                let co2Score;


                if (
                    maxCO2 === 0
                ) {

                    co2Score =
                        100;

                }

                else {

                    co2Score =
                        100 -
                        (
                            option.co2 /
                            maxCO2
                        ) * 100;

                }


                let timeScore =
                    100 -
                    (
                        option.time /
                        maxTime
                    ) * 100;


                let smartScore =
                    (
                        co2Score *
                        0.70
                    ) +
                    (
                        timeScore *
                        0.30
                    );


                option.score =
                    Math.round(
                        Math.max(
                            0,
                            Math.min(
                                100,
                                smartScore
                            )
                        )
                    );

            }
        );


        // ==========================================
        // FASTEST
        // ==========================================

        let fastest =
            [...options].sort(
                (a, b) =>
                    a.time -
                    b.time
            )[0];


        // ==========================================
        // BEST ECO OPTION
        // ==========================================

        let greenest =
            [...options].sort(
                (a, b) =>
                    b.score -
                    a.score
            )[0];


        // ==========================================
        // SELECTED
        // ==========================================

        let selected =
            options.find(
                option =>
                    option.mode ===
                    transport
            );


        // ==========================================
        // CO₂ SAVINGS
        // ==========================================

        let saving = 0;


        if (
            fastest.co2 > 0
        ) {

            saving =
                (
                    (
                        fastest.co2 -
                        greenest.co2
                    ) /
                    fastest.co2
                ) * 100;

        }


        saving =
            Math.round(
                saving
            );


        let co2Saved =
            Math.max(
                0,
                fastest.co2 -
                greenest.co2
            );


        // ==========================================
        // GREEN POINTS
        // ==========================================

        let points = 0;


        if (
            transport === "walk"
        ) {

            points = 15;

        }

        else if (
            transport === "cycle"
        ) {

            points = 15;

        }

        else if (
            transport === "bus"
        ) {

            points = 10;

        }

        else if (
            transport === "bike"
        ) {

            points = 3;

        }

        else {

            points = 0;

        }


        // Bonus for high eco score

        if (
            selected.score >= 80
        ) {

            points += 5;

        }


        greenPoints += points;


        localStorage.setItem(
            "routeLeafPoints",
            greenPoints
        );


        // ==========================================
        // SAVE JOURNEY
        // ==========================================

        journeyData.unshift({

            from:
                from,

            to:
                to,

            transport:
                selected.name,

            icon:
                selected.icon,

            distance:
                distance,

            co2:
                selected.co2,

            score:
                selected.score,

            co2Saved:
                co2Saved

        });


        // Keep latest 10

        journeyData =
            journeyData.slice(
                0,
                10
            );


        localStorage.setItem(
            "routeLeafJourneys",
            JSON.stringify(
                journeyData
            )
        );


        // ==========================================
        // DISPLAY RESULT
        // ==========================================

        document.getElementById(
            "result"
        ).innerHTML = `

            <div class="route-result">


                <h2>
                    🌱 Route Found
                </h2>


                <p>

                    📍
                    <strong>
                        From:
                    </strong>

                    ${from}

                </p>


                <p>

                    🏁
                    <strong>
                        To:
                    </strong>

                    ${to}

                </p>


                <hr>


                <!-- SELECTED -->

                <div class="selected-route">


                    <h3>

                        ${selected.icon}

                        ${selected.name}

                    </h3>


                    <p>

                        📏
                        <strong>
                            Distance:
                        </strong>

                        ${distance} km

                    </p>


                    <p>

                        ⏱️
                        <strong>
                            Estimated Time:
                        </strong>

                        ${selected.time}
                        minutes

                    </p>


                    <p>

                        🌍
                        <strong>
                            CO₂:
                        </strong>

                        ${selected.co2.toFixed(2)}
                        kg

                    </p>


                    <p>

                        🌱
                        <strong>
                            Smart Eco Score:
                        </strong>

                        ${selected.score}/100

                    </p>


                    <p>

                        🏆
                        <strong>
                            Green Points Earned:
                        </strong>

                        +${points}

                    </p>


                </div>


                <!-- OPTIONS -->

                <h3>
                    🆚 Travel Options
                </h3>


                <div class="comparison-container">


                    ${options.map(
                        option => `

                        <div class="option-card">


                            <div class="option-icon">

                                ${option.icon}

                            </div>


                            <strong>

                                ${option.name}

                            </strong>


                            <p>

                                ⏱️
                                ${option.time}
                                min

                            </p>


                            <p>

                                🌍
                                ${option.co2.toFixed(2)}
                                kg

                            </p>


                            <p>

                                🌱
                                ${option.score}/100

                            </p>


                        </div>

                    `
                    ).join("")}


                </div>


                <!-- RECOMMENDATION -->

                <div class="eco-recommendation">


                    <h3>

                        🍃 Smart Recommendation

                    </h3>


                    <p>

                        ${greenest.icon}

                        <strong>

                            ${greenest.name}

                        </strong>

                        has the highest
                        Smart Eco Score.

                    </p>


                    ${
                        saving > 0

                        ? `

                        <p>

                            🌍
                            Potential CO₂ reduction:

                            <strong>

                                ${saving}%

                            </strong>

                        </p>

                        `

                        : ""

                    }


                </div>


                <!-- GREEN IMPACT -->

                <div class="green-impact">


                    <h3>

                        🌍 Your Green Impact

                    </h3>


                    <div class="impact-number">

                        ${co2Saved.toFixed(2)}

                    </div>


                    <div class="impact-unit">

                        kg CO₂ potentially avoided

                    </div>


                    <div class="impact-bar">


                        <div
                            class="impact-fill"
                            style="
                                width:
                                ${Math.min(
                                    saving,
                                    100
                                )}%;
                            "
                        ></div>


                    </div>


                    <p class="impact-message">

                        🍃 Choosing a greener option
                        can make every journey
                        more sustainable.

                    </p>


                </div>


                <p class="disclaimer">

                    CO₂ values are estimates based
                    on transport-mode emission factors.

                </p>


            </div>

        `;


        // ==========================================
        // UPDATE DASHBOARD
        // ==========================================

        updateDashboard();

    }


    catch (error) {


        console.error(
            error
        );


        document.getElementById(
            "result"
        ).innerHTML = `

            <div class="route-result">


                <h2>

                    ⚠️ Route Not Found

                </h2>


                <p
                    style="
                        text-align:center;
                    "
                >

                    ${error.message}

                </p>


                <p
                    style="
                        text-align:center;
                    "
                >

                    Try entering a more
                    specific location.

                </p>


            </div>

        `;

    }

}


// ==========================================
// GEOCODING
// ==========================================

async function geocodeLocation(
    place
) {


    let originalPlace =
        place.trim();


    let key =
        originalPlace.toLowerCase();


    // ==========================================
    // KNOWN LOCATIONS
    // ==========================================

    const knownLocations = {


        "kolkata": {

            lat:
                22.5726,

            lon:
                88.3639

        },


        "howrah": {

            lat:
                22.5958,

            lon:
                88.2636

        },


        "salt lake": {

            lat:
                22.5804,

            lon:
                88.4125

        },


        "new town": {

            lat:
                22.5958,

            lon:
                88.4797

        },


        "uem": {

            lat:
                22.5603,

            lon:
                88.4902

        },


        "uem kolkata": {

            lat:
                22.5603,

            lon:
                88.4902

        },


        "university of engineering and management kolkata": {

            lat:
                22.5603,

            lon:
                88.4902

        },


        "university of engineering & management kolkata": {

            lat:
                22.5603,

            lon:
                88.4902

        }

    };


    if (
        knownLocations[key]
    ) {

        return knownLocations[key];

    }


    // ==========================================
    // NOMINATIM
    // ==========================================

    let query =
        originalPlace;


    if (
        !query
            .toLowerCase()
            .includes("india")
    ) {

        query +=
            ", India";

    }


    let url =
        "https://nominatim.openstreetmap.org/search" +

        "?format=jsonv2" +

        "&limit=1" +

        "&q=" +

        encodeURIComponent(
            query
        );


    let response =
        await fetch(
            url
        );


    if (
        !response.ok
    ) {

        throw new Error(
            "Location search failed."
        );

    }


    let data =
        await response.json();


    if (
        data.length === 0
    ) {

        return null;

    }


    return {

        lat:
            parseFloat(
                data[0].lat
            ),

        lon:
            parseFloat(
                data[0].lon
            )

    };

}


// ==========================================
// OSRM ROUTING
// ==========================================

async function getRoute(
    start,
    end
) {


    let url =

        "https://router.project-osrm.org/route/v1/driving/" +

        start.lon + "," +
        start.lat + ";" +

        end.lon + "," +
        end.lat +

        "?overview=full&geometries=geojson";


    let response =
        await fetch(
            url
        );


    if (
        !response.ok
    ) {

        throw new Error(
            "Routing service is unavailable."
        );

    }


    let data =
        await response.json();


    if (

        data.code !== "Ok" ||

        !data.routes ||

        data.routes.length === 0

    ) {

        return null;

    }


    return data.routes[0];

}


// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard() {


    let scoreElement =
        document.getElementById(
            "dashboardScore"
        );


    let co2Element =
        document.getElementById(
            "co2Saved"
        );


    let tripElement =
        document.getElementById(
            "tripCount"
        );


    let ecoElement =
        document.getElementById(
            "ecoTrips"
        );


    let pointsElement =
        document.getElementById(
            "greenPoints"
        );


    let historyElement =
        document.getElementById(
            "journeyHistory"
        );


    let achievementElement =
        document.getElementById(
            "achievementList"
        );


    if (
        !scoreElement ||
        !co2Element ||
        !tripElement ||
        !ecoElement ||
        !pointsElement ||
        !historyElement ||
        !achievementElement
    ) {

        return;

    }


    // ==========================================
    // TOTAL TRIPS
    // ==========================================

    let trips =
        journeyData.length;


    // ==========================================
    // CO2 SAVED
    // ==========================================

    let totalCO2 =
        journeyData.reduce(
            (
                total,
                journey
            ) =>

                total +
                Number(
                    journey.co2Saved ||
                    0
                ),

            0
        );


    // ==========================================
    // AVERAGE SCORE
    // ==========================================

    let averageScore = 0;


    if (
        trips > 0
    ) {

        averageScore =

            journeyData.reduce(
                (
                    total,
                    journey
                ) =>

                    total +
                    Number(
                        journey.score ||
                        0
                    ),

                0

            ) / trips;

    }


    averageScore =
        Math.round(
            averageScore
        );


    // ==========================================
    // ECO TRIPS
    // ==========================================

    let ecoChoices =
        journeyData.filter(
            journey =>
                journey.score >= 70
        ).length;


    // ==========================================
    // UPDATE
    // ==========================================

    scoreElement.textContent =
        averageScore;


    co2Element.textContent =
        totalCO2.toFixed(2)
        + " kg";


    tripElement.textContent =
        trips;


    ecoElement.textContent =
        ecoChoices;


    pointsElement.textContent =
        greenPoints;


    // ==========================================
    // HISTORY
    // ==========================================

    if (
        trips === 0
    ) {

        historyElement.innerHTML = `

            <p class="empty-history">

                Your journeys will appear here.

            </p>

        `;

    }

    else {

        historyElement.innerHTML =

            journeyData.map(
                journey => `

                    <div class="history-item">


                        <strong>

                            ${journey.icon}

                            ${journey.from}

                            →

                            ${journey.to}

                        </strong>


                        <p>

                            ${journey.icon}

                            ${journey.transport}

                            •

                            ${journey.distance}
                            km

                            •

                            ${journey.co2.toFixed(2)}
                            kg CO₂

                        </p>


                        <p>

                            🌱 Eco Score:

                            ${journey.score}/100

                        </p>


                    </div>

                `
            ).join("");

    }


    // ==========================================
    // ACHIEVEMENTS
    // ==========================================

    let bicycleTrips =
        journeyData.filter(
            journey =>
                journey.transport ===
                "Bicycle"
        ).length;


    let achievements = [

        {

            icon:
                "🌱",

            title:
                "First Step",

            description:
                "Complete your first journey.",

            unlocked:
                trips >= 1

        },


        {

            icon:
                "🍃",

            title:
                "Eco Traveler",

            description:
                "Complete 5 eco-friendly journeys.",

            unlocked:
                ecoChoices >= 5

        },


        {

            icon:
                "🚲",

            title:
                "Green Commuter",

            description:
                "Choose bicycle 5 times.",

            unlocked:
                bicycleTrips >= 5

        },


        {

            icon:
                "🌍",

            title:
                "Planet Protector",

            description:
                "Avoid 5 kg of estimated CO₂.",

            unlocked:
                totalCO2 >= 5

        },


        {

            icon:
                "🏆",

            title:
                "Green Champion",

            description:
                "Earn 500 Green Points.",

            unlocked:
                greenPoints >= 500

        }

    ];


    achievementElement.innerHTML =

        achievements.map(
            achievement => `

                <div
                    class="
                        achievement
                        ${
                            achievement.unlocked
                            ? "unlocked"
                            : "locked"
                        }
                    "
                >


                    <div class="achievement-icon">

                        ${achievement.icon}

                    </div>


                    <div>

                        <div class="achievement-title">

                            ${achievement.title}

                        </div>


                        <div class="achievement-description">

                            ${achievement.description}

                        </div>

                    </div>


                </div>

            `
        ).join("");

}


// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

updateDashboard();
