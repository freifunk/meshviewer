const self = {
  distance: undefined,
  distancePoint: undefined,
  distanceLink: undefined,
};

self.distance = function distance(a: Point, b: Point) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
};

self.distancePoint = function distancePoint(a: Point, b: Point) {
  return Math.sqrt(self.distance(a, b));
};

self.distanceLink = function distanceLink(p: Point, a: Point, b: Point) {
  /* http://stackoverflow.com/questions/849211 */
  let l2 = self.distance(a, b);
  if (l2 === 0) {
    return self.distance(p, a);
  }
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  if (t < 0) {
    return self.distance(p, a);
  } else if (t > 1) {
    return self.distance(p, b);
  }
  return self.distancePoint(p, {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  });
};

export default self;
