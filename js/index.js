requirejs.config({
  baseUrl: 'js',
  paths: {
    jquery: 'lib/zepto-min',
    // zepto: 'lib/zepto-min',
    underscore: 'lib/underscore-min',
    backbone: 'lib/backbone-min',
    mapboxgl: 'https://api.mapbox.com/mapbox-gl-js/v0.21.0/mapbox-gl'
  }
});

requirejs([
  '../token',
  'jquery',
  'underscore',
  'backbone',
  'mapboxgl',
  'models',
  'views'],
function (token, $, _, Backbone, mapboxgl, Models, Views) {


mapboxgl.accessToken = token.MAPBOX_TOKEN;
var map = new mapboxgl.Map({
  container: 'map-view',
  style: 'mapbox://styles/mapbox/streets-v9'
});

// ---
// Item System
var groundCollectionInstance = new Models.ItemCollection();
var groundViewInstance = new Views.GroundView(groundCollectionInstance);

var inventoryModelInstance = new Models.ItemCollection(); 
var inventoryViewInstance = new Views.InventoryView(inventoryModelInstance);

// Add debug items
inventoryViewInstance.collection.add({label: 'Another Thing!'});

// Debug System
var DebugModel = Backbone.Model.extend({
  defaults: {
    'latitude': 0,
    'longitude': 0,
    'accuracy': 0,
    'freshness': false
  },
  initialize: function () {},
});

var debugModelInstance = new DebugModel;

var DebugView = Backbone.View.extend({
  model: debugModelInstance,
  initialize: function () {
    // TODO: Create DebugView element dynamically.
    this.el = $('#debug-view');

    this.listenTo(debugModelInstance, 'change', this.render);
  },
  render: function () {
    $('#debug-latitude',  this.el).html(this.model.get('latitude'));
    $('#debug-longitude', this.el).html(this.model.get('longitude'));
    $('#debug-accuracy',  this.el).html(this.model.get('accuracy'));
    $('#debug-freshness', this.el).html(this.model.get('freshness') ? ':-)' : ':-(');
  }
});

var debugViewInstance = new DebugView;

var ItemMarker = Backbone.View.extend({
  initialize: function (map, itemModel) {
    this.map = map;
    this.itemModel = itemModel;
    this.marker = new mapboxgl.Marker(this.el);
    this.marker.setLngLat([
      this.itemModel.get('longitude'),
      this.itemModel.get('latitude')
    ]);

    this.listenTo(itemModel, 'move', this.move);
    this.listenTo(itemModel, 'pick-up', this.remove);
    this.render();
  },
  move: function () {
    this.marker.setLngLat([
      this.itemModel.get('longitude'), 
      this.itemModel.get('latitude')
    ]);
  },
  render: function () {
    this.marker.addTo(this.map);
  }
})

// Create a marker to represent the user.
var marker = new mapboxgl.Marker($('<div id="player-marker"></div>')[0])
  .setLngLat([0, 0])
  .addTo(map);

// Center on user.
var navOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 2000
};
var watchId = navigator.geolocation.watchPosition(positionUpdate, positionError, navOptions);

// !!! DEBUG !!!
var scattered = false;

function positionUpdate (position) {

  // Update debug UI
  updateDebug(position);

  // !!! DEBUG !!!
  if(!scattered /*&& position.coords.accuracy < 20*/) {
    scattered = true;
    scatterItems(position.coords.longitude, position.coords.latitude, 0.0001);
  }

  marker.setLngLat([position.coords.longitude, position.coords.latitude])
  map.flyTo({
    center: [position.coords.longitude, position.coords.latitude], 
    zoom: 19
  });

  // Update nearby items.
  // TODO: Clean up code for filtering nearby items so server can be a drop-in replacement.
  groundViewInstance.collection.reset();
  items.forEach(function (item, index) {
    var userPos = marker.getLngLat(),
        lngDiff = item.get('longitude') - userPos.lng,
        latDiff = item.get('latitude')  - userPos.lat,
        diff    = Math.abs(Math.sqrt(lngDiff * lngDiff + latDiff * latDiff));
    if(diff < 0.00005) groundViewInstance.collection.add(item);
  })
}

function positionError (error) {
  debugModelInstance.set('freshness', false);
}

function updateDebug (position) {
  debugModelInstance.set('latitude',  position.coords.latitude);
  debugModelInstance.set('longitude', position.coords.longitude);
  debugModelInstance.set('accuracy',  position.coords.accuracy);
  debugModelInstance.set('freshness', true);
}

var items = [];
function scatterItems (centerLng, centerLat, spread) {
  var totalItems = 10,
    itemModel, itemView, latitude, longitude;
  for(var i=0; i<totalItems; i++) {
    latitude = centerLat + (Math.random() * spread) * (Math.random() < 0.5 ? 1 : -1);
    longitude = centerLng + (Math.random() * spread) * (Math.random() < 0.5 ? 1 : -1);
    itemModel = new Models.ItemModel({
      label: 'Item ' + i,
      latitude: latitude,
      longitude: longitude
    });
    itemView = new ItemMarker(map, itemModel);
    items.push(itemModel);
  }
}

});
