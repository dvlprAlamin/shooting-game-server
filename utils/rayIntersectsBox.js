const rayIntersectsBox = (rayOrigin, rayDirection, boxMin, boxMax) => {
    let tmin = (boxMin.x - rayOrigin.x) / rayDirection.x;
    let tmax = (boxMax.x - rayOrigin.x) / rayDirection.x;

    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (boxMin.y - rayOrigin.y) / rayDirection.y;
    let tymax = (boxMax.y - rayOrigin.y) / rayDirection.y;

    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if ((tmin > tymax) || (tymin > tmax)) return false;

    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (boxMin.z - rayOrigin.z) / rayDirection.z;
    let tzmax = (boxMax.z - rayOrigin.z) / rayDirection.z;

    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if ((tmin > tzmax) || (tzmin > tmax)) return false;

    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    return tmax > 0;
};

module.exports = rayIntersectsBox;