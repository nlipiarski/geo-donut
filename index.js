'use strict';


const FORM_FIELDS = [
  'latitude',
  'longitude',
  'innerRadius',
  'outerRadius',
];

const getFormField = (fieldName) =>
  document.querySelector(`[name='${fieldName}']`)

const setupQueryParams = () => {
  const queryParams = new URLSearchParams(window.location.search);
  for (const fieldName of FORM_FIELDS) {
    const element = getFormField(fieldName);

    const queryValue = queryParams.get(fieldName);
    if (queryValue) {
      element.value = queryValue
    }

    element.addEventListener('change', (e) => {
      const newUrl = new URL(window.location);
      newUrl.searchParams.set(fieldName, e.currentTarget.value);
      window.history.pushState({}, '', newUrl);
    })

  }
}

const getRandomOffset = (innerRadius, outerRadius) => {
  // If radii are the same treat as picking a random point on a circle
  if (Math.abs(innerRadius - outerRadius) < 0.0001) {
    return {
      theta: 2 * Math.PI * Math.random(),
      radius: outerRadius,
    }
  }

  const sampleWidth = outerRadius - innerRadius;
  const sampleHeight = innerRadius + outerRadius;
  let sampleX = sampleWidth * Math.random();
  let sampleY = sampleHeight * Math.random();

  if (sampleY > innerRadius + sampleX) {
    sampleX = sampleWidth - sampleX;
    sampleY = sampleHeight - sampleY;
  }

  const radius = innerRadius + sampleX;
  return {
    theta: (sampleY / radius) * 2 * Math.PI,
    radius,
  }
}

// In miles
const RADIUS_OF_EARTH = 3_959;

const generateRandomPoint = () => {
  let startLat = parseFloat(getFormField('latitude').value);
  if (startLat > 90) {
    startLat = 90;
  } else if (startLat < -90) {
    startLat = -90;
  }

  let startLong = parseFloat(getFormField('longitude').value);
  if (startLong > 180) {
    startLong = 180;
  } else if (startLong < -180) {
    startLong = -180;
  }

  let innerRadius = Math.abs(parseFloat(getFormField('innerRadius').value));
  let outerRadius = Math.abs(parseFloat(getFormField('outerRadius').value));

  if (innerRadius > outerRadius) {
    [innerRadius, outerRadius] = [outerRadius, innerRadius];
  }

  const startLatRad = startLat * Math.PI / 180;
  const startLongRad = startLong * Math.PI / 180;
  const start = [
    Math.cos(startLatRad) * Math.cos(startLongRad),
    Math.cos(startLatRad) * Math.sin(startLongRad),
    Math.sin(startLatRad),
  ]

  // Near the top of the earth the surface is close to flat so the upward vector
  // is not a good choice to create a tangent vector from
  let majorAxisRaw;
  if (Math.abs(startLat) < 70) {
    majorAxisRaw = [0, 0, 1];
  } else {
    majorAxisRaw = [1, 0, 0];
  }

  const majorAxisRawDotStart = 
    majorAxisRaw[0] * start[0] +
    majorAxisRaw[1] * start[1] +
    majorAxisRaw[2] * start[2];

  // Subtract the projection of raw onto the radius vector to get a perpendicual
  // vector roughly in the direction of the "main axis"
  const majorAxisUnscaled = [
    majorAxisRaw[0] - majorAxisRawDotStart * start[0],
    majorAxisRaw[1] - majorAxisRawDotStart * start[1],
    majorAxisRaw[2] - majorAxisRawDotStart * start[2],
  ];
  // Make sure axis has a length of 1
  const majorAxisScale = Math.sqrt(
    majorAxisUnscaled[0] ** 2 +
    majorAxisUnscaled[1] ** 2 +
    majorAxisUnscaled[2] ** 2
  );
  const majorAxis = [
    majorAxisUnscaled[0] / majorAxisScale,
    majorAxisUnscaled[1] / majorAxisScale,
    majorAxisUnscaled[2] / majorAxisScale,
  ];

  // Use the cross product to get a third vector perpendicular to the radius and
  // the main axis
  const minorAxis = [
    majorAxis[1] * start[2] - majorAxis[2] * start[1],
    majorAxis[2] * start[0] - majorAxis[0] * start[2],
    majorAxis[0] * start[1] - majorAxis[1] * start[0],
  ];

  const {radius, theta} = getRandomOffset(innerRadius, outerRadius);

  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const offsetDirection = [
    cosTheta * minorAxis[0] + sinTheta * majorAxis[0],
    cosTheta * minorAxis[1] + sinTheta * majorAxis[1],
    cosTheta * minorAxis[2] + sinTheta * majorAxis[2],
  ];

  const offsetAngle = radius / RADIUS_OF_EARTH;
  const cosOffset = Math.cos(offsetAngle);
  const sinOffset = Math.sin(offsetAngle);

  const endDirection = [
    cosOffset * start[0] + sinOffset * offsetDirection[0],
    cosOffset * start[1] + sinOffset * offsetDirection[1],
    cosOffset * start[2] + sinOffset * offsetDirection[2],
  ];

  const endLat = 180 * Math.asin(endDirection[2]) / Math.PI;
  const endLong = 180 * Math.atan2(endDirection[1], endDirection[0]) / Math.PI;

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('latDisplay').innerText = endLat;
  document.getElementById('longDisplay').innerText = endLong;
  document.getElementById('radiusDisplay').innerText = radius;

  document.getElementById('googleEarthLink').href = `https://www.google.com/maps/place/${endLat},${endLong}`;
}


const main = () => {
  setupQueryParams();
  getFormField('submit').addEventListener('click', generateRandomPoint)
}

window.onload = main;
