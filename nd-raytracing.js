const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");
let canvasData;
let start = Date.now();
let buffers = {};

function drawPixel(x, y, r, g, b, a = 255) {
  const index = (x + y * canvas.width) * 4;

  canvasData.data[index + 0] = r;
  canvasData.data[index + 1] = g;
  canvasData.data[index + 2] = b;
  canvasData.data[index + 3] = a;
}

function getPixel(x, y) {
  const index = (x + y * canvas.width) * 4;

  return [
    canvasData.data[index + 0],
    canvasData.data[index + 1],
    canvasData.data[index + 2],
    canvasData.data[index + 3]
  ];
}

function drawPixels(step, x, y, r, g, b, a) {
  for (let i = 0; i <= step; i++) {
    for (let j = 0; j <= step; j++) {
      drawPixel(x + i, y + j, r, g, b, a);
    }
  }
}

function updateCanvas() {
  ctx.putImageData(canvasData, 0, 0);
}

function normalize(vec) {
  const len = Math.hypot(...vec);
  return vec.map(e => e / len);
}

function dot(a, b) {
  let product = 0;
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i];
  }

  return product;
}

function mulScalar(vec, scalar) {
  const res = [];
  for (let i = 0; i < vec.length; i++) {
    res[i] = vec[i] * scalar;
  }
  return res;
}

function mulVec(vecA, vecB) {
  const res = [];
  for (let i = 0; i < vecA.length; i++) {
    res[i] = vecA[i] * vecB[i];
  }
  return res;
}

function subVec(vecA, vecB) {
  const res = [];
  for (let i = 0; i < vecA.length; i++) {
    res[i] = vecA[i] - vecB[i];
  }
  return res;
}

function addVec(vecA, vecB) {
  const res = [];
  for (let i = 0; i < vecA.length; i++) {
    res[i] = vecA[i] + vecB[i];
  }
  return res;
}

function len(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum + 1e-300);
}

function sphereIntersection(origin, ray, spherePos, sphereR) {
  const originToSphere = subVec(spherePos, origin);

  // len of ray to the point where it's closest to the sphere center
  const tc = dot(ray, originToSphere);

  // if sphere is in front of us
  if (tc > 0) {
    const originToSphereLen = Math.hypot(...originToSphere);

    // throw { originToSphereLen, tc, originToSphere };

    // center of sphere to ray
    const d = Math.sqrt(originToSphereLen * originToSphereLen - tc * tc);

    // return originToSphereLen - tc;

    // if we hit the sphere
    if (d < sphereR) {
      // length from intersection to the point where d hits the ray (i.e. end of tc)
      const t1c = Math.sqrt(sphereR * sphereR - d * d);

      // length to first intersection
      const tc1 = tc - t1c;

      // point of first intersection on the ray
      const intersection = mulScalar(ray, tc1);

      return addVec(origin, intersection);
    }
  }
  return null;
}

function getRotation(t, loopTime) {
  // 0 .. 1 -> 0 .. 1
  const offset = (t % loopTime) / loopTime;

  const posOnCircle = [
    Math.cos(Math.PI * (offset * 2 - 1)),
    Math.sin(Math.PI * (offset * 2 - 1))
  ];

  return posOnCircle;
}

function clear() {
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      drawPixel(x, y, 255, 255, 255, 0);
    }
  }
}

function lightIntensityDist(dist) {
  const tmp = dist / 20 + 1;
  return 1 / (tmp * tmp);
}

function stackSpheres(dim) {
  const objects = [];
  const count = 2 ** dim;
  const outerR = 0.95;
  for (var i = 0; i < count; i++) {
    // this is so dumm but it works
    const pos = i
      .toString(2)
      .padStart(dim, "0")
      .split("")
      .map(Number)
      .map(n => n * 2 - 1);

    objects.push({
      pos,
      radius: outerR,
      color: [40, 90, 255]
    });
  }
  objects.push({
    pos: padVec([], 0),
    radius: Math.sqrt(dim) - outerR,
    color: [255, 90, 40]
  });
  return objects;
}

function trace(objects, camPos, ray, lightPos) {
  const allIntersections = [];

  for (var i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const point = sphereIntersection(camPos, ray, obj.pos, obj.radius);

    // console.log(point);
    // return mulScalar(obj.color, point);

    // allIntersections.push({
    //   pos: camPos,
    //   center: obj.pos,
    //   color: mulScalar(obj.color, point)
    // });

    if (point) {
      allIntersections.push({
        pos: point,
        center: obj.pos,
        color: obj.color
      });
    }
  }

  let firstIntersection = null;
  let minDistToCam = Infinity;

  for (var i = 0; i < allIntersections.length; i++) {
    const intersection = allIntersections[i];
    const toCam = subVec(intersection.pos, camPos);
    const distToCam = Math.hypot(...toCam);

    if (minDistToCam > distToCam) {
      minDistToCam = distToCam;
      firstIntersection = intersection;
    }
  }

  if (firstIntersection) {
    const point = firstIntersection.pos;
    const toLight = subVec(lightPos, point);
    const normal = normalize(subVec(point, firstIntersection.center));
    const angle = dot(normalize(toLight), normal);

    const brightness = Math.max(angle * 0.7 + 0.1, 0) + 0.2;

    return mulScalar(firstIntersection.color, brightness);
  }

  // bg color
  return [220, 220, 220, 255];
}

