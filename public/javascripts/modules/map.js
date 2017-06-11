import axios from 'axios';
import { $ } from './bling';

// Google map api is loaded from layout.pug

// See docs for google maps
const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10 // rather than monkey around with zoom, we can use bounds
}

// You could autopop these defaults using navigator.geolocation.getCurrentPosition
function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios
    .get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        alert('no places found!');
        return;
      }

      // create a bounds
      const bounds = new google.maps.LatLngBounds();

      // create an info window to display data of a marker
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat:placeLat, lng:placeLng };
        
        bounds.extend(position); // extend bounds by every marker
        
        const marker = new google.maps.Marker({ map, position });
        marker.place = place; // store our place data on the google marker itself so we can get later
        
        return marker;
      });

      // when someone clicks on a marker, show the dtails of that place
      markers.forEach(marker => marker.addListener('click', function(){
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `;

        infoWindow.setContent(html);
        infoWindow.open(map, this);
      }));

      // then zoom the map to fit the markers perfectly
      map.setCenter(bounds.getCenter()); // set center of map to center of bounds
      map.fitBounds(bounds);
    });
}

function makeMap (mapDiv) {
  if(!mapDiv) return;

  //make our map
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  });
}

export default makeMap;