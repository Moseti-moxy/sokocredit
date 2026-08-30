"""GPS tracking support: distance calculation and simple route optimization
for field agents visiting customers in a market.

Route "optimization" here is a nearest-neighbour heuristic over haversine
distance - the standard, cheap approach for small daily visit lists (tens of
stops), which is the realistic scale for a single agent's collection round.
It is not a full TSP solver (that needs a routing engine / OR-Tools and a
real road network, which is a separate infrastructure decision), but it
turns an unordered pin list into a sensible walking/driving order and reports
the total distance, which is what "route optimization" means for this use case.
"""
import math

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1, lon1, lat2, lon2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def optimize_route(start, stops):
    """start: {'latitude', 'longitude'}. stops: list of dicts each with at least
    'id', 'latitude', 'longitude'. Returns (ordered_stops, total_km), where each
    ordered stop gets a 'legDistanceKm' added (distance from the previous stop).

    Stops missing coordinates are appended, unordered, at the end - unvisitable
    is better than silently dropped.
    """
    locatable = [s for s in stops if s.get('latitude') is not None and s.get('longitude') is not None]
    unlocatable = [s for s in stops if s not in locatable]

    ordered = []
    remaining = list(locatable)
    current = {'latitude': start['latitude'], 'longitude': start['longitude']}
    total_km = 0.0

    while remaining:
        nearest = min(remaining, key=lambda s: haversine_km(current['latitude'], current['longitude'], s['latitude'], s['longitude']))
        leg = haversine_km(current['latitude'], current['longitude'], nearest['latitude'], nearest['longitude'])
        total_km += leg
        ordered.append({**nearest, 'legDistanceKm': round(leg, 3)})
        current = nearest
        remaining.remove(nearest)

    for stop in unlocatable:
        ordered.append({**stop, 'legDistanceKm': None})

    return ordered, round(total_km, 3)
