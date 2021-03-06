/*
 * @author     Martin Høgh
 * @copyright  2013-2020 MapCentia ApS
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

'use strict';

/**
 *
 * @type {*|exports|module.exports}
 */
var cloud;

/**
 * @type {*|exports|module.exports}
 */
var backboneEvents;

/**
 *
 * @type {string}
 */
var AHOST = "https://dk.gc2.io";

/**
 *
 * @type {string}
 */
var ADB = "dk";

/**
 *
 * @type {string}
 */
var MHOST = "https://dk.gc2.io";

/**
 *
 * @type {string}
 */
var MDB = "dk";

/**
 * Global var with config object
 */
window.vidiConfig = require('../../../config/config.js');

/**
 *
 * @type {{set: module.exports.set, init: module.exports.init}}
 */
module.exports = {
    set: function (o) {
        cloud = o.cloud;
        backboneEvents = o.backboneEvents;
        return this;
    },
    init: function (onLoad, el, onlyAddress, getProperty) {
        let type1, type2, type3, type4, gids = {}, searchString, dslM, shouldA = [], shouldM = [], dsl1, dsl2, size,
            komKode = window.vidiConfig.searchConfig.komkode, placeStore, maxZoom, searchTxt,
            esrSearchActive = typeof (window.vidiConfig.searchConfig.esrSearchActive) !== "undefined" ? window.vidiConfig.searchConfig.esrSearchActive : false,
            sfeSearchActive = typeof (window.vidiConfig.searchConfig.sfeSearchActive) !== "undefined" ? window.vidiConfig.searchConfig.sfeSearchActive : false;
            size = typeof (window.vidiConfig.searchConfig.size) !== "undefined" ? window.vidiConfig.searchConfig.size : 10;

        // adjust search text
        let placeholder =window.vidiConfig?.searchConfig?.placeholderText;
        if (placeholder) {
            searchTxt = placeholder;
            $("#custom-search, #conflict-custom-search").attr("placeholder",
                searchTxt
            );
        } else {
            searchTxt = "Adresse, matr. nr.";
            if (sfeSearchActive) {
                $("#custom-search").attr("placeholder",
                    searchTxt
                    + (esrSearchActive ? ", ESR nr. " : "")
                    + " eller SFE nr.");
            } else if (esrSearchActive) {
                $("#custom-search").attr("placeholder",
                    searchTxt + " eller ESR nr.");
            }
        }

        // Set max zoom then zooming on target
        // ===================================

        maxZoom = 18;

        // Listen for clearing event
        // =========================

        backboneEvents.get().on("clear:search", function () {
            console.info("Clearing search");
            placeStore.reset();
            $("#custom-search").val("");
        });


        // Set default onLoad function.
        // It just zooms to feature
        // ============================

        if (!onLoad) {
            onLoad = function () {
                var resultLayer = new L.FeatureGroup();
                cloud.get().map.addLayer(resultLayer);
                resultLayer.addLayer(this.layer);
                cloud.get().zoomToExtentOfgeoJsonStore(this, maxZoom);
            }
        }


        // Set default input element
        // =========================

        if (!el) {
            el = "custom-search";
        }

        // Define GC2 SQL store
        // ====================

        placeStore = new geocloud.sqlStore({
            jsonp: false,
            method: "POST",
            dataType: "json",
            sql: null,
            clickable: false,
            // Make Awesome Markers
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: L.AwesomeMarkers.icon({
                            icon: 'home',
                            markerColor: '#C31919',
                            prefix: 'fa'
                        }
                    )
                });
            },
            styleMap: {
                weight: 3,
                color: '#C31919',
                dashArray: '',
                Opacity: 1,
                fillOpacity: 0
            },
            onLoad: onLoad
        });

        if (komKode !== "*") {
            if (typeof komKode === "string") {
                komKode = [komKode];
            }
            $.each(komKode, function (i, v) {
                shouldA.push({
                    "term": {
                        "properties.kommunekode": "0" + v
                    }
                });
                shouldM.push({
                    "term": {
                        "properties.kommunekode": "" + v
                    }
                });
            });
        }
        let standardSearches = [{
            name: 'adresse',
            displayKey: 'value',
            templates: {
                header: '<h2 class="typeahead-heading">Adresser</h2>'
            },
            source: function (query, cb) {
                if (query.match(/\d+/g) === null && query.match(/\s+/g) === null) {
                    type1 = "vejnavn,bynavn";
                }
                if (query.match(/\d+/g) === null && query.match(/\s+/g) !== null) {
                    type1 = "vejnavn_bynavn";
                }
                if (query.match(/\d+/g) !== null) {
                    type1 = "adresse";
                }
                var names = [];
                (function ca() {
                    switch (type1) {
                        case "vejnavn,bynavn":
                            gids[type1] = [];
                            dsl1 = {
                                "from": 0,
                                "size": size,
                                "query": {
                                    "bool": {
                                        "must": {
                                            "query_string": {
                                                "default_field": "properties.string2",
                                                "query": query.toLowerCase().replace(",", ""),
                                                "default_operator": "AND"
                                            }
                                        },
                                        "filter": {
                                            "bool": {
                                                "should": shouldA
                                            }
                                        }
                                    }
                                },
                                "aggregations": {
                                    "properties.postnrnavn": {
                                        "terms": {
                                            "field": "properties.postnrnavn",
                                            "size": size,
                                            "order": {
                                                "_term": "asc"
                                            }
                                        },
                                        "aggregations": {
                                            "properties.postnr": {
                                                "terms": {
                                                    "field": "properties.postnr",
                                                    "size": size
                                                },
                                                "aggregations": {
                                                    "properties.kommunekode": {
                                                        "terms": {
                                                            "field": "properties.kommunekode",
                                                            "size": size
                                                        },
                                                        "aggregations": {
                                                            "properties.regionskode": {
                                                                "terms": {
                                                                    "field": "properties.regionskode",
                                                                    "size": size
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                            dsl2 = {
                                "from": 0,
                                "size": size,
                                "query": {
                                    "bool": {
                                        "must": {
                                            "query_string": {
                                                "default_field": "properties.string3",
                                                "query": query.toLowerCase().replace(",", ""),
                                                "default_operator": "AND"
                                            }
                                        },
                                        "filter": {
                                            "bool": {
                                                "should": shouldA
                                            }
                                        }
                                    }
                                },
                                "aggregations": {
                                    "properties.vejnavn": {
                                        "terms": {
                                            "field": "properties.vejnavn",
                                            "size": size,
                                            "order": {
                                                "_term": "asc"
                                            }
                                        },
                                        "aggregations": {
                                            "properties.kommunekode": {
                                                "terms": {
                                                    "field": "properties.kommunekode",
                                                    "size": size
                                                },
                                                "aggregations": {
                                                    "properties.regionskode": {
                                                        "terms": {
                                                            "field": "properties.regionskode",
                                                            "size": size
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                            break;
                        case "vejnavn_bynavn":
                            gids[type1] = [];
                            dsl1 = {
                                "from": 0,
                                "size": size,
                                "query": {
                                    "bool": {
                                        "must": {
                                            "query_string": {
                                                "default_field": "properties.string1",
                                                "query": query.toLowerCase().replace(",", ""),
                                                "default_operator": "AND"
                                            }
                                        },
                                        "filter": {
                                            "bool": {
                                                "should": shouldA
                                            }
                                        }
                                    }
                                },
                                "aggregations": {
                                    "properties.vejnavn": {
                                        "terms": {
                                            "field": "properties.vejnavn",
                                            "size": size,
                                            "order": {
                                                "_term": "asc"
                                            }
                                        },
                                        "aggregations": {
                                            "properties.postnrnavn": {
                                                "terms": {
                                                    "field": "properties.postnrnavn",
                                                    "size": size
                                                },
                                                "aggregations": {
                                                    "properties.kommunekode": {
                                                        "terms": {
                                                            "field": "properties.kommunekode",
                                                            "size": size
                                                        },
                                                        "aggregations": {
                                                            "properties.regionskode": {
                                                                "terms": {
                                                                    "field": "properties.regionskode",
                                                                    "size": size
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            };
                            break;
                        case "adresse":
                            gids[type1] = [];
                            dsl1 = {
                                "from": 0,
                                "size": size,
                                "query": {
                                    "bool": {
                                        "must": {
                                            "query_string": {
                                                "default_field": "properties.string5",
                                                "query": query.toLowerCase().replace(",", ""),
                                                "default_operator": "AND"
                                            }
                                        },
                                        "filter": {
                                            "bool": {
                                                "should": shouldA
                                            }
                                        }
                                    }
                                },

                                "sort": [
                                    {
                                        "properties.vejnavn": {
                                            "order": "asc"
                                        }
                                    },
                                    {
                                        "properties.husnr": {
                                            "order": "asc"
                                        }
                                    },
                                    {
                                        "properties.litra": {
                                            "order": "asc"
                                        }
                                    }
                                ]
                            };
                            break;
                    }

                    $.ajax({
                        url: AHOST + '/api/v2/elasticsearch/search/' + ADB + '/dar/adgangsadresser_view',
                        data: JSON.stringify(dsl1),
                        contentType: "application/json; charset=utf-8",
                        scriptCharset: "utf-8",
                        dataType: 'json',
                        type: "POST",
                        success: function (response) {
                            if (response.hits === undefined) return;
                            if (type1 === "vejnavn,bynavn") {
                                if (response.aggregations === undefined) return;
                                if (response.aggregations["properties.postnrnavn"] === undefined) return;
                                $.each(response.aggregations["properties.postnrnavn"].buckets, function (i, hit) {
                                    var str = hit.key;
                                    names.push({value: str});
                                });
                                $.ajax({
                                    url: AHOST + '/api/v2/elasticsearch/search/' + ADB + '/dar/adgangsadresser_view',
                                    data: JSON.stringify(dsl2),
                                    contentType: "application/json; charset=utf-8",
                                    scriptCharset: "utf-8",
                                    dataType: 'json',
                                    type: "POST",
                                    success: function (response) {
                                        if (response.hits === undefined) return;
                                        if (type1 === "vejnavn,bynavn") {
                                            if (response.aggregations === undefined) return;
                                            if (response.aggregations["properties.vejnavn"] === undefined) return;
                                            $.each(response.aggregations["properties.vejnavn"].buckets, function (i, hit) {
                                                var str = hit.key;
                                                names.push({value: str});
                                            });
                                        }
                                        if (names.length === 1 && (type1 === "vejnavn,bynavn" || type1 === "vejnavn_bynavn")) {
                                            type1 = "adresse";
                                            names = [];
                                            gids[type1] = [];
                                            ca();
                                        } else {
                                            cb(names);
                                        }

                                    }
                                })
                            } else if (type1 === "vejnavn_bynavn") {
                                if (response.aggregations === undefined) return;
                                if (response.aggregations["properties.vejnavn"] === undefined) return;
                                $.each(response.aggregations["properties.vejnavn"].buckets, function (i, hit) {
                                    var str = hit.key;
                                    $.each(hit["properties.postnrnavn"].buckets, function (m, n) {
                                        var tmp = str;
                                        tmp = tmp + ", " + n.key;
                                        names.push({value: tmp});
                                    });

                                });
                                if (names.length === 1 && (type1 === "vejnavn,bynavn" || type1 === "vejnavn_bynavn")) {
                                    type1 = "adresse";
                                    names = [];
                                    gids[type1] = [];
                                    ca();
                                } else {
                                    cb(names);
                                }

                            } else if (type1 === "adresse") {
                                $.each(response.hits.hits, function (i, hit) {
                                    var str = hit._source.properties.string4;
                                    gids[type1][str] = hit._source.properties.gid;
                                    names.push({value: str});
                                });
                                if (names.length === 1 && (type1 === "vejnavn,bynavn" || type1 === "vejnavn_bynavn")) {
                                    type1 = "adresse";
                                    names = [];
                                    gids[type1] = [];
                                    ca();
                                } else {
                                    cb(names);
                                }
                            }

                        }
                    })
                })();
            }
        }, {
            name: 'matrikel',
            displayKey: 'value',
            templates: {
                header: '<h2 class="typeahead-heading">Matrikel</h2>'
            },
            source: function (query, cb) {
                var names = [];
                type2 = (query.match(/\d+/g) != null) ? "jordstykke" : "ejerlav";
                if (!onlyAddress) {
                    (function ca() {

                        switch (type2) {
                            case "jordstykke":
                                gids[type2] = [];
                                dslM = {
                                    "from": 0,
                                    "size": size,
                                    "query": {
                                        "bool": {
                                            "must": {
                                                "query_string": {
                                                    "default_field": "properties.string1",
                                                    "query": query.toLowerCase(),
                                                    "default_operator": "AND"
                                                }
                                            },
                                            "filter": {
                                                "bool": {
                                                    "should": shouldM
                                                }
                                            }
                                        }
                                    },
                                    "sort": [
                                        {
                                            "properties.nummer": {
                                                "order": "asc"
                                            }
                                        },
                                        {
                                            "properties.litra": {
                                                "order": "asc"
                                            }
                                        },
                                        {
                                            "properties.ejerlavsnavn": {
                                                "order": "asc"
                                            }
                                        }
                                    ]
                                };
                                break;
                            case "ejerlav":
                                gids[type2] = [];
                                dslM = {
                                    "from": 0,
                                    "size": size,
                                    "query": {
                                        "bool": {
                                            "must": {
                                                "query_string": {
                                                    "default_field": "properties.string1",
                                                    "query": query.toLowerCase(),
                                                    "default_operator": "AND"
                                                }
                                            },
                                            "filter": {
                                                "bool": {
                                                    "should": shouldM
                                                }
                                            }
                                        }
                                    },
                                    "aggregations": {
                                        "properties.ejerlavsnavn": {
                                            "terms": {
                                                "field": "properties.ejerlavsnavn",
                                                "order": {
                                                    "_term": "asc"
                                                },
                                                "size": size
                                            },
                                            "aggregations": {
                                                "properties.kommunekode": {
                                                    "terms": {
                                                        "field": "properties.kommunekode",
                                                        "size": size
                                                    }
                                                }
                                            }
                                        }
                                    }
                                };
                                break;
                        }

                        $.ajax({
                            url: MHOST + '/api/v2/elasticsearch/search/' + MDB + '/matrikel',
                            data: JSON.stringify(dslM),
                            contentType: "application/json; charset=utf-8",
                            scriptCharset: "utf-8",
                            dataType: 'json',
                            type: "POST",
                            success: function (response) {
                                if (response.hits === undefined) return;
                                if (type2 === "ejerlav") {
                                    if (response.aggregations === undefined) return;
                                    if (response.aggregations["properties.ejerlavsnavn"] === undefined) return;
                                    $.each(response.aggregations["properties.ejerlavsnavn"].buckets, function (i, hit) {
                                        var str = hit.key;
                                        names.push({value: str});
                                    });
                                } else {
                                    $.each(response.hits.hits, function (i, hit) {
                                        var str = hit._source.properties.string1;
                                        gids[type2][str] = hit._source.properties.gid;
                                        names.push({value: str});
                                    });
                                }
                                if (names.length === 1 && (type2 === "ejerlav")) {
                                    type2 = "jordstykke";
                                    names = [];
                                    gids[type2] = [];
                                    ca();
                                } else {
                                    cb(names);
                                }

                            }
                        })
                    })();
                }
            }
        }, {
            name: 'esr_ejdnr',
            displayKey: 'value',
            templates: {
                header: '<h2 class="typeahead-heading">Ejendomsnummer (ESR)</h2>'
            },
            source: function (query, cb) {
                if (esrSearchActive) {
                    var names = [];
                    type3 = "esr_nr";
                    if (!onlyAddress) {
                        (function ca() {
                            var qry = "";
                            if (komKode !== "*") {
                                $.each(komKode, function (i, v) {
                                    qry += (qry.length < 1 ? "" : " OR ");
                                    qry += (query.startsWith(v) ? query.toLowerCase() : v + "*" + query.toLowerCase());
                                });
                            }
                            switch (type3) {
                                case "esr_nr":
                                    gids[type3] = [];
                                    dslM = {
                                        "from": 0,
                                        "size": size,
                                        "query": {
                                            "bool": {
                                                "must": {
                                                    "query_string": {
                                                        "default_field": "properties.esr_ejendomsnummer",
                                                        "query": qry,
                                                        "default_operator": "AND"
                                                    }
                                                }
                                            }
                                        }
                                    };
                                    break;

                            }

                            $.ajax({
                                url: MHOST + '/api/v2/elasticsearch/search/' + MDB + '/matrikel',
                                data: JSON.stringify(dslM),
                                contentType: "application/json; charset=utf-8",
                                scriptCharset: "utf-8",
                                dataType: 'json',
                                type: "POST",
                                success: function (response) {
                                    $.each(response.hits.hits, function (i, hit) {
                                        var str = hit._source.properties.esr_ejendomsnummer;
                                        // find only the 20 first real properties
                                        if (names.length < 20 && names.findIndex(x => x.value == str) < 0) {
                                            names.push({value: str});
                                            gids[type3][str] = hit._source.properties.gid;
                                        }
                                    });
                                    if (names.length === 1 && (type3 === "esr_ejdnr")) {
                                        type3 = "esr_ejdnr";
                                        names = [];
                                        gids[type3] = [];
                                        ca();
                                    } else {
                                        names.sort(function (a, b) {
                                            return a.value - b.value
                                        });
                                        cb(names);
                                    }
                                }
                            })
                        })();
                    }
                }
            }
        }, {
            name: 'sfe_ejdnr',
            displayKey: 'value',
            templates: {
                header: '<h2 class="typeahead-heading">Ejendomsnummer (SFE)</h2>'
            },
            source: function (query, cb) {
                if (sfeSearchActive) {
                    var names = [];
                    type4 = "sfe_nr";
                    if (!onlyAddress) {
                        (function ca() {
                            switch (type4) {
                                case "sfe_nr":
                                    gids[type4] = [];
                                    dslM = {
                                        "from": 0,
                                        "size": size,
                                        "query": {
                                            "bool": {
                                                "must": {
                                                    "query_string": {
                                                        "default_field": "properties.sfe_ejendomsnummer",
                                                        "query": query.toLowerCase(),
                                                        "default_operator": "AND"
                                                    }
                                                }
                                            }
                                        }
                                    };
                                    break;
                            }

                            $.ajax({
                                url: MHOST + '/api/v2/elasticsearch/search/' + MDB + '/matrikel',
                                data: JSON.stringify(dslM),
                                contentType: "application/json; charset=utf-8",
                                scriptCharset: "utf-8",
                                dataType: 'json',
                                type: "POST",
                                success: function (response) {
                                    $.each(response.hits.hits, function (i, hit) {
                                        var str = hit._source.properties.sfe_ejendomsnummer;
                                        // find only the 20 first real properties
                                        if (names.length < 20 && names.findIndex(x => x.value === str) < 0) {
                                            names.push({value: str});
                                            console.log(type4)
                                            console.log(str)
                                            gids[type4][str] = hit._source.properties.gid;
                                        }
                                    });
                                    if (names.length === 1 && (type4 === "sfe_ejdnr")) {
                                        type4 = "sfe_ejdnr";
                                        names = [];
                                        gids[type4] = [];
                                        ca();
                                    } else {
                                        names.sort(function (a, b) {
                                            return a.value - b.value
                                        });
                                        cb(names);
                                    }
                                }
                            })
                        })();
                    }
                }
            }
        }];
        let extraSearchesNames = [];
        let extraSearchesObj = {};
        if (typeof (window.vidiConfig.searchConfig.extraSearches) !== "undefined") {
            window.vidiConfig.searchConfig.extraSearches.forEach((v) => {
                extraSearchesNames.push(v.name);
                extraSearchesObj[v.name] = v;
                standardSearches.push(
                    {
                        name: v.name,
                        displayKey: 'value',
                        templates: {
                            header: '<h2 class="typeahead-heading">' + v.heading + '</h2>'
                        },
                        source: function (query, cb) {
                            var names = [];
                            (function ca() {
                                gids[v.name] = [];
                                let dsl = {
                                    "from": 0,
                                    "size": size,
                                    "query": {
                                        "bool": {
                                            "must": {
                                                "query_string": {
                                                    "default_field": "properties." + v.index.field,
                                                    "query": query.toLowerCase(),
                                                    "default_operator": "AND"
                                                }
                                            }
                                        }
                                    }
                                };
                                $.ajax({
                                    url: v.host + '/api/v2/elasticsearch/search/' + v.db + '/' + v.index.name,
                                    data: JSON.stringify(dsl),
                                    contentType: "application/json; charset=utf-8",
                                    scriptCharset: "utf-8",
                                    dataType: 'json',
                                    type: "POST",
                                    success: function (response) {
                                        if (response.hits === undefined) return;
                                        $.each(response.hits.hits, function (i, hit) {
                                            var str = hit._source.properties[v.index.field];
                                            names.push({value: str});
                                            gids[v.name][str] = hit._source.properties[v.index.key];

                                        });
                                        names.sort(function (a, b) {
                                            return a.value - b.value
                                        });
                                        cb(names);
                                    }
                                })
                            })();
                        }
                    }
                )
            });
        }
        $("#" + el).typeahead({
            highlight: false
        }, ...standardSearches);
        $('#' + el).bind('typeahead:selected', function (obj, datum, name) {
            if ((type1 === "adresse" && name === "adresse") || (type2 === "jordstykke" && name === "matrikel")
                || (type3 === "esr_nr" && name === "esr_ejdnr") || (type4 === "sfe_nr" && name === "sfe_ejdnr")
                || extraSearchesNames.indexOf(name) !== -1
            ) {
                placeStore.reset();
                switch (name) {
                    case "esr_ejdnr" :
                        placeStore.db = MDB;
                        placeStore.host = MHOST;
                        searchString = datum.value;
                        placeStore.sql = "SELECT esr_ejendomsnummer,ST_Multi(ST_Union(the_geom)),ST_asgeojson(ST_transform(ST_Multi(ST_Union(the_geom)),4326)) as geojson FROM matrikel.jordstykke WHERE esr_ejendomsnummer = (SELECT esr_ejendomsnummer FROM matrikel.jordstykke WHERE gid=" + gids[type3][datum.value] + ") group by esr_ejendomsnummer";
                        placeStore.load();
                        break;
                    case "sfe_ejdnr" :
                        placeStore.db = MDB;
                        placeStore.host = MHOST;
                        searchString = datum.value;
                        placeStore.sql = "SELECT sfe_ejendomsnummer,ST_Multi(ST_Union(the_geom)),ST_asgeojson(ST_transform(ST_Multi(ST_Union(the_geom)),4326)) as geojson FROM matrikel.jordstykke WHERE sfe_ejendomsnummer = (SELECT sfe_ejendomsnummer FROM matrikel.jordstykke WHERE gid=" + gids[type4][datum.value] + ") group by sfe_ejendomsnummer";
                        placeStore.load();
                        break;
                    case "matrikel" :
                        placeStore.db = MDB;
                        placeStore.host = MHOST;
                        searchString = datum.value;
                        if (getProperty) {
                            placeStore.sql = "SELECT esr_ejendomsnummer,ST_Multi(ST_Union(the_geom)),ST_asgeojson(ST_transform(ST_Multi(ST_Union(the_geom)),4326)) as geojson FROM matrikel.jordstykke WHERE esr_ejendomsnummer = (SELECT esr_ejendomsnummer FROM matrikel.jordstykke WHERE gid=" + gids[type2][datum.value] + ") group by esr_ejendomsnummer";
                        } else {
                            placeStore.sql = "SELECT gid,the_geom,ST_asgeojson(ST_transform(the_geom,4326)) as geojson FROM matrikel.jordstykke WHERE gid='" + gids[type2][datum.value] + "'";
                        }
                        placeStore.load();
                        break;
                    case "adresse" :
                        placeStore.db = ADB;
                        placeStore.host = AHOST;
                        if (getProperty) {
                            placeStore.sql = "SELECT esr_ejendomsnummer,ST_Multi(ST_Union(the_geom)),ST_asgeojson(ST_transform(ST_Multi(ST_Union(the_geom)),4326)) as geojson FROM matrikel.jordstykke WHERE esr_ejendomsnummer = (SELECT esr_ejendomsnummer FROM matrikel.jordstykke WHERE (the_geom && (SELECT ST_transform(the_geom, 25832) FROM dar.adgangsadresser WHERE id='" + gids[type1][datum.value] + "')) AND ST_Intersects(the_geom, (SELECT ST_transform(the_geom, 25832) FROM dar.adgangsadresser WHERE id='" + gids[type1][datum.value] + "'))) group by esr_ejendomsnummer";
                        } else {
                            placeStore.sql = "SELECT id,kommunekode,the_geom,ST_asgeojson(ST_transform(the_geom,4326)) as geojson FROM dar.adgangsadresser WHERE id='" + gids[type1][datum.value] + "'";
                        }
                        searchString = datum.value;
                        placeStore.load();
                        break;
                    default: // Extra searches
                        placeStore.db = extraSearchesObj[name].db;
                        placeStore.host = extraSearchesObj[name].host;
                        searchString = datum.value;
                        placeStore.sql = "SELECT *,ST_asgeojson(ST_transform(" + extraSearchesObj[name].relation.geom + ",4326)) as geojson FROM " + extraSearchesObj[name].relation.name + " WHERE " + extraSearchesObj[name].relation.key +"='" + gids[name][datum.value] + "'";
                        placeStore.load();
                        break;

                }
            } else {
                setTimeout(function () {
                    $("#" + el).val(datum.value + " ").trigger("paste").trigger("input");
                }, 100)
            }
        });
    }

};
