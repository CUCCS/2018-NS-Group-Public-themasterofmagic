import json
from random import choice
import geoip2.database


reader = geoip2.database.Reader('GeoLite2-City.mmdb')
with open('static/root_servers.json', 'r') as f:
	text = f.read()
root_servers = json.loads(text)
root_servers = dict((v[0], v[1:]) for v in root_servers.values())


def ip_to_geo(ip):
	if ip in root_servers:
		longi, lati = choice(root_servers[ip])
		rv = (longi, -lati)
	else:
		_ = reader.city(ip).location
		rv = (
			_.longitude,
			-_.latitude
		)
	return rv
