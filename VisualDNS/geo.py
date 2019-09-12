import json
from random import choice
import IP2Location

with open('static/root_servers.json', 'r') as f:
	text = f.read()
root_servers = json.loads(text)
root_servers = dict((v[0], v[1:]) for v in root_servers.values())


def ip_to_geo(ip):
	if ip in root_servers:
		longi, lati = choice(root_servers[ip])
		rv = (longi, -lati)
	else:
		database = IP2Location.IP2Location('IP2LOCATION-LITE-DB5.BIN')

		rec = database.get_all(ip)

		'''
		rec.country_short
		rec.country_long
		rec.region
		rec.city
		rec.latitude
		rec.longitude
		'''

		rv = (
				rec.longitude,
				-rec.latitude
		)
	return rv