function getAvg(colors) {
  const len = colors.length;
  let sum = colors[0];
  for (var i = 1; i < len; i++) {
    sum = addVec(sum, colors[i]);
  }
  return [sum[0] / len, sum[1] / len, sum[2] / len, (sum[3] || 0) / len];
}

function findMaxDeviation(colors, avg) {
  avg = normalize(avg);
  let maxDiv = -Infinity;
  for (var i = 0; i < colors.length; i++) {
    const color = normalize(colors[i]);
    const div = Math.hypot(...subVec(color, avg));

    if (div > maxDiv) {
      maxDiv = div;
      if (maxDiv > 250) {
        // close enough
        return maxDiv;
      }
    }
  }

  return maxDiv;
}

const dimension = 3;

function padVec(vec, filler = 0) {
  const res = [];
  for (var i = 0; i < dimension; i++) {
    res[i] = vec[i] === undefined ? filler : vec[i];
  }
  return res;
}

const maxDeviationPerStep = {
  [64]: 16,
  [32]: 24,
  [16]: 32,
  [8]: 64,
  [4]: 128,
  [2]: 200,
  [1]: 230
};

const camPos = padVec([-10, -2, 0], -10);
const lightBasePos = padVec([-4, 0, 4], -3);

const objects = stackSpheres(dimension);

function nextFrame() {
  return new Promise(function(resolve, reject) {
    requestAnimationFrame(resolve);
  });
}

function sleep(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms);
  });
}

function draw() {
  const t = Date.now() - start;
  const lightPos = addVec(
    lightBasePos,
    padVec(mulScalar(getRotation(t, 2000), 2), 0)
  );

  let maxCanvasDim = Math.max(canvas.height, canvas.width);
  let offsetY = (maxCanvasDim - canvas.height) / 2;
  let offsetX = (maxCanvasDim - canvas.width) / 2;

  let smallestSample = Math.floor(maxCanvasDim / 250);

  let sampleCount = 0;
  function sample(x, y) {
    sampleCount++;
    const ray = normalize(padVec([1, x - 0.5, y - 0.5], 1));
    return trace(objects, camPos, ray, lightPos);
  }

  let step = smallestSample * 6;
  for (let y = 0; y < canvas.height; y += step) {
    const relY = 1 - (y + offsetY) / maxCanvasDim;
    for (let x = 0; x < canvas.width; x += step) {
      const relX = (x + offsetX) / maxCanvasDim;
      const color = sample(relX, relY);
      drawPixel(x, y, ...color);
    }
  }

  let subStep = smallestSample * 3;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      let a = getPixel(x, y);
      let b = getPixel(x + step, y);
      let c = getPixel(x, y + step);
      let d = getPixel(x + step, y + step);

      const all = [];
      if (a[0] !== undefined) all.push(a);
      if (b[0] !== undefined) all.push(b);
      if (c[0] !== undefined) all.push(c);
      if (d[0] !== undefined) all.push(d);

      const avg = getAvg(all);

      const maxDeviation = findMaxDeviation(all, avg);

      for (var yo = y; yo < y + step; yo += subStep) {
        const relY = 1 - (yo + offsetY) / maxCanvasDim;
        for (var xo = x; xo < x + step; xo += subStep) {
          const relX = (xo + offsetX) / maxCanvasDim;
          if (maxDeviation < 0.1) {
            drawPixel(xo, yo, ...avg);
          } else {
            const color = sample(relX, relY);
            drawPixel(xo, yo, ...color);
          }
        }
      }
    }
  }

  step = subStep;
  subStep = smallestSample;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      let a = getPixel(x, y);
      let b = getPixel(x + step, y);
      let c = getPixel(x, y + step);
      let d = getPixel(x + step, y + step);

      const all = [];
      if (a[0] !== undefined) all.push(a);
      if (b[0] !== undefined) all.push(b);
      if (c[0] !== undefined) all.push(c);
      if (d[0] !== undefined) all.push(d);

      const avg = getAvg(all);

      const maxDeviation = findMaxDeviation(all, avg);

      for (var yo = y; yo < y + step; yo += subStep) {
        const relY = 1 - (yo + offsetY) / maxCanvasDim;
        for (var xo = x; xo < x + step; xo += subStep) {
          const relX = (xo + offsetX) / maxCanvasDim;
          if (maxDeviation < 0.1) {
            drawPixels(subStep, xo, yo, ...avg);
          } else {
            const color = sample(relX, relY);
            drawPixels(subStep, xo, yo, ...color);
          }
        }
      }
    }
  }

  console.log("sampleCount", sampleCount);

  updateCanvas();
  requestAnimationFrame(draw);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let maxCanvasDim = Math.max(canvas.height, canvas.width);

  canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

resize();
window.addEventListener("resize", resize);

requestAnimationFrame(draw);