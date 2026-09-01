from math import radians, sin, cos, sqrt, atan2

# Returns distance in meters between two lat/lng pairs using Haversine
def calculate_distance(lat1, lng1, lat2, lng2):
    try:
        lat1 = float(lat1); lng1 = float(lng1); lat2 = float(lat2); lng2 = float(lng2)
    except (TypeError, ValueError):
        return None
    R = 6371000.0  # Earth radius in meters
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lng2 - lng1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c
