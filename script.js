var map, map_bounds, start, shop, end;
var directionsDisplay, transitDisplay, directionsService, travel_mode;
var start_marker, end_marker;

function main() {
    initMap();
    initDirections();
}

function initMap() {
    map_bounds = new google.maps.LatLngBounds();

    end = { //Lat / lng of Soda Hall at UC Berkeley
        lat: 37.875744,
        lng: -122.258840    };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: end    });
    end_marker = new google.maps.Marker({
        position: end,
        map: map    });
    map_bounds.extend(end_marker.position);

    var infoWindow = new google.maps.InfoWindow({
        map: map
    });

    //try geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            start = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            start_marker = new google.maps.Marker({
                position: start,
                map: map
            })
            map_bounds.extend(start_marker.position);
            map.fitBounds(map_bounds);

            infoWindow.setPosition(start);
            infoWindow.setContent('You are here.');
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }

    function handleLocationError(browserHasGeolocation, infoWindow, curr_loc) {
        infoWindow.setPosition(curr_loc);
        infoWindow.setContent(browserHasGeolocation ?
            'Error: The Geolocation service failed.' :
            'Error: Your browser doesn\'t support geolocation.');
    }
}

function initDirections() {
    directionsService = new google.maps.DirectionsService();

    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setOptions({preserveViewport: true});
    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('directionsPanel'));

    transitDisplay = new google.maps.DirectionsRenderer(); //special panel for displaying transit directions since google api doesn't support waypoints for transit
    transitDisplay.setOptions({preserveViewport: true});
    transitDisplay.setPanel(document.getElementById('transitPanel'));

    shop = null;
    travel_mode = 'WALKING';
    var destination_input = document.getElementById('destination-input');
    var modes = document.getElementById('mode-selector');

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(destination_input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(modes);

    var destination_autocomplete = new google.maps.places.Autocomplete(destination_input);
    destination_autocomplete.bindTo('bounds', map);

    function setupClickListener(id, mode) {
        var radioButton = document.getElementById(id);
        radioButton.addEventListener('click', function() {
            travel_mode = mode;
            getDirections();
        });
    }
    setupClickListener('changemode-walking', 'WALKING');
    setupClickListener('changemode-transit', 'TRANSIT');
    setupClickListener('changemode-bicycling', 'BICYCLING');

    destination_autocomplete.addListener('place_changed', function() {
        shop = destination_autocomplete.getPlace();
        if (!shop.geometry) {
            window.alert("Autocomplete's returned place contains no geometry");
            return;
        }
        getDirections();
    });

}

function expandViewportToFitPlace(place) {
    var newBounds = new google.maps.LatLngBounds();
    newBounds.extend(place.geometry.location);
    map.fitBounds(newBounds.union(map_bounds));
}

function getDirections() {
    if (start == null) {
        setTimeout(getDirections, 50); //wait until geolocation services have found your location
    } else {
        if (shop == null) {
            return;
        }
        start_marker.setMap(null);
        end_marker.setMap(null);

        var request;

        if (travel_mode != 'TRANSIT') {
            //hide transit directions
            transitDisplay.setMap(null);
            document.getElementById('transitPanel').style.display = "none";

            var waypts = [] //resets shop location
            waypts.push({
                location: shop.geometry.location,
                stopover: true
            })

            request = {
                origin: start,
                waypoints: waypts,
                destination: end,
                travelMode: travel_mode
            };
        } else {
            //make transit directions visible
            transitDisplay.setMap(map);
            document.getElementById('transitPanel').style.display = "inline";

            mid_request = {
                origin: start,
                destination: shop.geometry.location,
                travelMode: travel_mode
            };

            //request intermediary directions to destination
            directionsService.route(mid_request, function(response, status) {
                if (status === 'OK') {
                    transitDisplay.setDirections(response);
                } else {
                    window.alert('Directions request failed due to ' + status);
                }
            });

            request = {
                origin: shop.geometry.location,
                destination: end,
                travelMode: travel_mode
            };
        }

        //request directions to destination
        directionsService.route(request, function(response, status) {
            if (status === 'OK') {
                directionsDisplay.setDirections(response);
            } else {
                window.alert('Directions request failed due to ' + status);
            }
        });

        expandViewportToFitPlace(shop);
    }
}
